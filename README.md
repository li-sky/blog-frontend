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

通过 Crepe 原生 `/` 菜单（或块手柄的 `+`）选择“上传附件”（支持多选，单文件 100 MB）或“链接卡片”。也可输入 `/附件`、`/链接` 筛选。附件与链接在编辑器内以 Milkdown 自定义块节点展示，可预览、拖动、删除与原生撤销。链接卡片通过块内表单编辑地址和标题。拖入非图片文件也会上传为附件；拖入图片保留原图片流程。文章页面显示文件名、大小和下载图标，链接卡片显示标题与域名，支持深色模式。

复用标准 Markdown 链接的 title 字段，Milkdown 可以保留，无额外解析语法：

```markdown
[资料.zip](/api/v1/files/<uuid>/download "attachment:2048")

[项目主页](https://example.com "link-card")
```

普通链接继续使用 Crepe 原生行内链接和链接浮层。独占段落的卡片标记通过 remark 转为 `resourceCard` AST 节点，由 Milkdown `resource_card` schema 与 NodeView 展示为可编辑块；序列化回标准 Markdown 链接，兼容先前保存的内容。链接卡片编辑时通过作者认证的 `/links/metadata` 读取网页标题与网站图标，保存后阅读页直接使用已保存的信息。旧的 `"link-card"` 标记继续兼容；有图标时使用 `"link-card:https://example.com/favicon.ico"`。文件卡片左侧显示文件类型图标，右侧居中显示文件名；链接卡片左侧显示网站图标，右侧显示标题和完整 URL。两者均采用 1/3 + 2/3 布局，悬浮或键盘聚焦时将图标切换为下载/打开提示，并尊重减少动态效果设置。

Vite `resolve.dedupe` 保证 ProseMirror model/state/view/transform 使用同一运行时实例，避免多版本构造函数导致输入时报 `Can not convert ... to a Fragment`。

附件需要同时部署后端接口；上传沿用 `upload_image` 权限。`POST /api/v1/files/upload` 接收 multipart `file`，返回 `name`、`size`、`url`；公开的 `GET /api/v1/files/:id/download` 强制下载。附件属于持有链接即可访问的公开资源，不用于私密资料。

验证：`bun test components/ResourceLink.test.jsx components/resourceCardMarkdown.test.jsx`、`npx tsc --noEmit`、`npm run build`。

卡片采用居中紧凑布局，最大宽度 420px，最小高度 96px（手机 88px）；文件名和链接标题继承正文字号，URL 保持较小字号。图标加载失败依次回退到网站 favicon 与通用链接图标。
