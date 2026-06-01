package com.hanun.hanunan.domain.report.repository;

import com.hanun.hanunan.domain.report.entity.CitizenReport;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface CitizenReportRepository extends JpaRepository<CitizenReport, Long> {
    @EntityGraph(attributePaths = {"member", "images"})
    List<CitizenReport> findAllByOrderByCreatedAtDesc();

    // 만료 제보 조회: images까지 fetch (파일 삭제에 storedFileName 필요)
    @EntityGraph(attributePaths = {"images"})
    List<CitizenReport> findByCreatedAtBefore(LocalDateTime threshold);
}
