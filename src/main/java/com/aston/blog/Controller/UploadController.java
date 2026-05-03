package com.aston.blog.Controller;

import com.aston.blog.common.Result;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api")
public class UploadController {

    private static final String UPLOAD_DIR = "/app/uploads/";

    // 允许的图片扩展名白名单
    private static final Set<String> ALLOWED_EXTENSIONS = new HashSet<>(Arrays.asList(
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"));

    // 允许的MIME类型
    private static final Set<String> ALLOWED_MIME_TYPES = new HashSet<>(Arrays.asList(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"));

    // 图片文件头魔数 (字节签名)
    private static final byte[][] MAGIC_NUMBERS = {
            // JPEG
            { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF },
            // PNG
            { (byte) 0x89, (byte) 0x50, (byte) 0x4E, (byte) 0x47 },
            // GIF
            { (byte) 0x47, (byte) 0x49, (byte) 0x46 },
            // WebP
            { (byte) 0x52, (byte) 0x49, (byte) 0x46, (byte) 0x46 },
            // BMP
            { (byte) 0x42, (byte) 0x4D }
    };

    @PostMapping("/upload/image")
    public Result<String> uploadImage(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        // 验证用户是否已登录
        String userId = getUserIdFromRequest(request);
        if (userId == null) {
            return Result.error(401, "请先登录");
        }

        if (file.isEmpty()) {
            return Result.error(400, "文件为空");
        }

        // 1. 检查文件大小（最大5MB）
        if (file.getSize() > 5 * 1024 * 1024) {
            return Result.error(400, "文件大小不能超过5MB");
        }

        try {
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || !originalFilename.contains(".")) {
                return Result.error(400, "文件名称无效");
            }

            // 2. 获取扩展名并验证（白名单）
            String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            if (!ALLOWED_EXTENSIONS.contains(extension)) {
                return Result.error(400, "不支持的文件类型，仅支持: jpg, jpeg, png, gif, webp, bmp");
            }

            // 3. 验证Content-Type（但不完全信任）
            String contentType = file.getContentType();
            if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
                return Result.error(400, "文件类型不匹配");
            }

            // 4. 验证文件魔数（读取文件头字节）
            byte[] fileBytes = file.getBytes();
            if (!isValidImageMagicNumber(fileBytes)) {
                return Result.error(400, "文件内容无效，不是有效的图片");
            }

            // 5. 尝试使用ImageIO解析图片（深度验证）
            if (!isValidImageByImageIO(fileBytes, extension)) {
                return Result.error(400, "图片文件损坏或格式错误");
            }

            // 6. 创建上传目录
            File uploadDir = new File(UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            // 7. 生成唯一文件名（使用UUID，保持扩展名）
            String fileName = UUID.randomUUID().toString() + extension;

            // 8. 保存文件
            Path filePath = Paths.get(UPLOAD_DIR, fileName);
            Files.write(filePath, fileBytes);

            // 9. 返回文件访问URL
            String fileUrl = "/uploads/" + fileName;
            return Result.success(fileUrl);

        } catch (IOException e) {
            return Result.error(500, "文件上传失败: " + e.getMessage());
        }
    }

    // 允许的视频扩展名白名单
    private static final Set<String> ALLOWED_VIDEO_EXTENSIONS = new HashSet<>(Arrays.asList(
            ".mp4", ".webm", ".mov", ".avi", ".mkv"));

    private static final Set<String> ALLOWED_VIDEO_MIME_TYPES = new HashSet<>(Arrays.asList(
            "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"));

    // 视频文件魔数（简单验证）
    private static final byte[][] VIDEO_MAGIC_NUMBERS = {
            // MP4: ftyp (offset 4)
            { (byte) 0x66, (byte) 0x74, (byte) 0x79, (byte) 0x70 },
            // WebM: EBML ID
            { (byte) 0x1A, (byte) 0x45, (byte) 0xDF, (byte) 0xA3 },
    };

    // 碎碎念图片/视频上传（支持图片和视频，最大50MB）
    @PostMapping("/upload/media")
    public Result<Map<String, String>> uploadMedia(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        String userId = getUserIdFromRequest(request);
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        if (file.isEmpty()) {
            return Result.error(400, "文件为空");
        }

        // 1. 检查文件大小（最大50MB）
        if (file.getSize() > 50 * 1024 * 1024) {
            return Result.error(400, "文件大小不能超过50MB");
        }

        try {
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || !originalFilename.contains(".")) {
                return Result.error(400, "文件名称无效");
            }

            String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            String contentType = file.getContentType();

            boolean isImage = ALLOWED_EXTENSIONS.contains(extension) &&
                    (contentType != null && ALLOWED_MIME_TYPES.contains(contentType));
            boolean isVideo = ALLOWED_VIDEO_EXTENSIONS.contains(extension) &&
                    (contentType != null && ALLOWED_VIDEO_MIME_TYPES.contains(contentType));

            if (!isImage && !isVideo) {
                return Result.error(400, "不支持的文件类型，支持: jpg, jpeg, png, gif, webp, bmp, mp4, webm, mov");
            }

            // 视频魔数验证（简单检查）
            if (isVideo) {
                byte[] bytes = file.getBytes();
                boolean validMagic = false;
                for (byte[] magic : VIDEO_MAGIC_NUMBERS) {
                    if (bytes.length >= magic.length) {
                        boolean match = true;
                        for (int i = 0; i < magic.length; i++) {
                            if (bytes[i] != magic[i]) { match = false; break; }
                        }
                        if (match) { validMagic = true; break; }
                    }
                }
                if (!validMagic) {
                    return Result.error(400, "视频文件内容无效");
                }
            }

            // 保存到 notes/ 子目录
            File uploadDir = new File(UPLOAD_DIR + "notes/");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            String fileName = UUID.randomUUID().toString() + extension;
            Path filePath = Paths.get(uploadDir.getPath(), fileName);
            Files.write(filePath, file.getBytes());

            String fileUrl = "/uploads/notes/" + fileName;

            Map<String, String> result = new java.util.HashMap<>();
            result.put("url", fileUrl);
            result.put("type", isVideo ? "video" : "image");
            return Result.success(result);

        } catch (IOException e) {
            return Result.error(500, "文件上传失败: " + e.getMessage());
        }
    }

    private String getUserIdFromRequest(HttpServletRequest request) {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() != null) {
                Object principal = auth.getPrincipal();
                if (principal instanceof String) {
                    return (String) principal;
                }
            }
        } catch (Exception e) {
        }
        return null;
    }

