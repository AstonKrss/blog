package com.aston.blog.repository;

import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import com.aston.blog.entity.LoginAttempt;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, String> {

    @Query("select count(*) from LoginAttempt where ip = :ip and createdAt >= :since and success = false")
    long countFailedAttemptsByIp(String ip, LocalDateTime since);

    @Query("select count(*) from LoginAttempt where username = :username and createdAt >= :since and success = false")
    long countFailedAttemptsByUsername(String username, LocalDateTime since);

    LoginAttempt save(LoginAttempt attempt);

}
