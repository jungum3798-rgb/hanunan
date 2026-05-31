package com.hanun.hanunan.domain.fire.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fire_disaster")
@Builder
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class FireDisaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String sn; // 재난문자 일련번호

    @Column(columnDefinition = "TEXT")
    private String messageContent; // 재난문자 본문

    private String rcptnRgnNm; // 수신지역명

    private String alertLevel; // 긴급단계 (안전안내, 긴급재난, 위급재난)

    private String parsedAddress; // Groq + RCPTN_RGN_NM 결합 주소

    private Double latitude;
    private Double longitude;

    private LocalDateTime createdAt;

    // 동일 화재에 대한 중복 재난문자 여부
    // true: 이미 등록된 화재의 후속 문자 → 마커 미표시, 뉴스·유튜브 수집은 기존 화재에 귀속
    @Column(nullable = false)
    @Builder.Default
    private boolean isDuplicate = false;

    // 알림 등급 우선순위: 안전안내(1) < 긴급재난(2) < 위급재난(3)
    private static final java.util.Map<String, Integer> ALERT_PRIORITY = java.util.Map.of(
            "안전안내", 1,
            "긴급재난", 2,
            "위급재난", 3
    );

    /**
     * 후속 재난문자의 알림 등급이 더 높을 경우에만 업그레이드합니다.
     * @return 등급이 실제로 변경되었으면 true
     */
    public boolean upgradeAlertLevel(String newAlertLevel) {
        int current = ALERT_PRIORITY.getOrDefault(this.alertLevel, 0);
        int incoming = ALERT_PRIORITY.getOrDefault(newAlertLevel, 0);
        if (incoming > current) {
            this.alertLevel = newAlertLevel;
            return true;
        }
        return false;
    }
}
