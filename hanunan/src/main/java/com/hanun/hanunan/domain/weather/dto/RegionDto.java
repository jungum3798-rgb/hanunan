package com.hanun.hanunan.domain.weather.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RegionDto {
    private String region1;   // 시/도     예: 경기도
    private String region2;   // 시/군/구  예: 양주시
    private String region3;   // 읍/면/동  예: 덕계동
}
