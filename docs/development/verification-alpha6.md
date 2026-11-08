# alpha.6：训练补测与错误后准入

本轮针对用户在桌面验收中遇到的 UNKNOWN_RUN、错误后仍提交后续任务、无法核对产物参数，以及尚未执行的深度学习测试。目标为 D:/DSH NEXT/DSH NEXT.exe，Next 2.0.22-next／DSH 0.2.2-rc.1。

## 实际桌面训练

在原“alpha.5 短回归验收”对话和原 Study 中，仅执行一次 CpuLSTM 训练，2 epochs、hidden_size=4、lookback=7、batch_size=8、random_seed=1234；训练与验证时期保持既有声明。模型按次序读取指导、训练预检、训练、固定 checkpoint 评估；三个后台任务都收取终态，无工具错误或重复训练。

训练完成 14 次优化步骤；2001-06-01 至 2001-06-15 的固定权重评估有 15 个有效样本，新增优化步骤为 0。评估 NSE=-6.961201542174511、KGE=-0.01624962772915506、RMSE=0.5092941176468243 mm/day。该短合成数据结果拟合较差，验收证明执行、记账和证据链，不作为预测质量达标。13 个产物及嵌套引用文件的哈希均通过，checkpoint 为 sha256-cdb50760d1dafe418dcddb0058ae73646943c47967b02df86d342a780e344035。原始结果见 `.omx/training-live-events.json` 与 `.omx/training-complete-audit.json`。

## 修复

DSH 插件使用公共工具 guard 和事件，在每个 Agent 的当前用户轮次记录水文错误。同步工具拒绝或后台失败后，后续科学任务、新项目、Study 修改和研究改绑均拒绝；状态、已启动任务的结果收取和只读元数据核查仍允许。新用户轮次恢复准入，不影响其他 Agent，卸载移除 guard 与事件订阅。该状态限制运行实例的准入，不修改公共科学核心或 Agent 循环。

科学结果增加 task_ref 对应的 status_query，回显已保存的 effective 算法、搜索空间、目标和预热设置；原科学产物不改写。优化器 run_id 不作为独立模拟 run_ref 使用。新增 hydrosystem_read_artifact，用完整引用读取当前 Study 内不超过 1 MiB 的 JSON 元数据，验证路径、schema、kind 和内容哈希；不读取任意文件或二进制权重。preset 说明单步调用、错误后停止、准确报告任务是否启动，以及按需核对产物、避免重复状态查询与长 JSON 报告。

## 验证与发行

先用真实 DSH ToolExecutionPipeline 复现同一批前一个工具失败、后一个科学任务仍被接纳；修复后，同批阻止、同轮后续步骤阻止、诊断保留、跨 Agent 隔离、新轮次恢复及卸载解除通过。另先复现后台失败不阻止新任务，修复后通过。旧 alpha.5 worker 的真实率定结果缺少 status_query，回归先失败；新 worker 对同一公开请求通过。只读产物入口先因不支持失败，再验证合法读取、越界路径拒绝和损坏哈希拒绝。

Node v24.21.0 下运行 pnpm run check、pnpm run test:integration，以及明确科学解释器运行 worker unittest，合计 12 项通过（发布元数据 1、插件与真实 DSH 调度 4、worker 7）。公共核心 release 9e123656afda 与依赖锁不变，无需新建科学环境。候选 0.1.0-alpha.6，工件 41,987,656 字节，SHA256 d4d521dfb6610e85fa80baffd0b2098bc0b7f83c3f4656146d645d472d654c2f；199 个 payload 文件校验通过。包未公开发布。

最终包的实际 Next 双模式验收位于 `.omx/next-final6/`，桌面安装日志为 `.omx/desktop-final6-install.log`。该宿主中普通模式与水文专家均完成四类科学闭环，各 247 次率定求值、14 次训练优化、15 天固定权重评估；每种模式 14 个直接产物、22 个引用图节点哈希通过。正式桌面重载后，原对话模型只读调用 hydromodel_status(task_ref) 和 hydrosystem_read_artifact 各一次，均无错误，实际算法与搜索空间逐项一致。后续自动通知的停止保护修正见[alpha.7](verification-alpha7.md)。
