package com.hanun.hanunan.global.casualty.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanun.hanunan.global.casualty.dto.CasualtyInfoDto;
import com.hanun.hanunan.global.casualty.dto.GeminiCasualtyResult;
import com.hanun.hanunan.global.casualty.entity.DisasterCasualtyInfo;
import com.hanun.hanunan.global.casualty.repository.DisasterCasualtyInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CasualtyExtractionService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final ArticleCrawlerService articleCrawlerService;
    private final DisasterCasualtyInfoRepository casualtyInfoRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    // ─────────────────────────────────────────────────────────────
    // 외부 진입점: 뉴스 기사 저장 후 호출
    // ─────────────────────────────────────────────────────────────

    /**
     * 기사 정보를 분석하여 피해 정보를 추출하고 DB에 upsert합니다.
     *
     * 추출 우선순위:
     * 1차: naverLink(n.news.naver.com) 크롤링 → 본문 전체 Gemini 전달
     * 2차: 크롤링 실패 시 네이버 API title + description으로 Gemini 분석
     *
     * @param disasterId          재난 엔티티 PK
     * @param disasterType        재난 유형 ("화재", "붕괴", "테러", "폭발", "산사태")
     * @param crawlUrl            크롤링할 URL (naverLink 우선)
     * @param articleTitle        기사 제목 (네이버 API, fallback용)
     * @param articleDescription  기사 요약 스니펫 (네이버 API, fallback용)
     */
    public void extractAndSave(Long disasterId, String disasterType,
                                String crawlUrl, String articleTitle, String articleDescription) {
        try {
            GeminiCasualtyResult result = null;

            // 1차: naverLink 크롤링 → 본문 전체 Gemini 전달
            String crawled = articleCrawlerService.crawl(crawlUrl);
            if (crawled != null && !crawled.isBlank()) {
                log.info("[피해정보 추출] 크롤링 성공 - 길이: {}, url: {}", crawled.length(), crawlUrl);
                result = extractWithGemini(crawled, disasterType);
            } else {
                log.info("[피해정보 추출] 크롤링 실패, description fallback - url: {}", crawlUrl);
            }

            // 2차: 크롤링 실패 또는 추출 실패 시 title + description으로 fallback
            if (result == null || result.getSummary() == null || result.getSummary().isBlank()) {
                String fallbackText = buildArticleContext(articleTitle, articleDescription);
                if (!fallbackText.isBlank()) {
                    log.info("[피해정보 추출] description fallback 사용 - disasterId: {}", disasterId);
                    result = extractWithGemini(fallbackText, disasterType);
                }
            }

            if (result == null || result.getSummary() == null || result.getSummary().isBlank()) {
                log.info("[피해정보 추출] 추출 정보 없음 - disasterId: {}", disasterId);
                return;
            }

            // DB upsert
            upsert(disasterId, disasterType, result, crawlUrl);

        } catch (Exception e) {
            log.error("[피해정보 추출] 처리 실패 - disasterId: {}, 오류: {}", disasterId, e.getMessage());
        }
    }

    /** 네이버 API 제목 + description을 Gemini에 넘길 텍스트로 조합 */
    private String buildArticleContext(String title, String description) {
        StringBuilder sb = new StringBuilder();
        if (title != null && !title.isBlank()) sb.append("제목: ").append(title).append("\n");
        if (description != null && !description.isBlank()) sb.append("내용: ").append(description);
        return sb.toString().trim();
    }

    // ─────────────────────────────────────────────────────────────
    // 테스트용: DB 저장 없이 추출 결과만 반환
    // ─────────────────────────────────────────────────────────────

    /** url_context 방식으로 URL → 추출 결과 반환 (DB 저장 없음) */
    public Optional<CasualtyInfoDto> extractOnlyFromUrl(String articleUrl, String disasterType) {
        GeminiCasualtyResult result = extractFromUrl(articleUrl, disasterType);
        if (result == null || result.getSummary() == null || result.getSummary().isBlank()) return Optional.empty();

        return Optional.of(CasualtyInfoDto.builder()
                .deaths(result.getDeaths())
                .injuries(result.getInjuries())
                .propertyDamage(result.getPropertyDamage())
                .cause(result.getCause())
                .suppressionStatus(result.getSuppressionStatus())
                .summary(result.getSummary())
                .build());
    }

    /** 크롤링된 텍스트 직접 전달 (DB 저장 없음, fallback 테스트용) */
    public Optional<CasualtyInfoDto> extractOnly(String articleText, String disasterType) {
        GeminiCasualtyResult result = extractWithGemini(articleText, disasterType);
        if (result == null || result.getSummary() == null || result.getSummary().isBlank()) return Optional.empty();

        return Optional.of(CasualtyInfoDto.builder()
                .deaths(result.getDeaths())
                .injuries(result.getInjuries())
                .propertyDamage(result.getPropertyDamage())
                .cause(result.getCause())
                .suppressionStatus(result.getSuppressionStatus())
                .summary(result.getSummary())
                .build());
    }

    // ─────────────────────────────────────────────────────────────
    // 피해 정보 조회 (Controller → Service에서 호출)
    // ─────────────────────────────────────────────────────────────

    public Optional<CasualtyInfoDto> getCasualtyInfo(Long disasterId, String disasterType) {
        return casualtyInfoRepository
                .findByDisasterIdAndDisasterType(disasterId, disasterType)
                .map(info -> CasualtyInfoDto.builder()
                        .deaths(info.getDeaths())
                        .injuries(info.getInjuries())
                        .propertyDamage(info.getPropertyDamage())
                        .cause(info.getCause())
                        .suppressionStatus(info.getSuppressionStatus())
                        .summary(info.getSummary())
                        .sourceUrl(info.getSourceUrl())
                        .updatedAt(info.getUpdatedAt() != null ? info.getUpdatedAt().toString() : null)
                        .build());
    }

    // ─────────────────────────────────────────────────────────────
    // Gemini API 호출 (1차: url_context — Gemini가 직접 URL 읽기)
    // ─────────────────────────────────────────────────────────────

    private GeminiCasualtyResult extractFromUrl(String articleUrl, String disasterType) {
        String prompt = """
                다음 URL의 뉴스 기사를 읽고 재난(유형: %s) 관련 정보를 JSON 형식으로 추출해주세요.
                기사에 해당 정보가 없으면 null로 반환하세요.
                URL: %s

                [추출 항목]
                - deaths: 사망자 수 (숫자만, 없으면 null)
                - injuries: 부상자 수 (숫자만, 없으면 null)
                - property_damage: 재산피해 내용 (문자열, 없으면 null)
                - cause: 발생 원인 (문자열, 없으면 null)
                - suppression_status: 진압/수습 현황 (문자열, 없으면 null)
                - summary: 기사 내용 전체 요약 (2~3문장, 항상 작성)
                - has_info: summary가 작성되었으면 항상 true

                [출력 규칙]
                - 반드시 순수 JSON만 출력하세요 (마크다운 코드블록, 설명 텍스트 금지)
                - 줄바꿈 없이 한 줄로 출력하세요
                - 숫자 필드(deaths, injuries)는 반드시 숫자 또는 null
                """.formatted(disasterType, articleUrl);

        try {
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", prompt)))
                    ),
                    "tools", List.of(Map.of("url_context", Map.of())),
                    "generationConfig", Map.of(
                            "temperature", 0.1,
                            "maxOutputTokens", 512
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            String urlWithKey = geminiApiUrl + "?key=" + geminiApiKey;

            ResponseEntity<String> response = restTemplate.postForEntity(urlWithKey, entity, String.class);
            if (response.getBody() == null) return null;

            JsonNode root = objectMapper.readTree(response.getBody());
            log.debug("[피해정보 추출] Gemini url_context 전체 응답: {}", response.getBody());

            // url_context 사용 시 parts가 여러 개일 수 있으므로 text 필드가 있는 part를 찾음
            JsonNode parts = root.path("candidates").get(0).path("content").path("parts");
            String content = "";
            for (JsonNode part : parts) {
                String text = part.path("text").asText("").trim();
                if (!text.isBlank()) {
                    content = text;
                    break;
                }
            }

            log.info("[피해정보 추출] Gemini url_context 응답: {}", content);

            if (content.isBlank()) {
                log.warn("[피해정보 추출] url_context 응답 텍스트 없음 - parts 수: {}", parts.size());
                return null;
            }

            String json = extractJson(content);
            return objectMapper.readValue(json, GeminiCasualtyResult.class);

        } catch (Exception e) {
            log.error("[피해정보 추출] Gemini url_context 실패: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Gemini API 호출 (2차 fallback: 크롤링된 텍스트 직접 전달)
    // ─────────────────────────────────────────────────────────────

    private GeminiCasualtyResult extractWithGemini(String articleText, String disasterType) {
        String prompt = """
                다음은 재난(유형: %s) 관련 뉴스 기사입니다.
                아래 기사에서 다음 정보를 JSON 형식으로 추출해주세요.
                기사에 해당 정보가 없으면 null로 반환하세요.

                [추출 항목]
                - deaths: 사망자 수 (숫자만, 없으면 null)
                - injuries: 부상자 수 (숫자만, 없으면 null)
                - property_damage: 재산피해 내용 (문자열, 없으면 null)
                - cause: 발생 원인 (문자열, 없으면 null)
                - suppression_status: 진압/수습 현황 (문자열, 없으면 null)
                - summary: 기사 내용 전체 요약 (2~3문장, 항상 작성)
                - has_info: summary가 작성되었으면 항상 true

                [출력 규칙]
                - 반드시 순수 JSON만 출력하세요 (마크다운 코드블록, 설명 텍스트 금지)
                - 줄바꿈 없이 한 줄로 출력하세요
                - 숫자 필드(deaths, injuries)는 반드시 숫자 또는 null

                기사 내용:
                "%s"
                """.formatted(disasterType, articleText);

        try {
            // Gemini API 요청 바디 구성
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", prompt)))
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.1,
                            "maxOutputTokens", 512
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            String urlWithKey = geminiApiUrl + "?key=" + geminiApiKey;

            ResponseEntity<String> response = restTemplate.postForEntity(urlWithKey, entity, String.class);

            if (response.getBody() == null) return null;

            // 응답에서 텍스트 추출 (parts 순회)
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode parts = root.path("candidates").get(0).path("content").path("parts");
            String content = "";
            for (JsonNode part : parts) {
                String text = part.path("text").asText("").trim();
                if (!text.isBlank()) {
                    content = text;
                    break;
                }
            }

            log.info("[피해정보 추출] Gemini 응답: {}", content);

            if (content.isBlank()) return null;

            String json = extractJson(content);
            return objectMapper.readValue(json, GeminiCasualtyResult.class);

        } catch (Exception e) {
            log.error("[피해정보 추출] Gemini 호출 실패: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // DB upsert
    // ─────────────────────────────────────────────────────────────

    private void upsert(Long disasterId, String disasterType,
                        GeminiCasualtyResult result, String sourceUrl) {
        Optional<DisasterCasualtyInfo> existing =
                casualtyInfoRepository.findByDisasterIdAndDisasterType(disasterId, disasterType);

        // 새 요약을 기존 목록에 추가
        List<String> summaryList = buildSummaryList(
                existing.map(DisasterCasualtyInfo::getRawSummaries).orElse(null),
                result.getSummary());

        // 누적 요약들을 Gemini로 종합 요약
        String consolidatedSummary = consolidateSummaries(summaryList, disasterType);
        String rawSummariesJson = toJson(summaryList);

        if (existing.isPresent()) {
            existing.get().update(
                    result.getDeaths(),
                    result.getInjuries(),
                    result.getPropertyDamage(),
                    result.getCause(),
                    result.getSuppressionStatus(),
                    consolidatedSummary,
                    rawSummariesJson,
                    sourceUrl
            );
            casualtyInfoRepository.save(existing.get());
            log.info("[피해정보 추출] 업데이트 완료 - disasterId: {}, 누적 요약: {}건", disasterId, summaryList.size());
        } else {
            DisasterCasualtyInfo info = DisasterCasualtyInfo.builder()
                    .disasterId(disasterId)
                    .disasterType(disasterType)
                    .deaths(result.getDeaths())
                    .injuries(result.getInjuries())
                    .propertyDamage(result.getPropertyDamage())
                    .cause(result.getCause())
                    .suppressionStatus(result.getSuppressionStatus())
                    .summary(consolidatedSummary)
                    .rawSummaries(rawSummariesJson)
                    .sourceUrl(sourceUrl)
                    .updatedAt(LocalDateTime.now())
                    .build();
            casualtyInfoRepository.save(info);
            log.info("[피해정보 추출] 신규 저장 완료 - disasterId: {}", disasterId);
        }
    }

    // 기존 rawSummaries JSON + 새 요약 → List
    private List<String> buildSummaryList(String rawSummariesJson, String newSummary) {
        List<String> list = new ArrayList<>();
        if (rawSummariesJson != null && !rawSummariesJson.isBlank()) {
            try {
                list = objectMapper.readValue(rawSummariesJson, new TypeReference<List<String>>() {});
            } catch (Exception e) {
                log.warn("[피해정보 추출] rawSummaries 파싱 실패");
            }
        }
        if (newSummary != null && !newSummary.isBlank()) {
            list.add(newSummary);
        }
        return list;
    }

    // 누적된 요약들을 Gemini로 종합 요약
    private String consolidateSummaries(List<String> summaryList, String disasterType) {
        if (summaryList.isEmpty()) return null;
        if (summaryList.size() == 1) return summaryList.get(0); // 1개면 그대로 반환

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < summaryList.size(); i++) {
            sb.append((i + 1)).append(". ").append(summaryList.get(i)).append("\n");
        }

        String prompt = """
                다음은 같은 %s 사건에 대한 여러 뉴스 기사 요약들입니다.
                이를 종합하여 사건의 전체 경과를 2~3문장으로 최종 요약해주세요.
                최신 정보를 우선으로 반영하고, 중복 내용은 하나로 합쳐주세요.
                순수 텍스트만 출력하세요 (번호, 기호, 마크다운 금지).

                기사 요약 목록:
                %s
                """.formatted(disasterType, sb);

        try {
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", prompt)))
                    ),
                    "generationConfig", Map.of("temperature", 0.2, "maxOutputTokens", 256)
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    geminiApiUrl + "?key=" + geminiApiKey, entity, String.class);

            if (response.getBody() == null) return summaryList.get(summaryList.size() - 1);

            JsonNode root = objectMapper.readTree(response.getBody());
            String consolidated = root
                    .path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText().trim();

            log.info("[피해정보 추출] 종합 요약 완료 - {}개 요약 → 1개", summaryList.size());
            return consolidated;

        } catch (Exception e) {
            log.error("[피해정보 추출] 종합 요약 실패: {}", e.getMessage());
            return summaryList.get(summaryList.size() - 1); // 실패 시 가장 최신 요약 반환
        }
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
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
