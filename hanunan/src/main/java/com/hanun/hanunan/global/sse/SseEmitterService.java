package com.hanun.hanunan.global.sse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanun.hanunan.domain.disaster.dto.DisasterAlertMarkerDto;
import com.hanun.hanunan.domain.fire.dto.FireMarkerDto;
import com.hanun.hanunan.global.evacuation.dto.EvacuationShelterResponse;
import com.hanun.hanunan.global.evacuation.service.EvacuationService;
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

    private static class ClientInfo {
        final SseEmitter emitter;
        final Double lat;
        final Double lng;

        ClientInfo(SseEmitter emitter, Double lat, Double lng) {
            this.emitter = emitter;
            this.lat = lat;
            this.lng = lng;
        }
    }

    // 연결된 모든 클라이언트 관리 (key: 클라이언트 고유 ID)
    private final Map<String, ClientInfo> clients = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final EvacuationService evacuationService;

    /**
     * 클라이언트 SSE 구독 등록
     * - 연결 즉시 기존 마커 데이터 전송 (지도 초기 렌더링용)
     * - 이후 신규 재난 발생 시 broadcastFire / broadcastDisaster로 실시간 전송
     * - lat/lng가 제공된 클라이언트에는 대피 키워드 감지 시 evacuation-shelter 이벤트 push
     */
    public SseEmitter subscribe(List<FireMarkerDto> existingFireMarkers,
                                List<DisasterAlertMarkerDto> existingAlertMarkers,
                                Double lat, Double lng) {
        String clientId = UUID.randomUUID().toString();

        // 30분 타임아웃 (끊기면 브라우저 EventSource가 자동 재연결)
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        clients.put(clientId, new ClientInfo(emitter, lat, lng));
        log.info("SSE 클라이언트 연결: {}, lat={}, lng={}, 현재 연결 수: {}", clientId, lat, lng, clients.size());

        // 연결 해제 시 제거
        emitter.onCompletion(() -> {
            clients.remove(clientId);
            log.info("SSE 연결 종료: {}, 남은 연결 수: {}", clientId, clients.size());
        });
        emitter.onTimeout(() -> {
            clients.remove(clientId);
            log.info("SSE 타임아웃: {}", clientId);
        });
        emitter.onError(e -> {
            clients.remove(clientId);
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
            clients.remove(clientId);
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
     * 기존 화재 마커 알림 등급 변경 → 연결된 모든 클라이언트에 브로드캐스트
     * 프론트엔드는 id로 기존 마커를 찾아 alertLevel만 업데이트합니다.
     */
    public void broadcastFireUpdate(FireMarkerDto dto) {
        broadcast("fire-marker-update", dto);
    }

    /**
     * 신규 재난알림(테러·붕괴·폭발·산사태) 마커 → 연결된 모든 클라이언트에 브로드캐스트
     */
    public void broadcastDisaster(DisasterAlertMarkerDto dto) {
        broadcast("disaster-marker", dto);
    }

    /**
     * 재난문자에 대피 키워드가 있으면 각 클라이언트의 GPS 기준으로 evacuation-shelter 이벤트를 push.
     * GPS 미제공 클라이언트는 건너뜁니다.
     */
    public void broadcastEvacuationShelters(String disasterType, Long disasterId, String messageContent) {
        if (!evacuationService.isEvacuationRequired(messageContent)) {
            log.info("[대피소 SSE] 대피 키워드 없음 - type={}, id={}", disasterType, disasterId);
            return;
        }

        log.info("[대피소 SSE] 대피 키워드 감지 - type={}, id={}, 연결 수={}", disasterType, disasterId, clients.size());

        clients.forEach((clientId, info) -> {
            if (info.lat == null || info.lng == null) return;
            try {
                EvacuationShelterResponse response = evacuationService.getShelters(
                        disasterType, disasterId, messageContent, info.lat, info.lng, 1000);
                String json = objectMapper.writeValueAsString(response);
                info.emitter.send(SseEmitter.event().name("evacuation-shelter").data(json));
                log.info("[대피소 SSE] 전송 완료 - client={}, 대피소={}건", clientId, response.getShelters().size());
            } catch (Exception e) {
                log.warn("[대피소 SSE] 전송 실패, 연결 제거: {}", clientId);
                clients.remove(clientId);
                info.emitter.completeWithError(e);
            }
        });
    }

    /**
     * 30초마다 heartbeat 전송 (프록시/방화벽의 유휴 연결 끊김 방지)
     */
    @Scheduled(fixedDelay = 30000)
    public void sendHeartbeat() {
        if (clients.isEmpty()) return;
        clients.forEach((clientId, info) -> {
            try {
                info.emitter.send(SseEmitter.event().name("heartbeat").data("ping"));
            } catch (Exception e) {
                clients.remove(clientId);
            }
        });
        log.debug("SSE heartbeat 전송 완료, 연결 수: {}", clients.size());
    }

    // ─────────────────────────────────────────
    // 내부 공통 브로드캐스트 로직
    // ─────────────────────────────────────────
    private void broadcast(String eventName, Object data) {
        if (clients.isEmpty()) return;

        String json;
        try {
            json = objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            log.error("SSE 직렬화 실패: {}", e.getMessage());
            return;
        }

        log.info("SSE 브로드캐스트 [{}] → {}명", eventName, clients.size());

        clients.forEach((clientId, info) -> {
            try {
                info.emitter.send(SseEmitter.event().name(eventName).data(json));
            } catch (Exception e) {
                log.warn("SSE 전송 실패, 연결 제거: {}", clientId);
                clients.remove(clientId);
                info.emitter.completeWithError(e);
            }
        });
    }
}
