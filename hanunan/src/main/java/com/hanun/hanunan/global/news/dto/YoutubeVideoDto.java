package com.hanun.hanunan.global.news.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class YoutubeVideoDto {

    private String videoId;       // YouTube 영상 ID
    private String url;           // 시청 URL (https://www.youtube.com/watch?v={videoId})
    private String title;         // 영상 제목
    private String channelTitle;  // 채널명
    private String thumbnailUrl;  // 썸네일 이미지 URL
    private String publishedAt;   // 발행 시각 (ISO 8601)
}
