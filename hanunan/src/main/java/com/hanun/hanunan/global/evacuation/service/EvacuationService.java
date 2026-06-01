package com.hanun.hanunan.global.evacuation.service;

import com.hanun.hanunan.domain.safety.dto.SafetyFacilityDto;
import com.hanun.hanunan.domain.safety.service.ShelterApiService;
import com.hanun.hanunan.global.evacuation.dto.EvacuationShelterResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 재난문자 대피 키워드 감지 + 주변 대피소 조회 공통 서비스
 *
 * 화재, 산불, 태풍, 홍수, 테러, 붕괴 등 모든 재난 유형에서 공통으로 사용합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EvacuationService {

    private static final int    DEFAULT_RADIUS_METERS   = 1_000;
    private static final double METERS_PER_LAT_DEGREE   = 111_000.0;
    private static final double METERS_PER_LNG_DEGREE   = 89_000.0;   // 한국 위도 37° 기준

    // 대피 관련 키워드
    private static final List<String> EVACUATION_KEYWORDS = List.of(
            "대피", "피난", "즉시 이동", "대피하시기", "대피바랍니다", "대피 바랍니다"
    );

    private final ShelterApiService shelterApiService;

    /**
     * 재난문자에 대피 키워드가 있으면 사용자 반경 내 대피소를 반환합니다.
     *
     * @param disasterType   재난 유형 (로그용)
     * @param disasterId     재난 ID (로그용)
     * @param messageContent 재난문자 원문
     * @param lat            사용자 위도
     * @param lng            사용자 경도
     * @param radius         검색 반경 (미터), 0 이하이면 기본값 1000m 사용
     */
    public EvacuationShelterResponse getShelters(String disasterType, Long disasterId,
                                                  String messageContent,
                                                  double lat, double lng, int radius) {
        if (!isEvacuationRequired(messageContent)) {
            log.info("[대피소] 대피 키워드 없음 - type={}, id={}", disasterType, disasterId);
            return new EvacuationShelterResponse(false, List.of());
        }

        int effectiveRadius = (radius <= 0) ? DEFAULT_RADIUS_METERS : radius;
        double latOffset = effectiveRadius / METERS_PER_LAT_DEGREE;
        double lngOffset = effectiveRadius / METERS_PER_LNG_DEGREE;

        List<SafetyFacilityDto> shelters = shelterApiService.fetchShelter(
                lat - latOffset, lng - lngOffset,
                lat + latOffset, lng + lngOffset
        );

        log.info("[대피소] 대피 키워드 감지 - type={}, id={}, 반경={}m, 대피소={}건",
                disasterType, disasterId, effectiveRadius, shelters.size());

        return new EvacuationShelterResponse(true, shelters);
    }

    public boolean isEvacuationRequired(String messageContent) {
        if (messageContent == null || messageContent.isBlank()) return false;
        return EVACUATION_KEYWORDS.stream().anyMatch(messageContent::contains);
    }
}
