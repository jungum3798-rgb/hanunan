package com.hanun.hanunan.domain.disaster.repository;

import com.hanun.hanunan.domain.disaster.entity.DisasterAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisasterAlertRepository extends JpaRepository<DisasterAlert, Long> {
    boolean existsBySn(String sn);
    List<DisasterAlert> findAllByOrderByCreatedAtDesc();
}
