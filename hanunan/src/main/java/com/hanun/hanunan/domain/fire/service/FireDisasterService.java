package com.hanun.hanunan.domain.fire.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanun.hanunan.domain.fire.dto.*;
import com.hanun.hanunan.global.client.dto.DisasterApiItem;
import com.hanun.hanunan.domain.fire.entity.FireDisaster;
import com.hanun.hanunan.domain.fire.repository.FireDisasterRepository;
import com.hanun.hanunan.global.casualty.dto.CasualtyInfoDto;
import com.hanun.hanunan.global.casualty.service.CasualtyExtractionService;
import com.hanun.hanunan.global.client.DisasterApiClient;
import com.hanun.hanunan.global.news.dto.NewsArticleDto;
import com.hanun.hanunan.global.news.repository.DisasterNewsArticleRepository;
import com.hanun.hanunan.global.news.service.DisasterNewsScheduleService;
import com.hanun.hanunan.global.sse.SseEmitterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FireDisasterService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    private final FireDisasterRepository fireDisasterRepository;
    private final DisasterNewsArticleRepository disasterNewsArticleRepository;
    private final CasualtyExtractionService casualtyExtractionService;
    private final GeocodingService geocodingService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final DisasterApiClient disasterApiClient;
    private final DisasterNewsScheduleService disasterNewsScheduleService;
    private final SseEmitterService sseEmitterService;


    // ─────────────────────────────────────────
    // 스케줄러에서 호출 - 미리 fetch된 아이템 중 화재·산불만 처리
    // ─────────────────────────────────────────
    public void processItems(List<DisasterApiItem> items) {
        try {
            if (items == null || items.isEmpty()) {
                log.info("수신된 재난문자 없음");
                return;
            }

            // 화재·산불 필터링 + 이미 처리된 SN 중복 제거
            List<DisasterApiItem> newFireItems = items.stream()
                    .filter(item -> "화재".equals(item.getDstSeNm()) || "산불".equals(item.getDstSeNm()))
                    .filter(item -> item.getSn() != null && !fireDisasterRepository.existsBySn(item.getSn()))
                    .collect(Collectors.toList());

            log.info("신규 화재·산불 문자: {}건", newFireItems.size());

            for (DisasterApiItem item : newFireItems) {
                processFireItem(item);
            }
        } catch (Exception e) {
            log.error("재난문자 처리 오류: {}", e.getMessage());
        }
    }

    // ─────────────────────────────────────────
    // 개별 화재 문자 처리
    // ─────────────────────────────────────────
    private void processFireItem(DisasterApiItem item) {
        log.info("화재 문자 처리 중 - SN: {}", item.getSn());
        try {
            // 1. Groq API로 위치 파싱
            GroqLocationResult locationResult = parseLocationWithGroq(item.getMsgCn());
            if (locationResult == null || !locationResult.isLocationFound()
                    || locationResult.getAddress() == null) {
                log.info("위치 정보 없음 - SN: {}", item.getSn());
                return;
            }

            // 2. 수신지역명 + 파싱 주소 결합 후 좌표 변환
            String fullAddress = buildFullAddress(item.getRcptnRgnNm(), locationResult.getAddress());
            double[] coords = geocodingService.getCoordinates(fullAddress);

            // 결합 주소로 실패 시 파싱 주소만으로 재시도
            if (coords == null) {
                coords = geocodingService.getCoordinates(locationResult.getAddress());
            }

            if (coords == null) {
                log.info("좌표 변환 실패 - 주소: {}", fullAddress);
                return;
            }

            // 3. DB 저장
            FireDisaster fireDisaster = FireDisaster.builder()
                    .sn(item.getSn())
                    .messageContent(item.getMsgCn())
                    .rcptnRgnNm(item.getRcptnRgnNm())
                    .alertLevel(item.getEmrgStepNm())
                    .parsedAddress(fullAddress)
                    .latitude(coords[0])
                    .longitude(coords[1])
                    .createdAt(parseCrtDt(item.getCrtDt()))
                    .build();

            FireDisaster saved = fireDisasterRepository.save(fireDisaster);
            log.info("화재 마커 저장 완료 - SN: {}, 주소: {}", item.getSn(), fullAddress);

            // SSE로 연결된 프론트에 신규 화재 마커 실시간 전송
            sseEmitterService.broadcastFire(new FireMarkerDto(
                    saved.getId(), saved.getSn(), saved.getMessageContent(),
                    saved.getRcptnRgnNm(), saved.getParsedAddress(),
                    saved.getLatitude(), saved.getLongitude(),
                    saved.getCreatedAt().toString(), saved.getAlertLevel()
            ));

            // 뉴스 모니터링 시작 (T+10분 후 Phase1 첫 호출)
            disasterNewsScheduleService.startMonitoring(saved.getId(), "화재", fullAddress, item.getEmrgStepNm(), saved.getCreatedAt());

        } catch (Exception e) {
            log.error("화재 항목 처리 실패 - SN: {}, 오류: {}", item.getSn(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────
    // Groq API - 위치 파싱
    // ─────────────────────────────────────────
    private GroqLocationResult parseLocationWithGroq(String messageContent) {
        String prompt = """
                당신은 재난문자에서 화재·산불 발생 위치를 추출하는 파서입니다.
                아래 재난문자를 분석하여 발생 위치 주소를 추출하세요.

                [출력 규칙]
                - 반드시 순수 JSON만 출력하세요 (마크다운 코드블록, 설명 텍스트 금지)
                - 줄바꿈 없이 한 줄로 출력하세요

                [주소 추출 규칙]
                - 반드시 원문에 등장한 표현만 사용하세요. 추론하거나 보완하지 마세요.
                - 시/군/구 + 읍/면/동 + 번지까지 포함
                - 광역시/도 명칭은 원문에 명시된 경우에만 포함
                - 주소가 2개 이상이면 발생지로 명시된 것 우선

                [출력 형식]
                위치가 있는 경우: {"location_found": true, "address": "추출한 상세 주소"}
                위치 없는 경우: {"location_found": false, "address": null}

                [예시]
                입력: "[광주소방] 북구 용봉동 123-4 건물 화재 발생. 해당 지역 주민 대피 바랍니다."
                출력: {"location_found": true, "address": "광주 북구 용봉동 123-4"}

                입력: "[산림청] 경북 안동시 길안면 만경산 산불 발생. 인근 주민 대피 바랍니다."
                출력: {"location_found": true, "address": "경북 안동시 길안면 만경산"}

                입력: "[안전안내문자] 화재가 발생하였습니다. 주의하시기 바랍니다."
                출력: {"location_found": false, "address": null}

                재난문자: "%s"
                """.formatted(messageContent);

        try {
            GroqRequest request = new GroqRequest();
            request.setMessages(List.of(new GroqRequest.Message("user", prompt)));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            HttpEntity<GroqRequest> entity = new HttpEntity<>(request, headers);
            GroqResponse response = restTemplate.postForObject(groqApiUrl, entity, GroqResponse.class);

            if (response == null || response.getChoices() == null || response.getChoices().isEmpty()) {
                return null;
            }

            String content = extractJson(
                    response.getChoices().get(0).getMessage().getContent().trim()
            );
            log.info("Groq 위치 파싱 결과: {}", content);
            return objectMapper.readValue(content, GroqLocationResult.class);

        } catch (Exception e) {
            log.error("Groq 위치 파싱 실패: {}", e.getMessage());
            return null;
        }
    }

    // JSON 블록만 추출 (마크다운 코드블록 등 제거)
    private String extractJson(String content) {
        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return content.substring(start, end + 1);
        }
        return content;
    }

    // 수신지역명 + 파싱 주소 결합 (중복 방지)
    // 예) rcptnRgnNm="경기도 양주시 덕계동", parsed="양주시 덕계동 466-18 인근"
    //   → "경기도"만 없으므로 "경기도 양주시 덕계동 466-18 인근" 반환
    private String buildFullAddress(String rcptnRgnNm, String parsedAddress) {
        if (rcptnRgnNm == null || rcptnRgnNm.isBlank()) return parsedAddress;
        if (parsedAddress == null || parsedAddress.isBlank()) return rcptnRgnNm;

        // rcptnRgnNm 토큰을 앞에서부터 순서대로 확인
        // parsedAddress에 없는 앞부분 토큰만 prefix로 붙임
        String[] tokens = rcptnRgnNm.split(" ");
        StringBuilder prefix = new StringBuilder();

        for (String token : tokens) {
            if (parsedAddress.contains(token)) {
                break;
            }
            if (!prefix.isEmpty()) prefix.append(" ");
            prefix.append(token);
        }

        return prefix.isEmpty() ? parsedAddress : prefix + " " + parsedAddress;
    }



    // CRT_DT 파싱 (예: "2025/05/11 11:00:00" 또는 "2025-05-11 11:00:00")
    // 파싱 실패 시 현재 시각으로 fallback
    private LocalDateTime parseCrtDt(String crtDt) {
        if (crtDt == null || crtDt.isBlank()) return LocalDateTime.now();
        String[] patterns = {"yyyy/MM/dd HH:mm:ss", "yyyy-MM-dd HH:mm:ss", "yyyyMMddHHmmss"};
        for (String pattern : patterns) {
            try {
                return LocalDateTime.parse(crtDt.trim(), DateTimeFormatter.ofPattern(pattern));
            } catch (DateTimeParseException ignored) {}
        }
        log.warn("CRT_DT 파싱 실패, 현재 시각 사용 - crtDt: {}", crtDt);
        return LocalDateTime.now();
    }

    // ─────────────────────────────────────────
    // 테스트용: 임의 재난문자 직접 처리
    // ─────────────────────────────────────────
    public FireMarkerDto testProcessMessage(String messageContent, String rcptnRgnNm, String occurredAt) {
        String testSn = "TEST-" + System.currentTimeMillis();

        GroqLocationResult locationResult = parseLocationWithGroq(messageContent);
        if (locationResult == null || !locationResult.isLocationFound()
                || locationResult.getAddress() == null) {
            throw new IllegalArgumentException("위치 정보를 추출하지 못했습니다. 주소가 포함된 문자를 입력해주세요.");
        }

        String fullAddress = buildFullAddress(rcptnRgnNm, locationResult.getAddress());
        double[] coords = geocodingService.getCoordinates(fullAddress);
        if (coords == null) coords = geocodingService.getCoordinates(locationResult.getAddress());
        if (coords == null) {
            throw new IllegalArgumentException("좌표 변환 실패 - 주소: " + fullAddress);
        }

        LocalDateTime createdAt = (occurredAt != null && !occurredAt.isBlank())
                ? LocalDateTime.parse(occurredAt)
                : LocalDateTime.now();

        FireDisaster fireDisaster = FireDisaster.builder()
                .sn(testSn)
                .messageContent(messageContent)
                .rcptnRgnNm(rcptnRgnNm != null ? rcptnRgnNm : "테스트")
                .alertLevel("테스트")
                .parsedAddress(fullAddress)
                .latitude(coords[0])
                .longitude(coords[1])
                .createdAt(createdAt)
                .build();

        FireDisaster saved = fireDisasterRepository.save(fireDisaster);
        log.info("테스트 화재 마커 저장 완료 - SN: {}, 주소: {}", testSn, fullAddress);

        // 뉴스 모니터링 시작
        disasterNewsScheduleService.startMonitoring(saved.getId(), "화재", fullAddress, saved.getAlertLevel(), saved.getCreatedAt());

        return new FireMarkerDto(
                saved.getId(), saved.getSn(), saved.getMessageContent(),
                saved.getRcptnRgnNm(), saved.getParsedAddress(),
                saved.getLatitude(), saved.getLongitude(),
                saved.getCreatedAt().toString(),
                saved.getAlertLevel()
        );
    }

    // ─────────────────────────────────────────
    // 프론트엔드용 마커 목록 조회
    // ─────────────────────────────────────────
    public List<FireMarkerDto> getAllFireMarkers() {
        return fireDisasterRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(fire -> new FireMarkerDto(
                        fire.getId(),
                        fire.getSn(),
                        fire.getMessageContent(),
                        fire.getRcptnRgnNm(),
                        fire.getParsedAddress(),
                        fire.getLatitude(),
                        fire.getLongitude(),
                        fire.getCreatedAt().toString(),
                        fire.getAlertLevel()
                ))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────
    // 특정 화재의 피해 정보 조회
    // ─────────────────────────────────────────
    public Optional<CasualtyInfoDto> getFireCasualty(Long fireId) {
        if (!fireDisasterRepository.existsById(fireId)) {
            throw new IllegalArgumentException("해당 화재 정보를 찾을 수 없습니다. id=" + fireId);
        }
        return casualtyExtractionService.getCasualtyInfo(fireId, "화재");
    }

    // ─────────────────────────────────────────
    // 특정 화재의 수집된 뉴스 기사 조회 (DB 저장분, 최신순)
    // ─────────────────────────────────────────
    public List<NewsArticleDto> getFireNews(Long fireId) {
        if (!fireDisasterRepository.existsById(fireId)) {
            throw new IllegalArgumentException("해당 화재 정보를 찾을 수 없습니다. id=" + fireId);
        }

        return disasterNewsArticleRepository
                .findTop10ByDisasterIdAndDisasterTypeOrderByFetchedAtDesc(fireId, "화재")
                .stream()
                .map(article -> NewsArticleDto.builder()
                        .title(article.getTitle())
                        .link(article.getLink())
                        .description(article.getDescription())
                        .pubDate(article.getPubDate())
                        .build())
                .collect(Collectors.toList());
    }
}
