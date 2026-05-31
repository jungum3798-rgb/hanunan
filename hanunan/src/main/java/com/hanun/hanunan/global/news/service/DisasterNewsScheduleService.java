package com.hanun.hanunan.global.news.service;

import com.hanun.hanunan.global.news.dto.NewsArticleDto;
import com.hanun.hanunan.global.news.dto.YoutubeVideoDto;
import com.hanun.hanunan.global.news.entity.DisasterNewsArticle;
import com.hanun.hanunan.global.news.entity.DisasterYoutubeVideo;
import com.hanun.hanunan.global.news.repository.DisasterNewsArticleRepository;
import com.hanun.hanunan.global.news.repository.DisasterYoutubeVideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 재난 발생 시 다단계 뉴스 모니터링 스케줄을 관리하는 공통 서비스
 *
 * <pre>
 * [안전안내]
 *   T+10m → Phase1(5분 간격 × 5회) → Phase2(15분 간격 × 4회) → Phase3(20분 간격 × 최대7회, 연속3회 빈 시 종료)
 *
 * [긴급재난 / 위급재난]
 *   위 일정 동일 + Phase3 종료 후 Phase4(60분 간격 × 최대12회, 연속3회 빈 시 종료)
 * </pre>
 *
 * <p>사용법: 각 재난 서비스에서 {@code startMonitoring()} 호출</p>
 * <pre>
 *   disasterNewsScheduleService.startMonitoring(savedId, "화재", parsedAddress, alertLevel);
 *   disasterNewsScheduleService.startMonitoring(savedId, "붕괴", parsedAddress, alertLevel);
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DisasterNewsScheduleService {

    // ── 페이즈별 상수 ──────────────────────────────────────────
    private static final long INITIAL_DELAY_SEC   = 10 * 60L;      // 10분 후 첫 수집
    private static final long PHASE1_INTERVAL_SEC = 5 * 60L;       // Phase1: 5분 간격
    private static final int  PHASE1_MAX_CALLS    = 5;
    private static final long PHASE2_INTERVAL_SEC = 15 * 60L;
    private static final int  PHASE2_MAX_CALLS    = 4;
    private static final long PHASE3_INTERVAL_SEC = 20 * 60L;
    private static final int  PHASE3_MAX_CALLS    = 7;
    private static final int  PHASE3_EMPTY_STOP   = 3;
    private static final long PHASE4_INTERVAL_SEC = 60 * 60L;
    private static final int  PHASE4_MAX_CALLS    = 12;
    private static final int  PHASE4_EMPTY_STOP   = 3;

    private static final Set<String> URGENT_LEVELS = Set.of("긴급재난", "위급재난");

    // ── 인메모리 모니터링 상태 ─────────────────────────────────
    // key: "disasterType:disasterId" (예: "화재:3", "붕괴:7")
    private final ConcurrentHashMap<String, MonitoringState> activeMonitors = new ConcurrentHashMap<>();

    private final TaskScheduler                   taskScheduler;
    private final NaverNewsService                naverNewsService;
    private final YouTubeNewsService              youTubeNewsService;
    private final YoutubeEligibilityService       youtubeEligibilityService;
    private final DisasterNewsArticleRepository   disasterNewsArticleRepository;
    private final DisasterYoutubeVideoRepository  disasterYoutubeVideoRepository;

    // ═══════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════

    /**
     * 재난 발생 시 뉴스 모니터링을 시작합니다.
     *
     * @param disasterId         재난 엔티티 PK
     * @param disasterType       재난 유형 ("화재", "붕괴", "테러", "폭발", "홍수", "산사태")
     * @param parsedAddress      재난 발생 주소
     * @param alertLevel         긴급 단계 ("안전안내", "긴급재난", "위급재난")
     * @param disasterOccurredAt 재난 발생 시각 (이 시각 이후 발행된 기사만 수집)
     * @param messageContent     재난문자 원문 (YouTube 수집 대상 여부 판단에 사용)
     */
    public void startMonitoring(Long disasterId, String disasterType, String parsedAddress,
                                String alertLevel, LocalDateTime disasterOccurredAt,
                                String messageContent) {
        // YouTube 수집 대상 여부: 긴급/위급 재난은 무조건, 안전안내는 Gemini로 판단
        boolean youtubeEnabled = youtubeEligibilityService.shouldCollectYoutube(
                alertLevel, disasterType, messageContent, parsedAddress);

        String key = monitorKey(disasterType, disasterId);
        MonitoringState state = new MonitoringState(
                disasterId, disasterType, parsedAddress, alertLevel, disasterOccurredAt, youtubeEnabled);
        activeMonitors.put(key, state);
        log.info("[뉴스 모니터링 시작] key={}, 주소={}, 긴급단계={}, YouTube수집={}, 발생시각={}",
                key, parsedAddress, alertLevel, youtubeEnabled, disasterOccurredAt);
        scheduleCall(key, INITIAL_DELAY_SEC);
    }

    // ═══════════════════════════════════════════════════════════
    // 내부 실행 로직
    // ═══════════════════════════════════════════════════════════

    private void execute(String key) {
        MonitoringState state = activeMonitors.get(key);
        if (state == null) {
            log.debug("[뉴스 모니터링] 이미 종료된 모니터 - key={}", key);
            return;
        }

        log.info("[뉴스 모니터링] Phase{} 실행 - key={}, callCount={}", state.phase, key, state.callCount + 1);

        // ── 뉴스 수집 ─────────────────────────────────────────
        List<NewsArticleDto> fetched;
        try {
            fetched = naverNewsService.fetchLatestNews(state.disasterType, state.parsedAddress);
        } catch (Exception e) {
            log.error("[뉴스 모니터링] 뉴스 수집 실패 - key={}, 오류={}", key, e.getMessage());
            fetched = List.of();
        }

        // ── 신규 기사 필터링 및 저장 ──────────────────────────
        int savedCount = 0;
        for (NewsArticleDto article : fetched) {
            if (article.getLink() == null || state.seenLinks.contains(article.getLink())) continue;

            // 재난 발생 시각 이전에 발행된 기사 제외
            if (!isPublishedAfterDisaster(article.getPubDate(), state.disasterOccurredAt)) {
                log.info("[뉴스 모니터링] 재난 발생 이전 기사 제외 - pubDate: {}", article.getPubDate());
                continue;
            }

            state.seenLinks.add(article.getLink());
            disasterNewsArticleRepository.save(DisasterNewsArticle.builder()
                    .disasterId(state.disasterId)
                    .disasterType(state.disasterType)
                    .title(article.getTitle())
                    .link(article.getLink())
                    .description(article.getDescription())
                    .pubDate(article.getPubDate())
                    .phase(state.phase)
                    .fetchedAt(LocalDateTime.now())
                    .build());
            savedCount++;
        }

        // ── 연속 빈 카운트 업데이트 ───────────────────────────
        if (savedCount == 0) {
            state.consecutiveEmpty++;
            log.info("[뉴스 모니터링] 신규 기사 없음 - key={}, 연속빈={}", key, state.consecutiveEmpty);
        } else {
            state.consecutiveEmpty = 0;
            log.info("[뉴스 모니터링] 신규 기사 {}건 저장 - key={}", savedCount, key);
        }

        state.callCount++;

        // ── Phase2 이상 + YouTube 수집 대상인 경우만 영상 수집 ──
        if (state.phase >= 2 && state.youtubeEnabled) {
            collectYoutubeVideos(state);
        }

        scheduleNext(state, key);
    }

    // ═══════════════════════════════════════════════════════════
    // YouTube 영상 수집 (Phase2 이상)
    // ═══════════════════════════════════════════════════════════

    private void collectYoutubeVideos(MonitoringState state) {
        List<YoutubeVideoDto> videos;
        try {
            videos = youTubeNewsService.fetchLatestVideos(state.disasterType, state.parsedAddress);
        } catch (Exception e) {
            log.error("[YouTube 수집] 실패 - disasterId={}, 오류={}", state.disasterId, e.getMessage());
            return;
        }

        int savedCount = 0;
        for (YoutubeVideoDto video : videos) {
            if (video.getVideoId() == null || state.seenVideoIds.contains(video.getVideoId())) continue;

            state.seenVideoIds.add(video.getVideoId());
            disasterYoutubeVideoRepository.save(DisasterYoutubeVideo.builder()
                    .disasterId(state.disasterId)
                    .disasterType(state.disasterType)
                    .videoId(video.getVideoId())
                    .title(video.getTitle())
                    .channelTitle(video.getChannelTitle())
                    .thumbnailUrl(video.getThumbnailUrl())
                    .publishedAt(video.getPublishedAt())
                    .phase(state.phase)
                    .fetchedAt(LocalDateTime.now())
                    .build());
            savedCount++;
        }

        if (savedCount > 0) {
            log.info("[YouTube 수집] 신규 영상 {}건 저장 - disasterId={}", savedCount, state.disasterId);
        } else {
            log.info("[YouTube 수집] 신규 영상 없음 - disasterId={}", state.disasterId);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 다음 호출 스케줄 결정
    // ═══════════════════════════════════════════════════════════

    private void scheduleNext(MonitoringState state, String key) {
        switch (state.phase) {
            case 1 -> {
                if (state.callCount < PHASE1_MAX_CALLS) {
                    scheduleCall(key, PHASE1_INTERVAL_SEC);
                } else {
                    transitionTo(state, key, 2, PHASE2_INTERVAL_SEC);
                }
            }
            case 2 -> {
                if (state.callCount < PHASE2_MAX_CALLS) {
                    scheduleCall(key, PHASE2_INTERVAL_SEC);
                } else {
                    transitionTo(state, key, 3, PHASE3_INTERVAL_SEC);
                }
            }
            case 3 -> {
                boolean maxReached     = state.callCount >= PHASE3_MAX_CALLS;
                boolean emptyTriggered = state.consecutiveEmpty >= PHASE3_EMPTY_STOP;

                if (maxReached || emptyTriggered) {
                    String reason = emptyTriggered ? "연속 빈 3회" : "최대 호출 도달";
                    if (URGENT_LEVELS.contains(state.alertLevel)) {
                        log.info("[뉴스 모니터링] Phase3 종료({}) → Phase4 전환 - key={}", reason, key);
                        transitionTo(state, key, 4, PHASE4_INTERVAL_SEC);
                    } else {
                        log.info("[뉴스 모니터링] 모니터링 종료({}) - key={}", reason, key);
                        activeMonitors.remove(key);
                    }
                } else {
                    scheduleCall(key, PHASE3_INTERVAL_SEC);
                }
            }
            case 4 -> {
                boolean maxReached     = state.callCount >= PHASE4_MAX_CALLS;
                boolean emptyTriggered = state.consecutiveEmpty >= PHASE4_EMPTY_STOP;

                if (maxReached || emptyTriggered) {
                    String reason = emptyTriggered ? "연속 빈 3회" : "최대 호출 도달";
                    log.info("[뉴스 모니터링] Phase4 종료({}) - key={}", reason, key);
                    activeMonitors.remove(key);
                } else {
                    scheduleCall(key, PHASE4_INTERVAL_SEC);
                }
            }
            default -> {
                log.error("[뉴스 모니터링] 알 수 없는 페이즈={} - key={}", state.phase, key);
                activeMonitors.remove(key);
            }
        }
    }

    private void transitionTo(MonitoringState state, String key, int nextPhase, long delaySeconds) {
        log.info("[뉴스 모니터링] Phase{} → Phase{} 전환 - key={}", state.phase, nextPhase, key);
        state.phase = nextPhase;
        state.callCount = 0;
        state.consecutiveEmpty = 0;
        scheduleCall(key, delaySeconds);
    }

    private void scheduleCall(String key, long delaySeconds) {
        taskScheduler.schedule(() -> execute(key), Instant.now().plusSeconds(delaySeconds));
        log.debug("[뉴스 모니터링] 다음 호출 예약 - key={}, {}초 후", key, delaySeconds);
    }

    private static String monitorKey(String disasterType, Long disasterId) {
        return disasterType + ":" + disasterId;
    }

    // 네이버 뉴스 pubDate 형식: "Mon, 21 Jul 2025 07:21:00 +0900"
    private static final DateTimeFormatter NAVER_DATE_FORMAT =
            DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.ENGLISH);

    /**
     * 기사 발행일이 수집 허용 범위 내인지 확인합니다.
     *
     * <p>재난문자는 실제 재난 발생 후 수분~수십분 뒤에 발송되는 경우가 많습니다.
     * (예: 화재 17:50 발생 → 재난문자 18:12 발송)
     * 이 경우 발생 시각 이전에 이미 보도된 기사가 누락될 수 있으므로,
     * 재난 발생 시각 기준 30분 전까지 소급하여 수집합니다.</p>
     *
     * pubDate 파싱 실패 시 안전하게 true 반환 (수집 허용)
     */
    private static final long PRE_DISASTER_WINDOW_MIN = 30L; // 재난 발생 30분 전까지 소급 수집

    private boolean isPublishedAfterDisaster(String pubDate, LocalDateTime disasterOccurredAt) {
        if (pubDate == null || pubDate.isBlank() || disasterOccurredAt == null) return true;
        try {
            ZonedDateTime articleTime = ZonedDateTime.parse(pubDate.trim(), NAVER_DATE_FORMAT);
            ZonedDateTime collectFrom = disasterOccurredAt
                    .minusMinutes(PRE_DISASTER_WINDOW_MIN)
                    .atZone(java.time.ZoneId.of("Asia/Seoul"));
            return !articleTime.isBefore(collectFrom);
        } catch (Exception e) {
            log.warn("[뉴스 모니터링] pubDate 파싱 실패, 수집 허용 - pubDate: {}", pubDate);
            return true;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 모니터링 상태 (재난별 인메모리)
    // ═══════════════════════════════════════════════════════════
    private static class MonitoringState {
        final long          disasterId;
        final String        disasterType;
        final String        parsedAddress;
        final String        alertLevel;
        final LocalDateTime disasterOccurredAt; // 재난 발생 시각 (이후 기사만 수집)
        final boolean       youtubeEnabled;     // YouTube 수집 대상 여부 (startMonitoring 시점 1회 판단)

        int phase            = 1;
        int callCount        = 0;
        int consecutiveEmpty = 0;

        final Set<String> seenLinks    = ConcurrentHashMap.newKeySet();
        final Set<String> seenVideoIds = ConcurrentHashMap.newKeySet();

        MonitoringState(long disasterId, String disasterType, String parsedAddress,
                        String alertLevel, LocalDateTime disasterOccurredAt, boolean youtubeEnabled) {
            this.disasterId         = disasterId;
            this.disasterType       = disasterType;
            this.parsedAddress      = parsedAddress;
            this.alertLevel         = alertLevel;
            this.disasterOccurredAt = disasterOccurredAt;
            this.youtubeEnabled     = youtubeEnabled;
        }
    }
}
