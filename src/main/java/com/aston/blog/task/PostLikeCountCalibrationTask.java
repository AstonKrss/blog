package com.aston.blog.task;

import com.aston.blog.config.RedisDistributedLock;
import com.aston.blog.config.TaskMetrics;
import com.aston.blog.repository.PostRepository;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * 周期性校准文章点赞数。
 *
 * posts.like_count 负责读路径的快速展示，post_likes 的唯一约束负责真实点赞关系。
 * 这里只修复两者不一致的数据，不是每次请求都 count。
 */
@Component
public class PostLikeCountCalibrationTask {

    private static final Logger log = LoggerFactory.getLogger(PostLikeCountCalibrationTask.class);
    private static final String LOCK_NAME = "task:post-like-count-calibration";

    private final PostRepository postRepository;
    private final RedisDistributedLock distributedLock;
    private final TaskMetrics taskMetrics;

    @Value("${blog.post-like.calibration.enabled:true}")
    private boolean enabled;

    public PostLikeCountCalibrationTask(PostRepository postRepository,
            RedisDistributedLock distributedLock,
            TaskMetrics taskMetrics) {
        this.postRepository = postRepository;
        this.distributedLock = distributedLock;
        this.taskMetrics = taskMetrics;
    }

    @Scheduled(fixedDelayString = "${blog.post-like.calibration.interval-ms:3600000}",
            initialDelayString = "${blog.post-like.calibration.initial-delay-ms:300000}")
    public void calibrate() {
        if (!enabled) {
            return;
        }
        String token = null;
        Timer.Sample sample = null;
        try {
            token = distributedLock.tryLock(LOCK_NAME, Duration.ofMinutes(10));
            if (token == null) {
                return;
            }
            sample = taskMetrics.start();
            int repaired = postRepository.calibrateLikeCounts();
            if (repaired > 0) {
                log.info("文章点赞数校准完成: repaired={}", repaired);
            }
        } catch (Exception e) {
            log.error("文章点赞数校准失败", e);
        } finally {
            if (sample != null) {
                taskMetrics.stop(sample, "post-like-count-calibration");
            }
            if (token != null) {
                try {
                    distributedLock.unlock(LOCK_NAME, token);
                } catch (Exception e) {
                    log.warn("文章点赞数校准锁释放失败 lock={}", LOCK_NAME);
                }
            }
        }
    }
}
