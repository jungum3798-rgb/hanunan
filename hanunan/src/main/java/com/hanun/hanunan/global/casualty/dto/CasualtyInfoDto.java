package com.hanun.hanunan.global.casualty.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CasualtyInfoDto {
    private Integer deaths;           // 사망자 수
    private Integer injuries;         // 부상자 수
    private String propertyDamage;    // 재산피해
    private String cause;             // 발생 원인
    private String suppressionStatus; // 진압/수습 현황
    private String summary;           // 뉴스 요약
    private String sourceUrl;         // 출처 기사 URL
    private String updatedAt;         // 마지막 업데이트 시각
}
