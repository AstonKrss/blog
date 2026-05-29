# 代码审计 Agent 接入方案与后端搭建教程

检查时间：2026-05-22  
目标：在 Aston's Blog 中增加一个“代码审计 Agent”  
前端页面：`/security/tools/code-audit`  
前端调用后端接口：`POST /api/agents/code-audit/run`

## 你先理解 4 个概念

### 1. Agent 是什么

普通 AI 调用是：

```text
用户问题 -> 模型回答
```

Agent 是：

```text
用户任务 -> 模型思考 -> 调用工具 -> 读取资料/执行检查 -> 汇总结果 -> 输出结构化报告
```

代码审计 Agent 不应该只“看一段 prompt”。它应该能：

- 读取项目文件。
- 查找 Controller、Service、配置、依赖。
- 运行规则检查，比如密钥泄露、权限缺失、SSRF、SQL 注入。
- 必要时检索相关上下文。
- 输出结构化 findings：严重度、文件、行号、影响、修复建议。

OpenAI Agents SDK 把 Agent 定义为带 instructions、tools、guardrails、handoffs、sessions 的运行单元；SDK 默认基于 Responses API，可以帮你管理工具调用和运行流程。官方说明见 [OpenAI Agents SDK - Agents](https://openai.github.io/openai-agents-python/agents/)。

### 2. RAG 是什么

RAG = Retrieval-Augmented Generation，中文可以理解为“先检索，再回答”。

代码审计里的 RAG 是：

```text
把项目代码切成很多片段 -> 建索引 -> 用户发起审计 -> 先检索相关代码片段 -> Agent 基于检索结果审计
```

为什么需要 RAG：

- 项目代码太多，不能一次全塞进模型上下文。
- Agent 审计某个接口时，需要找到 Controller、Service、Entity、Repository、配置文件之间的关系。
- RAG 可以让模型只读取“相关文件片段”，省 token，也更稳定。

OpenAI 官方的 file_search 可以通过 vector store 检索已上传文件，Responses API 调用时把 `file_search` 作为工具传入即可。官方文档见 [OpenAI File Search](https://developers.openai.com/api/docs/guides/tools-file-search)。

### 3. Vector Store 是什么

Vector Store 就是“向量数据库/知识库”。你把代码文件上传进去，它会变成可检索的知识库。

在你的项目里可以这样理解：

```text
vector_store = 当前项目代码知识库
file = 一个 Java/TS/Python/配置文件
chunk = 文件里的一小段代码
metadata = 文件路径、语言、模块、commit hash
```

后续 Agent 审计时，可以问：

```text
检索和 SecurityConfig、ProjectController、权限校验相关的代码
```

模型就能拿到更精准的上下文。

### 4. Guardrails 是什么

Guardrails 是防护栏。比如：

- 不允许审计超大仓库。
- 不允许审计内网路径或服务器敏感目录。
- 不允许 Agent 输出攻击利用脚本。
- 要求输出必须是 JSON schema。

OpenAI Agents SDK 支持 input guardrails 和 output guardrails。官方说明见 [OpenAI Agents SDK - Guardrails](https://openai.github.io/openai-agents-python/guardrails/)。

---

## 推荐架构

你的项目已经有：

- Spring Boot 后端：认证、用户、业务数据、MySQL。
- Python FastAPI 服务：安全工具、任务、SSE。
- Next.js 前端：页面和工具箱。

推荐不要把 Agent 全塞进 Spring Boot。更清晰的方案是：

```text
Next.js 前端
  -> Spring Boot /api/agents/code-audit/*
    -> 校验登录/管理员权限
    -> 保存任务到 MySQL
    -> 调用 Python Agent Worker
      -> 拉取/读取代码
      -> 建 RAG 索引
      -> 调用 OpenAI Agents SDK / Responses API
      -> 保存 findings
    -> Spring Boot 返回任务结果
```

为什么这样设计：

- Spring Boot 继续负责权限和业务数据。
- Python 更适合跑 Agent SDK、代码解析、异步 worker。
- 后续你还可以加更多 Agent，比如简历优化 Agent、漏洞复现 Agent、文章生成 Agent。

---

## 目录规划

建议新增：

```text
blog/
├── src/main/java/com/aston/blog/
│   ├── Controller/CodeAuditAgentController.java
│   ├── Service/CodeAuditAgentService.java
│   ├── Service/impl/CodeAuditAgentServiceImpl.java
│   ├── dto/CodeAuditRunDTO.java
│   ├── entity/CodeAuditTask.java
│   ├── entity/CodeAuditFinding.java
│   ├── repository/CodeAuditTaskRepository.java
│   └── repository/CodeAuditFindingRepository.java
├── python/
│   ├── routers/code_audit.py
│   ├── services/code_audit_agent.py
│   ├── services/code_indexer.py
│   ├── services/repo_loader.py
│   └── prompts/code_audit_agent.md
└── docs/
    └── CODE_AUDIT_AGENT_BUILD_GUIDE_2026-05-22.md
```

---

## 后端接口设计

前端已经按下面接口写好了。

### 1. 发起审计

```http
POST /api/agents/code-audit/run
Authorization: Bearer <token>
Content-Type: application/json
```

请求体：

```json
{
  "sourceType": "repository",
  "repositoryUrl": "https://github.com/owner/repo.git",
  "branch": "main",
  "includePaths": ["src/main/java", "frontend/app", "frontend/components"],
  "excludePaths": ["target", "node_modules", ".next", "uploads"],
  "scanDepth": "standard",
  "useRag": true,
  "focusAreas": ["auth", "injection", "ssrf", "file-upload", "secrets"]
}
```

也支持粘贴代码：

```json
{
  "sourceType": "paste",
  "pastedCode": "public class Demo { ... }",
  "scanDepth": "quick",
  "useRag": false,
  "focusAreas": ["auth", "injection"]
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "uuid",
    "status": "COMPLETED",
    "score": 72,
    "summary": "发现 1 个高危 SSRF 风险、1 个中危权限问题。",
    "checkedFiles": 38,
    "model": "gpt-5.4",
    "durationMs": 18320,
    "findings": [
      {
        "severity": "high",
        "title": "用户可控 URL 被服务端直接请求",
        "file": "src/main/java/com/aston/blog/Controller/SecurityToolsController.java",
        "line": 194,
        "category": "SSRF",
        "impact": "攻击者可能借服务器访问内网服务。",
        "recommendation": "限制协议为 http/https，解析 DNS 后阻止内网地址。"
      }
    ]
  }
}
```

### 2. 查询任务详情

```http
GET /api/agents/code-audit/tasks/{taskId}
```

### 3. 查询历史任务

```http
GET /api/agents/code-audit/tasks?page=1&limit=20
```

### 4. 重建当前项目索引

```http
POST /api/agents/code-audit/index
```

这个接口用于把当前博客项目代码重新上传/同步到 vector store。

---

## 数据库表设计

### 1. 审计任务表

```sql
CREATE TABLE code_audit_tasks (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  repository_url VARCHAR(500),
  branch VARCHAR(100),
  scan_depth VARCHAR(20) NOT NULL,
  use_rag BOOLEAN NOT NULL DEFAULT TRUE,
  focus_areas VARCHAR(500),
  status VARCHAR(20) NOT NULL,
  score INT,
  summary TEXT,
  checked_files INT DEFAULT 0,
  model VARCHAR(100),
  vector_store_id VARCHAR(100),
  error_message TEXT,
  duration_ms BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  finished_at DATETIME,
  INDEX idx_code_audit_tasks_user_created (user_id, created_at DESC),
  INDEX idx_code_audit_tasks_status_created (status, created_at DESC)
);
```

### 2. 审计发现表

```sql
CREATE TABLE code_audit_findings (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  file_path VARCHAR(500),
  line_number INT,
  impact TEXT,
  recommendation TEXT,
  evidence TEXT,
  created_at DATETIME NOT NULL,
  INDEX idx_code_audit_findings_task (task_id),
  INDEX idx_code_audit_findings_severity (severity),
  CONSTRAINT fk_code_audit_findings_task
    FOREIGN KEY (task_id) REFERENCES code_audit_tasks(id)
    ON DELETE CASCADE
);
```

### 3. 代码索引表

```sql
CREATE TABLE code_audit_indexes (
  id VARCHAR(36) PRIMARY KEY,
  repo_key VARCHAR(255) NOT NULL,
  commit_hash VARCHAR(100),
  vector_store_id VARCHAR(100),
  indexed_files INT DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_code_audit_indexes_repo_commit (repo_key, commit_hash)
);
```

---

## Spring Boot 后端步骤

### 第 1 步：增加 DTO

`CodeAuditRunDTO.java`

```java
package com.aston.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class CodeAuditRunDTO {
    @NotBlank
    private String sourceType; // repository / paste

    private String repositoryUrl;
    private String branch;
    private String pastedCode;

    private List<String> includePaths;
    private List<String> excludePaths;
    private List<String> focusAreas;

    private String scanDepth = "standard"; // quick / standard / deep
    private Boolean useRag = true;
}
```

### 第 2 步：增加 Entity

`CodeAuditTask.java`

```java
@Data
@Entity
@Table(name = "code_audit_tasks")
public class CodeAuditTask {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "source_type", nullable = false)
    private String sourceType;

    @Column(name = "repository_url")
    private String repositoryUrl;

    private String branch;

    @Column(name = "scan_depth")
    private String scanDepth;

    @Column(name = "use_rag")
    private Boolean useRag;

    @Column(name = "focus_areas")
    private String focusAreas;

    private String status;
    private Integer score;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "checked_files")
    private Integer checkedFiles;

    private String model;

    @Column(name = "vector_store_id")
    private String vectorStoreId;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "duration_ms")
    private Long durationMs;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;
}
```

`CodeAuditFinding.java`

```java
@Data
@Entity
@Table(name = "code_audit_findings")
public class CodeAuditFinding {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "task_id", nullable = false)
    private String taskId;

    private String severity;
    private String title;
    private String category;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "line_number")
    private Integer lineNumber;

    @Column(columnDefinition = "TEXT")
    private String impact;

    @Column(columnDefinition = "TEXT")
    private String recommendation;

    @Column(columnDefinition = "TEXT")
    private String evidence;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
```

### 第 3 步：增加 Repository

```java
public interface CodeAuditTaskRepository extends JpaRepository<CodeAuditTask, String> {
    Page<CodeAuditTask> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
}
```

```java
public interface CodeAuditFindingRepository extends JpaRepository<CodeAuditFinding, String> {
    List<CodeAuditFinding> findByTaskIdOrderByCreatedAtAsc(String taskId);
    void deleteByTaskId(String taskId);
}
```

### 第 4 步：增加 Controller

`CodeAuditAgentController.java`

```java
@RestController
@RequestMapping("/api/agents/code-audit")
public class CodeAuditAgentController {

    private final CodeAuditAgentService service;

    public CodeAuditAgentController(CodeAuditAgentService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public Result<?> run(@Valid @RequestBody CodeAuditRunDTO dto) {
        String userId = currentUserId();
        if (userId == null) return Result.error(401, "未登录");
        return Result.success(service.runAudit(dto, userId));
    }

    @GetMapping("/tasks/{id}")
    public Result<?> getTask(@PathVariable String id) {
        String userId = currentUserId();
        if (userId == null) return Result.error(401, "未登录");
        return Result.success(service.getTask(id, userId));
    }

    @GetMapping("/tasks")
    public Result<?> listTasks(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        String userId = currentUserId();
        if (userId == null) return Result.error(401, "未登录");
        return Result.success(service.listTasks(userId, page, limit));
    }

    private String currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return null;
        Object principal = auth.getPrincipal();
        return principal instanceof String ? (String) principal : null;
    }
}
```

### 第 5 步：Spring 调用 Python Agent 服务

配置：

```yaml
agent:
  python-url: ${PYTHON_API_URL:http://localhost:8000}
```

Service 里：

```java
@Value("${agent.python-url:http://localhost:8000}")
private String pythonApiUrl;
```

调用 Python：

```java
HttpHeaders headers = new HttpHeaders();
headers.setContentType(MediaType.APPLICATION_JSON);
headers.setBearerAuth(internalServiceToken);

HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
ResponseEntity<Map> response = restTemplate.postForEntity(
    pythonApiUrl + "/api/agent/code-audit/run",
    entity,
    Map.class
);
```

注意：

- 内部服务调用不要直接用用户 JWT。
- 用 `AGENT_INTERNAL_TOKEN` 做服务间认证。
- Python 服务只接受内网请求或内部 token。

---

## Python Agent Worker 步骤

### 第 1 步：安装依赖

`python/requirements.txt` 增加：

```txt
openai>=2.0.0
openai-agents>=0.2.0
gitpython>=3.1.43
tree-sitter>=0.23.0
```

如果暂时不想用 Agents SDK，可以先只用 OpenAI Responses API。

### 第 2 步：环境变量

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4
AGENT_INTERNAL_TOKEN=change-me
CODE_AUDIT_WORKDIR=/tmp/code-audit
CODE_AUDIT_MAX_FILES=300
CODE_AUDIT_MAX_FILE_BYTES=200000
```

### 第 3 步：新增路由

`python/routers/code_audit.py`

```python
from fastapi import APIRouter, Header, HTTPException
from services.code_audit_agent import run_code_audit
import os

router = APIRouter(prefix="/api/agent/code-audit", tags=["代码审计 Agent"])

def verify_internal_token(authorization: str | None):
    expected = os.getenv("AGENT_INTERNAL_TOKEN")
    if not expected:
        raise HTTPException(status_code=500, detail="AGENT_INTERNAL_TOKEN 未配置")
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="内部服务认证失败")

@router.post("/run")
async def run(payload: dict, authorization: str | None = Header(default=None)):
    verify_internal_token(authorization)
    return await run_code_audit(payload)
```

在 `python/app.py` 注册：

```python
from routers import code_audit
app.include_router(code_audit.router)
```

### 第 4 步：仓库加载器

`python/services/repo_loader.py`

核心职责：

- clone 仓库到临时目录。
- checkout 指定 branch。
- 只读取 includePaths。
- 跳过 excludePaths。
- 跳过二进制文件、大文件、依赖目录。
- 返回文件路径和内容。

伪代码：

```python
import os
import shutil
import tempfile
from git import Repo

TEXT_EXTS = {
    ".java", ".kt", ".ts", ".tsx", ".js", ".jsx", ".py", ".yml", ".yaml",
    ".properties", ".xml", ".json", ".md", ".sql", ".dockerfile"
}

def load_repository(repo_url: str, branch: str, include_paths: list[str], exclude_paths: list[str]):
    workdir = tempfile.mkdtemp(prefix="code-audit-")
    Repo.clone_from(repo_url, workdir, branch=branch or "main", depth=1)
    return collect_files(workdir, include_paths, exclude_paths)

def collect_files(root: str, include_paths: list[str], exclude_paths: list[str]):
    files = []
    for dirpath, _, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root).replace("\\", "/")
        if should_skip(rel_dir, exclude_paths):
            continue
        for name in filenames:
            rel_path = os.path.join(rel_dir, name).replace("\\", "/")
            if should_skip(rel_path, exclude_paths):
                continue
            if include_paths and not any(rel_path.startswith(p) for p in include_paths):
                continue
            if os.path.splitext(name)[1].lower() not in TEXT_EXTS:
                continue
            full_path = os.path.join(root, rel_path)
            if os.path.getsize(full_path) > int(os.getenv("CODE_AUDIT_MAX_FILE_BYTES", "200000")):
                continue
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                files.append({"path": rel_path, "content": f.read()})
    return files
```

安全注意：

- 不允许 clone `file://`、内网地址、localhost。
- 私有仓库后续再支持，不要一开始就接用户 token。
- 限制文件数、文件大小、总大小。
- 临时目录用完必须删除。

### 第 5 步：RAG 索引器

两种方案。

#### 方案 A：使用 OpenAI vector store + file_search

优点：

- 最快落地。
- 不需要自己维护向量数据库。
- Responses API 可直接用 `file_search` 工具。

流程：

```text
代码文件 -> 上传到 OpenAI Files -> 加入 vector store -> Responses API 使用 file_search
```

示例：

```python
from openai import OpenAI
client = OpenAI()

def create_vector_store(files: list[dict]) -> str:
    vector_store = client.vector_stores.create(name="code-audit")
    for item in files:
        local_path = write_temp_file(item["path"], item["content"])
        uploaded = client.files.create(
            file=open(local_path, "rb"),
            purpose="assistants",
        )
        client.vector_stores.files.create(
            vector_store_id=vector_store.id,
            file_id=uploaded.id,
        )
    return vector_store.id
```

调用模型时：

```python
response = client.responses.create(
    model=os.getenv("OPENAI_MODEL", "gpt-5.4"),
    input=prompt,
    tools=[{
        "type": "file_search",
        "vector_store_ids": [vector_store_id],
        "max_num_results": 20
    }],
    include=["file_search_call.results"]
)
```

官方文档说明 file_search 是 Responses API 工具，可让模型在已上传文件知识库中检索信息；使用前需要先创建 vector store 并上传文件。见 [OpenAI File Search](https://developers.openai.com/api/docs/guides/tools-file-search)。

#### 方案 B：自己做向量库

可选技术：

- Redis Stack Vector Search
- PostgreSQL + pgvector
- Milvus
- Qdrant

优点：

- 数据完全在你自己服务器。
- 可控性更强。

缺点：

- 搭建复杂。
- 要自己做 chunk、embedding、召回、rerank。

新手建议先用方案 A。

### 第 6 步：Agent Prompt

`python/prompts/code_audit_agent.md`

```md
你是一个资深代码安全审计 Agent。你要审计一个全栈博客项目。

审计重点：
1. 认证与授权：未登录访问、越权、IDOR、角色校验缺失。
2. 注入风险：SQL 注入、命令注入、路径穿越、模板注入。
3. SSRF：用户可控 URL、host、domain 被服务端访问。
4. 文件上传：扩展名、MIME、内容校验、存储路径、静态资源执行风险。
5. 密钥泄露：密码、token、邮箱授权码、JWT secret。
6. 前后端接口是否一致。
7. 性能风险：N+1、缺少索引、大表聚合。

输出必须是 JSON，不要输出 Markdown：
{
  "score": 0-100,
  "summary": "...",
  "checkedFiles": 0,
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "title": "...",
      "category": "...",
      "file": "...",
      "line": 1,
      "impact": "...",
      "recommendation": "...",
      "evidence": "..."
    }
  ]
}

规则：
- 不确定时标为 info，并说明需要人工确认。
- 不要编造文件路径和行号。
- 修复建议要能直接指导工程师修改。
- 不输出攻击利用代码。
```

### 第 7 步：Agent 主逻辑

`python/services/code_audit_agent.py`

```python
import json
import os
from openai import OpenAI
from services.repo_loader import load_repository
from services.code_indexer import create_vector_store

client = OpenAI()

async def run_code_audit(payload: dict) -> dict:
    source_type = payload.get("sourceType")

    if source_type == "repository":
        files = load_repository(
            payload["repositoryUrl"],
            payload.get("branch") or "main",
            payload.get("includePaths") or [],
            payload.get("excludePaths") or [],
        )
    else:
        files = [{
            "path": "pasted-code.txt",
            "content": payload.get("pastedCode", "")
        }]

    if len(files) == 0:
        return {
            "score": 0,
            "summary": "没有找到可审计的代码文件。",
            "checkedFiles": 0,
            "findings": []
        }

    vector_store_id = None
    tools = []
    if payload.get("useRag", True):
        vector_store_id = create_vector_store(files)
        tools.append({
            "type": "file_search",
            "vector_store_ids": [vector_store_id],
            "max_num_results": 20
        })

    prompt = build_prompt(payload, files, use_rag=bool(tools))

    response = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-5.4"),
        input=prompt,
        tools=tools,
    )

    text = response.output_text
    result = json.loads(text)
    result["vectorStoreId"] = vector_store_id
    result["model"] = os.getenv("OPENAI_MODEL", "gpt-5.4")
    return result
```

`build_prompt()` 建议：

- RAG 开启时，只传文件清单和重点入口，不把全部代码塞进去。
- RAG 关闭时，粘贴代码可以直接放入 prompt。
- 仓库代码很多时，先用规则扫描器找候选文件，再让 Agent 看候选文件。

---

## 更稳的 Agent 工作流

第一版可以一个 Agent 做完。第二版建议拆成 4 步：

```text
1. FileCollector：收集文件和元信息
2. RuleScanner：正则/AST 静态规则扫描
3. AuditAgent：结合 RAG 做安全审计
4. ReportFormatter：把输出整理成 JSON 和 Markdown
```

为什么要先跑 RuleScanner：

- 便宜、快、稳定。
- 可以先抓硬编码密钥、`permitAll`、`RestTemplate` 用户 URL、`Runtime.exec`、`Files.write`、`MultipartFile` 等高风险模式。
- Agent 再基于这些候选点深入分析，效果更好。

规则示例：

```python
RULES = [
    {
        "id": "spring-permit-all",
        "pattern": r"anyRequest\\(\\)\\.permitAll\\(",
        "severity": "high",
        "category": "Authorization",
    },
    {
        "id": "hardcoded-secret",
        "pattern": r"(password|secret|token|apiKey)\\s*[:=]\\s*[\"'][^\"']{8,}[\"']",
        "severity": "high",
        "category": "Secrets",
    },
    {
        "id": "ssrf-rest-template",
        "pattern": r"RestTemplate|new URL\\(|Socket\\(",
        "severity": "medium",
        "category": "SSRF",
    },
]
```

---

## Spring Boot 保存 Agent 结果

Python 返回结果后，Spring Boot 做：

1. 更新 `code_audit_tasks.status = COMPLETED`。
2. 保存 score、summary、checkedFiles、model、durationMs。
3. 删除旧 findings。
4. 插入新 findings。

伪代码：

```java
@Transactional
public CodeAuditResultVO saveResult(String taskId, Map<String, Object> result) {
    CodeAuditTask task = taskRepository.findById(taskId)
            .orElseThrow(() -> new RuntimeException("任务不存在"));

    task.setStatus("COMPLETED");
    task.setScore((Integer) result.get("score"));
    task.setSummary((String) result.get("summary"));
    task.setCheckedFiles((Integer) result.get("checkedFiles"));
    task.setModel((String) result.get("model"));
    task.setFinishedAt(LocalDateTime.now());
    taskRepository.save(task);

    findingRepository.deleteByTaskId(taskId);
    // 遍历 result.findings 保存
    return convertToVO(task);
}
```

---

## 同步还是异步

### 第一版：同步

前端点按钮后等待结果。

优点：

- 最容易做。
- 前端现在已经能接同步结果。

缺点：

- 大仓库会超时。
- 用户关闭页面任务就不好追踪。

### 第二版：异步

```text
POST /run -> 返回 taskId + RUNNING
后台 worker 执行
GET /tasks/{id} -> 查询结果
SSE /tasks/{id}/events -> 实时进度
```

建议最终做异步。你项目已有 OSS SSE 经验，可以复用那套模式。

---

## 权限与安全设计

这个功能必须小心，因为它会读取代码、访问仓库、调用模型。

### 1. 权限

建议第一版只允许 ADMIN：

```java
if (!"ADMIN".equals(role)) {
    return Result.error(403, "无权限");
}
```

后续可以允许 AUTHOR 审计自己上传的代码片段，但不能审计服务器本地路径。

### 2. 仓库限制

第一版只允许：

- GitHub HTTPS 公共仓库。
- 不支持内网 Git。
- 不支持 `file://`。
- 不支持服务器本地绝对路径。

禁止：

```text
file:///etc/passwd
http://127.0.0.1/repo.git
http://localhost/repo.git
http://10.0.0.1/repo.git
ssh://...
```

### 3. 大小限制

建议：

```text
最大文件数：300
单文件最大：200KB
总字符数：3MB
单任务超时：120 秒
单用户并发：1-2 个任务
```

### 4. 数据脱敏

上传代码到外部模型前，建议做密钥脱敏：

```text
sk-xxxx -> [REDACTED_OPENAI_KEY]
password=xxxx -> password=[REDACTED]
MAIL_PASSWORD=xxxx -> MAIL_PASSWORD=[REDACTED]
```

注意：

- 脱敏不要破坏代码结构。
- findings 里可以说“发现疑似密钥”，但不要回显完整密钥。

### 5. 输出限制

不要让 Agent 输出：

- 可直接攻击第三方系统的完整利用脚本。
- 真实密钥。
- 大段源码。

---

## 前端已经做了什么

已经新增页面：

```text
frontend/app/security/tools/code-audit/page.tsx
```

已经在工具箱增加入口：

```text
frontend/app/security/tools/page.tsx
```

页面能力：

- 选择 Git 仓库或粘贴代码。
- 设置 branch、includePaths、excludePaths。
- 选择扫描深度。
- 选择审计重点。
- 开关 RAG。
- 调用 `POST /api/agents/code-audit/run`。
- 展示 score、summary、findings。
- 后端未接入时展示错误，同时保留结果示例。

---

## 本地开发步骤

### 第 1 步：准备环境变量

根目录 `.env` 或服务器环境：

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4
AGENT_INTERNAL_TOKEN=change-me
PYTHON_API_URL=http://localhost:8000
```

Docker Compose：

```yaml
backend:
  environment:
    PYTHON_API_URL: http://python:8000
    AGENT_INTERNAL_TOKEN: ${AGENT_INTERNAL_TOKEN}

python:
  environment:
    OPENAI_API_KEY: ${OPENAI_API_KEY}
    OPENAI_MODEL: ${OPENAI_MODEL}
    AGENT_INTERNAL_TOKEN: ${AGENT_INTERNAL_TOKEN}
```

### 第 2 步：建表

执行上面的 3 张表 SQL。

### 第 3 步：写 Spring Boot Controller/Service

先只做同步版：

```text
前端 -> Spring Boot -> Python -> OpenAI -> Python -> Spring Boot -> 前端
```

### 第 4 步：写 Python 路由

增加：

```text
python/routers/code_audit.py
python/services/code_audit_agent.py
python/services/repo_loader.py
python/services/code_indexer.py
python/prompts/code_audit_agent.md
```

### 第 5 步：启动

```bash
# 后端
mvn spring-boot:run

# Python
cd python
python app.py

# 前端
cd frontend
npm run dev
```

访问：

```text
http://localhost:3000/security/tools/code-audit
```

---

## 测试清单

### 后端接口测试

1. 未登录调用 `/api/agents/code-audit/run` 返回 401。
2. 非 ADMIN 调用返回 403。
3. 空仓库地址返回 400。
4. `file://`、`localhost`、内网地址被拒绝。
5. 超大仓库被拒绝。
6. 粘贴代码模式可以返回 findings。
7. Python 服务不可用时，Spring Boot 返回清晰错误。
8. OpenAI API 失败时任务状态变成 FAILED。

### Agent 输出测试

准备一个包含以下问题的小仓库：

- `permitAll`
- 硬编码 password
- RestTemplate 请求用户 URL
- MultipartFile 未校验
- `LIKE '%keyword%'`

期望：

- Agent 至少发现 3 个高/中危问题。
- findings 里有文件路径、行号、影响和修复建议。
- 不回显完整密钥。

### 前端测试

1. `/security/tools` 能看到“代码审计 Agent”入口。
2. `/security/tools/code-audit` 页面能打开。
3. 空输入点击审计会提示。
4. 后端没接入时会显示错误。
5. 后端接入后能展示 findings。

---

## 后续可以升级什么

### 1. 支持 SSE 进度

```text
正在克隆仓库
正在收集文件
正在创建向量索引
正在执行规则扫描
正在运行 Agent
正在生成报告
完成
```

### 2. 支持多 Agent

```text
Manager Agent
  -> Auth Audit Agent
  -> Injection Audit Agent
  -> Frontend XSS Agent
  -> Dependency Risk Agent
  -> Report Agent
```

先不要一上来做多 Agent。第一版一个 Agent 更稳。

### 3. 支持 PR 审计

输入 GitHub PR URL，只审计 diff。

需要：

- GitHub token
- 拉取 changed files
- 只对 diff 和关联上下文做 RAG

### 4. 支持一键生成修复建议 PR

这一步风险高，建议晚点做。

流程：

```text
Agent 发现问题 -> 生成 patch -> 人工预览 -> 创建分支 -> 提 PR
```

### 5. 接入 Tracing

OpenAI Agents SDK 默认支持 tracing，可记录模型生成、工具调用、handoff、guardrails 等运行事件，方便调试和生产监控。官方说明见 [OpenAI Agents SDK - Tracing](https://openai.github.io/openai-agents-python/tracing/)。

---

## 推荐第一版最小实现

如果你想最快跑起来，先做这个版本：

1. 前端使用已经新增的 `/security/tools/code-audit` 页面。
2. Spring Boot 增加 `POST /api/agents/code-audit/run`。
3. Spring Boot 校验 ADMIN。
4. Python 增加 `/api/agent/code-audit/run`。
5. Python 只支持粘贴代码和当前项目本地代码，不先支持任意 Git 仓库。
6. 不先做 vector store，直接把小范围文件内容发给模型。
7. 输出 JSON findings。

跑通后再加：

1. Git 仓库 clone。
2. vector store + file_search。
3. 异步任务 + SSE。
4. 历史任务和报告导出。

这样学习成本最低，也最不容易中途卡住。
