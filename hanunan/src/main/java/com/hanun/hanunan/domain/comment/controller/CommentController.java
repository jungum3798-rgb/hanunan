package com.hanun.hanunan.domain.comment.controller;

import com.hanun.hanunan.domain.comment.dto.CommentResponse;
import com.hanun.hanunan.domain.comment.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
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

    // 최초 입장 시 기존 댓글 목록 조회 (인증 불필요)
    @GetMapping
    public ResponseEntity<List<CommentResponse>> findByType(@RequestParam String type) {
        List<CommentResponse> response = commentService.findByType(type)
                .stream()
                .map(CommentResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }
}
