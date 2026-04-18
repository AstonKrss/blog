package com.aston.blog.Service;

import com.aston.blog.entity.Photo;
import java.util.List;

public interface PhotoService {
    List<Photo> getAllPhotos();
    Photo uploadPhoto(String filename);
    void deletePhoto(String id);
    void updateOrder(List<String> photoIds);
    void syncPhotosFromDirectory();
}