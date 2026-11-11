<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your blog frontend

This contains everything you need to run the blog UI locally.

## Run Locally

**Prerequisites:**  Node.js or Bun

### Using Bun (recommended)
1. Install dependencies:
   `bun install`
2. Run the app:
   `bun run dev`

### Using npm
1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## 附件与链接卡片（2026-11-11）

通过 Crepe 原生 `/` 菜单或块手柄 `+` 插入附件/链接卡片，支持拖入附件，单文件 100 MB。图片保持原 ImageBlock/WebP 上传流程。

卡片最大宽度330px、居中，左侧96px正方形图标区，右侧文字左对齐（水平内边距20px）。手机图标区88px。文件显示对应类型图标与文件名；链接有description显示描述，没有才显示URL。metadata图标失败依次回退网站/favicon.ico和通用图标。悬浮或键盘聚焦切换下载/打开图标，支持减少动态效果设置。

编辑器中首次点击选中高亮并显示右上角删除按钮，再次点击进入JSON源码区；点卡片外取消选中/结束有效源码编辑。正文方向键可连续进入源码：左右按起点/终点，上下尽量保留横向位置。源码由ProseMirror textblock/contentDOM管理，支持原生IME与撤销。无效JSON保留为resource-card代码围栏，重新打开可修复，不静默丢失内容。普通行内链接保留原生功能。

保存仍为标准Markdown链接：附件title为attachment:<字节数>；旧link-card与link-card:<icon URL>兼容。包含description时使用link-card:v2:<URI编码JSON>，JSON字段为icon、description。源码无效时以resource-card代码围栏保存。

作者metadata接口GET /api/v1/links/metadata?url=...需要JWT与upload_image权限，返回url/title/icon/description。阅读页直接使用已保存metadata；不在每次浏览时抓取网页。附件公开链接可下载，非私密存储，后端接口及存储说明见后端README。

Vite resolve.dedupe确保ProseMirror构造函数一致。验证：bun test components/ResourceLink.test.jsx components/resourceCardMarkdown.test.jsx；npx tsc --noEmit；npm run build。浏览器另外验证选中/编辑/点外退出、方向键、无效源码恢复、删除与撤销。

源码区显式启用原生 caret，避免 Crepe 虚拟光标隐藏浏览器光标的冲突；只有源码编辑状态禁用虚拟光标绘制。展开/收起使用轻阻尼高度动画，减少动态效果设置下关闭动画。

## 移动端编辑与草稿发布（2026-11-11）

编辑页使用 `PostEditorShell`：手机上标题与正文共享一层 16px 页面留白，标题可自动换行，摘要默认折叠。顶部提供返回、保存状态和完成操作；底部提供放弃修改、保存草稿和发布／更新发布。正文工具栏提供图片、附件、链接卡片及常用格式入口，触摸目标至少 44px。布局适配安全区，并随 `visualViewport` 高度变化为软键盘让出空间。上传或执行发布等关键操作时，会暂时禁用可能造成内容丢失的离开／发布动作。

### 自动保存与显式发布

同一文章 ID 下保留线上内容与编辑草稿。自动保存只更新草稿；读者继续看到上一次已发布的标题、摘要和正文。已发布文章保存草稿后仍保持发布状态，并标记“有未发布修改”。只有点击“发布”或“更新发布”，才把最新草稿原子更新到线上版本；文章地址、评论等已有引用保持关联。

编辑内容变更后会短暂等待再自动保存。一次编辑会话只有一个写请求在途，后续输入排队继续保存；旧响应只确认自己发送的内容，不会把更新的输入误标为已保存。新文章创建使用稳定的 `clientRequestId`，供后端识别重试请求，避免重复创建。手动保存、发布和正常返回前会读取编辑器最新 Markdown 并等待草稿同步。发布时暂时锁定编辑输入，避免发布请求期间产生尚未包含的新内容。放弃修改前有确认，并保留本地备份；已发布文章恢复线上版本，未发布文章清空当前草稿。

### 版本冲突与本地恢复

草稿接口携带 `version`，后端使用 CAS（比较并交换）检查更新版本。其他窗口或设备先保存后，旧版本请求返回 HTTP 409；当前编辑器停止自动重试覆盖，保留本地内容并显示冲突提示。用户明确点击“载入服务器草稿”后，才会备份当前本地内容并载入服务器版本，需要合并的改动可从本地备份找回。

未同步内容保存在当前浏览器的 `localStorage`，再次进入编辑页时可确认恢复。页面隐藏时会同步本地缓存，并尽力提交草稿；浏览器关闭、系统杀进程或断网时，网络提交不保证完成，因此保存状态仍以服务器确认结果为准。本地缓存属于当前浏览器，清除网站数据、无痕会话结束或更换设备不会保留这份未同步副本。网络错误会显示错误状态并重试，也可使用“保存草稿”主动重试。返回前保存失败时，会提示是否保留本地内容后离开。

### 发布时间语义

- `publishedAt` 表示可确认的最早发布时间，后续发布不覆盖。
- `publishedUpdatedAt` 仅在已发布内容确实再次更新发布时记录；单纯修改或自动保存草稿不改变公开时间。
- `draftUpdatedAt` 是编辑草稿的保存时间，`createdAt`／`updatedAt` 是数据记录时间，均不替代公开发布时间。
- 页面统一按北京时间（`Asia/Shanghai`）显示发布事件。历史数据若无法确认首次发布时间，通过 `publicationTimeKnown` 标明不确定性，显示历史发布记录／首次发布时间待确认；不把创建时间或迁移当天时间冒充首次发布。

后端需要同步部署支持上述草稿、版本和发布接口。相关回归：`bun test services/draftSaveCoordinator.test.jsx services/publicationDates.test.jsx`；结合卡片测试、`npx tsc --noEmit` 和 `npm run build` 检查集成。手机窄屏布局可在浏览器中验证，真实输入法、软键盘和 Safari 安全区仍应做真机复核。
