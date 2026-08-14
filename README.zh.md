# dsh-observer

[English](README.md) | 中文

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的基于证据的执行诊断。该插件从持久化 Session 日志中派生可重放的诊断结果，并在 Chat 和 Trajectory 旁增加 **Diagnostics** 视图。

初始规则有意只作范围严格的判断：

- 检测具有完全相同规范化执行参数的连续重复 Tool 调用；对于 Bash/Pwsh，`description` 文本会被排除，因为 Harness 将其定义为仅用于展示；
- 检测具有相同规范化错误证据的重复 Tool 失败，包括结构化 Tool 错误，以及 Harness Bash/Pwsh 工具发出的稳定非零退出码或 signal 标记；
- 统计整个 Session 的 Turns、Steps、模型调用、Tool 调用、失败、重试，以及提供方报告的 token。

每条诊断结果都携带其来源事件区间。时间和 token 数值描述已经观测到的工作；插件不会把它们标记为已证实的浪费，也不会声称某个语义根因。

## 架构

```text
SessionEvent log
      ↓
observerDiagnostics projection
      ↓
bounded DiagnosticIssue[]
      ↓
Diagnostics conversation view
```

该包是一个可安装的 Harness bundle，包含两个编译期部分：

- Host 插件在 `ctx.sessionProjections` 上注册一个同步、可 JSON 序列化的会话投影单元；
- browser 插件注册一个 `conversation.view` 配置项，并通过框架提供的 `useProjection` hook 读取该投影。

Observer 不使用 `SessionTelemetryBackend`。它仍与部署中现有的 OTel 或其他 telemetry 后端兼容。

## 开发

环境要求与 Harness 一致：Node `^22.19.0 || >=24` 和 pnpm。

```sh
pnpm install
pnpm run check
pnpm run build
```

本仓库基于公开的 Harness `0.1.0-rc.6` 包进行开发。运行时 peer 版本范围从 `0.1.0-rc.5` 开始，这与建立当前脚手架时相邻 Harness 检出目录的版本一致，并接受更新的 1.0 之前版本。

若要从相邻的 DeepSeek Harness 检出目录尝试本地版本：

```sh
pnpm dsh plugin --profile web add ../dsh-observer
pnpm dsh --profile web --dump-config
pnpm dsh --profile web
```

第一条命令会修改选定的本地 profile。如果不希望更改现有配置，请使用一次性的 profile。

## 从 GitHub 安装

Git 依赖拿到的是源文件，因此本包声明了 `prepare` 构建。pnpm 10+ 要求用户显式允许该构建。请固定到已经评审过的 commit，按照 pnpm 打印的构建授权提示操作，然后重试：

```sh
dsh plugin --profile web add github:lfc162874/dsh-observer#<commit>
```

若要发布到 registry，请移除 `private: true`，选择预期的 license，运行 `pnpm run check`，并在发布前检查 `pnpm run pack:check`。

## 配置

bundle 会插入以下默认值；后续 profile patch 可以替换该配置项完整的 `config` 值：

```yaml
- id: observer
  name: dsh-observer
  config:
    repeatCallThreshold: 3
    repeatedErrorThreshold: 2
    maxIssues: 50
```

所有阈值都必须是整数。检测阈值至少为 `2`；`maxIssues` 至少为 `1`。无效值会在插件加载期间直接失败。

## 模型体验

无。该插件读取已提交事件并发布客户端投影。它不会增加提示词、消息、工具、schema 或注入的上下文。

#### KV Cache 影响

无。Observer 不会组装或发送提供方请求。

## 已知限制与暂缓工作

- 第一条循环规则只覆盖完全相同的连续调用。循环 `A → B → A → B` 和结果相似度分析会暂缓，直到带标签的 fixture 能定义可接受的误报率。
- 重复错误匹配会移除 ANSI 控制序列并规范化空白，除此之外仍保持精确匹配。Shell 退出状态使用公开的 `@deepseek-ai/dsh-shell` 解析器；该规则有意不删除路径、行号或领域特定标识符。
- Diagnostics 到 Trajectory 的导航暂缓实现，因为当前 Trajectory 视图没有公开的事件序列 anchor 协议。
- 投影 payload 由 `maxIssues` 限制；较旧的诊断结果会从视图中移出，而聚合计数仍保持整个 Session 的完整值。
