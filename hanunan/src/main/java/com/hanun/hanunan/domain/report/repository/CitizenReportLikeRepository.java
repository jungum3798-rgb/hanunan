package com.hanun.hanunan.domain.report.repository;

import com.hanun.hanunan.domain.report.entity.CitizenReport;
import com.hanun.hanunan.domain.report.entity.CitizenReportLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CitizenReportLikeRepository extends JpaRepository<CitizenReportLike, Long> {
    Optional<CitizenReportLike> findByMemberIdAndReportId(Long memberId, Long reportId);
    boolean existsByMemberIdAndReportId(Long memberId, Long reportId);
    List<CitizenReportLike> findAllByMemberId(Long memberId);

    // 만료 제보 삭제 시 연관 좋아요 일괄 삭제 (CitizenReport에 cascade 없으므로 직접 삭제)
    void deleteAllByReportIn(List<CitizenReport> reports);
}
