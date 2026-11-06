package com.aston.blog.Service.impl;

import com.aston.blog.Service.NoteService;
import com.aston.blog.dto.CreateNoteDTO;
import com.aston.blog.entity.Note;
import com.aston.blog.entity.NoteComment;
import com.aston.blog.entity.NoteCommentVO;
import com.aston.blog.entity.NoteLike;
import com.aston.blog.entity.User;
import com.aston.blog.repository.NoteCommentRepository;
import com.aston.blog.repository.NoteLikeRepository;
import com.aston.blog.repository.NoteRepository;
import com.aston.blog.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class NoteServiceImpl implements NoteService {

    private final NoteRepository noteRepository;
    private final NoteCommentRepository noteCommentRepository;
    private final NoteLikeRepository noteLikeRepository;
    private final UserRepository userRepository;

    public NoteServiceImpl(NoteRepository noteRepository,
                           NoteCommentRepository noteCommentRepository,
                           NoteLikeRepository noteLikeRepository,
                           UserRepository userRepository) {
        this.noteRepository = noteRepository;
        this.noteCommentRepository = noteCommentRepository;
        this.noteLikeRepository = noteLikeRepository;
        this.userRepository = userRepository;
    }

    // Manual JSON array serialize/deserialize — no external deps needed
    private List<String> parseImageUrls(String json) {
        if (json == null || json.isEmpty()) return new ArrayList<>();
        List<String> result = new ArrayList<>();
        String trimmed = json.trim();
        if (!trimmed.startsWith("[")) return result;
        // Simple parse: extract quoted strings between [ and ]
        int n = trimmed.length();
        boolean inStr = false;
        StringBuilder buf = new StringBuilder();
        for (int i = 0; i < n; i++) {
            char ch = trimmed.charAt(i);
            if (ch == '"' && (i == 0 || trimmed.charAt(i - 1) != '\\')) {
                inStr = !inStr;
                if (inStr) {
                    buf.setLength(0);
                } else {
                    result.add(buf.toString());
                }
            } else if (inStr) {
                buf.append(ch);
            }
        }
        return result;
    }

    private String toImageUrlsJson(List<String> urls) {
        if (urls == null || urls.isEmpty()) return null;
        return "[" + urls.stream()
            .map(u -> "\"" + u.replace("\\", "\\\\").replace("\"", "\\\"") + "\"")
            .collect(Collectors.joining(","))
            + "]";
    }

    @Override
    public List<Note> getPublicNotes(int page, int limit) {
        Page<Note> notes = noteRepository.findAll(PageRequest.of(page, limit));
        return enrichNotes(notes.getContent(), null);
    }

    @Override
    public List<Note> getMyNotes(String userId, int page, int limit) {
        Page<Note> notes = noteRepository.findByAuthorIdOrderByCreatedAtDesc(userId, PageRequest.of(page, limit));
        return enrichNotes(notes.getContent(), userId);
    }

    /**
     * 批量组装一页笔记的评论和点赞状态。
     *
     * 修复 N+1：评论只按当前页 noteId 集合查询一次，评论作者只查询一次，
     * 当前用户的点赞状态也只查询当前页，不再在笔记循环中访问数据库。
     */
    private List<Note> enrichNotes(List<Note> notes, String currentUserId) {
        if (notes == null || notes.isEmpty()) return notes;

        List<String> noteIds = notes.stream()
                .map(Note::getId)
                .filter(Objects::nonNull)
                .toList();
        if (noteIds.isEmpty()) return notes;

        if (currentUserId != null) {
            Set<String> likedNoteIds = noteLikeRepository
                    .findByUserIdAndNoteIdIn(currentUserId, noteIds)
                    .stream()
                    .map(NoteLike::getNoteId)
                    .collect(Collectors.toSet());
            for (Note note : notes) {
                note.setLiked(likedNoteIds.contains(note.getId()));
            }
        }

        List<NoteComment> allComments = noteCommentRepository
                .findByNoteIdInOrderByNoteIdAscCreatedAtAsc(noteIds);

        // 按 noteId 分组；LinkedHashMap 保留 SQL 返回的 noteId 顺序。
        Map<String, List<NoteComment>> commentsByNote = allComments.stream()
                .filter(comment -> comment.getNoteId() != null)
                .collect(Collectors.groupingBy(
                        NoteComment::getNoteId,
                        LinkedHashMap::new,
                        Collectors.toList()));

        // 评论作者也只批量加载一次，并把 userMap 传给建树方法复用。
        Map<String, User> userMap = loadUsers(allComments);

        for (Note note : notes) {
            List<NoteComment> flat = commentsByNote.getOrDefault(note.getId(), List.of());
            // 先建完整树，再截取前 3 条根评论，保证子评论不会被误当成根评论。
            note.setComments(buildCommentTree(flat, userMap).stream().limit(3).toList());
        }

        return notes;
    }

    private Map<String, User> loadUsers(List<NoteComment> comments) {
        Set<String> userIds = comments.stream()
                .map(NoteComment::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (userIds.isEmpty()) return Map.of();

        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity(), (left, right) -> left));
    }

    @Override
    public Note createNote(CreateNoteDTO dto, String userId) {
        Note note = new Note();
        note.setAuthorId(userId);
        note.setContent(dto.getContent());
        note.setImageUrls(toImageUrlsJson(dto.getImageUrls()));
        note.setVideoUrl(dto.getVideoUrl());
        note.setLikeCount(0);
        note.setCommentCount(0);
        return noteRepository.save(note);
    }

    @Override
    public Note getNoteById(String id) {
        Note note = noteRepository.findById(id).orElseThrow(() -> new RuntimeException("动态不存在"));
        List<NoteComment> flat = noteCommentRepository.findByNoteIdOrderByCreatedAtAsc(id);
        note.setComments(buildCommentTree(flat, loadUsers(flat)));
        return note;
    }

    @Override
    public void deleteNote(String id, String userId) {
        Note note = noteRepository.findById(id).orElseThrow(() -> new RuntimeException("动态不存在"));
        if (!note.getAuthorId().equals(userId)) {
            throw new RuntimeException("无权限删除");
        }
        noteCommentRepository.deleteByNoteId(id);
        noteLikeRepository.deleteByNoteId(id);
        noteRepository.delete(note);
    }

    @Override
    @Transactional
    public Note likeNote(String noteId, String userId) {
        if (noteLikeRepository.findByNoteIdAndUserId(noteId, userId).isPresent()) {
            return noteRepository.findById(noteId).orElseThrow(() -> new RuntimeException("动态不存在"));
        }
        NoteLike like = new NoteLike();
        like.setNoteId(noteId);
        like.setUserId(userId);
        noteLikeRepository.save(like);
        Note note = noteRepository.findById(noteId).orElseThrow(() -> new RuntimeException("动态不存在"));
        note.setLikeCount(note.getLikeCount() == null ? 1 : note.getLikeCount() + 1);
        return noteRepository.save(note);
    }

    @Override
    @Transactional
    public Note unlikeNote(String noteId, String userId) {
        Optional<NoteLike> likeOpt = noteLikeRepository.findByNoteIdAndUserId(noteId, userId);
        if (likeOpt.isPresent()) {
            noteLikeRepository.delete(likeOpt.get());
            Note note = noteRepository.findById(noteId).orElseThrow(() -> new RuntimeException("动态不存在"));
            note.setLikeCount(Math.max(0, (note.getLikeCount() == null ? 0 : note.getLikeCount()) - 1));
            return noteRepository.save(note);
        }
        return noteRepository.findById(noteId).orElseThrow(() -> new RuntimeException("动态不存在"));
    }

    @Override
    public Object getNoteComments(String noteId) {
        List<NoteComment> flat = noteCommentRepository.findByNoteIdOrderByCreatedAtAsc(noteId);
        return buildCommentTree(flat, loadUsers(flat));
    }

    @Override
    public Object createNoteComment(String noteId, String userId, String content, String parentId) {
        Note note = noteRepository.findById(noteId).orElseThrow(() -> new RuntimeException("动态不存在"));
        NoteComment comment = new NoteComment();
        comment.setNoteId(noteId);
        comment.setUserId(userId);
        comment.setContent(content);
        comment.setParentId(parentId);
        NoteComment saved = noteCommentRepository.save(comment);
        note.setCommentCount((note.getCommentCount() == null ? 0 : note.getCommentCount()) + 1);
        noteRepository.save(note);
        return saved;
    }

    private List<NoteCommentVO> buildCommentTree(List<NoteComment> flat, Map<String, User> userMap) {
        Map<String, NoteCommentVO> map = new LinkedHashMap<>();
        List<NoteCommentVO> roots = new ArrayList<>();

        if (flat == null || flat.isEmpty()) return roots;

        for (NoteComment c : flat) {
            User u = userMap.get(c.getUserId());
            NoteCommentVO vo = new NoteCommentVO();
            vo.setId(c.getId());
            vo.setContent(c.getContent());
            vo.setUserId(c.getUserId());
            vo.setCreatedAt(c.getCreatedAt());
            if (u != null) {
                vo.setAuthorName(u.getDisplayName() != null ? u.getDisplayName() : u.getUsername());
                vo.setAuthorAvatar(u.getAvatarUrl());
            } else {
                vo.setAuthorName("匿名用户");
            }
            vo.setChildren(new ArrayList<>());
            map.put(c.getId(), vo);
        }

        for (NoteComment c : flat) {
            NoteCommentVO vo = map.get(c.getId());
            if (c.getParentId() != null && map.containsKey(c.getParentId())) {
                map.get(c.getParentId()).getChildren().add(vo);
            } else {
                roots.add(vo);
            }
        }

        return roots;
    }
}
