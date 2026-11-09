# 独立发布两个插件

一个 GitHub 仓库存放两个插件的源码，每个插件有自己的 npm 包、版本与安装文件。根目录 package.json 为 private；不从根目录执行 npm publish，也不发布总 bundle。当前候选版本与平台验收范围见[项目主页](../README.md)。

## 源码和安装文件

Git 保存 packages 下的源码、DSH 声明、包内许可证和图标，以及构建脚本、测试与文档。node_modules、lib、科学 payload、uv 工具二进制、环境、研究数据与安装 tarball 不进入源码提交。reference 是已提交的拆分历史，不能用于活动构建。

GitHub Releases 可以分别附上两个 tgz，也可以仅为发生变化的插件创建 Release；npm 则以各自包名独立发布。下载源码不等于获得安装包。首次公开发布前，确认 npm 作用域的发布权限，以及目标 Next 版本和实际平台验证结果。

GitHub Release 的操作是：选定已经推送的源码提交，为该插件创建版本标签，将对应 tgz 和 SHA256SUMS.txt 添加为附件，填写安装方式与验证范围。当前 alpha 使用预发布标记；草稿可先检查，发布后附件才可被普通用户下载。无需先发布 npm，也能通过 Release 附件 URL 安装，命令见[安装指南](installation.md)。

## 本地准备

使用 Node >=24.9 和根 packageManager 指定的 pnpm，先执行：

```sh
pnpm install --frozen-lockfile
pnpm run check
```

只构建一个包时使用 pnpm run build:tools 或 pnpm run build:workspace。完整 check 同时覆盖两个包的类型、构建和源／HTTP／Projection 测试；真实 Next 界面和科学集成回归按改动选择，命令见[开发说明](development/first-build.md)。CI 的源检查和 UI 打包预检不代表 Mac 科学依赖已通过真机验收。

## 分别生成安装包

| 目标 | 构建与打包命令 | 前提 |
|---|---|---|
| 能力插件 | pnpm run build:tools；pnpm run pack:tools | 已通过 prepare:core 显式准备匹配的公共科学 payload 和 uv 工具 |
| 工作台 UI | pnpm run build:workspace；pnpm run pack:workspace | Node 依赖就绪，不需要 Python 或科学 payload |

两种 tgz 均输出到 artifacts。pack:tools 保留原 pack:plugin 入口并复用同一校验脚本；pack:workspace 可附加 --dry-run，仅检查 npm 将收录的文件，不生成或覆盖安装包。能力包的 payload 准备参数和校验步骤见[开发说明](development/first-build.md)。

已安装或已发布的版本对应固定内容；修改任意随包文件都要使用新版本号。不要覆盖同名 tgz 再要求用户重装，因为包管理器可能复用旧缓存。已验收的现有安装文件保留原样；新候选先安装到隔离 Next Profile，检查实际加载结果和文件哈希后再用于桌面。

## 版本与发布

分别修改目标包的 package.json；只有变更的插件需要发新版本。推荐 Git 标签为 tools-v<能力插件版本> 和 workspace-v<UI插件版本>，每个 Release 标明该插件版本、DSH 基线、已验证的搭配、安装文件与 SHA256。更新一个插件不要求另一个跟随升版。

实际 npm 发布使用已验收的 tgz，而不是再次从工作目录打包。先对该 tgz 执行 npm publish <安装文件路径> --access public --tag next --dry-run，核对清单；确认公开发布后再去掉 --dry-run。alpha 候选使用 next 标签，不覆盖稳定版 latest。仓库当前没有自动发布任务，上传 GitHub 源码不会触发 npm 发布。

两个包已配置 GitHub 仓库 zhuanglaihong/dsh-hydrosystem，共用 repository.url，repository.directory 分别为 packages/hydrosystem-plugin 与 packages/hydro-workspace；主页与问题反馈地址已填写。补齐元数据后的源码候选为能力 alpha.9 与 UI alpha.7。现有已验收 alpha.8／alpha.6 安装文件不变，后续另行构建、验收并发布新候选。

2026-11-09 远程 main 已有仅包含 MIT LICENSE 的初始化提交，本地项目及两个插件声明 Apache-2.0。用户已确认统一使用本地 Apache-2.0；首次同步保留远程初始化历史，以本地许可证为准；公开代码同步不自动发布 npm 包。远程 origin 已配置为 https://github.com/zhuanglaihong/dsh-hydrosystem.git。
