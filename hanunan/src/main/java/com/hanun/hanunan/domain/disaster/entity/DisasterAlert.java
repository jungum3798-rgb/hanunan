package com.hanun.hanunan.domain.disaster.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "disaster_alert")
@Builder
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class DisasterAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String sn;

    @Column(columnDefinition = "TEXT")
    private String messageContent;

    private String rcptnRgnNm;

    private String alertLevel;

    private String disasterType; // 테러, 붕괴, 폭발, 산사태

    private String parsedAddress;

    private Double latitude;
    private Double longitude;

    private LocalDateTime createdAt;
}
