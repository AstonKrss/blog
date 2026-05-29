package com.aston.blog.config;

import com.aston.blog.common.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Collections;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtUtil jwtUtil;

    public SecurityConfig(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtUtil);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.requestMatchers(
                        "/api/public/**",
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/send-code",
                        "/uploads/**",
                        "/health").permitAll()
                        .requestMatchers(
                                "/api/admin/**",
                                "/api/settings",
                                "/api/projects/**",
                                "/api/photos/**",
                                "/api/friends/**",
                                "/api/analytics/**")
                        .hasRole("ADMIN")
                        .requestMatchers(
                                "/api/posts/**",
                                "/api/notes/**",
                                "/api/users/profile",
                                "/api/users/password",
                                "/api/upload/**",
                                "/api/terminal/**")
                        .authenticated()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();

        // 从环境变量读取允许的域名
        String allowedOrigins = System.getenv("CORS_ALLOWED_ORIGINS");
        java.util.List<String> originsList;
        if (allowedOrigins != null && !allowedOrigins.isEmpty()) {
            originsList = java.util.Arrays.asList(allowedOrigins.split(","));
        } else {
            // 默认允许本地开发和生产 IP
            originsList = java.util.List.of(
                    "http://localhost:3000",
                    "http://47.242.21.40",
                    "http://47.242.21.40:80",
                    "http://47.242.21.40:8080");
        }

        configuration.setAllowedOrigins(originsList);
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(java.util.List.of("*"));
        configuration.setAllowCredentials(true);

        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    static class JwtAuthenticationFilter extends OncePerRequestFilter {
        private final JwtUtil jwtUtil;
        private static final String TOKEN_COOKIE_NAME = "auth_token";

        public JwtAuthenticationFilter(JwtUtil jwtUtil) {
            this.jwtUtil = jwtUtil;
        }

        /**
         * 从请求中获取 Token（优先从 Cookie，fallback 到 Authorization header）
         */
        private String extractToken(HttpServletRequest request) {
            // 1. 先尝试从 Cookie 获取
            if (request.getCookies() != null) {
                for (var cookie : request.getCookies()) {
                    if (TOKEN_COOKIE_NAME.equals(cookie.getName())) {
                        return cookie.getValue();
                    }
                }
            }
            // 2. Fallback 到 Authorization header
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
            return null;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {

            String token = extractToken(request);

            if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    String username = jwtUtil.extractUsername(token);
                    String userId = jwtUtil.extractUserId(token);

                    if (username != null && userId != null) {
                        if (jwtUtil.validateToken(token, username)) {
                            String role = jwtUtil.extractRole(token);

                            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                    userId,
                                    null,
                                    Collections.singletonList(
                                            new SimpleGrantedAuthority("ROLE_" + (role != null ? role : "USER"))));
                            SecurityContextHolder.getContext().setAuthentication(authToken);
                        }
                    }
                } catch (Exception e) {
                    // token无效，打印日志（生产环境）
                    // log.debug("JWT validation failed: {}", e.getMessage());
                }
            }

            chain.doFilter(request, response);
        }
    }
}