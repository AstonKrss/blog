# MEMORY.md — Long-Term Curated Memory

## Project: Aston Blog

### Architecture
- **Backend:** Spring Boot 4.0 + Hibernate JPA + MySQL + Maven
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + Lucide React
- **Auth:** JWT via httpOnly Cookie (NOT localStorage)
- **Paths:** Backend in `src/main/java/com/aston/blog/`, Frontend in `frontend/`

### Key Decisions
- Cookie Domain: `localhost` for dev, `COOKIE_DOMAIN` env var for prod
- Static files: `/uploads/**` needs `WebMvcConfigurer.addResourceHandlers()`
- Config: Single `application.yml`, delete `application.properties` (priority conflict)
- Table creation: `ddl-auto=update` auto-creates tables

### Security
- JWT token must be httpOnly cookie, NOT localStorage (XSS vulnerable)
- Guestbook module: had to create full CRUD (Controller/Service/Entity/Repository/VO)
- AttackLog entity: needs `@CreationTimestamp` for trend data, manual `@PrePersist` unreliable
- Filters: SecurityFilter logs attacks and blocks brute force (10 fails / 15 min)

### Frontend Patterns
- Native `details`/`summary` for dropdown (no JS timing issues)
- `useState` + `useEffect` for interactive dashboard panels
- API calls: `/api/admin/security/stats` and `/api/admin/security/logs?attackType=X`

## User: AstonKrss

### Preferences
- Concise responses, no over-explanation
- Direct fixes, no "should I?"
- Chinese + English mix OK
- Wants corrections remembered automatically

### Communication
- Uses Chinese primarily
- Will correct directly — log it immediately
- Prefers proactive, not wait-for-instruction

## Context Continuity

### 2026-05-02 — Skills 安装 + Memory 系统激活
- Skills 安装：`clawhub install` 后需重启 Claude Code 才能生效（教训写入 projects/blog.md）
- 建立了完整记忆系统：USER.md / SOUL.md / SESSION-STATE.md / MEMORY.md / memory/
- self-improving: `~/self-improving/` 已有 corrections.md + memory.md，新增 `projects/blog.md`
- 记忆激活：纠正即写、会话状态即写、偏好即写、项目上下文即写

### 2026-05-02 — Skills Installed
- clawhub install: browser, code-review, github, multi-search-engine (in `.claude/skills/`)
- self-improving memory already existed at `C:\Users\32239\self-improving/`
- proactive-agent SKILL loaded → created: USER.md, SOUL.md, SESSION-STATE.md, MEMORY.md
- WAL protocol: corrections/decisions → SESSION-STATE.md BEFORE responding

### Known Issues (Pending)
- Backend restart needed for: AttackLog trend, filtered logs API, PostSummaryVO content
- Admin dashboard: stat cards clickable ✅, security card filters ✅, trend data after restart