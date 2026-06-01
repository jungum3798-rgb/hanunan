package com.hanun.hanunan.domain.weather.controller;

import com.hanun.hanunan.global.evacuation.dto.EvacuationShelterResponse;
import com.hanun.hanunan.domain.weather.dto.WeatherAlertDto;
import com.hanun.hanunan.domain.weather.dto.WeatherAlertsResponse;
import com.hanun.hanunan.domain.weather.service.WeatherDisasterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherDisasterController {

    private final WeatherDisasterService weatherDisasterService;

    // 사용자 GPS 기반 기상 재난문자 조회
    // 예: GET /api/weather/alerts?lat=37.5665&lng=126.9780
    @GetMapping("/alerts")
    public ResponseEntity<WeatherAlertsResponse> getAlerts(
            @RequestParam double lat,
            @RequestParam double lng) {
        return ResponseEntity.ok(weatherDisasterService.getAlertsByLocation(lat, lng));
    }

    // 대피 키워드 감지 + 반경 내 대피소 조회
    // 예: GET /api/weather/3/shelters?lat=37.5665&lng=126.9780&radius=1000
    @GetMapping("/{id}/shelters")
    public ResponseEntity<?> getEvacuationShelters(
            @PathVariable Long id,
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "1000") int radius) {
        try {
            EvacuationShelterResponse response =
                    weatherDisasterService.getEvacuationShelters(id, lat, lng, radius);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 테스트용: 임의 기상 재난문자 직접 저장
    @PostMapping("/test")
    public ResponseEntity<WeatherAlertDto> testSave(@RequestBody Map<String, String> body) {
        WeatherAlertDto result = weatherDisasterService.testSave(
                body.get("message"),
                body.get("rcptnRgnNm"),
                body.get("dstSeNm"),
                body.get("alertLevel")
        );
        return ResponseEntity.ok(result);
    }
}
