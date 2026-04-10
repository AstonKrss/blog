package com.aston.blog.entity;
import lombok.Data;
import java.io.Serializable;


@Data
public class PostTagId implements Serializable {
    private String postId;
    private String tagId;
}