# 笔记列表 N+1 优化记录

> 日期：2026-11-04  
> 范围：`GET /api/public/notes`、`GET /api/notes`

## 1. 问题

改造前 `NoteServiceImpl.enrichNotes()` 对一页笔记逐条查询评论：

```java
for (Note note : notes) {
    noteCommentRepository.findByNoteIdOrderByCreatedAtAsc(note.getId());
}
```

`buildCommentTree()` 内部还会为每篇笔记单独查询评论作者。假设一页 20 条笔记，每次都有评论，主要 SQL 次数约为：

| 查询 | 次数 |
|---|---:|
| 笔记分页 | 1 |
| 分页 count | 1 |
| 评论 | 20 |
| 评论作者 | 20 |
| 当前用户点赞 | 1（加载该用户全部点赞） |
| 合计 | 约 43 |

这就是 N+1：列表查询只有一次，但每条记录又触发关联查询，SQL 次数随页大小线性增长。

## 2. 改造方案

采用“当前页批量查询 + 内存分组回装”：

1. 先查询当前页笔记，收集 `noteIds`。
2. 用一次 `WHERE note_id IN (...)` 查询当前页所有评论。
3. 按 `noteId` 分组。
4. 收集评论中的 `userId`，用一次 `findAllById` 查询作者。
5. 当前用户点赞状态只查询当前页笔记，不再加载用户全部点赞。
6. 对每篇笔记建完整评论树，再截取前 3 条根评论。

改造后主要 SQL 次数：

| 查询 | 次数 |
|---|---:|
| 笔记分页 | 1 |
| 分页 count | 1 |
| 当前页评论 | 1 |
| 评论作者 | 1 |
| 当前页点赞状态 | 1 |
| 合计 | 约 5 |

## 3. 关键代码

- `NoteCommentRepository.findByNoteIdInOrderByNoteIdAscCreatedAtAsc(...)`
- `NoteLikeRepository.findByUserIdAndNoteIdIn(...)`
- `NoteServiceImpl.enrichNotes(...)`
- `NoteServiceImpl.loadUsers(...)`
- `NoteServiceImpl.buildCommentTree(flat, userMap)`

评论查询按 `noteId ASC, createdAt ASC` 排序，分组后每篇笔记内部仍然是时间正序。

## 4. 语义保持

- 前端接口路径和返回结构不变。
- 每篇笔记仍然只返回前 3 条根评论。
- 截断发生在建树之后，避免把子评论误当成根评论。
- 单篇详情 `GET /api/notes/{id}` 和评论列表接口仍然返回完整评论树。

## 5. 测试

新增 `NoteServiceImplTest`，覆盖：

- 一页笔记只调用一次批量评论查询和一次作者查询。
- 评论按 `noteId` 正确分组。
- 每篇笔记只返回前 3 条根评论，子评论保留。
- 登录用户只查询当前页点赞状态。
- 单篇详情仍返回完整评论树。

验证结果：

```text
NoteServiceImplTest: 3 tests, 0 failures, 0 errors
后端测试（排除受临时目录权限影响的 LocalFileStorageTest）: 62 tests, 0 failures, 0 errors
```

## 6. 取舍与后续

当前采用方案 A：加载当前页涉及的全部评论，再在内存中建树。实现简单、语义正确，适合当前数据规模。

如果以后单篇笔记评论量非常大，可以升级为方案 B：用 SQL 窗口函数先选出每篇前 3 条根评论，再查询这些根评论的子评论，减少加载量，但 SQL 和组装逻辑会更复杂。
## 7. 压测结果

使用独立测试库 `myblog_bench` 生成：

```text
10,000 notes
100,000 note_comments
10,000 note_likes
```

关键结果：

| 指标 | 无索引 | 有索引 |
|---|---:|---:|
| 10 VU P95 | 117.02 ms | 13.98 ms |
| 50 VU P95 | 557.05 ms（临时移除索引） | 11.01 ms |
| 批量评论扫描行数 | 约 100,200 行/次 | 200 行/次 |
| 批量评论平均耗时 | 49.768 ms | 1.202 ms |

完整报告见 `docs/BENCHMARK_N1_2026-11-04.md`。

