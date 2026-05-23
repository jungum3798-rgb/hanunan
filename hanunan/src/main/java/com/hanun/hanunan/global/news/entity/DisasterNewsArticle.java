package com.hanun.hanunan.global.news.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "disaster_news_article",
    uniqueConstraints = @UniqueConstraint(columnNames = {"disaster_id", "disaster_type", "link"})
)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisasterNewsArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "disaster_id", nullable = false)
    private Long disasterId;        // 각 재난 엔티티의 PK

    @Column(name = "disaster_type", nullable = false)
    private String disasterType;    // "화재", "붕괴", "테러", "폭발", "홍수", "산사태"

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String link;

    @Column(columnDefinition = "TEXT")
    private String description;     // 네이버 API 제공 요약 스니펫

    private String pubDate;

    private int phase;              // 수집 페이즈 (1~4)

    private LocalDateTime fetchedAt;
}
