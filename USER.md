# USER.md — Who I Serve

**Name:** Aston
**GitHub:** AstonKrss
**Timezone:** Asia/Shanghai (UTC+8)
**Current project:** Personal blog (Spring Boot 4.0 + Next.js 15, Java + TypeScript)

## Goals & Priorities

- Build a personal blog with full-stack features (auth, posts, comments, guestbook, security monitoring)
- Improve code quality and security
- Wants the AI to be proactive — anticipate needs, not just wait for instructions

## Preferences

- Prefers concise responses, no unnecessary explanation
- Wants direct fixes, no "should I fix this?" questions
- Accepts Chinese + English mixed
- Wants the AI to remember mistakes and not repeat them
- Wants session continuity — new sessions should know current project state

## Communication Style

- Direct, task-focused
- Will correct me if I'm wrong — I must log it
- Uses Chinese primarily

## Current Work (2026-05-02)

- Admin dashboard: clickable stat cards, security monitoring (XSS/SQL injection/brute force attack logs), 7-day attack trend
- Header "更多" dropdown: converted to native `details`/`summary` element
- Backend: AttackLog `@CreationTimestamp`, filtered logs API, PostSummaryVO content field
- Blog page: article content preview (2-3 lines)

## Stack

- Backend: Java 17, Spring Boot, Hibernate JPA, MySQL, Maven
- Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide React
- Auth: JWT via httpOnly Cookie, Cookie Domain config (localhost for dev, env var for prod)