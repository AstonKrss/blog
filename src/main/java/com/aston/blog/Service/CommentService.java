package com.aston.blog.Service;

import java.util.List;
import com.aston.blog.vo.comment.CommentVO;

public interface CommentService {
    List<CommentVO> getComments(String postId);

    CommentVO createComment(String postId, String userId, String authorName, String authorEmail, String authorUrl, String content);
}
