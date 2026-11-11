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

编辑器顶部提供“上传附件”（支持多选，单文件 100 MB）和“插入链接卡片”。拖入非图片文件也会上传为附件；拖入图片保留原图片流程。文章页面显示文件名、大小和下载图标，链接卡片显示标题与域名，支持深色模式。

复用标准 Markdown 链接的 title 字段，Milkdown 可以保留，无额外解析语法：

```markdown
[资料.zip](/api/v1/files/<uuid>/download "attachment:2048")

[项目主页](https://example.com "link-card")
```

普通链接继续按原样显示。卡片样式在文章阅读页展示，编辑器中以可编辑的 Markdown 链接保留。链接卡片不抓取外部网站元数据。

附件需要同时部署后端接口；上传沿用 `upload_image` 权限。`POST /api/v1/files/upload` 接收 multipart `file`，返回 `name`、`size`、`url`；公开的 `GET /api/v1/files/:id/download` 强制下载。附件属于持有链接即可访问的公开资源，不用于私密资料。

验证：`bun test components/ResourceLink.test.jsx`、`npx tsc --noEmit`、`npm run build`。
