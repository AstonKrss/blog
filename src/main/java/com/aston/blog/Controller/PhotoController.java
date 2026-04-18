package com.aston.blog.Controller;

import com.aston.blog.Service.PhotoService;
import com.aston.blog.common.Result;
import com.aston.blog.entity.Photo;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class PhotoController {

    private final PhotoService photoService;
    private static final String UPLOAD_DIR = System.getProperty("user.dir") + "/uploads/photos/";

    public PhotoController(PhotoService photoService) {
        this.photoService = photoService;
    }

    @GetMapping("/public/photos")
    public Result<List<Photo>> getPhotos() {
        return Result.success(photoService.getAllPhotos());
    }

    @GetMapping("/photos")
    public Result<List<Photo>> getAllPhotos() {
        return Result.success(photoService.getAllPhotos());
    }

    @PostMapping("/photos/upload")
    public Result<Photo> uploadPhoto(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return Result.error(400, "文件不能为空");
        }
        
        // 确保目录存在
        File uploadDir = new File(UPLOAD_DIR);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        
        // 生成唯一文件名
        String originalFilename = file.getOriginalFilename();
        String ext = originalFilename != null ? originalFilename.substring(originalFilename.lastIndexOf(".")) : ".jpg";
        String filename = UUID.randomUUID().toString() + ext;
        
        // 保存文件
        File destFile = new File(UPLOAD_DIR + filename);
        file.transferTo(destFile);
        
        // 保存到数据库
        Photo photo = photoService.uploadPhoto(filename);
        return Result.success(photo);
    }

    @DeleteMapping("/photos/{id}")
    public Result<?> deletePhoto(@PathVariable String id) {
        photoService.deletePhoto(id);
        return Result.success(null);
    }

    @PutMapping("/photos/order")
    public Result<?> updateOrder(@RequestBody List<String> photoIds) {
        photoService.updateOrder(photoIds);
        return Result.success(null);
    }

    @PostMapping("/photos/sync")
    public Result<?> syncPhotos() {
        photoService.syncPhotosFromDirectory();
        return Result.success(null);
    }
}