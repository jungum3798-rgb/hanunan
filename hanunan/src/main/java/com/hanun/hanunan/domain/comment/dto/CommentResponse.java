package com.hanun.hanunan.domain.comment.dto;

import com.hanun.hanunan.domain.comment.entity.Comment;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        String type,
        String content,
        Long userId,
        String userName,
        LocalDateTime createdAt
) {
    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getType().name(),
                comment.getContent(),
                comment.getMember().getId(),
                comment.getMember().getName(),
                comment.getCreatedAt()
        );
    }
}
