# DSH 桌面插件部署

hydrosystem 的 DSH 开发插件提供四类研究工具、水文研究员 preset 和右侧研究成果/任务标签。科学接口与 MCP、CLI 共用公共实现；工具执行和结果不依赖特定界面。

## 当前可部署工件

当前工作台验收版本为 `@iheadwater/dsh-hydrosystem` 0.0.1-dev.15，目标为 Windows x64、官方 DSH Desktop V0.2.1-rc.5。已在指定桌面验证研究创建与会话绑定、环境元数据、四个右侧入口、旧研究报告与图表，以及一次主 Agent 只读工具调用；科学执行沿用原 payload，本轮未重跑四类科学计算。当前 `.tgz` 使用 Windows 环境引导程序；不能把该文件直接作为 Mac 安装包。源码位于 [integrations/dsh](../../integrations/dsh/README.md)，仓库不携带维护者的 Python 环境、研究数据、登录信息或本地构建工件。

在另一台兼容 Windows 电脑取得该 `.tgz` 后，通过 DSH 插件管理入口安装本地包；也可使用那台电脑 Desktop 自带的 CLI：

```powershell
& '<DSH安装目录>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add '<插件包绝对路径>.tgz'
```

首次激活下载私有 Python 和锁定科学依赖，需要网络、可写 profile 与数 GiB 的磁盘空间。日志位于 `<profile>/hydrosystem/releases/<release-id>/hydrosystem/.hydrosystem/installation.log`，成功报告为同目录 `setup-result.json`。安装不会自动创建 Study 或执行科学计算。

加载后可在“研究实例”选择或新建 Study，选择已有工作区，再开始研究对话；工作区、水文研究员 preset 和 Study 一次绑定。对话建立后点击标题栏“产物”，在右侧查看结果。新机器没有旧机器已算出的图表。只需使用能力时不复制旧虚拟环境；迁移真实研究另行核对 Study、数据与配置。

## 工作台开发版

工作台开发包将 Host 功能拆分为节点运行时、水文工具、研究管理和环境查询，仍然安装同一个 bundle。“研究实例”支持查看、选择和明确新建研究；从这里开始新对话会保留选中的研究，已有对话独立绑定。“环境与节点”显示实际解释器、uv、五包版本和来源。对话右上角通过“文件、产物、实验、终端”打开原生右侧标签，详情见 [DSH 接入 README](../../integrations/dsh/README.md)。安装新工件后须重开 Desktop 验证 Host 与 Client 一致；dev.15 重启后已确认四个 Host 插件和 preset 共五个组件运行中。

## macOS Apple Silicon 与已有安装器

本仓已有原生 macOS ARM64 `.app.zip`/`.run` 安装器、同一 `uv.lock` 与公共 `scripts/install_local.py`，详见[跨平台本机安装](local-installation.md)。DSH 托管插件同样调用此公共安装器，不需要为 Mac 重写水文算法或另一套环境管理。

当前原生安装器固定 uv 0.9.2、私有 Python 3.12.12，检查 wheel/锁文件哈希并完成依赖与协议自检。现有 Mac 安装器内置原生 uv，不要求用户预装 Python；系统已有 uv 仍不能直接替代为任意版本，因为当前代码检查固定版本并读取节点内的工具路径。

DSH 的跨平台自动安装引导仍待补齐：识别平台和架构，检查并复用符合要求的系统工具，缺少时取得对应原生工具，再调用同一个公共安装器，最后向 Agent 和界面报告就绪状态。Agent 发起和解释安装结果；版本、依赖、目录、校验与失败处理由确定性程序执行。该目标不要求 Mac 用户手工编译整个项目，也不让 Agent 自由组合未锁定的水文依赖。

macOS 原生安装器存在不等于 DSH 插件在 Mac 已验收。当前尚未验证 Mac Desktop 插件安装和四类科学闭环，也不把 Windows 桌面验收当作 Mac 证据。目标 Mac 应核对原生 ARM64、macOS 版本、DSH 版本、依赖安装、自检与实际工具调用；平台条件见本机安装指南。

## 维护者构建

当前构建脚本与参数见 [DSH 接入 README](../../integrations/dsh/README.md)。构建后的 payload 包含自身快照标识；从新提交构建会产生新的科学快照，不能仅凭插件版本相同就认定与已有验收工件一致。每个交付包分别记录平台、版本、SHA-256 和真实验收范围。
