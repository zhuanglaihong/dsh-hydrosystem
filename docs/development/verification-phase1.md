# 第一阶段 Windows 程序化验收（alpha.4）

本轮平台范围经用户确认：先完成 Windows，Mac Apple Silicon 随后单独验收。包为 `@iheadwater/dsh-hydrosystem@0.1.0-alpha.4`，尚未公开发布。实际宿主 `D:/DSH NEXT/DSH NEXT.exe`，产品 2.0.22-next，自带 DSH 0.2.2-rc.1／Cordis 4.1.0，构建 Node v24.21.0。

本页记录 alpha.4 的程序化验收：独立环境、四类原生工具、后台任务、研究绑定和水文专家 preset 已按以下范围验证。Mac 与独立科研工作台 UI 分别留待后续。

后续用户的模型驱动验收发现 Study 布尔字段缺少显式类型、SelfMade 不必要的缓存准备，以及仅刷新版本信息未重载桌面插件代码的问题。本页保留 alpha.4 程序化验收的历史事实；当前修复和实际模型调用结果见 [alpha.5 修复记录](verification-alpha5.md)。

## 功能和工件

原生工具覆盖数据准备、率定／验证、CPU 神经网络训练／checkpoint 评估、绘图／指标。工具全局注册，普通模式和水文专家使用同一执行器；指导按需读取。安装和实际科学执行使用随包固定 wheel，无需运行 MCP 服务或经 CLI 调用算法。公共核心新增能力仍与 DSH 无关，MCP／CLI 保留同一执行规则。

工件 `artifacts/iheadwater-dsh-hydrosystem-0.1.0-alpha.4.tgz`，41,983,795 字节，SHA256 `cd41f2e03fd3c5911173b4a243cdaf4591ebeab839d43f207331868af8ad1880`。核心 release id `6695fa4dcb51`，原依赖锁不变；实际 tarball 的 199 个 payload 文件及 Windows／Mac uv 已校验。候选未公开发布或自动提交。

## 已运行的验证

| 入口 | 结果 |
|---|---|
| `pnpm run check` | 类型检查、构建、工件元数据测试通过 |
| `pnpm run test:integration` | 3 个公共插件测试通过；真实指标、取消、绑定与重载、变更位置拒绝、注册失败回滚、任务中拒绝 Study 修改、依赖失败 |
| 明确科学解释器执行 Python worker unittest | 5 项通过；含接口可见但未配置不得执行、已取消的项目准备不创建配置 |
| 公共核心 8 个相关 pytest 文件 | 160 项通过，覆盖模型、运行时、数据、训练、可选限制、研究配置、部署和 MCP |
| managed smoke | 新 payload 私有环境和固定依赖导入通过，真实指标 NSE=1、KGE=1、RMSE=0 |
| Next 原生 Host 双模式科学 probe | 标准模式、水文专家均完成完整四类任务、跨对话 Study 共享及原生取消 |
| 不兼容安装包拒绝 | 退出码 1；Profile package.json 和 pnpm-lock.yaml 的前后哈希完全一致 |

源码验证使用 Node v24.21.0 和 `HYDROSYSTEM_TEST_PYTHON=D:/project/iHeadWater/hydrosystem/.venv/Scripts/python.exe`、`HYDROSYSTEM_TEST_SOURCE=D:/project/iHeadWater/hydrosystem`。worker 命令为同一解释器执行 `-m unittest discover -s tests/python -v`。公共核心执行 `-m pytest tests/test_hydromodel_service.py tests/test_runtime.py tests/test_data_utils.py tests/test_torchhydro_service.py tests/test_optional_execution_limits.py tests/test_research_project.py tests/test_deployment.py tests/test_mcp_protocol.py -q --disable-warnings --maxfail=3`，160 通过，5 个 warning，用时 252.80 秒。

独立托管环境验收是本机新发布环境的真实安装，不等于在全新 Windows 系统或 Mac 上完成安装。`.hydrosystem/setup-result.json` 分别报告环境和协议通过；科学执行由后续原生工具闭环独立证明。

