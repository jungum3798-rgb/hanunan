package com.hanun.hanunan.domain.disaster.controller;

import com.hanun.hanunan.domain.disaster.dto.DisasterAlertMarkerDto;
import com.hanun.hanunan.domain.disaster.service.DisasterAlertService;
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
}
