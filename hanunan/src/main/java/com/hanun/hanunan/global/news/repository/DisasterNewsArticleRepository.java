package com.hanun.hanunan.global.news.repository;

import com.hanun.hanunan.global.news.entity.DisasterNewsArticle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisasterNewsArticleRepository extends JpaRepository<DisasterNewsArticle, Long> {

    // 특정 재난의 뉴스 기사 조회 (수집 시각 최신순, 최대 10건)
    List<DisasterNewsArticle> findTop10ByDisasterIdAndDisasterTypeOrderByFetchedAtDesc(Long disasterId, String disasterType);

    // 링크 중복 체크
    boolean existsByDisasterIdAndDisasterTypeAndLink(Long disasterId, String disasterType, String link);
}
