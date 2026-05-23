package com.hanun.hanunan.domain.fire.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class GroqRequest {
    private String model = "llama-3.3-70b-versatile";
    private List<Message> messages;
    private double temperature = 0.1;

    @JsonProperty("max_tokens")
    private Integer maxTokens;

    @Data
    @AllArgsConstructor
    public static class Message {
        private String role;
        private String content;
    }
}
