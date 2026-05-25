package com.hanun.hanunan.global.casualty.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "disaster_casualty_info",
        uniqueConstraints = @UniqueConstraint(columnNames = {"disaster_id", "disaster_type"}))
@Builder
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class DisasterCasualtyInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "disaster_id", nullable = false)
    private Long disasterId;

    @Column(name = "disaster_type", nullable = false)
    private String disasterType; // 화재, 붕괴, 테러, 폭발, 산사태

    private Integer deaths;       // 사망자 수

    private Integer injuries;     // 부상자 수

    @Column(columnDefinition = "TEXT")
    private String propertyDamage; // 재산피해

    @Column(columnDefinition = "TEXT")
    private String cause;          // 발생 원인

    private String suppressionStatus; // 진압/수습 현황 (화재: 진화 완료 등)

    @Column(columnDefinition = "TEXT")
    private String summary;        // 종합 요약 (Gemini가 rawSummaries를 재요약한 결과)

    @Column(columnDefinition = "TEXT")
    private String rawSummaries;   // 각 기사별 요약 누적 (JSON 배열)

    private String sourceUrl;      // 출처 기사 URL

    private LocalDateTime updatedAt;

    // 신규 정보가 들어올 때 non-null 값만 덮어씀
    public void update(Integer deaths, Integer injuries, String propertyDamage,
                       String cause, String suppressionStatus, String consolidatedSummary,
                       String rawSummaries, String sourceUrl) {
        if (deaths != null) this.deaths = deaths;
        if (injuries != null) this.injuries = injuries;
        if (propertyDamage != null && !propertyDamage.isBlank()) this.propertyDamage = propertyDamage;
        if (cause != null && !cause.isBlank()) this.cause = cause;
        if (suppressionStatus != null && !suppressionStatus.isBlank()) this.suppressionStatus = suppressionStatus;
        if (consolidatedSummary != null && !consolidatedSummary.isBlank()) this.summary = consolidatedSummary;
        if (rawSummaries != null) this.rawSummaries = rawSummaries;
        if (sourceUrl != null) this.sourceUrl = sourceUrl;
        this.updatedAt = LocalDateTime.now();
    }
}
