# 项目约定

先读 PLAN.md。用户于 2026-11-08 确认 D1 采用 A，其余决策采用推荐方案，并授权从标准可发布仓库开始构建能力插件。基础能力检查点为 302160d。用户已授权在同仓库独立包 packages/hydro-workspace 实施配套科研工作台 UI；基础能力继续位于 packages/hydrosystem-plugin。先在隔离 Profile 验证，使用目标桌面安装入口，不更改既有模型账号或研究。

本项目负责 DSH 工具、环境托管、preset 与科研工作台；hydrosystem 仓库保留 MCP、CLI、公共确定性执行语义和原生安装。科学算法由上游包提供，不复制算法，不把 UI 或模型接入写入公共科学层。

用户于 2026-11-09 确认一个仓库维护两个独立安装、独立版本的插件：packages/hydrosystem-plugin 为能力插件，packages/hydro-workspace 为配套 UI。根 package.json 保持 private；不创建同时安装两者的总 bundle。每个已安装或发布的版本都视为不可变工件，修改包内容后使用新版本号；不能原版本覆盖重打包来更新桌面缓存。GitHub 地址确认后再补仓库元数据，不猜测组织名或远程地址。

reference/legacy-dsh-20261107 是历史留档，不能作为活动源码、构建入口或当前产品能力。优先依据 PLAN.md 的新边界重新设计；参考代码有价值时验证接口、环境和错误处理后再采用。旧代码中的绝对路径、固定数据、演示时限、工具数和旧桌面版本不能直接继承。

第二阶段必须同时验证普通 DSH 模式和水文专家 preset。所谓任意 Agent 指拥有相应工具访问权、支持工具调用的 DSH Agent；其他产品继续通过 hydrosystem 的 MCP／CLI 接入。preset 不授予数据权限，不改变计算规则，不是底层工具执行的前提。

目标实机是 D:/DSH NEXT/DSH NEXT.exe。重新核对 Next 版本、其包含的 DSH 版本和当前 Profile，不使用 PATH 中的 npm dsh 或旧官方桌面替代验收。测试优先使用隔离 Profile，正式 Profile 的安装与变更单独验收。

环境、数据和 Study 分开保存。固定解释器、版本与来源；不修改全局 Python，不复用 Next Office 环境，不自动迁移旧研究、不覆盖用户已有安装。安装、环境检查、协议加载与科学执行分别报告。

开发遵循 karpathy-guidelines；改动后执行相应公共行为测试及构建检查，汇报实际结果。保留用户已有工作，不自动提交、推送、发布或接入新的模型账号。
