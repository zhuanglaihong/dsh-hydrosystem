# alpha.2 研究绑定验收

候选 `@iheadwater/dsh-hydrosystem@0.1.0-alpha.2`，本地构建，未公开发布。工件大小 41,973,287 字节，SHA256 `b864b76c014360c71cfb70a5185cdfb631a8cfed34e3b83356d60ae5cc378377`。公共科学核心与 alpha.1 相同，未改动算法、科学策略或依赖锁。

`pnpm run check` 类型检查、构建和工件元数据测试通过；`pnpm run test:integration` 两个公共工具测试通过。新增行为覆盖：两段对话绑定同一 Study、未知项目 ID 拒绝、任务期间拒绝切换、重载保留同一 Study、配置路径变化报告 BINDING_CHANGED，以及原先的注册失败回滚和取消。

`scripts/pack_plugin.py` 对实际 tgz 的 198 个核心 payload 文件及平台工具链哈希校验通过。用 `scripts/smoke_next.py` 加载目标 `D:/DSH NEXT/DSH NEXT.exe` 自带 DSH 0.2.2-rc.1 运行时，在隔离 Profile 安装该包，真实创建两段标准模式会话并绑定同一项目，读取到相同 Study 引用。随后在标准模式与水文专家中分别完成原生后台指标任务，均为 NSE=1、KGE=1、RMSE=0；取消状态为 killed。

原始宿主证据：`.omx/next-study-alpha2/host-result.json` 与相邻安装、Host 日志；工件摘要：`artifacts/package-result.json`。复用插件已安装的独立环境，研究使用隔离合成目录，未调用模型或更改日常桌面 Profile。该结果不替代桌面窗口点击、模型自主选择工具或 Mac 真机验收。

当前仅实现显式绑定。相似研究识别、数据配置引导、每个研究独立科学配置、四类工作流及后续 UI 尚待完成。配置用法见[研究绑定指南](../research-binding.md)。
