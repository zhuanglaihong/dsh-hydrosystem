# 水文能力插件

DSH 原生水文工具与“水文专家”preset。水文专家会按初次使用、开始任务、执行结果和阻塞场景提供引导：介绍四类能力、给出可直接发送的任务例句、分步补齐必要信息，并解释结果和下一步。纯介绍不启动计算；具体任务执行前检查实际支持范围。工具在 Host 注册，普通模式也能使用；算法、数据与研究规则复用固定 hydrosystem 公共核心。

版本 `0.1.0-alpha.8`，目标为 DSH-Next 2.0.22-next（DSH 0.2.2-rc.1／Cordis 4.1.0），尚未发布到 npm。默认托管模式准备独立的 Python 3.12.12 环境和固定科学依赖，首次使用需要网络和约 5–10 GiB 磁盘空间。环境准备阶段仅提供 `hydrosystem_environment`；成功后注册支持的工具接口，实际执行仍检查选中项目的部署配置。

先用 hydrosystem_research 查看已有项目、来源与时期，发现相似研究时先提示复用。确需新研究时，hydrosystem_setup_project 根据用户明确选择的本地目录、reader、流域 ID、可读时期及率定／验证划分生成独立声明，并绑定当前对话；随后进行数据预检、纳管和显式 Study 初始化。引导支持 selfmade CSV 与既有 CAMELS-US，其他读取方式可使用公共核心的显式部署 JSON；不自动下载真实数据。

数据准备、模型率定与验证、CPU LSTM 训练与 checkpoint 评估、绘图与指标直接通过包内 Python worker 调用固定公共核心和上游包，不启动 MCP 服务或经 CLI 调用算法。图表和权重用完整产物引用传递；各平台实际验收范围以源码仓库的验证记录为准。

SelfMade CSV 取值预检通过后可直接初始化 Study 并读取，不需要额外生成 NetCDF 缓存。新 SelfMade 项目不开放 prepare_cache；已有配置保持原样。新建研究的 new_research 必须为 JSON 布尔值 true，字符串 "true" 会被拒绝。发生错误后报告阻塞，本轮不再启动新的科学任务；用户的新指令可在原 Study 中纠正参数。

水文工具错误或后台失败后，插件阻止同一用户轮次继续启动科学任务、建立项目或改绑研究；状态、既有后台输出和只读产物核查仍可使用。只有新的用户指令恢复准入；后台自动续跑不解除失败保护，不影响其他 Agent。该规则由 DSH 工具 guard 执行，无需更改 Agent 循环。

hydromodel 科学结果的 status_query 指向 task_ref，effective 提供已保存的算法和搜索范围；优化器 run_id 不能当成独立模拟的 run_ref。hydrosystem_read_artifact 用完整引用读取当前 Study 内不超过 1 MiB 的 JSON 元数据，验证目录、schema、kind 和内容哈希，不接受任意文件路径或执行科学计算。

新项目默认不设应用累计／单次额度和墙钟停止，实际用量、取消和算法停止条件仍记录。率定默认 quick（算法求值参数 256），precise 为 4096，custom 必须显式 model_evaluations；也可覆盖算法设置。模式描述计算投入，不保证精度或收敛。CPU 模型仅限已适配家族，其他上游模型可能仅供发现。

在 DSH 插件页安装本 tarball 并开启 bundle；新会话可选“水文专家”。普通会话也有同样的原生工具访问能力。后台任务通过 DSH 的 `job_output` 和 `job_kill` 查询或停止，返回任务句柄不代表计算完成。

配置项 `mode` 默认为 `managed`；高级接入 `existing` 必须明确给出 `python` 与 `projectRoot` 的绝对路径，且通过公共核心来源检查。可选绝对路径 `stateRoot` 调整插件存储；`hydromodelConfig`、`dataConfig`、`torchhydroConfig` 绑定公共核心部署配置。模型提供的工具参数不能覆盖解释器和部署位置。

该包不提供专属科研 UI，不接入模型账号；使用用户已有的模型提供方。

`researchRoots` 接受 `{id,title,root}` 数组，声明可用的研究输出目录。Agent 通过 `hydrosystem_research` 的 `list`／`current`／`bind` 选择配置中的 ID；两个对话绑定同一项目即可复用同一个 Study。绑定跨重载保留，运行中拒绝切换，配置路径改变后要求显式重新选择。项目绑定不改变数据授权或环境。
