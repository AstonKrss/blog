package com.aston.blog.task;

import com.aston.blog.config.RedisDistributedLock;
import com.aston.blog.config.TaskMetrics;
import com.aston.blog.repository.PostRepository;
import io.micrometer.core.instrument.Timer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostLikeCountCalibrationTaskTest {

    @Mock
    private PostRepository postRepository;
    @Mock
    private RedisDistributedLock distributedLock;
    @Mock
    private TaskMetrics taskMetrics;
    @Mock
    private Timer.Sample sample;

    @Test
    void calibrationRunsOnlyAfterAcquiringLock() {
        when(distributedLock.tryLock(anyString(), any(Duration.class))).thenReturn("token");
        when(taskMetrics.start()).thenReturn(sample);
        when(postRepository.calibrateLikeCounts()).thenReturn(2);

        PostLikeCountCalibrationTask task = new PostLikeCountCalibrationTask(
                postRepository, distributedLock, taskMetrics);
        ReflectionTestUtils.setField(task, "enabled", true);
        task.calibrate();

        verify(postRepository).calibrateLikeCounts();
        verify(taskMetrics).stop(sample, "post-like-count-calibration");
        verify(distributedLock).unlock(eq("task:post-like-count-calibration"), eq("token"));
    }
}

