package com.aston.blog.Service;

import com.aston.blog.entity.Photo;
import com.aston.blog.vo.photo.PhotoVO;
import java.util.List;

public interface PhotoService {
    List<PhotoVO> getAllPhotos();
    Photo uploadPhoto(String filename);
    void deletePhoto(String id);
    void updateOrder(List<String> photoIds);
    void syncPhotosFromDirectory();
    int syncPhotosFromFrontendDirectory();
}