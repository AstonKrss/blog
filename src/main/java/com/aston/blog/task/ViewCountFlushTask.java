package com.aston.blog.task;

import com.aston.blog.repository.PostRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 浏览量定时刷回 MySQL:
 *   1. SCAN post:view:delta:* 拿 (postId, delta)
 *   2. 原子 UPDATE posts SET view_count = view_count + delta WHERE id = ?
 *   3. DEL post:view:delta:&lt;id&gt;  // DEL 必须在 UPDATE 成功之后,防止丢数据
 *
 * 为什么 60 秒一次?
 *   - 浏览量本身允许延迟可见(用户感觉不到 1 分钟误差)
 *   - 太频繁(INCR 完就 UPDATE)等于没优化
 *   - 太慢(>5 分钟)重启会丢较多浏览量
 */
@Component
public class ViewCountFlushTask {

    private static final Logger log = LoggerFactory.getLogger(ViewCountFlushTask.class);
    private static final String KEY_PREFIX = "post:view:delta:";
    private static final String KEY_PATTERN = "post:view:delta:*";

    private final StringRedisTemplate redisTemplate;
    private final PostRepository postRepository;

    public ViewCountFlushTask(StringRedisTemplate redisTemplate, PostRepository postRepository) {
        this.redisTemplate = redisTemplate;
        this.postRepository = postRepository;
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    @Transactional
    public void flushViewCounts() {
        ScanOptions options = ScanOptions.scanOptions()
                .match(KEY_PATTERN)
                .count(100)
                .build();

        int flushed = 0;
        try (Cursor<String> cursor = redisTemplate.scan(options)) {
            while (cursor.hasNext()) {
                String key = cursor.next();
                if (!key.startsWith(KEY_PREFIX)) continue;

                String postId = key.substring(KEY_PREFIX.length());
                String deltaStr = redisTemplate.opsForValue().get(key);
                if (deltaStr == null || deltaStr.isEmpty()) continue;

                long delta;
                try {
                    delta = Long.parseLong(deltaStr);
                } catch (NumberFormatException e) {
                    // 脏数据,清掉
                    redisTemplate.delete(key);
                    continue;
                }
                if (delta <= 0) {
                    redisTemplate.delete(key);
                    continue;
                }

                try {
                    int updated = postRepository.incrementViewCount(postId, delta);
                    if (updated > 0) {
                        // UPDATE 成功才 DEL:失败不删,下次重试
                        redisTemplate.delete(key);
                        flushed++;
                    } else {
                        // postId 不存在(可能文章被删了),清掉这个 key
                        redisTemplate.delete(key);
                        log.warn("flushViewCounts: post {} 不存在,清除 delta key", postId);
                    }
                } catch (Exception e) {
                    // 单条失败不影响其他 postId
                    log.error("flushViewCounts: 更新 post {} 浏览量失败", postId, e);
                }
            }
        } catch (Exception e) {
            log.error("flushViewCounts: SCAN 失败", e);
        }

        if (flushed > 0) {
            log.info("flushViewCounts: 刷回 {} 篇文章的浏览量", flushed);
        }
    }
}
