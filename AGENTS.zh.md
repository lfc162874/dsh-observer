# AGENTS.md

[English](AGENTS.md) | 中文

`dsh-observer` 是一个 out-of-tree DeepSeek Harness bundle。它在不修改 agent loop（智能体循环）的情况下增加基于证据的诊断。

## 架构

- `src/index.ts` 是 Host 函数插件。它在 `ctx.sessionProjections` 上注册一个纯 `observerDiagnostics` 投影单元。
- `src/client/index.ts` 是 Web Client 插件。它向现有 `conversation.view` slot 贡献 `diagnostics` 配置项。
- `src/types.ts` 是唯一共享的 Host/Client 领域约定。该文件不得包含运行时 import。
- `cordis.patch.yml` 是可安装的 bundle 层。该包在 `package.json` 中同时声明 `dsh.bundle` 和 `dsh.client`。
- Host 与 Client 使用独立的 TypeScript program 编译，因为两侧对 Cordis `Context` 的声明合并不同。

## 规则

- 只从持久化 `SessionEvent` 记录派生诊断，确保刷新、恢复和重放得到相同结果。
- 不要使用 `SessionTelemetryBackend` 作为数据源；它是外部上报后端，并且每个上下文只允许一个提供方。
- 投影状态转移必须保持同步、确定性、可 JSON 序列化且有界。对于无关事件，返回同一个状态引用。
- 每条诊断结果都携带事件序列证据。不要把关联的时间或 token 表述为已证实的浪费。
- 在通过带标签的语料完成校准之前，禁止使用数值 confidence。使用离散的 `certainty` 词汇。
- 因部署而异的阈值和结果上限必须放入导出的 `Config` schema，并在值无效时明确失败。
- UI 组合只能在 `ctx.slots.inject` 内通过 `ctx.slots.register` 完成。组件不得接收或 import `ctx`。
- browser 业务状态必须通过框架 hook 获取；不要创建第二套订阅，也不要把投影状态复制到另一个存储中。
- 通过 CSS Modules 使用 Harness `--dsw-*` 语义 token。产品文案使用双语；注释和标识符使用英文。
- 仅使用 ESM。本地相对 import 必须包含 `.ts` / `.tsx`。公开导出和不明显的模块约定应提供简洁 JSDoc。

## 命令

```sh
pnpm install
pnpm run check
pnpm run build
pnpm run pack:check
```

迭代期间运行聚焦测试。发布前应验证打包出的 tarball，并把该产物安装到一次性的 Harness Web profile 中。
