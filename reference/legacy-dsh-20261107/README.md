# 旧 DSH 集成留档

日期：2026-11-07。此目录保留从 hydrosystem 迁出的 DSH 专用代码和文档，包括未提交改动。它不参与新项目构建，不注册工具、不启动服务，也不是 DSH-Next 的候选发行版。

原目录结构保存在 integrations/dsh、scripts、docs/guides、hydrosystem/bridge.py 与 tests/test_bridge.py。迁移清单 migration-manifest.json 记录原路径、字节数、摘要和原提交；迁出前已逐文件对照原内容。source-working-tree.patch 保存当时的跟踪文件改动，未跟踪的 DSH 文件已作为原文件纳入留档。

previous-roadmap.md 与 previous-desktop-acceptance.md 记录旧计划和验收。旧官方 Desktop 工件另在本地 artifacts 中保留，工件不进入 Git；原安装位置与用户研究数据均未改动。相对路径和本机目录可能不再可执行，不能从此目录运行旧构建或安装命令。

新计划唯一入口为 ../../PLAN.md。Codex 接入草稿仅为留档，后续使用现成模型插件。