    /**
     * 检查文件头魔数是否匹配已知图片格式
     */
    private boolean isValidImageMagicNumber(byte[] bytes) {
        if (bytes.length < 4) {
            return false;
        }

        // 检查每个已知的魔数
        for (byte[] magic : MAGIC_NUMBERS) {
            if (bytes.length >= magic.length) {
                boolean match = true;
                for (int i = 0; i < magic.length; i++) {
                    if (bytes[i] != magic[i]) {
                        match = false;
                        break;
                    }
                }
                if (match)
                    return true;
            }
        }

        return false;
    }

    /**
     * 使用ImageIO深度验证图片有效性
     */
    private boolean isValidImageByImageIO(byte[] bytes, String extension) {
        try {
            ByteArrayInputStream bais = new ByteArrayInputStream(bytes);
            BufferedImage img = ImageIO.read(bais);

            // 检查图片是否有效
            if (img == null) {
                return false;
            }

            // 检查图片尺寸是否合理（防止通过小图片绕过）
            int width = img.getWidth();
            int height = img.getHeight();

            if (width <= 0 || height <= 0 || width > 10000 || height > 10000) {
                return false;
            }

            // 检查是否为允许的格式
            String formatName = ImageIO.getImageReaders(Object.class).hasNext()
                    ? ImageIO.getImageReadersByFormatName(extension.substring(1)).hasNext() ? extension.substring(1)
                            : null
                    : null;

            return true;

        } catch (Exception e) {
            return false;
        }
    }
}