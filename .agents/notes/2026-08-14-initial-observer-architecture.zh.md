# Observer 初始架构

[English](2026-08-14-initial-observer-architecture.md) | 中文

状态：已实现

## 问题

DeepSeek Harness 已经记录并渲染执行轨迹。诊断插件需要识别执行反模式，同时不能重复实现 Trajectory、替换 telemetry 交付、修改 agent loop，或产生在 Session 重新加载后发生变化的诊断结果。

## 决策

`dsh-observer` 是一个可安装的 bundle 和 npm 包。Host 侧注册 `observerDiagnostics` 会话投影；browser 侧贡献 `diagnostics` conversation view。Host 与 Client 包会向 Cordis `Context` 接口合并不同的服务，因此两侧由独立的 TypeScript program 编译。

持久化 `SessionEvent` 日志是唯一的诊断输入。投影以纯 JSON 保存有界指纹、待配对的 Tool 关联、聚合计数器和有界诊断结果。对于与规则无关的事件，它返回同一个状态引用。每条诊断结果都会标识首个和最新的支撑事件序列，并使用离散的 `certainty` 等级，而不是未经校准的数值 confidence。

初始规则检测完全相同的连续 Tool 调用，以及重复出现的完全相同 Tool 错误证据。规则报告观测到的发生次数和耗时，不会把所有关联工作都归类为浪费，也不会把最早观测到的失败提升为语义根因。

browser 通过标准的 `useProjection` 接入点读取完整投影。它只负责展示，不维护重复的诊断存储。未来若要把证据交接给 Trajectory，需要该视图提供公开的事件序列 anchor 协议。

## 结果

Diagnostics 可以跨刷新、恢复、分页和投影缓存重建保持一致。Observer 可以与任意 `SessionTelemetryBackend` 共存。规则计算在 Session 事件路径上保持同步，因此高成本的语义相似度和模型辅助分析不会进入初始投影。有界 issue 列表会把每个投影载体保持在 UI 量级；后续可以通过详细证据 API 按需提供更大的材料。
