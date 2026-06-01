package com.hanun.hanunan.domain.disaster.controller;

import com.hanun.hanunan.domain.disaster.dto.DisasterAlertMarkerDto;
import com.hanun.hanunan.domain.disaster.service.DisasterAlertService;
import com.hanun.hanunan.global.casualty.dto.CasualtyInfoDto;
import com.hanun.hanunan.global.evacuation.dto.EvacuationShelterResponse;
import com.hanun.hanunan.global.news.dto.NewsArticleDto;
import com.hanun.hanunan.global.news.dto.YoutubeVideoDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/disaster")
@RequiredArgsConstructor
public class DisasterAlertController {

    private final DisasterAlertService disasterAlertService;

    @GetMapping("/markers")
    public ResponseEntity<List<DisasterAlertMarkerDto>> getDisasterAlertMarkers() {
        return ResponseEntity.ok(disasterAlertService.getAllAlertMarkers());
    }

    // 특정 재난의 수집된 뉴스 조회
    // 예: GET /api/disaster/3/news?type=붕괴
    @GetMapping("/{id}/news")
    public ResponseEntity<List<NewsArticleDto>> getDisasterNews(
            @PathVariable Long id,
            @RequestParam String type) {
        return ResponseEntity.ok(disasterAlertService.getDisasterNews(id, type));
    }

    // 특정 재난의 유튜브 영상 조회 (Phase2 이후 수집된 최신 10건)
    // 예: GET /api/disaster/3/youtube?type=붕괴
    @GetMapping("/{id}/youtube")
    public ResponseEntity<List<YoutubeVideoDto>> getDisasterYoutubeVideos(
            @PathVariable Long id,
            @RequestParam String type) {
        return ResponseEntity.ok(disasterAlertService.getDisasterYoutubeVideos(id, type));
    }

    // 대피 키워드 감지 + 반경 내 대피소 조회
    // 예: GET /api/disaster/3/shelters?type=붕괴&lat=37.5665&lng=126.9780&radius=1000
    @GetMapping("/{id}/shelters")
    public ResponseEntity<?> getEvacuationShelters(
            @PathVariable Long id,
            @RequestParam String type,
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "1000") int radius) {
        try {
            EvacuationShelterResponse response =
                    disasterAlertService.getEvacuationShelters(id, type, lat, lng, radius);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 특정 재난의 피해 정보 조회 (사망자, 부상자, 재산피해, 발생원인, 수습현황)
    // 예: GET /api/disaster/3/casualty?type=붕괴
    @GetMapping("/{id}/casualty")
    public ResponseEntity<?> getDisasterCasualty(
            @PathVariable Long id,
            @RequestParam String type) {
        try {
            return disasterAlertService.getDisasterCasualty(id, type)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.noContent().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
