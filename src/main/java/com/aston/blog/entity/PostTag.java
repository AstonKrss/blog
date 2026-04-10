package com.aston.blog.entity;
import jakarta.persistence.*;
import lombok.Data;


@Data
@Entity
@Table(name = "post_tags")
@IdClass(PostTagId.class) // 关联上面的 ID 类
public class PostTag {

    @Id
    @Column(name = "post_id")
    private String postId;
    @Id
    @Column(name = "tag_id")
    private String tagId;
}