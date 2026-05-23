package com.hanun.hanunan.global.news.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NaverNewsResponse {

    private List<NaverNewsItem> items;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NaverNewsItem {
        private String title;           // 뉴스 제목 (HTML 태그 포함)
        private String originallink;    // 원문 링크
        private String link;            // 네이버 뉴스 링크
        private String description;     // 뉴스 요약 스니펫 (HTML 태그 포함)
        private String pubDate;         // 발행일
    }
}
