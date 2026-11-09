# 两个独立插件

本仓库通过 pnpm workspace 统一开发和检查，两个 packages 子目录分别生成自己的 npm 包与 DSH 安装文件。根 package.json 为 private，不发布组合包。

| 目录 | 包名 | 负责的内容 |
|---|---|---|
| [hydrosystem-plugin](hydrosystem-plugin/README.md) | @iheadwater/dsh-hydrosystem | 托管环境、原生水文工具、后台任务、研究绑定和水文专家 preset |
| [hydro-workspace](hydro-workspace/README.md) | @iheadwater/dsh-hydro-workspace | 研究管理页面、任务依赖画布、只读产物预览和 DSH 原生研究对话 |

能力插件不依赖工作台。工作台读取同一 DSH Profile 的项目声明、Study 0.2 研究记录与 Session Projection 科学引用；使用自定义状态目录时，两者需配置一致的 stateRoot。工作台不启动第二套科学环境，也不包含能力插件的 npm 依赖，因此安装 UI 不会自动安装科学工具。

每个包在自己的 package.json 中维护版本、文件清单、许可证、DSH bundle 与导出。两个版本无需相同；共享研究记录格式或 DSH 适配发生变化时，同时验证兼容组合。科学规则继续由独立 hydrosystem 公共核心提供，UI 与宿主接入不进入公共科学层。

开发与检查见[构建说明](../docs/development/first-build.md)，独立打包与发布见[发布指南](../docs/releasing.md)。
