package com.hanun.hanunan.domain.fire.controller;

import com.hanun.hanunan.domain.fire.dto.FireMarkerDto;
import com.hanun.hanunan.domain.fire.service.FireDisasterService;
import com.hanun.hanunan.global.news.dto.NewsArticleDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fire")
@RequiredArgsConstructor
public class FireDisasterController {

    private final FireDisasterService fireDisasterService;

    // 지도에 표시할 화재 마커 목록 조회
    @GetMapping("/markers")
    public ResponseEntity<List<FireMarkerDto>> getFireMarkers() {
        return ResponseEntity.ok(fireDisasterService.getAllFireMarkers());
    }

    // 임의 재난문자로 전체 파이프라인 테스트
    @PostMapping("/test")
    public ResponseEntity<?> testMessage(@RequestBody Map<String, String> body) {
        try {
            String message = body.get("message");
            String rcptnRgnNm = body.getOrDefault("rcptnRgnNm", "");
            FireMarkerDto result = fireDisasterService.testProcessMessage(message, rcptnRgnNm);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 특정 화재에 대한 관련 뉴스 조회 (마커 클릭 시 호출)
    @GetMapping("/{id}/news")
    public ResponseEntity<?> getFireNews(@PathVariable Long id) {
        try {
            List<NewsArticleDto> news = fireDisasterService.getFireNews(id);
            return ResponseEntity.ok(news);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
