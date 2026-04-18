package com.aston.blog.repository;

import com.aston.blog.entity.Photo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PhotoRepository extends JpaRepository<Photo, String> {
    List<Photo> findAllByOrderBySortOrderAsc();
    java.util.Optional<Photo> findByFilename(String filename);
    
    @Modifying
    @Query("DELETE FROM Photo")
    void deleteAllPhotos();
}