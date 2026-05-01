package com.aston.blog.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;

import org.apache.catalina.connector.Response;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldError().getDefaultMessage();
        Map<String, Object> result = new HashMap<>();
        result.put("code", 400);
        result.put("message", message);
        result.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMiss(MethodArgumentTypeMismatchException e) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 400);
        result.put("message", "参数类型错误");
        result.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException e) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 404);
        result.put("message", "请求的资源不存在");
        result.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(result);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException e) {
        String message = "数据操作失败";
        Throwable cause = e.getCause();
        if (cause != null && cause.getMessage() != null) {
            String errorMsg = cause.getMessage();
            if (errorMsg.contains("foreign key constraint")) {
                // 判断是否是 author_id 外键错误（用户不存在）
                if (errorMsg.contains("posts_ibfk_1") || errorMsg.contains("author_id")) {
                    message = "登录已失效，请重新登录";
                } else {
                    message = "关联数据不存在，请检查后重试";
                }
            } else if (errorMsg.contains("Duplicate entry")) {
                message = "数据已存在";
            }
        }
        log.error("数据完整性异常: {}", e.getMessage());
        Map<String, Object> result = new HashMap<>();
        result.put("code", 401);  // 用户相关问题返回 401
        result.put("message", message);
        result.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException e) {
        log.error("运行时异常: {}", e.getMessage(), e);

        Map<String, Object> result = new HashMap<>();
        result.put("code", 400);
        result.put("message", "操作失败，请稍后重试");
        result.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleException(Exception e) {
        log.error("系统异常: {}", e.getMessage(), e);

        Map<String, Object> result = new HashMap<>();
        result.put("code", 500);
        result.put("message", "服务器错误，请稍后重试");
        result.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
    }
}