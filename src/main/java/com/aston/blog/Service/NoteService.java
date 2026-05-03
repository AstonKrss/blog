package com.aston.blog.Service;

import com.aston.blog.dto.CreateNoteDTO;
import com.aston.blog.entity.Note;
import java.util.List;

public interface NoteService {
    List<Note> getPublicNotes(int page, int limit);

    List<Note> getMyNotes(String userId, int page, int limit);

    Note createNote(CreateNoteDTO dto, String userId);

    Note getNoteById(String id);

    void deleteNote(String id, String userId);

    Note likeNote(String noteId, String userId);

    Note unlikeNote(String noteId, String userId);

    Object getNoteComments(String noteId);

    Object createNoteComment(String noteId, String userId, String content, String parentId);
}