package com.aston.blog.repository;

import com.aston.blog.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByUsername(String username);

    // 检查用户名是否存在
    boolean existsByUsername(String username);

    boolean existsByEmail(@NotBlank(message = "邮箱不能为空") @Email(message = "邮箱格式不正确") String email);
}
