package com.hanun.hanunan.domain.report.scheduler;

import com.hanun.hanunan.domain.report.entity.CitizenReport;
import com.hanun.hanunan.domain.report.repository.CitizenReportLikeRepository;
import com.hanun.hanunan.domain.report.repository.CitizenReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 시민 제보 만료 정리 스케줄러
 *
 * 10분마다 실행하여 작성 후 3시간이 지난 제보를 삭제합니다.
 * 삭제 순서:
 *   1. 연관 좋아요(CitizenReportLike) 삭제 — cascade 없으므로 직접 삭제
 *   2. 제보(CitizenReport) 삭제 — 이미지(CitizenReportImage)는 cascade 삭제
 *   3. 디스크 이미지 파일 삭제
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CitizenReportCleanupScheduler {

    private static final long EXPIRE_HOURS = 3;

    @Value("${app.upload.report-image-dir:uploads/reports}")
    private String reportImageDir;

    private final CitizenReportRepository     citizenReportRepository;
    private final CitizenReportLikeRepository citizenReportLikeRepository;

    @Transactional
    @Scheduled(fixedDelay = 10 * 60 * 1000, initialDelay = 60 * 1000) // 1분 후 첫 실행, 이후 10분 간격
    public void deleteExpiredReports() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(EXPIRE_HOURS);
        List<CitizenReport> expired = citizenReportRepository.findByCreatedAtBefore(threshold);

        if (expired.isEmpty()) {
            log.debug("[제보 정리] 만료된 제보 없음");
            return;
        }

        log.info("[제보 정리] 만료 제보 {}건 삭제 시작 (기준: {}시간 이전)", expired.size(), EXPIRE_HOURS);

        // 1. 연관 좋아요 삭제
        citizenReportLikeRepository.deleteAllByReportIn(expired);

        // 2. 디스크 이미지 파일 삭제 (DB 삭제 전에 경로 수집)
        expired.forEach(report -> report.getImages().forEach(image -> deleteImageFile(image.getStoredFileName())));

        // 3. 제보 삭제 (CitizenReportImage는 cascade로 함께 삭제)
        citizenReportRepository.deleteAll(expired);

        log.info("[제보 정리] 만료 제보 {}건 삭제 완료", expired.size());
    }

    private void deleteImageFile(String storedFileName) {
        if (storedFileName == null || storedFileName.isBlank()) return;
        File file = new File(reportImageDir, storedFileName);
        if (file.exists()) {
            if (file.delete()) {
                log.debug("[제보 정리] 이미지 파일 삭제 완료: {}", storedFileName);
            } else {
                log.warn("[제보 정리] 이미지 파일 삭제 실패: {}", file.getAbsolutePath());
            }
        }
    }
}
