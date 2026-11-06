package com.aston.blog.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class JitterTtlFunctionTest {

    @Test
    void ttlStaysWithinConfiguredRange() {
        JitterTtlFunction function = new JitterTtlFunction(Duration.ofMinutes(8), Duration.ofMinutes(12));

        for (int i = 0; i < 200; i++) {
            Duration ttl = function.getTimeToLive("key", "value");
            assertThat(ttl).isBetween(Duration.ofMinutes(8), Duration.ofMinutes(12));
        }
    }

    @Test
    void invalidRangeIsRejected() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                        new JitterTtlFunction(Duration.ofMinutes(12), Duration.ofMinutes(8)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
