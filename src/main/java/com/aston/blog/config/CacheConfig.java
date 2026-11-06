package com.aston.blog.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.support.NoOpCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Set;

/**
 * Spring Cache 配置：用 Jackson JSON 序列化替代默认 JDK 序列化。
 *
 * 压测开关：BLOG_CACHE_ENABLED=false 时注册 NoOpCacheManager，
 * 让 @Cacheable 方法每次都走真实数据库，用于测量缓存关闭后的读压力。
 */
@Configuration
public class CacheConfig {

    @Bean
    @ConditionalOnProperty(name = "blog.cache.enabled", havingValue = "true", matchIfMissing = true)
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory, MeterRegistry meterRegistry) {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        mapper.activateDefaultTyping(
                BasicPolymorphicTypeValidator.builder()
                        .allowIfBaseType(Object.class)
                        .build(),
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );

        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer(mapper);

        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(new JitterTtlFunction(Duration.ofMinutes(8), Duration.ofMinutes(12)))
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(jsonSerializer))
                .disableCachingNullValues();

        // Spring Boot 的缓存指标只在启动时绑定 CacheManager.getCacheNames() 返回的缓存。
        // RedisCacheManager 默认按需创建，启动时名字为空，因此必须预声明。
        Set<String> cacheNames = Set.of(
                "allPhotos", "approvedFriends", "archive", "guestbook", "postDetail",
                "project", "publicFootprints", "publicPosts", "publicProjects",
                "search", "siteSettings", "stats", "tags");

        RedisCacheManager redisCacheManager = RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .initialCacheNames(cacheNames)
                .enableStatistics()
                .build();

        // 所有缓存统一包装：Redis 不可用时退化为无缓存，业务方法回源 MySQL。
        return new ResilientCacheManager(redisCacheManager, meterRegistry);
    }

    @Bean
    @ConditionalOnProperty(name = "blog.cache.enabled", havingValue = "false")
    public CacheManager noOpCacheManager() {
        return new NoOpCacheManager();
    }
}

