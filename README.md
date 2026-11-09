# dsh-hydrosystem

在一个仓库内维护两个独立的 DSH 插件：水文能力插件让普通 Agent 使用数据准备、模型率定、模型训练、绘图与指标评估，并提供“水文专家”preset；科研工作台插件提供研究管理、任务画布、成果查看和宽幅原生对话。

源码仓库：[zhuanglaihong/dsh-hydrosystem](https://github.com/zhuanglaihong/dsh-hydrosystem)。两个插件分别安装、分别更新，当前均为本地候选，尚未公开发布。目标基线为 DSH-Next 2.0.22-next，内含 DSH 0.2.2-rc.1／Cordis 4.1.0。

| 插件包 | 当前版本 | 使用方式 |
|---|---|---|
| `@iheadwater/dsh-hydrosystem` | `0.1.0-alpha.9` | 独立安装，准备科学环境并向 Agent 提供水文工具与 preset |
| `@iheadwater/dsh-hydro-workspace` | `0.1.0-alpha.7` | 单独安装，在同一 Profile 查看能力插件产生的研究记录 |

上表为补齐 GitHub 发行元数据后的源码候选版本；当前桌面已验收安装仍为能力 alpha.8 与 UI alpha.6，本轮未替换它们或生成新版本安装包。

能力插件可在原生对话中独立使用。工作台不重复安装科学依赖，也不自动安装能力插件；完整水文研究体验需要分别安装这两个包。仓库根目录只管理开发与检查，不是第三个可安装插件。

| 项目 | 职责 |
|---|---|
| hydrosystem | 调用方无关的研究语义、上游适配、MCP、CLI、skills 与 EXE／Unix 本机安装器 |
| dsh-hydrosystem | DSH 插件发行、环境准备与生命周期、原生工具和后台任务、水文专家 preset、研究工作空间 |
| 上游水文包 | 数据 reader、模型、优化、训练、指标与绘图的领域实现 |

模型接入使用用户已安装的 Codex、WorkBuddy 等插件。本项目不实现账号接入或另一套 Agent 推理循环。能力插件不依赖专属 UI；普通模式使用相同底层工具，preset 提供专业指导。

插件直接使用随包固定的 hydrosystem Python 执行核心，无需运行 MCP 服务或通过 CLI 执行科学任务。插件负责 DSH 装配与运行环境，上游依赖按锁和哈希安装；环境保存在所选 Profile 的 `hydrosystem/` 目录，研究与运行记录分开保存。首次安装需要联网下载 Python 和科学依赖，建议预留 5–10 GiB。

## 当前可用范围

默认节点提供环境诊断、模型／数据能力发现、研究接口与真实指标计算；普通对话可以调用相同工具，preset 增加水文研究指导。科学任务返回 DSH job，由 `job_output` 收取结果、`job_kill` 请求取消。未绑定项目的对话使用独立研究目录；配置 researchRoots 后可显式共享同一 Study。

| 能力 | 当前 alpha |
|---|---|
| 环境托管、版本检查、工具发现 | 已实现，Windows 独立环境和实际 Next 隔离宿主已验证 |
| 指标计算与后台任务 | 已验证真实上游计算、非法参数、即时取消与卸载清理 |
| 水文专家 preset | 实际桌面 Hy4 已一次生成正确布尔参数并初始化原项目的 Study |
| 数据准备、率定、训练、绘图 | 实际 Next 程序化双模式闭环通过；原桌面对话另完成 CPU 训练、独立评估和实际参数只读核验 |
| Mac Apple Silicon | 包含已校验的 uv 和跨平台锁；待 Mac 真机安装及科学验收 |

原项目的桌面对话已补测 CPU LSTM：两轮训练共 14 次优化步骤，固定权重评估覆盖独立 15 天且不新增优化步骤。alpha.7 包含同轮失败后的科学任务准入保护、正确状态查询提示和只读 JSON 产物核查，详见[训练与修复验收](docs/development/verification-alpha7.md)。

新项目默认不设应用累计／单次额度和墙钟停止，保留实际用量与算法停止参数。quick／precise／custom 率定模式公开可调，不保证收敛或预测精度；已有研究配置保持原样。具体接入见[本地数据研究指南](docs/project-setup.md)。配套 UI 位于同仓库的独立包 packages/hydro-workspace，按[工作台说明](packages/hydro-workspace/README.md)单独安装。

工作台本地候选为 `@iheadwater/dsh-hydro-workspace@0.1.0-alpha.6`。左侧“水文研究”提供研究管理导航和真实任务依赖画布；研究助手使用中央宽幅原生对话，文件／产物／实验临时展开，执行记录在底部查看。原始配置与引用按需展开，普通页面优先展示研究名称、状态与结果。终端是只读记录，文件限研究已引用内容；最新范围与测试见[布局改版验收](docs/development/verification-workspace-layout.md)，首版记录保留在[原验收](docs/development/verification-workspace.md)。基础能力检查点为 `302160d`，UI 在 `codex/hydro-workspace` 分支继续开发。

## 安装与开始

本地安装文件分别为 `artifacts/iheadwater-dsh-hydrosystem-0.1.0-alpha.8.tgz` 和 `artifacts/iheadwater-dsh-hydro-workspace-0.1.0-alpha.6.tgz`。使用目标 Next 自带的插件管理入口分别安装；已验证的 CLI 形式是 `dsh plugin --profile <Profile> add file:<绝对 tarball 路径>`。源码下载不包含这些生成文件；维护者从[构建说明](docs/development/first-build.md)生成安装包。不要用 PATH 中其他版本的 dsh 代替目标 Next。安装更新后须重载 Host 并核对实际工具和界面，具体配置见[安装说明](docs/installation.md)。

alpha.8 的引导与验证范围见[使用引导更新](docs/development/verification-alpha8.md)。

第一次使用可选择“水文专家”并发送“我第一次用，你能帮我做些什么？”；按任务提供研究目标和自己选择的数据位置，助手会分步说明还需要哪些信息，见[水文专家使用引导](docs/hydrology-expert.md)。

环境就绪后，在普通对话中要求“查询水文环境和可用能力”；也可选择“水文专家”preset，再要求“计算实测与模拟均为 1、2、3、4 的 NSE、KGE、RMSE，并读取后台任务结果”。真实数据任务需先配置数据与部署策略。

## 仓库结构

```text
packages/hydrosystem-plugin/   可发布能力 bundle、preset、原生工具与 Python worker
packages/hydro-workspace/      独立工作台 UI bundle、只读研究接口与会话引用投影
scripts/                      核心 payload、打包校验与托管环境 smoke
tests/                        工件、公共工具与 worker 协议测试
docs/                         安装、开发和验收记录
reference/                    只读历史参考，不参与构建
```

维护者从[开发构建说明](docs/development/first-build.md)开始，分别发布两个插件的流程见[发布指南](docs/releasing.md)，包之间的职责见[packages 说明](packages/README.md)。当前科学结果见[alpha.7 修复记录](docs/development/verification-alpha7.md)。Apache-2.0 适用于本项目代码；随包 uv 的许可证保留在 `tools/licenses/`，科学依赖各自保留上游许可证。

## 阅读入口

[研究绑定指南](docs/research-binding.md)说明如何配置研究目录和跨对话复用 Study；[Windows 阶段验收](docs/development/verification-phase1.md)记录当前测试结果。

- [PLAN.md](PLAN.md)：三阶段目标、实施顺序、验收与决策表。
- [design/README.md](design/README.md)：已讨论的界面概念。
- [历史参考](reference/legacy-dsh-20261107/README.md)：从 hydrosystem 原样迁出的旧插件、脚本、桥接代码和旧验收记录。

旧工件 `0.0.1-dev.15` 的验收对象是官方 Desktop V0.2.1-rc.5，不能作为本项目 DSH-Next 可安装或跨平台兼容的证据。历史目录只供审阅，不是新的产品源码入口；其中的 Codex 接入草稿不进入新产品。
