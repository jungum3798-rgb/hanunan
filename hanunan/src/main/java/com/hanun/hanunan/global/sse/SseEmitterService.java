package com.hanun.hanunan.global.sse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanun.hanunan.domain.disaster.dto.DisasterAlertMarkerDto;
import com.hanun.hanunan.domain.fire.dto.FireMarkerDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class SseEmitterService {

    // 연결된 모든 클라이언트 관리 (key: 클라이언트 고유 ID)
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    /**
     * 클라이언트 SSE 구독 등록
     * - 연결 즉시 기존 마커 데이터 전송 (지도 초기 렌더링용)
     * - 이후 신규 재난 발생 시 broadcastFire / broadcastDisaster로 실시간 전송
     */
    public SseEmitter subscribe(List<FireMarkerDto> existingFireMarkers,
                                List<DisasterAlertMarkerDto> existingAlertMarkers) {
        String clientId = UUID.randomUUID().toString();

        // 30분 타임아웃 (끊기면 브라우저 EventSource가 자동 재연결)
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        emitters.put(clientId, emitter);
        log.info("SSE 클라이언트 연결: {}, 현재 연결 수: {}", clientId, emitters.size());

        // 연결 해제 시 emitter 제거
        emitter.onCompletion(() -> {
            emitters.remove(clientId);
            log.info("SSE 연결 종료: {}, 남은 연결 수: {}", clientId, emitters.size());
        });
        emitter.onTimeout(() -> {
            emitters.remove(clientId);
            log.info("SSE 타임아웃: {}", clientId);
        });
        emitter.onError(e -> {
            emitters.remove(clientId);
            log.warn("SSE 오류: {}", clientId);
        });

        // 연결 직후 기존 마커 전체 전송
        try {
            String initData = objectMapper.writeValueAsString(Map.of(
                    "fireMarkers", existingFireMarkers,
                    "disasterMarkers", existingAlertMarkers
            ));
            emitter.send(SseEmitter.event()
                    .name("init")
                    .data(initData));
            log.info("SSE 초기 데이터 전송 완료: {} (화재: {}건, 재난: {}건)",
                    clientId, existingFireMarkers.size(), existingAlertMarkers.size());
        } catch (IOException e) {
            log.error("SSE 초기 데이터 전송 실패: {}", e.getMessage());
            emitters.remove(clientId);
        }

        return emitter;
    }

    /**
     * 신규 화재·산불 마커 → 연결된 모든 클라이언트에 브로드캐스트
     */
    public void broadcastFire(FireMarkerDto dto) {
        broadcast("fire-marker", dto);
    }

    /**
     * 신규 재난알림(테러·붕괴·폭발·산사태) 마커 → 연결된 모든 클라이언트에 브로드캐스트
     */
    public void broadcastDisaster(DisasterAlertMarkerDto dto) {
        broadcast("disaster-marker", dto);
    }

    /**
     * 30초마다 heartbeat 전송 (프록시/방화벽의 유휴 연결 끊김 방지)
     */
    @Scheduled(fixedDelay = 30000)
    public void sendHeartbeat() {
        if (emitters.isEmpty()) return;
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event().name("heartbeat").data("ping"));
            } catch (Exception e) {
                emitters.remove(clientId);
            }
        });
        log.debug("SSE heartbeat 전송 완료, 연결 수: {}", emitters.size());
    }

    // ─────────────────────────────────────────
    // 내부 공통 브로드캐스트 로직
    // ─────────────────────────────────────────
    private void broadcast(String eventName, Object data) {
        if (emitters.isEmpty()) return;

        String json;
        try {
            json = objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            log.error("SSE 직렬화 실패: {}", e.getMessage());
            return;
        }

        log.info("SSE 브로드캐스트 [{}] → {}명", eventName, emitters.size());

        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(json));
            } catch (Exception e) {
                log.warn("SSE 전송 실패, 연결 제거: {}", clientId);
                emitters.remove(clientId);
                emitter.completeWithError(e);
            }
        });
    }
}
