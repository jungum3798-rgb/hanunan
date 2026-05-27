package com.hanun.hanunan.domain.comment.service;

import com.hanun.hanunan.domain.comment.dto.CommentCreateRequest;
import com.hanun.hanunan.domain.comment.entity.Comment;
import com.hanun.hanunan.domain.comment.entity.CommentType;
import com.hanun.hanunan.domain.comment.repository.CommentRepository;
import com.hanun.hanunan.domain.member.entity.Member;
import com.hanun.hanunan.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public Comment create(String memberEmail, CommentCreateRequest request) {
        Member member = memberRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new AccessDeniedException("인증된 사용자만 댓글을 작성할 수 있습니다."));

        if (!StringUtils.hasText(request.content())) {
            throw new IllegalArgumentException("댓글 내용을 입력해 주세요.");
        }

        CommentType type = parseType(request.type());

        Comment comment = Comment.builder()
                .member(member)
                .type(type)
                .content(request.content().trim())
                .build();

        return commentRepository.save(comment);
    }

    @Transactional(readOnly = true)
    public List<Comment> findByType(String typeStr) {
        CommentType type = parseType(typeStr);
        return commentRepository.findByTypeOrderByCreatedAtDesc(type);
    }

    // 삭제 후 브로드캐스트를 위해 type 반환
    @Transactional
    public String deleteAndGetType(String memberEmail, Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 댓글입니다."));

        if (!comment.getMember().getEmail().equals(memberEmail)) {
            throw new AccessDeniedException("본인의 댓글만 삭제할 수 있습니다.");
        }

        String type = comment.getType().name();
        commentRepository.delete(comment);
        return type;
    }

    private CommentType parseType(String typeStr) {
        if (!StringUtils.hasText(typeStr)) {
            throw new IllegalArgumentException("댓글 타입을 입력해 주세요. (DISASTER, SAFETY, REPORT)");
        }
        try {
            return CommentType.valueOf(typeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("올바르지 않은 댓글 타입입니다. (DISASTER, SAFETY, REPORT)");
        }
    }
}
