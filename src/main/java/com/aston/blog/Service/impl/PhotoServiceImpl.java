package com.aston.blog.Service.impl;

import com.aston.blog.Service.PhotoService;
import com.aston.blog.entity.Photo;
import com.aston.blog.repository.PhotoRepository;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.List;

@Service
public class PhotoServiceImpl implements PhotoService {

    private final PhotoRepository repository;
    private static final String UPLOAD_DIR = System.getProperty("user.dir") + "/uploads/photos/";

    public PhotoServiceImpl(PhotoRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<Photo> getAllPhotos() {
        return repository.findAllByOrderBySortOrderAsc();
    }

    @Override
    public Photo uploadPhoto(String filename) {
        Photo photo = new Photo();
        photo.setFilename(filename);
        return repository.save(photo);
    }

    @Override
    public void deletePhoto(String id) {
        Photo photo = repository.findById(id).orElseThrow(() -> new RuntimeException("照片不存在"));
        try {
            String filePath = UPLOAD_DIR + photo.getFilename();
            File file = new File(filePath);
            if (file.exists()) {
                file.delete();
            }
        } catch (Exception e) {
            // 忽略文件删除错误
        }
        repository.delete(photo);
    }

    @Override
    public void updateOrder(List<String> photoIds) {
        for (int i = 0; i < photoIds.size(); i++) {
            final int index = i;
            repository.findById(photoIds.get(i)).ifPresent(photo -> {
                photo.setSortOrder(index);
                repository.save(photo);
            });
        }
    }

    @Override
    public void syncPhotosFromDirectory() {
        File dir = new File(UPLOAD_DIR);
        if (!dir.exists() || !dir.isDirectory()) {
            return;
        }
        File[] files = dir.listFiles((d, name) -> {
            String lower = name.toLowerCase();
            return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".gif");
        });
        if (files == null) return;
        
        for (File file : files) {
            String filename = file.getName();
            if (repository.findByFilename(filename).isEmpty()) {
                Photo photo = new Photo();
                photo.setFilename(filename);
                repository.save(photo);
            }
        }
    }
}