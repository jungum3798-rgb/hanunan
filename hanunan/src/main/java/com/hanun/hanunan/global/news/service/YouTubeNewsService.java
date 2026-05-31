package com.hanun.hanunan.global.news.service;

import com.hanun.hanunan.global.news.dto.YoutubeSearchResponse;
import com.hanun.hanunan.global.news.dto.YoutubeVideoDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class YouTubeNewsService {

    private static final String YOUTUBE_SEARCH_URL       = "https://www.googleapis.com/youtube/v3/search";
    private static final String YOUTUBE_WATCH_URL         = "https://www.youtube.com/watch?v=";
    private static final int    DISPLAY_COUNT              = 5;
    private static final long   PRE_DISASTER_WINDOW_MIN   = 30L; // 재난 발생 30분 전까지 소급 (네이버 뉴스와 동일)

    @Value("${youtube.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate;

    /**
     * 재난 유형 + 주소 기반으로 유튜브 최신 영상 최대 5건 반환
     * 재난 발생 시각 기준 30분 전 이후 업로드된 영상만 수집합니다.
     *
     * @param disasterType       재난 유형 (예: "화재", "붕괴")
     * @param parsedAddress      재난 발생 주소
     * @param disasterOccurredAt 재난 발생 시각 (이 시각 30분 전 이후 영상만 수집)
     */
    public List<YoutubeVideoDto> fetchLatestVideos(String disasterType, String parsedAddress,
                                                    LocalDateTime disasterOccurredAt) {
        try {
            String searchQuery = buildSearchQuery(disasterType, parsedAddress);

            // 재난 발생 30분 전 시각을 YouTube API의 publishedAfter 형식(RFC 3339)으로 변환
            String publishedAfter = toRfc3339(disasterOccurredAt.minusMinutes(PRE_DISASTER_WINDOW_MIN));

            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(YOUTUBE_SEARCH_URL)
                    .queryParam("part", "snippet")
                    .queryParam("q", searchQuery)
                    .queryParam("type", "video")
                    .queryParam("order", "date")
                    .queryParam("maxResults", DISPLAY_COUNT)
                    .queryParam("relevanceLanguage", "ko")
                    .queryParam("key", apiKey);

            if (publishedAfter != null) {
                builder.queryParam("publishedAfter", publishedAfter);
            }

            URI uri = builder.build().encode().toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            ResponseEntity<YoutubeSearchResponse> response = restTemplate.exchange(
                    uri, HttpMethod.GET, new HttpEntity<>(headers), YoutubeSearchResponse.class
            );

            YoutubeSearchResponse body = response.getBody();
            if (body == null || body.getItems() == null || body.getItems().isEmpty()) {
                log.warn("[YouTube] 검색 결과 없음 - 쿼리: {}", searchQuery);
                return Collections.emptyList();
            }

            log.info("[YouTube] 검색 완료 - 쿼리: {}, publishedAfter: {}, 결과: {}건",
                    searchQuery, publishedAfter, body.getItems().size());

            return body.getItems().stream()
                    .filter(item -> item.getId() != null && item.getId().getVideoId() != null)
                    .map(item -> {
                        YoutubeSearchResponse.YoutubeSnippet snippet = item.getSnippet();
                        String thumbnailUrl = resolveThumbnail(snippet);

                        return YoutubeVideoDto.builder()
                                .videoId(item.getId().getVideoId())
                                .url(YOUTUBE_WATCH_URL + item.getId().getVideoId())
                                .title(snippet != null ? snippet.getTitle() : "")
                                .channelTitle(snippet != null ? snippet.getChannelTitle() : "")
                                .thumbnailUrl(thumbnailUrl)
                                .publishedAt(snippet != null ? snippet.getPublishedAt() : null)
                                .build();
                    })
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("[YouTube] 검색 실패 - disasterType: {}, 오류: {}", disasterType, e.getMessage());
            return Collections.emptyList();
        }
    }

    // ─────────────────────────────────────────
    // 검색 쿼리 생성: "{재난유형} {지역} 뉴스"
    // 예) "화재 양주시 덕계동 뉴스"
    // ─────────────────────────────────────────
    private String buildSearchQuery(String disasterType, String parsedAddress) {
        String regionKeyword = extractRegionKeyword(parsedAddress);
        return disasterType + " " + regionKeyword + " 뉴스";
    }

    // ─────────────────────────────────────────
    // 주소에서 핵심 지역 키워드 추출 (NaverNewsService와 동일 로직)
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

    // LocalDateTime → RFC 3339 형식 변환 (YouTube API publishedAfter 파라미터 형식)
    // 예) 2025-07-21T07:21:00+09:00
    private String toRfc3339(LocalDateTime dateTime) {
        if (dateTime == null) return null;
        ZonedDateTime zoned = dateTime.atZone(ZoneId.of("Asia/Seoul"));
        return zoned.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }

    // medium 썸네일 우선, 없으면 default 사용
    private String resolveThumbnail(YoutubeSearchResponse.YoutubeSnippet snippet) {
        if (snippet == null || snippet.getThumbnails() == null) return null;
        YoutubeSearchResponse.YoutubeThumbnails thumbnails = snippet.getThumbnails();
        if (thumbnails.getMedium() != null && thumbnails.getMedium().getUrl() != null) {
            return thumbnails.getMedium().getUrl();
        }
        if (thumbnails.getDefaultThumbnail() != null) {
            return thumbnails.getDefaultThumbnail().getUrl();
        }
        return null;
    }
}
