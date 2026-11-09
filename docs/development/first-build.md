# 首个能力插件构建

已确认的公开验证入口：实际 npm tarball、Python worker 的 JSON 输入输出，以及 DSH 的公共工具注册与 preset 装配。复用 PLAN.md 已确认的接口与测试范围，不通过私有实现调用次数判断成功。

先验证可安装工件，再用真实公共核心验证发现、合法指标和非法参数；环境检查须区分托管准备与显式已有环境。背景任务验证所有权、取消与结果查询。只允许 stub 外部宿主或下载边界，内部协议和科学结果使用真实实现。

默认安装准备独立环境；现有环境接入必须显式提供解释器与项目来源。开发测试可复用原科学环境，不能据此声称完成干净机器安装或 Mac 真机验收。单个默认查询节点不授予真实数据权限，不自动创建 Study。

本轮首先形成可发布目录与首个安装／工具闭环。四类科学功能按公共核心实际配置开放；完整阶段验收以 PLAN.md 的逐项结果为准，首个 alpha 不能冒充全量科学验收。

alpha.3 增加 hydrosystem_setup_project，为每个新项目生成独立科学声明；支持接口发现与实际执行授权分开，新增部署默认关闭应用额度和科学超时。Windows 实际 Next 双模式的四类科学闭环已经运行，后续状态和证据见[第一阶段验收](verification-phase1.md)。用户已确认本轮先完成 Windows，Mac 随后单独验收。

最终 alpha.4 完成 Windows 交付，统一快速率定的预检与执行默认值，并验证精细／自定义预检、较长 Windows 目录、任务互斥与取消。实际安装包通过双模式完整科学闭环并安装到指定 Next 桌面；两个组件运行中。完整验收证据和平台范围以阶段验收记录为准。

## 开发命令

使用 Node >=24.9、pnpm 11.28.5；`pnpm install --frozen-lockfile` 后执行 `pnpm run check`，检查类型、构建产物与发布元数据。`.github/workflows/check.yml` 在 Windows／macOS 执行该源代码检查，不代表科学依赖安装已在 CI 验证。

科学集成测试须显式设置 `HYDROSYSTEM_TEST_PYTHON` 为已验证解释器、`HYDROSYSTEM_TEST_SOURCE` 为匹配公共核心目录，然后运行 `pnpm run test:integration`；用同一 Python 执行 `-m unittest discover -s tests/python -v`。测试真实公共核心与上游指标，仅宿主注册服务使用外部 fixture。

维护者以匹配 Python 执行 `scripts/prepare_core.py --source <公共核心绝对目录> --uv-windows <可信 uv 0.9.2 的绝对路径>`。脚本复用公共核心发布器构建 wheel 和安装锁，校验 Mac ARM uv 归档，并拒绝覆盖已有 payload。`pnpm run build` 后执行 `scripts/pack_plugin.py`，实际检查 tarball 中所有 payload 文件的 SHA256。生成目录 `core/`、`tools/`、`lib/` 与 `artifacts/` 不进入源码提交。

`node scripts/smoke_managed.mjs <隔离状态目录>` 从默认插件入口安装环境并计算真实指标，保留 `smoke-result.json` 与安装日志。该脚本不调用模型，不消耗模型额度。重复执行可检查同版本环境复用；不要将测试目录用作正式研究目录。

用匹配 Python 执行 `scripts/smoke_next.py --app <Next 可执行文件> --tarball <实际 tgz> --run-root <新的隔离验收目录> --state-root <托管环境目录> --port <空闲端口>`，调用目标 Next 自带 CLI 安装 tarball，并通过其 web Profile 加载真实 Host。探针创建隔离会话、装配标准模式和水文 preset、调用原生 jobs 并验收取消，不发送模型请求。`run-root` 必须不存在，防止混用已有 Profile；结果在其 `host-result.json`，日志与数据均保留。该检查不替代桌面窗口点击及模型自主选工具验收。

## 工作台开发

工作台源码在 packages/hydro-workspace，与基础能力分别发布。pnpm run check 同时检查两个包；UI 的 Host 与 Client 分别编译，浏览器入口由 scripts/build_workspace.mjs 生成 DSH ModuleLoader factory。执行 `npm pack --ignore-scripts --json --pack-destination artifacts ./packages/hydro-workspace` 生成独立 UI tarball，不运行科学 payload 打包器。开发类型依赖使用根目录同一份 Cordis，避免发布声明的可选 peer 组合产生两个 Context 类型身份。

执行 `python scripts/smoke_workspace_next.py --app <Next可执行文件> --tarball <UI工件> --run-root <新的隔离目录> --state-root <基础能力状态目录> --port <空闲端口>` 启动真实隔离 Host。该进程输出 WORKSPACE_HOST_READY 后，以 PLAYWRIGHT_MODULE 指定已安装 Playwright 的绝对模块路径、HYDRO_WORKSPACE_RUN 指定同一隔离目录，执行 `node --test tests/workspace-browser.test.mjs`。测试只操作 UI，不发送模型请求。完成后在该隔离目录创建 stop 文件，关闭探针拥有的 Host；access.json 含本地访问凭证，不应提交或转发。验收结果见[工作台记录](verification-workspace.md)。
