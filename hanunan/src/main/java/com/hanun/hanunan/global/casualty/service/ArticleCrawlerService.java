package com.hanun.hanunan.global.casualty.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArticleCrawlerService {

    private static final int MAX_TEXT_LENGTH = 4000;

    private final RestTemplate restTemplate;

    /**
     * 기사 URL의 전체 텍스트를 가져옵니다.
     * HTML 태그를 제거하고 최대 4000자로 자릅니다.
     *
     * @param url 기사 URL
     * @return 정제된 텍스트, 실패 시 null
     */
    public String crawl(String url) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                    "AppleWebKit/537.36 (KHTML, like Gecko) " +
                    "Chrome/120.0.0.0 Safari/537.36");
            headers.set("Accept", "text/html,application/xhtml+xml");
            headers.set("Accept-Language", "ko-KR,ko;q=0.9");

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String.class);

            String html = response.getBody();
            if (html == null || html.isBlank()) {
                log.warn("[크롤러] 빈 응답 - URL: {}", url);
                return null;
            }

            String text = extractText(html);
            log.info("[크롤러] 텍스트 추출 완료 - URL: {}, 길이: {}", url, text.length());
            return text;

        } catch (Exception e) {
            log.warn("[크롤러] 크롤링 실패 - URL: {}, 오류: {}", url, e.getMessage());
            return null;
        }
    }

    private String extractText(String html) {
        String text = html
                .replaceAll("(?i)<script[^>]*>[\\s\\S]*?</script>", " ")
                .replaceAll("(?i)<style[^>]*>[\\s\\S]*?</style>", " ")
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replaceAll("\\s+", " ")
                .trim();

        return text.length() > MAX_TEXT_LENGTH
                ? text.substring(0, MAX_TEXT_LENGTH)
                : text;
    }
}
