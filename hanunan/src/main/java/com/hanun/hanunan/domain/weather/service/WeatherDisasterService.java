package com.hanun.hanunan.domain.weather.service;

import com.hanun.hanunan.domain.fire.dto.DisasterApiItem;
import com.hanun.hanunan.domain.fire.service.GeocodingService;
import com.hanun.hanunan.domain.weather.dto.WeatherAlertDto;
import com.hanun.hanunan.domain.weather.entity.WeatherDisaster;
import com.hanun.hanunan.domain.weather.repository.WeatherDisasterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherDisasterService {

    private static final Set<String> WEATHER_CATEGORIES = Set.of(
            "강풍", "건조", "대설", "미세먼지", "안개", "지진",
            "태풍", "지진해일", "폭염", "풍랑", "한파", "홍수", "호우", "황사"
    );

    private final WeatherDisasterRepository weatherDisasterRepository;
    private final GeocodingService geocodingService;

    // ─────────────────────────────────────────
    // 스케줄러에서 호출 - 기상 재난문자 필터링 및 저장
    // ─────────────────────────────────────────
    public void processWeatherItems(List<DisasterApiItem> items) {
        if (items == null || items.isEmpty()) return;

        List<DisasterApiItem> newWeatherItems = items.stream()
                .filter(item -> item.getDstSeNm() != null && WEATHER_CATEGORIES.contains(item.getDstSeNm()))
                .filter(item -> item.getSn() != null && !weatherDisasterRepository.existsBySn(item.getSn()))
                .collect(Collectors.toList());

        log.info("신규 기상 재난문자: {}건", newWeatherItems.size());

        for (DisasterApiItem item : newWeatherItems) {
            WeatherDisaster entity = WeatherDisaster.builder()
                    .sn(item.getSn())
                    .messageContent(item.getMsgCn())
                    .rcptnRgnNm(item.getRcptnRgnNm())
                    .dstSeNm(item.getDstSeNm())
                    .alertLevel(item.getEmrgStepNm())
                    .createdAt(LocalDateTime.now())
                    .build();
            weatherDisasterRepository.save(entity);
            log.info("기상 재난문자 저장 - SN: {}, 종류: {}, 지역: {}",
                    item.getSn(), item.getDstSeNm(), item.getRcptnRgnNm());
        }
    }

    // ─────────────────────────────────────────
    // 사용자 GPS 기반 기상 재난문자 조회
    // ─────────────────────────────────────────
    public List<WeatherAlertDto> getAlertsByLocation(double lat, double lng) {
        // 1. 역지오코딩: 좌표 → 지역명 토큰 [시/도, 시/군/구, 읍/면/동]
        String[] regionTokens = geocodingService.reverseGeocode(lat, lng);

        // 2. RCPTN_RGN_NM이 사용자 지역과 겹치는 기상 재난문자 반환
        return weatherDisasterRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(alert -> matchesRegion(alert.getRcptnRgnNm(), regionTokens))
                .map(alert -> new WeatherAlertDto(
                        alert.getId(),
                        alert.getSn(),
                        alert.getMessageContent(),
                        alert.getRcptnRgnNm(),
                        alert.getDstSeNm(),
                        alert.getAlertLevel(),
                        alert.getCreatedAt().toString()
                ))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────
    // 테스트용: 임의 기상 재난문자 직접 저장
    // ─────────────────────────────────────────
    public WeatherAlertDto testSave(String messageContent, String rcptnRgnNm, String dstSeNm, String alertLevel) {
        String testSn = "TEST-WEATHER-" + System.currentTimeMillis();

        WeatherDisaster entity = WeatherDisaster.builder()
                .sn(testSn)
                .messageContent(messageContent)
                .rcptnRgnNm(rcptnRgnNm)
                .dstSeNm(dstSeNm)
                .alertLevel(alertLevel != null ? alertLevel : "안전안내")
                .createdAt(LocalDateTime.now())
                .build();

        WeatherDisaster saved = weatherDisasterRepository.save(entity);
        return new WeatherAlertDto(
                saved.getId(), saved.getSn(), saved.getMessageContent(),
                saved.getRcptnRgnNm(), saved.getDstSeNm(),
                saved.getAlertLevel(), saved.getCreatedAt().toString()
        );
    }

    // ─────────────────────────────────────────
    // RCPTN_RGN_NM과 사용자 지역 매칭
    // "전국"은 항상 매칭, 그 외엔 지역 토큰이 포함되는지 확인
    // ─────────────────────────────────────────
    private boolean matchesRegion(String rcptnRgnNm, String[] regionTokens) {
        if (rcptnRgnNm == null || rcptnRgnNm.isBlank()) return false;
        if ("전국".equals(rcptnRgnNm.trim())) return true;
        if (regionTokens == null || regionTokens.length == 0) return false;

        for (String token : regionTokens) {
            if (!token.isBlank() && rcptnRgnNm.contains(token)) {
                return true;
            }
        }
        return false;
    }
}
