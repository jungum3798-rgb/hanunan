package com.hanun.hanunan.global.news.repository;

import com.hanun.hanunan.global.news.entity.DisasterYoutubeVideo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisasterYoutubeVideoRepository extends JpaRepository<DisasterYoutubeVideo, Long> {

    // 특정 재난의 유튜브 영상 조회 (수집 시각 최신순, 최대 10건)
    List<DisasterYoutubeVideo> findTop10ByDisasterIdAndDisasterTypeOrderByFetchedAtDesc(Long disasterId, String disasterType);

    // 영상 ID 중복 체크
    boolean existsByDisasterIdAndDisasterTypeAndVideoId(Long disasterId, String disasterType, String videoId);
}
