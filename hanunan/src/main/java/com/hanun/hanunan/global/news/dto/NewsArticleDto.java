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
public class NewsArticleDto {
    private String title;       // 뉴스 제목
    private String link;        // 뉴스 원문 링크
    private String description; // 네이버 API 제공 요약 스니펫
    private String pubDate;     // 발행일
}
