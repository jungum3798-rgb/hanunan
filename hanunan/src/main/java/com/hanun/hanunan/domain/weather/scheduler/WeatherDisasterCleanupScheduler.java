package com.hanun.hanunan.domain.weather.scheduler;

import com.hanun.hanunan.domain.weather.entity.WeatherDisaster;
import com.hanun.hanunan.domain.weather.repository.WeatherDisasterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 기상 재난문자 만료 정리 스케줄러
 *
 * 매일 새벽 2시에 실행하여 24시간이 지난 기상 재난문자를 삭제합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WeatherDisasterCleanupScheduler {

    private static final long EXPIRE_HOURS = 24;

    private final WeatherDisasterRepository weatherDisasterRepository;

    @Transactional
    @Scheduled(cron = "0 0 2 * * *") // 매일 새벽 2시
    public void deleteExpiredWeatherDisasters() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(EXPIRE_HOURS);
        List<WeatherDisaster> expired = weatherDisasterRepository.findByCreatedAtBefore(threshold);

        if (expired.isEmpty()) {
            log.debug("[기상 재난 정리] 만료된 기상 재난문자 없음");
            return;
        }

        weatherDisasterRepository.deleteAll(expired);
        log.info("[기상 재난 정리] 만료 기상 재난문자 {}건 삭제 완료 (기준: {}시간 이전)", expired.size(), EXPIRE_HOURS);
    }
}
