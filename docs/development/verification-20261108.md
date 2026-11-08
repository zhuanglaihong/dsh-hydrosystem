# 首个 alpha 验收记录

2026-11-08；候选包 `@iheadwater/dsh-hydrosystem@0.1.0-alpha.1`，未发布。验收目标可执行文件 `D:/DSH NEXT/DSH NEXT.exe`，桌面产品 2.0.22-next，自带 CLI 报告 DSH 0.2.2-rc.1，Cordis 4.1.0。源代码检查使用其配套 Node v24.21.0。

## 实际工件

`artifacts/iheadwater-dsh-hydrosystem-0.1.0-alpha.1.tgz`，41,969,861 字节，SHA256 `280c9c37d68917ac453a6104a6cbf65469bfbc26fa12e6a6a396a5424a951981`。打包脚本校验 198 个公共核心 payload 文件和 Windows x64／Mac ARM uv 的完整性，确认没有历史参考、node_modules、虚拟环境或 Python 缓存进入工件。

公共核心版本 0.2.0，release id `5be8c3eceac3`，锁摘要 `5582ee21d85ea557db50c7f39f816450de18698f9494fb30439cf329c9428409`。上游版本：hydromodel 0.4.0、hydrodatasource 0.3.0、hydrodataset 0.3.0、hydroutils 0.2.0、torchhydro 0.2.0。

## 已执行检查

| 检查 | 实际结果 |
|---|---|
| `pnpm run check` | 类型检查、构建和 1 个工件元数据测试通过 |
| `pnpm run test:integration`，显式指定科学解释器与来源 | 2 个公共工具集成测试通过；覆盖指标、非法参数、即时取消、注册失败回滚与卸载 |
| 匹配 Python 执行 `-m unittest discover -s tests/python -v` | 3 个真实 worker 协议测试通过 |
| `scripts/pack_plugin.py` | 对实际 tarball 的资源、平台工具链与 payload 哈希校验通过 |
| `node scripts/smoke_managed.mjs .omx/managed-smoke` | 新建独立环境，安装 291 个锁定依赖；真实上游指标 NSE=1、KGE=1、RMSE=0 |
| `scripts/smoke_next.py`，实际目标 Next、最终 tarball、隔离运行目录 | 标准模式与水文专家均提交原生 jobs 并读取相同真实指标；`job_kill` 对应原生取消后状态为 killed |

所有科学输入均为明确的合成短序列，未发送模型请求。Next 的普通模式和水文 preset 使用真实宿主服务与会话；这是程序驱动的原生工具验收，尚未测试模型自主选择工具的效果。

原始证据保留在 `.omx/managed-smoke/smoke-result.json`、`.omx/next-release-smoke/host-result.json`、相邻日志与 `artifacts/package-result.json`。Next 隔离启动复用了已准备的同版本插件私有环境；正式用户 Profile、模型账号、研究数据未改动。首次独立状态目录实测占用约 4.01 GiB，包括本次缓存。

## 尚未验收

四类科学工作流、数据配置引导、跨会话 Study 复用、率定档与不限额默认策略、升级失败恢复、桌面窗口点击与模型自主执行、Mac 真机科学运行仍待完成。Mac 包含工具链不等于已经通过跨平台验收。GitHub Actions 配置已添加，远端 CI 尚未运行。
