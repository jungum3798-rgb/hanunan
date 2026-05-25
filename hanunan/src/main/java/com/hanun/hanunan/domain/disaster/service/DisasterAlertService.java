package com.hanun.hanunan.domain.disaster.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanun.hanunan.domain.disaster.dto.DisasterAlertMarkerDto;
import com.hanun.hanunan.domain.disaster.entity.DisasterAlert;
import com.hanun.hanunan.domain.disaster.repository.DisasterAlertRepository;
import com.hanun.hanunan.domain.fire.dto.DisasterApiItem;
import com.hanun.hanunan.domain.fire.dto.GroqLocationResult;
import com.hanun.hanunan.domain.fire.dto.GroqRequest;
import com.hanun.hanunan.domain.fire.dto.GroqResponse;
import com.hanun.hanunan.domain.fire.service.GeocodingService;
import com.hanun.hanunan.global.casualty.dto.CasualtyInfoDto;
import com.hanun.hanunan.global.casualty.service.CasualtyExtractionService;
import com.hanun.hanunan.global.news.dto.NewsArticleDto;
import com.hanun.hanunan.global.news.repository.DisasterNewsArticleRepository;
import com.hanun.hanunan.global.news.service.DisasterNewsScheduleService;
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
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DisasterAlertService {

    private static final Set<String> TARGET_TYPES = Set.of("테러", "붕괴", "폭발", "산사태");

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    private final DisasterAlertRepository disasterAlertRepository;
    private final DisasterNewsArticleRepository disasterNewsArticleRepository;
    private final DisasterNewsScheduleService disasterNewsScheduleService;
    private final CasualtyExtractionService casualtyExtractionService;
    private final GeocodingService geocodingService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public void processItems(List<DisasterApiItem> items) {
        try {
            if (items == null || items.isEmpty()) return;

            List<DisasterApiItem> newItems = items.stream()
                    .filter(item -> item.getDstSeNm() != null && TARGET_TYPES.contains(item.getDstSeNm()))
                    .filter(item -> item.getSn() != null && !disasterAlertRepository.existsBySn(item.getSn()))
                    .collect(Collectors.toList());

            log.info("신규 재난 알림 (테러·붕괴·폭발·산사태): {}건", newItems.size());

            for (DisasterApiItem item : newItems) {
                processAlertItem(item);
            }
        } catch (Exception e) {
            log.error("재난 알림 처리 오류: {}", e.getMessage());
        }
    }

    private void processAlertItem(DisasterApiItem item) {
        log.info("재난 알림 처리 중 - SN: {}, 유형: {}", item.getSn(), item.getDstSeNm());
        try {
            GroqLocationResult locationResult = parseLocationWithGroq(item.getMsgCn(), item.getDstSeNm());
            if (locationResult == null || !locationResult.isLocationFound()
                    || locationResult.getAddress() == null) {
                log.info("위치 정보 없음 - SN: {}", item.getSn());
                return;
            }

            String fullAddress = buildFullAddress(item.getRcptnRgnNm(), locationResult.getAddress());
            double[] coords = geocodingService.getCoordinates(fullAddress);
            if (coords == null) coords = geocodingService.getCoordinates(locationResult.getAddress());
            if (coords == null) {
                log.info("좌표 변환 실패 - 주소: {}", fullAddress);
                return;
            }

            DisasterAlert alert = DisasterAlert.builder()
                    .sn(item.getSn())
                    .messageContent(item.getMsgCn())
                    .rcptnRgnNm(item.getRcptnRgnNm())
                    .alertLevel(item.getEmrgStepNm())
                    .disasterType(item.getDstSeNm())
                    .parsedAddress(fullAddress)
                    .latitude(coords[0])
                    .longitude(coords[1])
                    .createdAt(parseCrtDt(item.getCrtDt()))
                    .build();

            DisasterAlert saved = disasterAlertRepository.save(alert);
            log.info("재난 알림 마커 저장 완료 - SN: {}, 유형: {}, 주소: {}", item.getSn(), item.getDstSeNm(), fullAddress);

            // 뉴스 모니터링 시작 (T+10분 후 Phase1 첫 호출)
            disasterNewsScheduleService.startMonitoring(saved.getId(), item.getDstSeNm(), fullAddress, item.getEmrgStepNm(), saved.getCreatedAt());

        } catch (Exception e) {
            log.error("재난 알림 항목 처리 실패 - SN: {}, 오류: {}", item.getSn(), e.getMessage());
        }
    }

    private GroqLocationResult parseLocationWithGroq(String messageContent, String disasterType) {
        String prompt = """
                당신은 재난문자에서 %s 발생 위치를 추출하는 파서입니다.
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

                재난문자: "%s"
                """.formatted(disasterType, messageContent);

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

            String content = extractJson(response.getChoices().get(0).getMessage().getContent().trim());
            log.info("Groq 위치 파싱 결과: {}", content);
            return objectMapper.readValue(content, GroqLocationResult.class);

        } catch (Exception e) {
            log.error("Groq 위치 파싱 실패: {}", e.getMessage());
            return null;
        }
    }

    private String extractJson(String content) {
        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return content.substring(start, end + 1);
        }
        return content;
    }

    private String buildFullAddress(String rcptnRgnNm, String parsedAddress) {
        if (rcptnRgnNm == null || rcptnRgnNm.isBlank()) return parsedAddress;
        if (parsedAddress == null || parsedAddress.isBlank()) return rcptnRgnNm;

        String[] tokens = rcptnRgnNm.split(" ");
        StringBuilder prefix = new StringBuilder();

        for (String token : tokens) {
            if (parsedAddress.contains(token)) break;
            if (!prefix.isEmpty()) prefix.append(" ");
            prefix.append(token);
        }

        return prefix.isEmpty() ? parsedAddress : prefix + " " + parsedAddress;
    }

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

    public Optional<CasualtyInfoDto> getDisasterCasualty(Long disasterId, String disasterType) {
        if (!disasterAlertRepository.existsById(disasterId)) {
            throw new IllegalArgumentException("해당 재난 정보를 찾을 수 없습니다. id=" + disasterId);
        }
        return casualtyExtractionService.getCasualtyInfo(disasterId, disasterType);
    }

    public List<NewsArticleDto> getDisasterNews(Long disasterId, String disasterType) {
        if (!disasterAlertRepository.existsById(disasterId)) {
            throw new IllegalArgumentException("해당 재난 정보를 찾을 수 없습니다. id=" + disasterId);
        }

        return disasterNewsArticleRepository
                .findTop10ByDisasterIdAndDisasterTypeOrderByFetchedAtDesc(disasterId, disasterType)
                .stream()
                .map(article -> NewsArticleDto.builder()
                        .title(article.getTitle())
                        .link(article.getLink())
                        .description(article.getDescription())
                        .pubDate(article.getPubDate())
                        .build())
                .collect(Collectors.toList());
    }

    public List<DisasterAlertMarkerDto> getAllAlertMarkers() {
        return disasterAlertRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(alert -> new DisasterAlertMarkerDto(
                        alert.getId(),
                        alert.getSn(),
                        alert.getMessageContent(),
                        alert.getRcptnRgnNm(),
                        alert.getParsedAddress(),
                        alert.getLatitude(),
                        alert.getLongitude(),
                        alert.getCreatedAt().toString(),
                        alert.getAlertLevel(),
                        alert.getDisasterType()
                ))
                .collect(Collectors.toList());
    }
}
