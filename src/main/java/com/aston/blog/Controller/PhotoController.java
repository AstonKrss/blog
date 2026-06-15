package com.aston.blog.Controller;

import java.awt.image.BufferedImage;

import com.aston.blog.Service.PhotoService;
import com.aston.blog.common.Result;
import com.aston.blog.entity.Photo;
import com.aston.blog.vo.photo.PhotoVO;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import javax.imageio.ImageIO;

@RestController
@RequestMapping("/api")
public class PhotoController {

    private final PhotoService photoService;
    private static final String UPLOAD_DIR = "/app/uploads/photos/";

    public PhotoController(PhotoService photoService) {
        this.photoService = photoService;
    }

    @GetMapping("/public/photos")
    public Result<List<PhotoVO>> getPhotos() {
        return Result.success(photoService.getAllPhotos());
    }

    @GetMapping("/photos")
    public Result<List<PhotoVO>> getAllPhotos(HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        return Result.success(photoService.getAllPhotos());
    }

    @PostMapping("/photos/upload")
    public Result<Photo> uploadPhoto(@RequestParam("file") MultipartFile file, HttpServletRequest request)
            throws IOException {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        if (file.isEmpty()) {
            return Result.error(400, "文件不能为空");
        }

        String contentType = file.getContentType();
        if (!Set.of("image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp").contains(contentType)) {
            return Result.error(400, "不支持的文件类型");
        }
        BufferedImage image = ImageIO.read(file.getInputStream());
        if (image == null) {
            return Result.error(400, "文件内容不是有效的图片");
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
    public Result<?> deletePhoto(@PathVariable String id, HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        photoService.deletePhoto(id);
        return Result.success(null);
    }

    @PutMapping("/photos/order")
    public Result<?> updateOrder(@RequestBody List<String> photoIds, HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        photoService.updateOrder(photoIds);
        return Result.success(null);
    }

    @PostMapping("/photos/sync")
    public Result<?> syncPhotos(HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        photoService.syncPhotosFromDirectory();
        return Result.success(null);
    }

    @PostMapping("/photos/sync-from-frontend")
    public Result<?> syncPhotosFromFrontend(HttpServletRequest request) {
        String role = getUserRole(request);
        if (!"ADMIN".equals(role)) {
            return Result.error(403, "无权限");
        }
        try {
            int count = photoService.syncPhotosFromFrontendDirectory();
            return Result.success(count);
        } catch (Exception e) {
            return Result.error(500, "同步失败: " + e.getMessage());
        }
    }

    private String getUserRole(HttpServletRequest request) {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getAuthorities() != null) {
                return auth.getAuthorities().stream()
                        .filter(a -> a.getAuthority().startsWith("ROLE_"))
                        .map(a -> a.getAuthority().substring(5))
                        .findFirst()
                        .orElse(null);
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }
}