package com.hanun.hanunan.domain.comment.dto;

import com.hanun.hanunan.domain.comment.entity.Comment;

import java.time.LocalDateTime;

public record CommentWebSocketResponse(
        String action,
        Long id,
        String type,
        String content,
        Long userId,
        String userName,
        LocalDateTime createdAt
) {
    public static CommentWebSocketResponse ofCreated(Comment comment) {
        return new CommentWebSocketResponse(
                "CREATE",
                comment.getId(),
                comment.getType().name(),
                comment.getContent(),
                comment.getMember().getId(),
                comment.getMember().getName(),
                comment.getCreatedAt()
        );
    }

    public static CommentWebSocketResponse ofDeleted(Long id, String type) {
        return new CommentWebSocketResponse("DELETE", id, type, null, null, null, null);
    }
}
