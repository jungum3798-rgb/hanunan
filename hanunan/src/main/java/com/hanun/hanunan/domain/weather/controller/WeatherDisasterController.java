package com.hanun.hanunan.domain.weather.controller;

import com.hanun.hanunan.domain.weather.dto.RegionDto;
import com.hanun.hanunan.domain.weather.dto.WeatherAlertDto;
import com.hanun.hanunan.domain.weather.service.WeatherDisasterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherDisasterController {

    private final WeatherDisasterService weatherDisasterService;

    // 사용자 GPS 기반 기상 재난문자 조회
    // 예: GET /api/weather/alerts?lat=37.5665&lng=126.9780
    @GetMapping("/alerts")
    public ResponseEntity<List<WeatherAlertDto>> getAlerts(
            @RequestParam double lat,
            @RequestParam double lng) {
        return ResponseEntity.ok(weatherDisasterService.getAlertsByLocation(lat, lng));
    }

    // 사용자 GPS 기반 지역명 조회
    // 예: GET /api/weather/location?lat=37.5665&lng=126.9780
    @GetMapping("/location")
    public ResponseEntity<RegionDto> getLocation(
            @RequestParam double lat,
            @RequestParam double lng) {
        return ResponseEntity.ok(weatherDisasterService.getRegionByLocation(lat, lng));
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
