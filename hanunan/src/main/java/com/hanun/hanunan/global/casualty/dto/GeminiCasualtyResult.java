package com.hanun.hanunan.global.casualty.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class GeminiCasualtyResult {

    @JsonProperty("deaths")
    private Integer deaths;

    @JsonProperty("injuries")
    private Integer injuries;

    @JsonProperty("property_damage")
    private String propertyDamage;

    @JsonProperty("cause")
    private String cause;

    @JsonProperty("suppression_status")
    private String suppressionStatus;

    @JsonProperty("summary")
    private String summary;

    // 추출된 정보가 하나라도 있으면 true
    @JsonProperty("has_info")
    private boolean hasInfo;
}
