# 外部 bundle 的运行时服务

[English](2026-08-14-external-bundle-runtime-services.md) | 中文

状态：已实现

## 问题

初始 bundle 挂载了一个 `dsh-observer/invariant` 配套项，该实现照搬了仓库内包的约定。已发布的 DeepSeek Harness Web profile 会安装 invariants 包，但不会挂载其 `invariants` 服务。因此该配套项一直保持 PENDING，激活审计随之拒绝整棵插件树。

## 决策

out-of-tree bundle 只挂载 Observer Host 插件。它不导出或挂载 invariant 配套项，也不引入全局 invariants 提供方。Observer 唯一必需的运行时关系，是其 Host 插件声明的公开 `sessionProjections` 服务。

## 结果

该 bundle 可以在已发布的 Web profile 中激活，而不会改变 profile 的全局诊断服务。仓库内部的 invariant 配套项仍是 in-tree 包治理机制，而不是外部插件的安装要求。
