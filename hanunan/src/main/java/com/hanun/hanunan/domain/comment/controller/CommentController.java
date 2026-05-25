package com.hanun.hanunan.domain.comment.controller;

import com.hanun.hanunan.domain.comment.dto.CommentCreateRequest;
import com.hanun.hanunan.domain.comment.dto.CommentResponse;
import com.hanun.hanunan.domain.comment.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // 댓글 작성
    @PostMapping
    public ResponseEntity<CommentResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CommentCreateRequest request
    ) {
        if (userDetails == null) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        CommentResponse response = CommentResponse.from(
                commentService.create(userDetails.getUsername(), request)
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 타입별 댓글 조회
    @GetMapping
    public ResponseEntity<List<CommentResponse>> findByType(
            @RequestParam String type
    ) {
        List<CommentResponse> response = commentService.findByType(type)
                .stream()
                .map(CommentResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    // 댓글 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id
    ) {
        if (userDetails == null) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        commentService.delete(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleForbidden(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
    }
}
