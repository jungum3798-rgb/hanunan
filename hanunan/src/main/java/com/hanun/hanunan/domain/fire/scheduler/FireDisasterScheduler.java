package com.hanun.hanunan.domain.fire.scheduler;

import com.hanun.hanunan.domain.disaster.service.DisasterAlertService;
import com.hanun.hanunan.domain.fire.dto.DisasterApiItem;
import com.hanun.hanunan.domain.fire.service.FireDisasterService;
import com.hanun.hanunan.domain.weather.service.WeatherDisasterService;
import com.hanun.hanunan.global.client.DisasterApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class FireDisasterScheduler {

    private final DisasterApiClient disasterApiClient;
    private final FireDisasterService fireDisasterService;
    private final WeatherDisasterService weatherDisasterService;
    private final DisasterAlertService disasterAlertService;

    // 5분마다 실행 (서버 시작 후 1분 뒤 첫 실행)
    // API를 한 번만 호출한 뒤 각 파이프라인에 분배
    @Scheduled(initialDelay = 60000, fixedDelay = 300000)
    public void fetchAndDispatch() {
        log.info("스케줄러 실행: 재난문자 API 조회");
        List<DisasterApiItem> items = disasterApiClient.fetchAll();
        fireDisasterService.processItems(items);           // 화재·산불 → Groq 파싱 후 지도 핀
        weatherDisasterService.processWeatherItems(items); // 기상 14종 → RCPTN_RGN_NM 저장
        disasterAlertService.processItems(items);          // 테러·붕괴·폭발·산사태 → Groq 파싱 후 지도 핀
    }
}