最终 alpha.4 的科学 probe 使用明确标注的合成数据，预热参数显式为 14 天，产品接入默认仍为 365 天。两个模式分别创建独立 Study，真实 XAJ 率定各完成 247 次求值；CPU LSTM 各执行 14 次优化步骤，再读取固定 checkpoint 评估独立的 15 天时期。每个模式返回 14 个产物，连同 JSON 中嵌套引用共 22 个文件均逐项检查内容哈希；另外验证真实 PNG 文件头和评估数组维度为 1 个流域、15 天、2 个观测／模拟字段。quick／precise／custom 预检分别得到 256／4096／64 的算法参数，custom 的 seed=42；预检不执行模型。合成训练的预测指标较差；本验收验证链路和证据正确，不证明预测质量。

最终原始证据在 `.omx/next-final4/host-result.json`、`artifact-check.json`、`package-check.json` 与相邻日志；此前科学闭环保留在 `.omx/next-phase1-science/`。另有 `.omx/upgrade-rollback.json` 和 `artifacts/package-result.json`。科学 probe 不请求模型；水文工具声明 JSON 实测 56,105 字节，共 33 个接口，未将字符数换算为任意提供方的实际 token 数。

最终宿主命令为匹配 Python 执行 `scripts/smoke_next.py --app "D:/DSH NEXT/DSH NEXT.exe" --tarball artifacts/iheadwater-dsh-hydrosystem-0.1.0-alpha.4.tgz --run-root .omx/next-final4 --state-root .omx/managed-smoke --port 43860 --science-spec .omx/science-input/project-fast-acceptance.json`，退出码 0；验收脚本只启动并停止其拥有的隔离 Host。随后执行 `.omx/check_phase1_artifacts.py .omx/next-final4/host-result.json`，双模式产物检查通过。

## 桌面 Profile

目标 Next 自带 CLI 已将最终 alpha.4 tarball 安装到 `C:/Users/zlh15/.dsh/profiles/desktop`，退出码 0。安装前备份包 manifest、lockfile、patch 和 workspace 配置到 `.omx/desktop-before-phase1/`；未修改模型账号或既有研究。刷新后的桌面详情显示 alpha.4、正确的本地工件来源，两个组件均为运行中，观测保存在 `.omx/desktop-final4-status.json`，安装日志为 `.omx/desktop-final4-install.log`。该 Profile 的新私有环境安装与协议报告通过。用户原有环境和 Study 保留。

正式桌面与最终隔离 Profile 的安装内容，均对实际 tgz 的 233 个文件逐项比较 SHA256，一致；记录为 `.omx/next-final4/package-check.json`。该检查确认验收使用同一安装包，不以源码目录或 PATH 上其他 dsh 代替。

用户协助聚焦后，桌面“水文专家”在“调用工具计算径流指标”对话完成自然语言验收。调用记录包含环境、能力、按需指导和研究查询，随后实际调用 hydroutils_compute_metrics，并由 job_output 读取已完成的 `hydrosystem-879c6d578bb94e11`；上游 backend 为 hydroutils.hydro_stat.stat_error，NSE=1、KGE=1、RMSE=0。该次对话运行于 alpha.3，观测用时 1 分 29 秒，科学执行约 3.58 秒；证据保存在 `.omx/desktop-ui-phase1.json`。桌面用量按钮显示 189K tok，为现有提供方的整轮 UI 读数，未校验其计费口径，也不视为科学运算开销。其余科学验收直接调用原生工具，不请求模型。

## 交付范围

默认新项目不设应用累计／单次额度和科学墙钟停止；quick／precise／custom 参数、真实用量、算法停止和可选有限配置均保留。数据引导支持本地 selfmade 和既有 CAMELS-US，其他 reader 可通过高级部署声明接入；仅经过适配的模型可执行，发现不等于科学支持。独立 UI、CUDA、远程算力与 Mac 真机验收属于后续工作。安装依赖缓存按发布隔离，候选环境清理命令被自动审批以 blocked by policy 拒绝，未执行删除，缓存保留。
