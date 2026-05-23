package com.hanun.hanunan.global.news.service;

import com.hanun.hanunan.global.news.dto.NaverNewsResponse;
import com.hanun.hanunan.global.news.dto.NewsArticleDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NaverNewsService {

    @Value("${naver.news.client-id}")
    private String clientId;

    @Value("${naver.news.client-secret}")
    private String clientSecret;

    @Value("${naver.news.url:https://openapi.naver.com/v1/search/news.json}")
    private String naverNewsUrl;

    private static final int DISPLAY_COUNT = 5;

    private final RestTemplate restTemplate;

    /**
     * 재난 주소로 관련 뉴스 최신 5건을 반환
     *
     * @param disasterType 재난 유형 (예: "화재", "붕괴", "테러")
     * @param parsedAddress 재난 발생 주소
     */
    public List<NewsArticleDto> fetchLatestNews(String disasterType, String parsedAddress) {
        List<NaverNewsResponse.NaverNewsItem> rawItems = fetchNaverNews(disasterType, parsedAddress, DISPLAY_COUNT);
        if (rawItems.isEmpty()) {
            return Collections.emptyList();
        }

        return rawItems.stream()
                .map(item -> {
                    String link = (item.getOriginallink() != null && !item.getOriginallink().isBlank())
                            ? item.getOriginallink()
                            : item.getLink();

                    return NewsArticleDto.builder()
                            .title(stripHtml(item.getTitle()))
                            .link(link)
                            .description(stripHtml(item.getDescription()))
                            .pubDate(item.getPubDate())
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────
    // 네이버 뉴스 검색 API 호출
    // 쿼리: "{재난유형} {지역명}" (예: "화재 양주시 덕계동")
    // ─────────────────────────────────────────
    private List<NaverNewsResponse.NaverNewsItem> fetchNaverNews(String disasterType, String address, int displayCount) {
        try {
            String searchQuery = disasterType + " " + extractRegionKeyword(address);

            URI uri = UriComponentsBuilder.fromHttpUrl(naverNewsUrl)
                    .queryParam("query", searchQuery)
                    .queryParam("display", displayCount)
                    .queryParam("sort", "date")
                    .build()
                    .encode()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Naver-Client-Id", clientId);
            headers.set("X-Naver-Client-Secret", clientSecret);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<NaverNewsResponse> response = restTemplate.exchange(
                    uri, HttpMethod.GET, entity, NaverNewsResponse.class
            );

            NaverNewsResponse body = response.getBody();
            if (body == null || body.getItems() == null) {
                log.warn("네이버 뉴스 결과 없음 - 쿼리: {}", searchQuery);
                return Collections.emptyList();
            }

            log.info("네이버 뉴스 검색 완료 - 쿼리: {}, 결과: {}건", searchQuery, body.getItems().size());
            return body.getItems();

        } catch (Exception e) {
            log.error("네이버 뉴스 검색 실패: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // ─────────────────────────────────────────
    // 주소에서 핵심 지역 키워드 추출
    // 예) "경기도 양주시 덕계동 466-18 인근" → "양주시 덕계동"
    // ─────────────────────────────────────────
    private String extractRegionKeyword(String address) {
        if (address == null || address.isBlank()) return "";

        String[] tokens = address.split(" ");
        StringBuilder keyword = new StringBuilder();
        for (String token : tokens) {
            if (token.matches(".*\\d+.*") || token.equals("인근") || token.equals("일대") || token.equals("부근")) {
                break;
            }
            if (!keyword.isEmpty()) keyword.append(" ");
            keyword.append(token);
        }

        String result = keyword.toString().trim();
        String[] parts = result.split(" ");
        if (parts.length > 2) {
            result = parts[parts.length - 2] + " " + parts[parts.length - 1];
        }
        return result;
    }

    // HTML 태그 및 엔티티 제거
    private String stripHtml(String html) {
        if (html == null) return "";
        return html
                .replaceAll("<[^>]*>", "")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&apos;", "'")
                .replace("&#39;", "'")
                .trim();
    }
}
