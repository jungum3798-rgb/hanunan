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
}
