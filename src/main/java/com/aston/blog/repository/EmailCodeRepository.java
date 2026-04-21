package com.aston.blog.repository;

import com.aston.blog.entity.EmailCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailCodeRepository extends JpaRepository<EmailCode, String> {

    Optional<EmailCode> findTopByEmailAndTypeAndUsedFalseOrderByCreatedAtDesc(String email, String type);

    @Modifying
    @Query("UPDATE EmailCode e SET e.used = true WHERE e.email = :email AND e.type = :type")
    void markAsUsed(@Param("email") String email, @Param("type") String type);

    void deleteByEmailAndType(String email, String type);

    @Modifying
    @Query("DELETE FROM EmailCode e WHERE e.expireAt < :now")
    void deleteExpiredCodes(@Param("now") LocalDateTime now);
}
