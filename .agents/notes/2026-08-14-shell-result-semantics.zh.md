# Shell 结果语义

[English](2026-08-14-shell-result-semantics.md) | 中文

状态：已实现

## 问题

Harness Bash 和 Pwsh 工具有意把非零进程退出保持为 `isError: false`；它们的持久化结果文本会携带稳定的尾部 `[exit code: N]` 或 `[killed by signal: X]` 标记。必需的 `description` 参数仅用于展示。如果只把 `isError` 当作失败，就会漏掉重复命令失败；如果把 `description` 纳入哈希，又会把其他方面完全相同的执行拆成不同指纹。

## 决策

Observer 对 Bash/Pwsh 结果使用公开的 `@deepseek-ai/dsh-shell` `parseExitStatus()` 约定。非零退出或因 signal 终止的前台结果会计为失败的 Tool 调用，并参与重复错误匹配。Shell 调用指纹会忽略 `description`，但保留所有影响执行的字段。其他工具继续保留完整的规范化参数和结构化 `isError` 语义。

投影状态版本递增到 `2`，使缓存 Session 按这些语义重新重放。

## 结果

Diagnostics 视图对 Shell 退出状态的判断与 Harness terminal card 一致，并且即使 `description` 不同，也能检测重复的 build/test 失败。仅仅长得像标记的成功输出，如果没有 renderer 要求的前导换行，仍会被视为普通输出。Tool 特定的规范化逻辑保持显式，不会把启发式 key 删除规则应用到所有工具。
