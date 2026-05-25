package com.hanun.hanunan.domain.comment.dto;

public record CommentCreateRequest(
        String type,
        String content
) {
}
