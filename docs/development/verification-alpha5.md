# alpha.5：Agent 参数与数据接入修复

目标为用户的 `D:/DSH NEXT/DSH NEXT.exe`，Next 2.0.22-next／DSH 0.2.2-rc.1。该候选未公开发布。

## 用户问题与原因

用户在 dsh-hydrosystem 工作区的实际模型对话中通过布局、reader 和实际取值预检，随后 prepare_cache 返回 UNSUPPORTED_CAPABILITY，Study 初始化反复失败。只读检查该对话日志发现，new_research 被提交为字符串 "true"、"True" 或其他文本；显式 boolean 类型的 unlimited 字段则实际提交为 JSON true。原声明的 new_research 只有 const=true，未标明 type=boolean；脚本直接传入布尔值的验收未覆盖模型生成参数这一层。

原会话的 27 次初始化尝试中，new_research 类型只有 string 或缺失，实际布尔 true 调用为 0 次。最小诊断摘要保存在 `.omx/alpha5-user-reproduction.json`，不复制整段推理记录。

SelfMade CSV 的实际取值预检已通过，不需要额外生成原生 NetCDF 缓存。旧新建项目引导统一开放 cache 权限，preset 对“必要时缓存”的说明不足以阻止无必要调用。

另有部署证据：alpha.4 的正式安装日志时间为 2026-11-08 13:18，但 13:56 新建的项目仍使用旧实现 deployments/project-* 的物理路径，而 alpha.4 使用 p/*。插件详情显示已安装版本与组件运行中，不能单独证明运行进程已加载新代码。

## 修复范围

公共核心明确声明 new_research 的 boolean 类型和 const=true，保留对字符串、数字和 false 的严格拒绝，不隐式转换新建研究意图。新建 SelfMade 声明关闭缓存准备，CAMELS-US 保留原授权；已有声明、Study、源数据和 staged evidence 不改写。preset 与共享 skills 指导只在明确缓存 blocker 和授权下准备缓存，参数纠正仍失败时报告阻塞，停止等价写法和执行 ID 的反复尝试。

包为 `@iheadwater/dsh-hydrosystem@0.1.0-alpha.5`；工件 `artifacts/iheadwater-dsh-hydrosystem-0.1.0-alpha.5.tgz`，41,985,009 字节，SHA256 `85f283c849d78aacd4d5f1a3b15dbcd48d3738c91443b6f5ae658fe796dfd09c`。核心 release `9e123656afda`，科学依赖锁未变，199 个 payload 文件和平台 uv 摘要通过打包校验。

## 验证

布尔声明回归先因缺少 type 失败，补齐后通过；SelfMade 缓存授权回归先因错误开放失败，修复后 SelfMade=false 与 CAMELS-US=true 均通过。相关核心测试命令为匹配解释器执行 `-m pytest tests/test_tool_catalog.py tests/test_runtime.py tests/test_research_project.py tests/test_hydrodata_workflow.py tests/test_mcp_protocol.py -q --disable-warnings --maxfail=1`，47 通过，用时 96.78 秒。`pnpm run check`、`pnpm run test:integration` 和匹配解释器执行 worker unittest 共 9 项通过；插件测试还验证注册出的 boolean 类型、拒绝文本 true、接受布尔 true。

最终 tarball 的实际 Next 隔离宿主验收位于 `.omx/next-final5/`，正式桌面安装日志为 `.omx/desktop-final5-install.log`，CLI 退出码 0。正式桌面与隔离 Profile 的 233 个安装文件分别逐项与该 tgz 比较哈希，一致，记录为 `.omx/next-final5/package-check.json`。

最终隔离宿主命令为匹配 Python 执行 `scripts/smoke_next.py --app "D:/DSH NEXT/DSH NEXT.exe" --tarball artifacts/iheadwater-dsh-hydrosystem-0.1.0-alpha.5.tgz --run-root .omx/next-final5 --state-root .omx/managed-smoke --port 43861 --science-spec .omx/science-input/project-fast-acceptance.json`，报告 passed。原生 Host 检查实际工具的 boolean 声明，拒绝字符串 true 后接受布尔 true；SelfMade 新项目的实际 capabilities.cache_writes=false，随后通过数据预检、纳管、Study 初始化和实际读取。标准模式与水文专家各完成 247 次 XAJ 求值、独立验证、绘图、14 次 CPU LSTM 优化步骤和固定 checkpoint 的独立 15 天评估；均返回 14 个产物，嵌套引用合计 22 个文件哈希通过，另验证 PNG 文件头和评估数组维度。`.omx/next-final5/host-result.json`、`artifact-check.json` 与日志保留证据。上述科学验收不请求模型。

用户确认允许重启后，观察到 Next 新进程和新窗口，实际开始准备 release 9e123656afda。首次安装因 fiona==1.10.1 的 wheel 下载超过 UV_HTTP_TIMEOUT=120 秒失败；保留缓存、环境和原研究，在同一安装根、同一锁和同一计划下将 UV_HTTP_TIMEOUT=600 后明确重试一次，退出码 0，环境和协议检查通过。随后单独停用／启用 hydrosystem-native 组件，清除失败的运行实例；未重装其他插件或修改模型账号。

正式桌面“alpha.5 短回归验收”对话选择水文专家和用户现有 Hy4 模型，复用原项目 project-c8e8059f-e11d-486b-abb4-49705f748871。实际只调用环境一次、项目 bind 一次、Study status 一次、Study initialize 一次。环境结果引用 C:/Users/zlh15/.dsh/profiles/desktop/hydrosystem/releases/9e123656afda/hydrosystem/.venv/Scripts/python.exe；initialize 的持久日志明确记录 new_research:true，类型为 boolean，工具无错误，created=true，Study 为 study-c7b1a96e5c264198b5a1850971cf7699。界面报告完成，用时 1 分 14 秒；没有重复初始化、准备缓存、率定或训练。最小原始证据在 `.omx/desktop-final5-agent.json`，会话 id 为 dad66373-0c20-4859-b8fe-31b303fc05f2。

本次修复已通过真实模型的布尔参数调用与原项目初始化。完整四类科学链路仍以程序化双模式结果为证据；该短桌面测试不代表已让模型自主执行全部率定、训练和绘图流程，也未验证其他模型提供方。原项目声明、原始数据和 staged evidence 保留，可在新对话的同一 Study 继续研究。
