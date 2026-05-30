package com.hanun.hanunan.domain.comment.controller;

import com.hanun.hanunan.domain.comment.dto.CommentCreateRequest;
import com.hanun.hanunan.domain.comment.dto.CommentDeleteRequest;
import com.hanun.hanunan.domain.comment.dto.CommentWebSocketResponse;
import com.hanun.hanunan.domain.comment.entity.Comment;
import com.hanun.hanunan.domain.comment.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class CommentWebSocketController {

    private final CommentService commentService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/comments.create")
    public void create(@Payload CommentCreateRequest request, Principal principal) {
        if (principal == null) throw new AccessDeniedException("로그인이 필요합니다.");
        Comment comment = commentService.create(principal.getName(), request);
        CommentWebSocketResponse response = CommentWebSocketResponse.ofCreated(comment);
        messagingTemplate.convertAndSend("/topic/comments/" + request.type(), response);
    }

    @MessageMapping("/comments.delete")
    public void delete(@Payload CommentDeleteRequest request, Principal principal) {
        if (principal == null) throw new AccessDeniedException("로그인이 필요합니다.");
        String type = commentService.deleteAndGetType(principal.getName(), request.commentId());
        CommentWebSocketResponse response = CommentWebSocketResponse.ofDeleted(request.commentId(), type);
        messagingTemplate.convertAndSend("/topic/comments/" + type, response);
    }
}
