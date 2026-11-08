# 选择并复用研究

从 alpha.2 开始，宿主可配置可选研究位置；普通模式和水文专家均通过 `hydrosystem_research` 选择。项目绑定只是“该对话接下来使用哪个研究目录”，Study 的目标、历史、实验和产物仍由公共核心维护。

## 配置位置

在能力插件配置中增加 `researchRoots`，保留原有环境和科学配置。例如 Windows 主机：

```json
{
  "researchRoots": [
    { "id": "basin-baseline", "title": "流域基线研究", "root": "D:/research/basin-baseline" }
  ]
}
```

`root` 必须是本机绝对路径，指向研究输出目录；不要填入上游源码目录或原始数据目录。ID 唯一且由字母、数字、下划线、连字符组成，最多 80 个字符。配置可指定尚不存在的输出目录；选择项目本身不创建 Study。手工 researchRoots 默认使用插件全局科学配置；alpha.3 的 hydrosystem_setup_project 为程序新建的项目生成各自独立声明，详见[本地数据接入](project-setup.md)。各项目共用固定依赖环境，绑定不扩大数据访问范围。

## Agent 使用

1. `hydrosystem_research` 传入 `{"operation":"list"}`，读取宿主明确提供的项目；用 `current` 查看当前对话绑定。
2. 用户明确要使用该项目后，传入 `{"operation":"bind","project_id":"basin-baseline"}`。工具只接受配置中的 ID。
3. 用 `hydrosystem_study` 的 `status` 读取原研究。已有 Study 时继续使用；确需新研究时才按核心要求提供目标及 `new_research:true` 初始化。
4. 另一个对话绑定同一项目后读取同一个 Study；未绑定的对话保留自己的独立目录。

绑定保存在插件状态目录的 `bindings/`，重载插件后仍保留。研究运行时拒绝本对话切换，已经提交的任务固定其原始目录。配置删除项目或更改同 ID 的目录后，原绑定会报告 `BINDING_CHANGED`，需要显式重新选择；不会把旧研究自动指向新目录。绑定不会迁移、合并或覆盖已有研究，也不负责相似研究的自动判断。
