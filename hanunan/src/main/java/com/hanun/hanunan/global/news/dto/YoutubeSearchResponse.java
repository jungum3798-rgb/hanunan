package com.hanun.hanunan.global.news.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * YouTube Data API v3 search.list 응답 파싱용 DTO
 * https://developers.google.com/youtube/v3/docs/search/list
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class YoutubeSearchResponse {

    @JsonProperty("items")
    private List<YoutubeItem> items;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class YoutubeItem {

        @JsonProperty("id")
        private YoutubeItemId id;

        @JsonProperty("snippet")
        private YoutubeSnippet snippet;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class YoutubeItemId {

        @JsonProperty("videoId")
        private String videoId;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class YoutubeSnippet {

        @JsonProperty("title")
        private String title;

        @JsonProperty("channelTitle")
        private String channelTitle;

        @JsonProperty("publishedAt")
        private String publishedAt;   // ISO 8601 형식 (예: "2025-07-21T07:21:00Z")

        @JsonProperty("thumbnails")
        private YoutubeThumbnails thumbnails;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class YoutubeThumbnails {

        @JsonProperty("medium")
        private YoutubeThumbnail medium;

        @JsonProperty("default")
        private YoutubeThumbnail defaultThumbnail;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class YoutubeThumbnail {

        @JsonProperty("url")
        private String url;
    }
}
