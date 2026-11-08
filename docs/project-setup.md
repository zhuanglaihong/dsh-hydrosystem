# 从本地数据开始研究

先用 hydrosystem_environment 查看环境，用 hydrosystem_research list 比较已有项目的来源、流域与时期。发现相似研究时先提示用户复用；明确选择后 bind，再用 hydrosystem_study status 读取已有证据。

## 新研究声明

用户明确选择本地目录后，调用 hydrosystem_setup_project：

```json
{
  "title": "流域基线研究",
  "reader": "selfmade",
  "source_root": "D:/my-data/basin-series",
  "dataset_id": "my_basins",
  "basin_ids": ["001"],
  "period": ["2000-01-01", "2002-12-31"],
  "calibration_period": ["2001-01-01", "2001-12-31"],
  "validation_period": ["2002-01-01", "2002-12-31"],
  "warmup_steps": 365
}
```

路径须替换为用户实际选择的本机绝对目录，Mac 使用其绝对路径。率定、验证必须有序且不重叠，可读数据须包含率定前预热。可选 variables／attributes 声明额外变量和静态属性，默认变量为 precipitation、potential_evapotranspiration、streamflow，属性为 area。声明文件保存在插件目录，不改原始数据，不自动创建 Study 或运行模型。

按顺序执行 hydrodata_preflight、hydrodata_adopt_dataset；公共 reader 如需缓存，在研究初始化前执行获准的 hydrodata_prepare_cache。确认数据就绪后，用明确目标和 new_research=true 调用 hydrosystem_study initialize。缺文件、日期、单位或权限时按具体错误补条件，不隐藏重试。

SelfMade CSV 取值预检通过后无需额外生成 NetCDF 缓存；新声明关闭其 prepare_cache 权限。缓存准备仅在预检报告 CACHE_NOT_READY 或 CACHE_REQUIRED 且部署授权时执行。Study 初始化示例为 `{"operation":"initialize","new_research":true,"goal":"流域基线研究"}`，其中 true 是 JSON 布尔值，带引号的 "true" 会被拒绝。参数错误时报告阻塞，等待新的用户指令纠正参数，不通过更换 execution_id 反复重试；保留已纳管数据、原声明和 staged evidence。

| 任务 | 工具衔接 |
|---|---|
| 数据准备 | list_datasets、list_basins、preflight、adopt_dataset、read_attributes、read_timeseries |
| 率定与验证 | hydromodel_preflight、hydromodel_calibrate；返回 trial_ref 在原 Study 调用 hydromodel_simulate，data_role=validation |
| 训练与评估 | torchhydro_preflight、torchhydro_train；用完整 checkpoint_ref 调用 torchhydro_evaluate，固定权重评估不执行优化步骤 |
| 图表与指标 | 复用生产者的 series_selections、完整 Artifact Reference，调用 hydroutils 的 plot_timeseries／plot_rainfall_runoff／plot_scatter／compute_metrics |

科学任务返回 job 句柄后，通过 job_output 取得终态和结果；job_kill 请求取消，等待结算后才确认停止。图表、数据和权重位于同一 Study 的 objects/，引用带哈希，不跨研究复制或手工重建引用。

科学任务的 status_query 明确给出查询工具和 task_ref，不把率定内部 run_id 当成独立模拟的 run_ref。effective 包含已保存的实际算法与搜索范围；进一步核对可用 hydrosystem_read_artifact 读取完整 JSON 引用，限当前 Study、1 MiB，验证哈希。发生水文错误或后台失败后，本用户轮次不能再启动科学任务或更换研究，只收取既有结果和诊断；等待新的用户指令后再继续原 Study；后台自动续跑不解除失败保护。

## 停止规则和范围

新项目默认不设应用累计／单次额度和墙钟停止，实际用量、并发容量、数据大小与已适配模型范围仍明确。quick 是插件默认率定模式，算法求值参数为 256；precise 为 4096；custom 要求 model_evaluations，所有模式均可显式覆盖。ngs、kstop、peps、pcento、random_seed 使用公开字段；参数、来源和停止原因保留，快速结果提示可继续精细或自定义，不保证精度或收敛。

需要有限限制时用显式公共核心部署 JSON，已有 Study 的 Policy 不原地改写。引导支持 selfmade 与既有 CAMELS-US；其他 reader 使用高级数据部署。仅发现的模型不等于可执行，CUDA、远程算力和专属 UI 留待后续。
