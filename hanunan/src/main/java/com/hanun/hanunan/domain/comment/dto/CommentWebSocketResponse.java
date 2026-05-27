package com.hanun.hanunan.domain.comment.dto;

import com.hanun.hanunan.domain.comment.entity.Comment;

import java.time.LocalDateTime;

public record CommentWebSocketResponse(
        String action,        // "CREATE" or "DELETE"
        Long id,
        String type,
        String content,
        Long userId,
        String userName,
        LocalDateTime createdAt
) {
    // 댓글 작성 브로드캐스트
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

    // 댓글 삭제 브로드캐스트
    public static CommentWebSocketResponse ofDeleted(Long id, String type) {
        return new CommentWebSocketResponse(
                "DELETE",
                id,
                type,
                null,
                null,
                null,
                null
        );
    }
}
