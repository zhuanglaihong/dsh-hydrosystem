# 水文研究工作台首版验收

2026-11-08，基础能力先提交为 302160d（feat: checkpoint native hydrology capability bundle alpha.8），随后在 codex/hydro-workspace 分支开发独立 UI 包。当前工作台版本为 @iheadwater/dsh-hydro-workspace@0.1.0-alpha.3，基础能力仍为 @iheadwater/dsh-hydrosystem@0.1.0-alpha.8；均已安装到指定 Next 的 desktop Profile 并重启加载。UI 工作尚未提交或推送，包未公开发布。

## 已验证的使用路径

指定程序为 D:/DSH NEXT/DSH NEXT.exe，Next 2.0.22-next、DSH 0.2.2-rc.1、Cordis 4.1.0。正式桌面左侧出现“水文研究”，选择原有“水文专家能力验收”项目后，显示同一 Study 的 19 条活动记录、默认 5 个计算任务、15 个产物；2 条依赖来自保存的产物或 trial 引用。逐一校验 15 个产物的内容哈希通过，读取无警告。Study 文件修改时间仍为本次 UI 安装之前。

点击真实率定节点后，工作台正确关联并嵌入“alpha.5 短回归验收”原会话，可见原历史内容、原生输入框和当前模型控件。首次选择项目时，通过 DSH 的 refreshProjections 公共接口顺序恢复可见会话的引用索引，不重放工具或请求模型；关闭工作台停止后续恢复请求。关联表示会话包含相同科学产物引用，不据此断言该会话或子智能体最先执行了任务。历史记录没有关联证据时提示用户选择已有对话。

最终 tarball 在目标 Next 自带运行时的隔离 web Profile 实际安装并加载，浏览器验证侧栏入口、项目选择、任务详情、五个右侧面板、面板收起、原生 Conversation、产物预览以及 1024／390 像素布局。修复“已有项目但未选中”被误报为“尚无项目”的引导问题。未发送任何模型请求或新增科学计算。

## 检查与工件

Node v24.21.0 下 pnpm run check 通过类型检查、Host／Client 构建和 4 项测试；pnpm run test:integration 的 4 项基础能力回归通过。HTTP 测试使用真实临时文件和 HTTP Server，覆盖准入拒绝、非法／未知项目、真实任务依赖、运行及失败状态、损坏记录保留警告、内容哈希不匹配和 Study 不被改写。Projection 测试使用真实 SessionStore 与 SessionProjectionRegistry，验证事件已有时注册、无关事件、释放后重注册及客户端视图；不将其当作完整持久化缓存故障恢复测试。

最终包的浏览器验收执行 node --test tests/workspace-browser.test.mjs，共 1 项通过；设置 PLAYWRIGHT_MODULE 为本机 Playwright 的绝对入口，HYDRO_WORKSPACE_RUN 为 .omx/workspace-alpha3。运行结果和截图位于该目录；.omx/workspace-final-audit.json 汇总正式桌面版本、文件哈希、研究记录与人工点击证据。实际安装文件逐一匹配 tarball：基础能力 233 个文件，UI 20 个文件。

| 工件 | 字节 | SHA256 |
|---|---:|---|
| iheadwater-dsh-hydrosystem-0.1.0-alpha.8.tgz | 41989390 | 9fa9932f56028abc4efcb79433ddbf97c8d26c75569e924810f2ebe026903876 |
| iheadwater-dsh-hydro-workspace-0.1.0-alpha.3.tgz | 22563 | 580743281a61272bc50e37762101ebfa3ff47b65189e78cf349e2715d20bf8d5 |

## 当前范围

画布是由真实执行记录恢复的任务概览；可查看关联会话，不提供拖拽规划、人工连线或自动创建子智能体。文件面板限研究元数据和已引用产物，终端面板是保存的执行记录，环境页展示部署位置与管理说明；任意目录浏览器、交互式终端、完整环境管理尚未接入。右侧研究助手沿用原生模型和工具；选择对话不会修改其研究绑定，执行前仍需确认项目。

本轮没有重复训练或完整科学闭环，没有运行全仓覆盖率或验证 Mac。开发依赖存在 dsh-settings 对 schemastery 的 ~3.19 peer 声明与当前 3.18.5-alpha.1 的差异；当前类型检查、构建和目标运行时验收通过，不将其描述为依赖兼容性全覆盖。基础科学能力的既有验证见 [alpha.7](verification-alpha7.md)，引导提示词的自然语言输出仍需独立模型验收。
