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

import java.util.*;
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

    private List<Note> enrichNotes(List<Note> notes, String currentUserId) {
        if (notes == null || notes.isEmpty()) return notes;

        if (currentUserId != null) {
            Set<String> likedNoteIds = new HashSet<>();
            for (NoteLike like : noteLikeRepository.findByUserId(currentUserId)) {
                likedNoteIds.add(like.getNoteId());
            }
            for (Note note : notes) {
                note.setLiked(likedNoteIds.contains(note.getId()));
            }
        }

        for (Note note : notes) {
            List<NoteComment> flat = noteCommentRepository.findByNoteIdOrderByCreatedAtAsc(note.getId());
            note.setComments(buildCommentTree(flat).stream().limit(3).toList());
        }

        return notes;
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
        note.setComments(buildCommentTree(flat));
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
        return buildCommentTree(flat);
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

    private List<NoteCommentVO> buildCommentTree(List<NoteComment> flat) {
        Map<String, NoteCommentVO> map = new LinkedHashMap<>();
        List<NoteCommentVO> roots = new ArrayList<>();

        if (flat.isEmpty()) return roots;

        // Batch load all user IDs at once (fixes N+1)
        Set<String> userIds = new HashSet<>();
        for (NoteComment c : flat) {
            if (c.getUserId() != null) userIds.add(c.getUserId());
        }
        Map<String, User> userMap = new HashMap<>();
        for (User u : userRepository.findAllById(userIds)) {
            userMap.put(u.getId(), u);
        }

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