# alpha.7：桌面补测与失败停止保护

2026-11-08 在 D:/DSH NEXT/DSH NEXT.exe（Next 2.0.22-next／DSH 0.2.2-rc.1／Cordis 4.1.0）完成本轮 Windows 补测。最终包 0.1.0-alpha.7 已通过该应用自带 CLI 安装至正式 desktop Profile，退出码 0；已重启实际 Next，新的 Host PID 39800，启动时间 2026-11-08T10:32:28.828Z。重启后的插件详情显示 v0.1.0-alpha.7、共 2 个组件且 2 运行中。已有项目、Study 和科学 release 9e123656afda 保持原位置。

## 结果

原桌面对话只训练一次 CpuLSTM，2 epochs 共 14 次优化；用同一 checkpoint 在独立 15 天评估，新增优化步骤为 0。13 个产物及嵌套文件哈希通过。NSE=-6.9612、KGE=-0.01625、RMSE=0.509294 mm/day；短合成数据的拟合较差，本次确认执行和证据链，不代表预测质量达标。详情及参数见[alpha.6 补测记录](verification-alpha6.md)，原始审计为 `.omx/training-complete-audit.json`。

率定结果返回正确的 task_ref 状态查询及保存的 effective 参数；新增 hydrosystem_read_artifact 读取并校验当前 Study 的 JSON 元数据。正式桌面原对话重载后按顺序调用 hydromodel_status、hydrosystem_read_artifact 各一次，无错误；algorithm 与 search_space 逐项相同，没有启动新科学任务。审计为 `.omx/desktop-metadata-audit.json`。该模型核验运行于 alpha.6，其 worker 与 alpha.7 相同。

工具或后台失败后，插件 guard 阻止该 Agent 的新科学任务、项目建立及研究修改，保留只读诊断与已启动任务收取。alpha.7 进一步修正框架 turn 因后台自动通知增加时错误解除保护的问题；只有明确的新用户消息恢复准入。状态按 Agent 隔离，卸载移除 guard 和事件。preset 要求顺序执行、准确报告已启动任务和简洁展示结果。

## 验证

真实 DSH ToolExecutionPipeline 回归先复现同批错误后继续提交、后台失败后继续提交、自动续跑解除保护，再修正并通过。覆盖同批、同请求多步、自动 follow-up、新用户指令、另一 Agent、诊断、异步失败和卸载。最终 TypeScript 改动后运行 pnpm run check（类型、构建、发布元数据 1 项）及 pnpm run test:integration（4 项）均通过；Python worker 的 7 项测试已在最后一次 worker 修改后通过，此次 alpha.7 仅修改 TypeScript guard，没有重复执行 Python 科学回归。

alpha.6 的实际 Next 隔离 Host 在普通模式和水文专家各跑通数据准备、247 次 XAJ 求值及验证、14 步 CPU 训练、独立 15 天固定权重评估和绘图；每种模式 14 个直接产物、22 个引用图节点哈希通过。alpha.7 最终包再次在实际 Next 隔离 Host 验证普通模式、水文专家、原生后台指标（NSE=1、KGE=1、RMSE=0）、取消、布尔参数与跨对话 Study 复用，结果为 passed；未重复无改动的完整科学流程，也未追加付费模型训练调用。对应 `.omx/next-final6/host-result.json` 与 `.omx/next-final7/host-result.json`。

最终工件 `artifacts/iheadwater-dsh-hydrosystem-0.1.0-alpha.7.tgz` 为 41,987,842 字节，SHA256 `0d1d2064c04ad2d628f3febd470dd709ccc4f90809a52a0ed813581066a3aed2`，199 个公共核心 payload 文件校验通过。正式 desktop 与隔离 web 各 233 个安装文件均与 tarball 哈希一致，见 `.omx/next-final7/package-check.json`。未提交、推送或公开发布；Mac 真机验收仍按用户决定随后进行。
