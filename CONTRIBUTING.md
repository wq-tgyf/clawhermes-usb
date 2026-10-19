# 贡献指南

## 项目定位

ClawHermes-USB 是一个 Windows 优先的便携运行套件，目标**不是 fork 上游应用**，
而是在 OpenClaw / Hermes Agent / hermes-web-ui 外面提供一层可交付、可启动、可备份、可诊断的便携编排层。

因此三条红线：

1. **不修改 `apps/` 下的上游代码** —— 上游以预构建 payload 形式分发
2. **不引入新的大型运行时依赖** —— 兼容 U 盘交付场景
3. **保持 Windows 原生路径优先** —— WSL 是可选适配路径，不是默认路径

## 开发环境

```powershell
git clone https://github.com/wq-tgyf/clawhermes-usb.git
cd clawhermes-usb
npm install
npm run build
npm test
```

要求 Node.js >= 22。

## 目录约定

| 目录 | 职责 |
|---|---|
| `core/` | 编排核心（启动、停止、备份、诊断） |
| `adapters/` | 上游应用适配契约 |
| `config/` | 默认配置与环境模板 |
| `portal/` | 本地 Web 入口 |
| `replica/` | 编排层复刻实现（独立子系统，见 `replica/README.md`） |
| `docs/` | 产品、架构、交付文档 |
| `docs/reconstruction/` | 逆向复刻全过程记录 |

## 提交规范

采用 Conventional Commits：

```text
feat: 新功能
fix: 缺陷修复
docs: 文档
test: 测试
chore: 构建/工具链
refactor: 重构（不改变行为）
```

示例：

```text
feat(core): 支持自定义 USB 根目录提示文件
fix(adapters): 修正 hermes-web-ui 端口探测超时
docs(reconstruction): 补充端到端验证报告
```

## 关于 `replica/` 的特殊约定

`replica/` 是对 `ClawHermes-Control-Electrobun-Setup.tar.zst` 中业务逻辑段的**行为等价复刻**。

它与项目其它部分的开发规则**不同**：

| 一般代码 | `replica/` 代码 |
|---|---|
| 鼓励改进、重构、优化 | **禁止「改进」** |
| 可以修复奇怪行为 | **必须保留**原产物的奇怪行为 |
| 以最佳实践为准 | **以原产物行为为准** |

原因：复刻的验收标准是**等价性**，不是代码质量。若你发现某处「看起来是 bug」，
先查 `docs/reconstruction/OBLIGATIONS.md` 中对应编号——很可能那是刻意保留的。

修改 `replica/` 时：

1. 先在 `OBLIGATIONS.md` 找到对应义务编号（如 `O-019`）
2. 同步修改实现与测试，测试名保留编号前缀
3. 运行 `npm test`，81 个测试必须全绿
4. 若改变了义务本身，需同步更新 `COVERAGE.md`

已知需要保留的「奇怪行为」：

- `saveModelConfig` 的 `providerType` / `apply` 是硬编码，忽略入参
- `stopAllServices` 无论 API 成败都执行一次 CLI stop，并返回 `apiResult ?? cliResult`
- `pingSync` 用独立 node 子进程 + 退出码，而不是直接 fetch
- RPC `maxRequestTime` 为 `Infinity`
- 日志文件只 append，无轮转

## CI

`.github/workflows/replica-tests.yml` 在远端 Ubuntu 上跑 `replica/` 的测试（Node 22 与 24）。
本机内存吃紧时（实测可用 < 1 GB 会导致 `JavaScript heap out of memory`），以 CI 结果为准。

## 文档要求

- 中文文档必须保持 **UTF-8 可读**，不能提交乱码（`.gitattributes` 已做保障）
- 架构级决策写入 `docs/decisions/`，采用 ADR 格式

## 许可证

提交内容默认以 Apache-2.0 授权。详见 `LICENSE` 与 `THIRD_PARTY_NOTICES.md`。
