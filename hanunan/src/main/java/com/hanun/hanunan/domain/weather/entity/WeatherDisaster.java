package com.hanun.hanunan.domain.weather.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "weather_disaster")
@Builder
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class WeatherDisaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String sn; // 재난문자 일련번호

    @Column(columnDefinition = "TEXT")
    private String messageContent; // 재난문자 본문

    private String rcptnRgnNm; // 수신지역명 (GPS 매칭 기준)
    private String dstSeNm;    // 재해구분명 (강풍, 태풍 등)
    private String alertLevel; // 긴급단계 (안전안내, 긴급재난, 위급재난)

    private LocalDateTime createdAt;
}
