# 基础能力开发检查点

2026-11-08：按用户要求，在开始独立工作台 UI 之前提交当前能力包。仓库版本为 0.1.0-alpha.8，基础工具、Python 托管环境与水文专家 preset 位于 packages/hydrosystem-plugin；UI 随后在同一仓库独立包开发，不把模型账号接入或界面代码加入科学核心。

Windows 实际 Next 双模式四类科学闭环、桌面对话 CPU 训练与固定 checkpoint 评估、状态查询与保存参数核对已完成，证据见 [alpha.7 验收](verification-alpha7.md)。Mac 真机验收按用户决定随后执行。

alpha.8 增加新用户能力介绍、渐进式信息收集和友好反馈；已完成发布工件检查与实际 Next 隔离 Host 双模式 smoke。正式桌面最后核验的安装仍为 alpha.7，未因更新打断用户运行中的研究，尚未进行 alpha.8 自然语言引导验收，详见 [alpha.8 验证](verification-alpha8.md)。

提交前再次执行 pnpm run check（类型检查、构建、发布元数据测试 1 项）与 pnpm run test:integration（4 项）均通过。科学执行器与 worker 没有新增修改，未重复训练、完整科学流程或 Python 回归。安装工件和环境保留在本机忽略目录，不进入源码 commit；维护者可按开发构建说明重新生成。

reference/legacy-dsh-20261107 是公共仓库拆分时保存的历史材料，不能作为活动实现或构建入口。本检查点为本仓库首个本地 commit，不推送或公开发布。
