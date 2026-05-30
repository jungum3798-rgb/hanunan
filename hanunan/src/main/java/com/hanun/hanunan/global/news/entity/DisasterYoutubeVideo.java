package com.hanun.hanunan.global.news.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "disaster_youtube_video",
    uniqueConstraints = @UniqueConstraint(columnNames = {"disaster_id", "disaster_type", "video_id"})
)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisasterYoutubeVideo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "disaster_id", nullable = false)
    private Long disasterId;

    @Column(name = "disaster_type", nullable = false)
    private String disasterType;    // "화재", "붕괴", "테러", "폭발", "홍수", "산사태"

    @Column(name = "video_id", nullable = false)
    private String videoId;         // YouTube 영상 ID (예: "dQw4w9WgXcQ")

    @Column(nullable = false)
    private String title;

    @Column(name = "channel_title")
    private String channelTitle;    // 채널명

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;    // 썸네일 이미지 URL

    @Column(name = "published_at")
    private String publishedAt;     // YouTube 제공 발행 시각 (ISO 8601)

    private int phase;              // 수집 페이즈 (2~4)

    @Column(name = "fetched_at")
    private LocalDateTime fetchedAt;
}
