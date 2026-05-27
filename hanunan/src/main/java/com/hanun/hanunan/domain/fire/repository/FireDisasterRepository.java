package com.hanun.hanunan.domain.fire.repository;

import com.hanun.hanunan.domain.fire.entity.FireDisaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FireDisasterRepository extends JpaRepository<FireDisaster, Long> {
    boolean existsBySn(String sn);
    List<FireDisaster> findAllByOrderByCreatedAtDesc();
    List<FireDisaster> findAllBySnStartingWith(String prefix);
}
