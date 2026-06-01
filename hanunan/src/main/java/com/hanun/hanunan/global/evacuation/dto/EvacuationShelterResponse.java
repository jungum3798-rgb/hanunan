package com.hanun.hanunan.global.evacuation.dto;

import com.hanun.hanunan.domain.safety.dto.SafetyFacilityDto;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class EvacuationShelterResponse {

    private boolean evacuationRequired; // 재난문자에 대피 키워드 포함 여부
    private List<SafetyFacilityDto> shelters; // 반경 내 대피소 목록 (evacuationRequired=false 이면 빈 리스트)
}
