# WSL2 Rootfs 产物策略

ClawHermes-USB 可以规划一条项目内的 `wsl.exe --import` 命令，
但**绝不会静默下载或创建** Linux rootfs 归档。

## 存放位置

WSL2 导入产物放在：

```text
runtimes/wsl/
```

`wsl-import-plan --distro Ubuntu` 期望的默认 Ubuntu 归档是：

```text
runtimes/wsl/ubuntu-rootfs.tar
runtimes/wsl/ubuntu-rootfs.tar.sha256
```

`.sha256` 文件在选定可信产物来源之前是可选的，但只要存在就应与归档放在一起。
若 sidecar 存在，`wsl-import` 会在执行 WSL 前校验；摘要不匹配时**拒绝导入**。

导入的适配器可能使用两个发行版名：

- `runtime.sourceDistro`，例如 `Ubuntu`，标识基础发行版/rootfs 产物。
- `runtime.distro`，例如 `ClawHermes-Ubuntu`，标识 setup、start、status、验证所用的受管执行目标。

## 规则

- Rootfs 归档是**运维管理的 payload**，不是源码文件。
- Rootfs 归档**不得进入 git**。
- **不得**由 setup、启动、诊断或工作流命令自动下载。
- 测试夹具只能使用极小的临时文件，且必须在完成前清理。
- 不要把 `%TEMP%`、Windows 系统盘或用户 profile 缓存当作持久 rootfs 位置。
- `data/wsl/<distribution-name>/` 是导入发行版文件的计划安装位置。
- 即使文件位于项目路径下，导入的发行版仍会**注册到当前 Windows 宿主机**。

## 当前命令

查看只读的手工产物指引：

```powershell
node core/node/dist/clawhermes.js wsl-rootfs-guide --distro Ubuntu --json
```

## 背景

为什么不自动下载：rootfs 归档体积大、来源可信度难以自动判定、且会修改宿主机注册表。
这三条任何一条都足以要求**人工明确放置**。
