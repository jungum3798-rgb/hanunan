package com.hanun.hanunan.domain.weather.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class WeatherAlertsResponse {
    private RegionDto region;           // 역지오코딩 결과 (시/도, 시/군/구, 읍/면/동)
    private List<WeatherAlertDto> alerts;  // 해당 지역 기상 재난문자 목록
}
