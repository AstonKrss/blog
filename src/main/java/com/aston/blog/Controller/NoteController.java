package com.aston.blog.Controller;

import com.aston.blog.Service.NoteService;
import com.aston.blog.common.Result;
import com.aston.blog.dto.CreateNoteDTO;
import com.aston.blog.entity.Note;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return auth.getName();
    }

    // 公开动态列表（游客也能看）
    @GetMapping("/public/notes")
    public Result<List<Note>> getPublicNotes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return Result.success(noteService.getPublicNotes(page, limit));
    }

    // 我的动态（登录后可看）
    @GetMapping("/notes")
    public Result<List<Note>> getMyNotes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit) {
        String userId = getCurrentUserId();
        if (userId == null) return Result.error(401, "请先登录");
        return Result.success(noteService.getMyNotes(userId, page, limit));
    }

    // 发布动态
    @PostMapping("/notes")
    public Result<Note> createNote(@Valid @RequestBody CreateNoteDTO dto) {
        String userId = getCurrentUserId();
        if (userId == null) return Result.error(401, "请先登录");
        if (dto.getContent() == null || dto.getContent().trim().isEmpty()) {
            return Result.error(400, "内容不能为空");
        }
        return Result.success(noteService.createNote(dto, userId));
    }

    // 点赞
    @PostMapping("/notes/{id}/like")
    public Result<Note> likeNote(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null) return Result.error(401, "请先登录");
        return Result.success(noteService.likeNote(id, userId));
    }

    // 取消点赞
    @DeleteMapping("/notes/{id}/like")
    public Result<Note> unlikeNote(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null) return Result.error(401, "请先登录");
        return Result.success(noteService.unlikeNote(id, userId));
    }

    // 获取评论
    @GetMapping("/notes/{id}/comments")
    public Result<?> getComments(@PathVariable String id) {
        return Result.success(noteService.getNoteComments(id));
    }

    // 添加评论
    @PostMapping("/notes/{id}/comments")
    public Result<?> createComment(@PathVariable String id, @RequestBody Map<String, String> body) {
        String userId = getCurrentUserId();
        if (userId == null) return Result.error(401, "请先登录");
        String content = body.get("content");
        String parentId = body.get("parentId");
        if (content == null || content.trim().isEmpty()) {
            return Result.error(400, "评论内容不能为空");
        }
        return Result.success(noteService.createNoteComment(id, userId, content, parentId));
    }

    // 删除动态
    @DeleteMapping("/notes/{id}")
    public Result<?> deleteNote(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null) return Result.error(401, "请先登录");
        noteService.deleteNote(id, userId);
        return Result.success(null);
    }

    // 获取单条动态详情
    @GetMapping("/notes/{id}")
    public Result<Note> getNote(@PathVariable String id) {
        return Result.success(noteService.getNoteById(id));
    }
}