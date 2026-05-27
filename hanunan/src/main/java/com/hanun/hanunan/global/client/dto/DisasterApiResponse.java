package com.hanun.hanunan.global.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class DisasterApiResponse {

    private DisasterApiHeader header;
    private List<DisasterApiItem> body;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DisasterApiHeader {
        private String resultCode;
        private String resultMsg;
    }
}
