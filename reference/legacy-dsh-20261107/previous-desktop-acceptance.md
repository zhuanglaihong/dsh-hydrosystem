# DSH 水文工作台开发与验证

目标桌面：`D:\DeepSeek_Harness\DeepSeek Harness.exe`，官方 V0.2.1-rc.5。开发源码在 `integrations/dsh`，DSH 源码未修改。Codex / WorkBuddy 接入按用户最新决定留待独立插件；开发中的 codex-auth 文件保留，但不打入本工作台包、不注册入口。

## 当前工件

`dsh-workbench-bundle-20261106/iheadwater-dsh-hydrosystem-0.0.1-dev.15.tgz`，SHA-256 `197561E28440C459858BE0441553E46DDA55B33C1C54EDE372EAE97099C8B257`。已安装到目标 Desktop profile，并正常退出、启动指定 EXE；插件详情显示 dev.15，共五个组件、五个运行中。继续使用原科学 payload `e45d67a785ea`，dev.15 的 204 个 payload 文件哈希校验通过，未重新创建 Python 环境或运行率定／训练。

## 实现

一个 bundle 装配节点运行时、水文工具、研究管理、环境查询四个 Host 插件，客户端工作台和水文研究员 preset 保留。节点服务拥有进程生命周期和固定环境；工具通过公共 Python bridge 调用，同一调用在提交时确定会话 Study，科学任务登记至 DSH 原生 jobs。

研究管理发现当前绑定节点 studies 目录的最多 200 个直接子目录，验证 manifest 与路径，提供选择和明确目标后新建 Study。`dsh-study-bindings.json` 保存每个对话的绑定；管理页的内部查询会话持有当前选择，从该页创建的研究对话取得相同绑定。任务登记前锁定所属会话的选择，失败释放锁，后台任务完成后释放。独立 Study 的科学账户、Policy 和产物仍由公共运行时管理。

环境页以实际绑定解释器调用公共 environment status，显示 Python、虚拟环境、五包版本／要求／来源／模块位置、锁指纹、uv 实际版本、CPU／内存／执行域。实机读取为 Python 3.12.12、uv 0.9.2，五包版本分别为 hydromodel 0.4.0、hydrodatasource 0.3.0、hydrodataset 0.3.0、hydroutils 0.2.0、torchhydro 0.2.0。检查类型明确为 metadata_only，不能表示科学验收或 GPU 就绪。

对话右上角提供文件／产物／实验／终端入口。文件和终端复用 DSH 标签；产物显示科学报告、核验图表及参数／模型引用，实验显示节点运行中的 worker 任务与所选 Study 活动。控制类查询不计入正在运行的科学任务。当前会话 job／turn 事件触发读取；有节点科学任务时，可见页每 5 秒读取，隐藏／卸载停止。详情与分类按会话存储在浏览器中，DSH 自身恢复标签布局。

## 已执行验证

Desktop 内置 Node 24 运行 studies、tools、workspace、managed-node 和 client 五个测试文件：9 通过、0 失败、0 跳过。client 测试使用 DSH 已安装的 React 18 与 jsdom，验证四个快捷入口、研究选择、研究页直接切换环境页时的数据隔离、环境版本展示。其余测试覆盖文件路径隔离、绑定持久化、忙碌拒绝切换、任务捕获原 Study、容量拒绝释放状态、自身 control 查询过滤、产物去重和图表哈希拒绝损坏。

`python -m pytest tests/test_examples_and_user_docs.py tests/test_bridge.py -q`：5 通过。`scripts/check_dsh_bundle.py`：204 文件通过。`git diff --check` 通过。JavaScript 语法检查通过。

## 真实桌面验收

验收使用指定官方 EXE，未用 npm、源码或浏览器实例替代。恢复桌面控制后检查研究页和环境页，并通过 UI 创建目标明确的测试研究 `study-11a9af59eba54305b1396b29dce698b3`，目录 `research-f4f7b47a-7222-40bb-b90e-a4efee25e2f2`，目标为“工作台交互验收：研究隔离与页面导航（不执行科学计算）”。原研究 `study-6949dad69a7d4b20a2e4f8aa01ee367d` 保留。

实机发现先建无工作区对话再选工作区会丢失 preset 与 Study，已改为在研究页选择工作区，并在创建会话时同时提交 workspaceId、hydrology preset，绑定 Study 后打开。补充测试覆盖带 this 的 WorkspaceSource 订阅方法，实机确认 HydroAgent 工作区与“水文研究员”同时保留。

主模型选择已登录的 DeepSeek 账号 / DeepSeek-V4.1-Flash。新对话“界面只读验收：报告绑定信息”实际执行一次 hydrosystem_workbench，返回上述新 Study，活动、图表、产物及科学用量均为 0；未提交其他模型请求。环境页显示实际 Python、uv、五包版本与节点信息。

四个入口实机打开：文件显示 HydroAgent 原生文件树；产物显示绑定研究；实验显示空科学任务；终端打开原生 cmd.exe，未输入命令。旧“hydrosystem 插件集成验收”对话仍显示原 Study 的四份报告、三张图表；散点图可打开详情。切换新旧对话后各自标签布局与旧图表详情恢复，未混入新 Study。最后正常重启至 dev.15，窗口 ID 为 247664620，插件详情确认四个 Host 插件与 preset 五项均运行中。深色、窄屏和重启时进行中的科学任务恢复未验收。

## 范围

当前管理当前节点研究和当前绑定环境；跨节点发现、环境安装／切换、跨会话实时全局订阅、任意聊天文字引用自动定位水文产物未实现。原有快速／精细率定方案及可选限额改造不属于本次工作台开发，原演示 Policy 保留。本轮未提交或推送代码。
