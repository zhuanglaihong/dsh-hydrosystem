# GitHub 首次发行准备

2026-11-09，源码仓库为 zhuanglaihong/dsh-hydrosystem，一个仓库发布两个独立插件。用户确认 Apache-2.0，并授权提交和推送；远程初始 MIT LICENSE 提交保留在历史中，当前文件以本地 Apache-2.0 为准。npm 发布和社区市场收录不包含在源码推送中。

pnpm run check 的类型、构建和 4 项测试通过；能力包使用 scripts/pack_plugin.py 实际生成并校验 199 个 payload 文件，工作台使用 pnpm run pack:workspace 实际生成安装包。新能力 alpha.9 与已验收 alpha.8、UI alpha.7 与已验收 alpha.6 的 tarball 逐文件比较，分别只有 package.json 和 README.md 不同；运行代码、科学依赖与工具链均未变动。本轮没有重新执行科学任务、模型对话或 Mac 真机测试，不将元数据发行视为新的科学验收。

| 安装文件 | 字节 | SHA256 |
|---|---:|---|
| iheadwater-dsh-hydrosystem-0.1.0-alpha.9.tgz | 41989481 | 6bc39f23526b553c6d46b6efa218d2dafd98908e370b7afa3d361a661878c932 |
| iheadwater-dsh-hydro-workspace-0.1.0-alpha.7.tgz | 28146 | d58674fc79253ccbbbe53a853a32fb206b28b17dc738079f7529caeec94c9eb3 |

源码不包含 node_modules、科学环境、生成的 lib/core/tools 或 tgz；安装包作为 GitHub Release 附件管理，各自附 SHA256SUMS.txt。Release 首先创建为预发布草稿，发布草稿后普通用户才能通过附件 URL 下载。维护者可以源码克隆构建，当前子包未提供自包含 prepare，因此不承诺直接 Git URL 自动构建安装。完整步骤见[安装指南](../installation.md)与[发布指南](../releasing.md)。
