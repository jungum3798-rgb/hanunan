package com.hanun.hanunan.domain.weather.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WeatherAlertDto {
    private Long id;
    private String sn;
    private String messageContent;
    private String rcptnRgnNm;  // 수신지역명
    private String dstSeNm;     // 재해구분명 (강풍, 태풍 등)
    private String alertLevel;  // 긴급단계
    private String createdAt;
}
