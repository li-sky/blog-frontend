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
