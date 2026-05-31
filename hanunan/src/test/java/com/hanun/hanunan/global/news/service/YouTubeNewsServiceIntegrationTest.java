package com.hanun.hanunan.global.news.service;

import com.hanun.hanunan.global.news.dto.YoutubeVideoDto;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * YouTube API 실제 호출 통합 테스트
 *
 * CI/자동 빌드에서는 실행되지 않도록 @Disabled 처리되어 있습니다.
 * 수동 테스트 시에만 @Disabled 주석 처리 후 실행하세요.
 *
 * 사전 조건: .env 파일에 YOUTUBE_API_KEY 설정 필요
 */
@Disabled("실제 YouTube API 호출 — 수동 테스트 시에만 활성화")
@SpringBootTest
@DisplayName("YouTubeNewsService 실제 API 통합 테스트")
class YouTubeNewsServiceIntegrationTest {

    @Autowired
    private YouTubeNewsService youTubeNewsService;

    @Test
    @DisplayName("화재 재난 — 실제 YouTube 영상 검색 결과 반환 확인")
    void 화재_실제_유튜브_검색() {
        // when
        List<YoutubeVideoDto> results = youTubeNewsService.fetchLatestVideos(
                "화재", "경기도 양주시 덕계동 466-18 인근", LocalDateTime.now().minusHours(1));

        // then
        System.out.println("\n========== YouTube 검색 결과 ==========");
        results.forEach(v -> {
            System.out.println("제목      : " + v.getTitle());
            System.out.println("채널      : " + v.getChannelTitle());
            System.out.println("URL       : " + v.getUrl());
            System.out.println("썸네일    : " + v.getThumbnailUrl());
            System.out.println("발행 시각 : " + v.getPublishedAt());
            System.out.println("----------------------------------------");
        });

        assertThat(results).isNotNull();
        assertThat(results).hasSizeLessThanOrEqualTo(5);
        results.forEach(v -> {
            assertThat(v.getVideoId()).isNotBlank();
            assertThat(v.getUrl()).startsWith("https://www.youtube.com/watch?v=");
            assertThat(v.getTitle()).isNotBlank();
        });
    }

    @Test
    @DisplayName("붕괴 재난 — 실제 YouTube 영상 검색 결과 반환 확인")
    void 붕괴_실제_유튜브_검색() {
        List<YoutubeVideoDto> results = youTubeNewsService.fetchLatestVideos(
                "붕괴", "서울특별시 중구 명동", LocalDateTime.now().minusHours(1));

        System.out.println("\n========== YouTube 검색 결과 (붕괴) ==========");
        results.forEach(v -> {
            System.out.println("제목: " + v.getTitle() + " | 채널: " + v.getChannelTitle());
            System.out.println("URL: " + v.getUrl());
        });

        assertThat(results).isNotNull();
    }

    @Test
    @DisplayName("결과 없는 쿼리 — 예외 없이 빈 리스트 반환")
    void 결과없는쿼리_빈리스트() {
        // 실제로 영상이 거의 없을 법한 특수한 주소
        List<YoutubeVideoDto> results = youTubeNewsService.fetchLatestVideos(
                "테러", "", LocalDateTime.now().minusHours(1));

        assertThat(results).isNotNull();
        System.out.println("결과 건수: " + results.size());
    }
}
