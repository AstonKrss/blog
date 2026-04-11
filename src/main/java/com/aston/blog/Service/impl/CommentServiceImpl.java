package com.aston.blog.Service.impl;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.aston.blog.entity.Comment;
import com.aston.blog.entity.User;
import com.aston.blog.repository.CommentRepository;
import com.aston.blog.repository.UserRepository;
import com.aston.blog.vo.comment.CommentVO;
import com.aston.blog.Service.CommentService;

@Service
public class CommentServiceImpl implements CommentService {
    final CommentRepository commentRepository;
    
    @Autowired
    private UserRepository userRepository;

    public CommentServiceImpl(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    @Override
    public List<CommentVO> getComments(String postId) {
        List<CommentVO> comments = commentRepository.findByPostId(postId).stream()
                .map(this::toVO)
                .toList();
        return comments;
    }

    @Override
    public CommentVO createComment(String postId, String userId, String authorName, String authorEmail, String authorUrl, String content) {
        Comment comment = new Comment();
        comment.setPostId(postId);
        
        // 如果有登录用户，使用用户信息
        if (userId != null) {
            comment.setUserId(userId);
            // 从数据库获取用户信息
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                comment.setAuthorName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername());
                comment.setAuthorEmail(user.getEmail());
            }
        } else {
            // 匿名评论
            comment.setAuthorName(authorName);
            comment.setAuthorEmail(authorEmail);
            comment.setAuthorUrl(authorUrl);
        }
        
        comment.setContent(content);
        comment.setStatus("APPROVED");
        
        comment = commentRepository.save(comment);
        return toVO(comment);
    }
    
    private CommentVO toVO(Comment comment) {
        CommentVO vo = new CommentVO();
        vo.setId(comment.getId());
        vo.setContent(comment.getContent());
        
        // 如果有userId，从数据库获取用户信息
        if (comment.getUserId() != null) {
            User user = userRepository.findById(comment.getUserId()).orElse(null);
            if (user != null) {
                vo.setAuthorName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername());
            }
        } else {
            vo.setAuthorName(comment.getAuthorName());
        }
        
        vo.setAuthorUrl(comment.getAuthorUrl());
        vo.setCreatedAt(comment.getCreatedAt() != null ? comment.getCreatedAt().toString() : null);
        return vo;
    }
}
