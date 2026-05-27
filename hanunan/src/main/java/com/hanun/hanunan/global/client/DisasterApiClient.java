package com.hanun.hanunan.global.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanun.hanunan.global.client.dto.DisasterApiItem;
import com.hanun.hanunan.global.client.dto.DisasterApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DisasterApiClient {

    @Value("${disaster.api.key}")
    private String disasterApiKey;

    @Value("${disaster.api.url}")
    private String disasterApiUrl;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public List<DisasterApiItem> fetchAll() {
        String url = disasterApiUrl
                + "?serviceKey=" + disasterApiKey
                + "&returnType=json&numOfRows=20&pageNo=1";

        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        headers.set("Accept", "application/json, text/plain, */*");
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        int maxAttempts = 5;
        long[] delays = {0, 3000, 5000, 10000, 20000};
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            if (delays[attempt - 1] > 0) {
                try { Thread.sleep(delays[attempt - 1]); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); return List.of(); }
            }
            try {
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                log.info("재난문자 API 응답 상태: {}", response.getStatusCode());

                if (response.getBody() == null) return List.of();

                if (response.getBody().trim().startsWith("<")) {
                    log.error("재난문자 API가 HTML을 반환했습니다. API 키를 확인하세요.");
                    return List.of();
                }

                DisasterApiResponse parsed = objectMapper.readValue(response.getBody(), DisasterApiResponse.class);
                if (parsed.getBody() != null) return parsed.getBody();
                return List.of();

            } catch (Exception e) {
                log.warn("재난문자 API 호출 실패 ({}/{}): {}", attempt, maxAttempts, e.getMessage());
            }
        }
        log.error("재난문자 API 호출 {}회 모두 실패", maxAttempts);
        return List.of();
    }
}
