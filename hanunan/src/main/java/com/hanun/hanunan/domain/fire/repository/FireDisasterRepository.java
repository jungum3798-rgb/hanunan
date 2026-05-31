package com.hanun.hanunan.domain.fire.repository;

import com.hanun.hanunan.domain.fire.entity.FireDisaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FireDisasterRepository extends JpaRepository<FireDisaster, Long> {
    boolean existsBySn(String sn);

    // 마커 표시용: 중복 문자 제외, 최신순
    List<FireDisaster> findByIsDuplicateFalseOrderByCreatedAtDesc();

    List<FireDisaster> findAllBySnStartingWith(String prefix);

    // 동일 화재 감지: 약 500m 이내(위경도 ±0.005°) + 2시간 이내 + 중복 아닌 화재 중 가장 오래된 것
    Optional<FireDisaster> findFirstByLatitudeBetweenAndLongitudeBetweenAndCreatedAtAfterAndIsDuplicateFalseOrderByCreatedAtAsc(
            double latMin, double latMax,
            double lonMin, double lonMax,
            LocalDateTime after
    );
}
