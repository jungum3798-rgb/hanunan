package com.hanun.hanunan.global.casualty.repository;

import com.hanun.hanunan.global.casualty.entity.DisasterCasualtyInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DisasterCasualtyInfoRepository extends JpaRepository<DisasterCasualtyInfo, Long> {

    Optional<DisasterCasualtyInfo> findByDisasterIdAndDisasterType(Long disasterId, String disasterType);
}
