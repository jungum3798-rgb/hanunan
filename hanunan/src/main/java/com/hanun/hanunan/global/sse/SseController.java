package com.hanun.hanunan.global.sse;

import com.hanun.hanunan.domain.disaster.service.DisasterAlertService;
import com.hanun.hanunan.domain.fire.service.FireDisasterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/sse")
@RequiredArgsConstructor
public class SseController {

    private final SseEmitterService sseEmitterService;
    private final FireDisasterService fireDisasterService;
    private final DisasterAlertService disasterAlertService;

    /**
     * SSE 구독 엔드포인트
     *
     * 프론트에서 EventSource로 한 번 연결하면:
     *  1. 즉시 기존 화재·재난 마커 전체를 "init" 이벤트로 수신 (지도 초기 렌더링)
     *  2. 이후 신규 재난 발생 시 "fire-marker" / "disaster-marker" 이벤트를 실시간 수신
     *  3. 30초마다 "heartbeat" 이벤트 수신 (연결 유지용)
     *
     * 프론트 사용 예시:
     *   const es = new EventSource("http://localhost:8080/api/sse/subscribe");
     *   es.addEventListener("init", e => { ... });
     *   es.addEventListener("fire-marker", e => { ... });
     *   es.addEventListener("disaster-marker", e => { ... });
     */
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe() {
        return sseEmitterService.subscribe(
                fireDisasterService.getAllFireMarkers(),
                disasterAlertService.getAllAlertMarkers()
        );
    }
}
