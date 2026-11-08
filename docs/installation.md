# 安装 alpha

目标是 DSH-Next 2.0.22-next／DSH 0.2.2-rc.1。使用本机 Next 自带的插件管理入口，安装本地 `iheadwater-dsh-hydrosystem-0.1.0-alpha.8.tgz`。该包尚未发布到 npm，包名搜索安装暂不可用。alpha.4 的程序化科学闭环保留在阶段验收，后续模型调用暴露的问题与当前版本验证见[alpha.7 修复记录](development/verification-alpha7.md)。alpha.7 复用 alpha.5 的同一科学 release；安装完成的环境可直接复用。

通过 CLI 更新包后，插件页刷新显示的是安装元数据，不能单凭版本标签认定 Host 已加载新代码。确认没有需要继续运行的任务后，通过“应用 → 退出并重启”重启 Next；环境就绪后再检查实际工具声明和执行结果。重启会停止 Host，不能在科学任务运行中直接执行。已有数据、项目配置和研究结果保持原位置。

## 环境与数据

默认 `managed` 模式安装插件私有 Python 3.12.12、uv 0.9.2 和锁定科学依赖，不使用全局 Python 或 Next Office 环境。首次需要联网；预留 5–10 GiB。环境与研究位于所选 Profile 的 `hydrosystem/` 中，可通过配置 `stateRoot` 指定绝对路径。普通科学工具不能替换解释器或部署位置；项目接入工具单独接收用户明确选择的数据目录，生成插件自有声明。

安装可能显示准备中；通过 `hydrosystem_environment` 查看状态，失败信息和 `releases/<release_id>/hydrosystem/.hydrosystem/installation.log` 保留定位依据。重新开启会检查并复用已完成的同版本环境，不自动覆盖旧版环境。插件卸载会移除工具并等待自身科学 worker 结束；环境和研究文件保留。

组件显示“运行中”只说明宿主已挂载组件，环境就绪仍以 hydrosystem_environment.status=ready 为准。下载失败时先查看原日志，保留缓存并修复网络；明确重试同一安装位置，完成后单独停用／启用水文工具组件，使失败实例重新读取就绪状态。不要删除研究或换项目来修复安装。

## 科学配置

接口发现不授予数据权限。使用[项目接入工具](project-setup.md)选择本地数据并生成独立配置；未配置研究仍可查询能力和计算内联指标。高级模式的 `hydromodelConfig`、`dataConfig`、`torchhydroConfig` 分别是公共核心部署 JSON 的绝对路径，格式随 payload 位于 `core/hydrosystem/docs/reference/`。旧演示数据或限额不作为真实研究默认值。

`existing` 模式仅用于明确选择的已有环境，必须同时配置 `python` 和 `projectRoot` 绝对路径。插件验证五包版本和来源；验证通过才注册科学工具。开发环境通过不等于干净机器或跨平台验收。

## 使用检查

开启 bundle 后，用普通对话查询环境和 `capabilities`。也可在新对话选择“水文专家”preset。要求计算实测与模拟都为 `[1, 2, 3, 4]` 的指标，收取后台结果后应得到 NSE=1、KGE=1、RMSE=0。环境检查和工具发现本身不启动率定、训练或创建 Study。

默认对话研究目录相互独立；可通过 researchRoots 和 hydrosystem_research 显式复用同一 Study，详见研究绑定指南。Mac Apple Silicon 的工具链资源已打包，真机验收待完成；Linux、CUDA 不属于此 alpha 平台范围。
