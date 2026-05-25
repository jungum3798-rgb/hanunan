package com.hanun.hanunan.domain.comment.repository;

import com.hanun.hanunan.domain.comment.entity.Comment;
import com.hanun.hanunan.domain.comment.entity.CommentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @EntityGraph(attributePaths = {"member"})
    List<Comment> findByTypeOrderByCreatedAtDesc(CommentType type);
}
