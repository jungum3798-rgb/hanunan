package com.hanun.hanunan.domain.disaster.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DisasterAlertMarkerDto {
    private Long id;
    private String sn;
    private String messageContent;
    private String rcptnRgnNm;
    private String parsedAddress;
    private Double latitude;
    private Double longitude;
    private String createdAt;
    private String alertLevel;
    private String disasterType; // 테러, 붕괴, 폭발, 산사태
}
