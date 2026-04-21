package com.aston.blog.Controller;

import com.aston.blog.Service.TerminalService;
import com.aston.blog.common.Result;
import com.aston.blog.vo.terminal.DirectoryListingVO;
import com.aston.blog.vo.terminal.FileContentVO;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/terminal")
public class TerminalController {
    private final TerminalService terminalService;

    public TerminalController(TerminalService terminalService) {
        this.terminalService = terminalService;
    }

    @GetMapping("/ls")
    public Result<DirectoryListingVO> listDirectory(@RequestParam(defaultValue = "/home/aston") String path) {
        try {
            DirectoryListingVO listing = terminalService.listDirectory(path);
            return Result.success(listing);
        } catch (Exception e) {
            return Result.error(500, "读取目录失败: " + e.getMessage());
        }
    }

    @GetMapping("/cat")
    public Result<FileContentVO> readFile(@RequestParam String path) {
        try {
            FileContentVO content = terminalService.readFile(path);
            if (content == null) {
                return Result.error(404, "文件不存在: " + path);
            }
            return Result.success(content);
        } catch (Exception e) {
            return Result.error(500, "读取文件失败: " + e.getMessage());
        }
    }

    @PostMapping("/write")
    public Result<FileContentVO> writeFile(@RequestBody Map<String, String> body, HttpServletRequest request) {
        try {
            String userId = getUserIdFromRequest(request);
            if (!terminalService.canEdit(userId)) {
                return Result.error(401, "需要登录才能编辑文件");
            }

            String path = body.get("path");
            String content = body.get("content");

            if (path == null || content == null) {
                return Result.error(400, "缺少必要参数");
            }

            FileContentVO result = terminalService.saveFile(path, content, userId);
            return Result.success(result);
        } catch (RuntimeException e) {
            return Result.error(403, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "保存文件失败: " + e.getMessage());
        }
    }

    @GetMapping("/check-auth")
    public Result<Map<String, Boolean>> checkAuth(HttpServletRequest request) {
        String userId = getUserIdFromRequest(request);
        boolean canEdit = terminalService.canEdit(userId);
        return Result.success(Map.of("canEdit", canEdit, "isLoggedIn", userId != null));
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
}
