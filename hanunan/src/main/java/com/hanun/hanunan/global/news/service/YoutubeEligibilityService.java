package com.hanun.hanunan.global.news.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 재난 발생 시 YouTube 영상 수집 대상 여부를 판단하는 서비스
 *
 * <pre>
 * [판단 기준]
 *   긴급재난 / 위급재난 → 무조건 수집 (Gemini 호출 없음)
 *   안전안내            → Gemini로 뉴스 보도 가능성 판단
 *                         - 학교·병원·공항 등 중요 시설 화재
 *                         - 다중이용시설, 문화재 등 언론이 주목할 만한 장소
 *                         → true 면 수집, false 면 YouTube 수집 생략
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class YoutubeEligibilityService {

    private static final Set<String> URGENT_LEVELS = Set.of("긴급재난", "위급재난");

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    /**
     * 이 재난에 대해 YouTube 영상을 수집해야 하는지 판단합니다.
     *
     * @param alertLevel     긴급 단계 ("안전안내", "긴급재난", "위급재난")
     * @param disasterType   재난 유형 ("화재", "붕괴", "테러" 등)
     * @param messageContent 재난문자 원문
     * @param parsedAddress  파싱된 재난 발생 주소
     * @return YouTube 수집 대상이면 true
     */
    public boolean shouldCollectYoutube(String alertLevel, String disasterType,
                                        String messageContent, String parsedAddress) {
        // 긴급재난 / 위급재난 → 무조건 수집
        if (URGENT_LEVELS.contains(alertLevel)) {
            log.info("[YouTube 수집 판단] 긴급/위급 재난 → 수집 대상 - alertLevel={}", alertLevel);
            return true;
        }

        // 안전안내 → Gemini로 판단
        boolean eligible = askGemini(disasterType, messageContent, parsedAddress);
        log.info("[YouTube 수집 판단] 안전안내 Gemini 판단 결과={} - disasterType={}, address={}",
                eligible, disasterType, parsedAddress);
        return eligible;
    }

    // ─────────────────────────────────────────────────────────────
    // Gemini 판단 호출
    // ─────────────────────────────────────────────────────────────

    private boolean askGemini(String disasterType, String messageContent, String parsedAddress) {
        String prompt = """
                당신은 재난문자를 분석하여 해당 재난이 언론(뉴스/유튜브)에 보도될 가능성을 판단하는 전문가입니다.

                [판단 기준 — 다음 중 하나라도 해당되면 true]
                - 학교, 유치원, 어린이집, 대학교 등 교육 시설
                - 병원, 의원, 요양원 등 의료·복지 시설
                - 시청, 구청, 군청, 경찰서, 소방서 등 공공기관
                - 공항, 기차역, 지하철역, 버스터미널 등 교통 허브
                - 백화점, 대형마트, 쇼핑몰, 호텔, 숙박 시설
                - 공장, 물류창고, 위험물 취급 시설
                - 문화재, 사찰, 교회, 성당 등 종교·문화 시설
                - 대규모 아파트 단지 (100세대 이상으로 추정)
                - 피해 규모가 클 것으로 예상되는 경우 (대형, 연쇄, 확산 등 표현 포함)
                - 기타 다중이용시설 또는 사회적 관심이 높을 장소

                [출력 규칙]
                - 반드시 순수 JSON만 출력하세요 (마크다운 코드블록, 설명 텍스트 금지)
                - 형식: {"newsworthy": true} 또는 {"newsworthy": false}

                재난 유형: %s
                발생 주소: %s
                재난문자 원문: "%s"
                """.formatted(disasterType, parsedAddress, messageContent);

        try {
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", prompt)))
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.0,
                            "maxOutputTokens", 32
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    geminiApiUrl + "?key=" + geminiApiKey,
                    new HttpEntity<>(requestBody, headers),
                    String.class
            );

            if (response.getBody() == null) {
                log.warn("[YouTube 수집 판단] Gemini 응답 없음 → 기본값 false");
                return false;
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            String content = root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText("").trim();

            log.debug("[YouTube 수집 판단] Gemini 원본 응답: {}", content);

            // JSON 파싱: {"newsworthy": true/false}
            String json = extractJson(content);
            JsonNode result = objectMapper.readTree(json);
            return result.path("newsworthy").asBoolean(false);

        } catch (Exception e) {
            log.error("[YouTube 수집 판단] Gemini 호출 실패, 기본값 false 반환: {}", e.getMessage());
            return false;
        }
    }

    private String extractJson(String content) {
        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return content.substring(start, end + 1);
        }
        return content;
    }
}
