package com.hanun.hanunan.global.news.service;

import com.hanun.hanunan.global.news.dto.YoutubeSearchResponse;
import com.hanun.hanunan.global.news.dto.YoutubeVideoDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("YouTubeNewsService 단위 테스트")
class YouTubeNewsServiceTest {

    @InjectMocks
    private YouTubeNewsService youTubeNewsService;

    @Mock
    private RestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(youTubeNewsService, "apiKey", "TEST_API_KEY");
    }

    // ─────────────────────────────────────────────────────────────
    // 정상 응답 파싱 검증
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("YouTube API 정상 응답 시 YoutubeVideoDto 리스트 반환")
    void fetchLatestVideos_정상응답_반환() {
        // given
        YoutubeSearchResponse mockResponse = buildMockResponse();
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class),
                eq(YoutubeSearchResponse.class)))
                .thenReturn(ResponseEntity.ok(mockResponse));

        // when
        List<YoutubeVideoDto> result = youTubeNewsService.fetchLatestVideos("화재", "경기도 양주시 덕계동 466-18 인근");

        // then
        assertThat(result).hasSize(2);

        YoutubeVideoDto first = result.get(0);
        assertThat(first.getVideoId()).isEqualTo("video123");
        assertThat(first.getUrl()).isEqualTo("https://www.youtube.com/watch?v=video123");
        assertThat(first.getTitle()).isEqualTo("양주시 덕계동 화재 현장 뉴스");
        assertThat(first.getChannelTitle()).isEqualTo("뉴스채널A");
        assertThat(first.getThumbnailUrl()).isEqualTo("https://i.ytimg.com/vi/video123/mqdefault.jpg");
        assertThat(first.getPublishedAt()).isEqualTo("2025-07-21T07:21:00Z");
    }

    @Test
    @DisplayName("검색 쿼리가 '{재난유형} {지역} 뉴스' 형식으로 생성됨")
    void fetchLatestVideos_검색쿼리_형식검증() {
        // given
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class),
                eq(YoutubeSearchResponse.class)))
                .thenReturn(ResponseEntity.ok(buildMockResponse()));

        // when
        youTubeNewsService.fetchLatestVideos("화재", "경기도 양주시 덕계동 466-18 인근");

        // then: URI에 쿼리 파라미터 포함 여부 확인
        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).exchange(uriCaptor.capture(), eq(HttpMethod.GET),
                any(HttpEntity.class), eq(YoutubeSearchResponse.class));

        String uriString = uriCaptor.getValue().toString();
        assertThat(uriString).contains("q=");           // 검색어 파라미터 포함
        assertThat(uriString).contains("type=video");   // 영상 타입 필터
        assertThat(uriString).contains("order=date");   // 최신순 정렬
        assertThat(uriString).contains("part=snippet"); // snippet 요청
    }

    @Test
    @DisplayName("주소에서 핵심 지역 키워드만 추출 — 번지수·인근 제거")
    void fetchLatestVideos_지역키워드_추출() {
        // given
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class),
                eq(YoutubeSearchResponse.class)))
                .thenReturn(ResponseEntity.ok(buildMockResponse()));

        // when
        youTubeNewsService.fetchLatestVideos("화재", "경기도 양주시 덕계동 466-18 인근");

        // then: URI에 핵심 지역('양주시', '덕계동')이 포함되고 번지수는 없어야 함
        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).exchange(uriCaptor.capture(), any(HttpMethod.class),
                any(HttpEntity.class), eq(YoutubeSearchResponse.class));

        String uriString = uriCaptor.getValue().toString();
        assertThat(uriString).contains("%EC%96%91%EC%A3%BC%EC%8B%9C"); // "양주시" URL 인코딩
        assertThat(uriString).doesNotContain("466");
        assertThat(uriString).doesNotContain("%EC%9D%B8%EA%B7%BC");  // "인근" URL 인코딩
    }

    // ─────────────────────────────────────────────────────────────
    // 예외/엣지 케이스 검증
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("API 응답 body가 null이면 빈 리스트 반환")
    void fetchLatestVideos_응답body_null_빈리스트() {
        // given
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class),
                eq(YoutubeSearchResponse.class)))
                .thenReturn(ResponseEntity.ok(null));

        // when
        List<YoutubeVideoDto> result = youTubeNewsService.fetchLatestVideos("화재", "양주시 덕계동");

        // then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("API 응답 items가 빈 리스트이면 빈 리스트 반환")
    void fetchLatestVideos_빈결과_빈리스트() {
        // given
        YoutubeSearchResponse emptyResponse = new YoutubeSearchResponse();
        emptyResponse.setItems(List.of());
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class),
                eq(YoutubeSearchResponse.class)))
                .thenReturn(ResponseEntity.ok(emptyResponse));

        // when
        List<YoutubeVideoDto> result = youTubeNewsService.fetchLatestVideos("화재", "양주시 덕계동");

        // then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("RestTemplate 예외 발생 시 빈 리스트 반환 (서비스 중단 없음)")
    void fetchLatestVideos_API예외_빈리스트() {
        // given
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class),
                eq(YoutubeSearchResponse.class)))
                .thenThrow(new RuntimeException("API 호출 실패"));

        // when
        List<YoutubeVideoDto> result = youTubeNewsService.fetchLatestVideos("화재", "양주시 덕계동");

        // then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("videoId가 null인 항목은 결과에서 제외됨")
    void fetchLatestVideos_videoId_null_항목제외() {
        // given: 첫 번째 항목은 videoId null, 두 번째는 정상
        YoutubeSearchResponse response = new YoutubeSearchResponse();

        YoutubeSearchResponse.YoutubeItem nullIdItem = new YoutubeSearchResponse.YoutubeItem();
        nullIdItem.setId(null);

        YoutubeSearchResponse.YoutubeItem validItem = buildItem("valid_id", "정상 영상", "채널B");

        response.setItems(List.of(nullIdItem, validItem));

        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class),
                eq(YoutubeSearchResponse.class)))
                .thenReturn(ResponseEntity.ok(response));

        // when
        List<YoutubeVideoDto> result = youTubeNewsService.fetchLatestVideos("화재", "양주시");

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getVideoId()).isEqualTo("valid_id");
    }

    // ─────────────────────────────────────────────────────────────
    // 헬퍼 메서드
    // ─────────────────────────────────────────────────────────────

    private YoutubeSearchResponse buildMockResponse() {
        YoutubeSearchResponse response = new YoutubeSearchResponse();
        response.setItems(List.of(
                buildItem("video123", "양주시 덕계동 화재 현장 뉴스", "뉴스채널A"),
                buildItem("video456", "양주 화재 피해 현황", "KBS뉴스")
        ));
        return response;
    }

    private YoutubeSearchResponse.YoutubeItem buildItem(String videoId, String title, String channelTitle) {
        YoutubeSearchResponse.YoutubeItem item = new YoutubeSearchResponse.YoutubeItem();

        YoutubeSearchResponse.YoutubeItemId id = new YoutubeSearchResponse.YoutubeItemId();
        id.setVideoId(videoId);
        item.setId(id);

        YoutubeSearchResponse.YoutubeSnippet snippet = new YoutubeSearchResponse.YoutubeSnippet();
        snippet.setTitle(title);
        snippet.setChannelTitle(channelTitle);
        snippet.setPublishedAt("2025-07-21T07:21:00Z");

        YoutubeSearchResponse.YoutubeThumbnails thumbnails = new YoutubeSearchResponse.YoutubeThumbnails();
        YoutubeSearchResponse.YoutubeThumbnail medium = new YoutubeSearchResponse.YoutubeThumbnail();
        medium.setUrl("https://i.ytimg.com/vi/" + videoId + "/mqdefault.jpg");
        thumbnails.setMedium(medium);
        snippet.setThumbnails(thumbnails);

        item.setSnippet(snippet);
        return item;
    }
}
