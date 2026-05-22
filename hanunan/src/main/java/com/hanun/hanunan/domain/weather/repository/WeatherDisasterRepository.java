package com.hanun.hanunan.domain.weather.repository;

import com.hanun.hanunan.domain.weather.entity.WeatherDisaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WeatherDisasterRepository extends JpaRepository<WeatherDisaster, Long> {
    boolean existsBySn(String sn);
    List<WeatherDisaster> findAllByOrderByCreatedAtDesc();
}
