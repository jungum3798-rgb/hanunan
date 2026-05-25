package com.hanun.hanunan.global.casualty.controller;

import com.hanun.hanunan.global.casualty.dto.CasualtyInfoDto;
import com.hanun.hanunan.global.casualty.repository.DisasterCasualtyInfoRepository;
import com.hanun.hanunan.global.casualty.service.ArticleCrawlerService;
import com.hanun.hanunan.global.casualty.service.CasualtyExtractionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * 크롤링/Gemini 추출 테스트용 컨트롤러 (개발 환경 전용)
 */
@Slf4j
@Profile("!prod")
@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class CasualtyTestController {

    private final ArticleCrawlerService articleCrawlerService;
    private final CasualtyExtractionService casualtyExtractionService;
    private final DisasterCasualtyInfoRepository casualtyInfoRepository;

    /**
     * 기사 URL 크롤링 결과 확인
     * POST /api/test/crawl
     * Body: { "url": "https://..." }
     */
    @PostMapping("/crawl")
    public ResponseEntity<?> testCrawl(@RequestBody Map<String, String> body) {
        String url = body.get("url");
        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body("url 파라미터가 필요합니다.");
        }

        String result = articleCrawlerService.crawl(url);
        if (result == null) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "크롤링 실패 - 로그를 확인하세요."
            ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "length", result.length(),
                "preview", result.substring(0, Math.min(500, result.length())),
                "full", result
        ));
    }

    /**
     * 크롤링 → Gemini 추출 전체 파이프라인 테스트
     * POST /api/test/extract
     * Body: {
     *   "url": "https://...",
     *   "disasterType": "화재"   // 화재, 붕괴, 테러, 폭발, 산사태
     * }
     */
    @PostMapping("/extract")
    public ResponseEntity<?> testExtract(@RequestBody Map<String, String> body) {
        String url = body.get("url");
        String disasterType = body.getOrDefault("disasterType", "화재");

        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body("url 파라미터가 필요합니다.");
        }

        // 1. 크롤링
        String articleText = articleCrawlerService.crawl(url);
        if (articleText == null) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "step", "crawl",
                    "message", "크롤링 실패 - 로그를 확인하세요."
            ));
        }

        // 2. Gemini 추출 (disasterId=-1로 DB 저장 없이 결과만 반환)
        Optional<CasualtyInfoDto> result = casualtyExtractionService.extractOnly(articleText, disasterType);

        if (result.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "step", "extract",
                    "message", "추출된 피해 정보 없음 (기사에 관련 내용이 없거나 Gemini 호출 실패)",
                    "crawledText", articleText
            ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "crawledLength", articleText.length(),
                "extracted", result.get()
        ));
    }

    /**
     * Gemini url_context 방식 단독 테스트 (DB 저장 없음)
     * POST /api/test/extract-url
     * Body: {
     *   "url": "https://...",
     *   "disasterType": "화재"
     * }
     */
    @PostMapping("/extract-url")
    public ResponseEntity<?> testExtractFromUrl(@RequestBody Map<String, String> body) {
        String url = body.get("url");
        String disasterType = body.getOrDefault("disasterType", "화재");

        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body("url 파라미터가 필요합니다.");
        }

        Optional<CasualtyInfoDto> result = casualtyExtractionService.extractOnlyFromUrl(url, disasterType);

        if (result.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "url_context 추출 실패 - 서버 로그 확인"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "extracted", result.get()
        ));
    }

    /**
     * extractAndSave 전체 파이프라인 테스트 (DB 저장까지 포함)
     * POST /api/test/extract-save
     * Body: {
     *   "disasterId": "7",
     *   "disasterType": "화재",
     *   "url": "https://...",
     *   "title": "기사 제목 (선택)",
     *   "description": "기사 요약 스니펫 (선택)"
     * }
     */
    @PostMapping("/extract-save")
    public ResponseEntity<?> testExtractAndSave(@RequestBody Map<String, String> body) {
        String url           = body.get("url");
        String disasterType  = body.getOrDefault("disasterType", "화재");
        String disasterIdStr = body.get("disasterId");
        String title         = body.getOrDefault("title", "");
        String description   = body.getOrDefault("description", "");

        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body("url 파라미터가 필요합니다.");
        }
        if (disasterIdStr == null) {
            return ResponseEntity.badRequest().body("disasterId 파라미터가 필요합니다.");
        }

        long disasterId;
        try {
            disasterId = Long.parseLong(disasterIdStr);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("disasterId는 숫자여야 합니다.");
        }

        log.info("[테스트] extractAndSave 직접 호출 - disasterId={}, type={}, url={}", disasterId, disasterType, url);

        // extractAndSave 호출 (title+description → Gemini → DB upsert)
        casualtyExtractionService.extractAndSave(disasterId, disasterType, url, title, description);

        // DB에서 저장 결과 조회
        return casualtyInfoRepository
                .findByDisasterIdAndDisasterType(disasterId, disasterType)
                .map(info -> ResponseEntity.ok((Object) Map.of(
                        "success", true,
                        "saved", Map.of(
                                "deaths",            info.getDeaths()            != null ? info.getDeaths()            : "null",
                                "injuries",          info.getInjuries()          != null ? info.getInjuries()          : "null",
                                "summary",           info.getSummary()           != null ? info.getSummary()           : "null",
                                "cause",             info.getCause()             != null ? info.getCause()             : "null",
                                "propertyDamage",    info.getPropertyDamage()    != null ? info.getPropertyDamage()    : "null",
                                "suppressionStatus", info.getSuppressionStatus() != null ? info.getSuppressionStatus() : "null",
                                "updatedAt",         info.getUpdatedAt()         != null ? info.getUpdatedAt().toString() : "null"
                        )
                )))
                .orElse(ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "DB 저장 없음 - 서버 로그에서 [피해정보 추출] 확인"
                )));
    }
}
