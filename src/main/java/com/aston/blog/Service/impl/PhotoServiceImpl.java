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
    private static final String FRONTEND_TREE_PHOTOS_DIR = System.getProperty("user.dir") + "/frontend/public/tree/photos/";

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

    @Override
    public int syncPhotosFromFrontendDirectory() {
        File frontendDir = new File(FRONTEND_TREE_PHOTOS_DIR);
        File uploadDir = new File(UPLOAD_DIR);
        
        if (!frontendDir.exists() || !frontendDir.isDirectory()) {
            throw new RuntimeException("前端照片目录不存在: " + FRONTEND_TREE_PHOTOS_DIR);
        }
        
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        
        File[] files = frontendDir.listFiles((d, name) -> {
            String lower = name.toLowerCase();
            return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".gif") || lower.endsWith(".webp");
        });
        
        if (files == null) return 0;
        
        int count = 0;
        for (File file : files) {
            String filename = file.getName();
            File destFile = new File(UPLOAD_DIR + filename);
            
            if (!destFile.exists()) {
                try {
                    java.nio.file.Files.copy(file.toPath(), destFile.toPath());
                    count++;
                } catch (Exception e) {
                    // 忽略复制失败的文件
                }
            }
            
            if (repository.findByFilename(filename).isEmpty()) {
                Photo photo = new Photo();
                photo.setFilename(filename);
                repository.save(photo);
            }
        }
        return count;
    }
}