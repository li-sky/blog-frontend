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

## 前端开发指导与检查

项目已安装 GoogleChrome 的 `modern-web-guidance` 技能，文件位于 `.agents/skills/modern-web-guidance`，来源记录在 `skills-lock.json`。更新使用 `npx modern-web-guidance@latest update`。

- `npm run typecheck`：检查类型、未使用的局部变量和参数。
- `bun run test`：运行回归测试，需要 Bun。
- `npm run build`：生成生产构建。

登录与注册表单支持标签关联、密码自动填充和原生校验。注册页装饰动画在四秒内结束；花朵可通过点击或键盘再次触发，离开页面时取消动画，减少动态效果模式下保持静态显示。

### 全页检查（2026-11-12）

按 Modern Web Guidance 对首页、文章详情、登录、注册、管理后台、设置、图片管理和 404 全部路由，以及用户／角色管理、编辑器、图片预览、删除确认和配色弹窗进行代码审查。重点修复原生弹窗与焦点、表单标签与自动填充、标题与导航、图片加载优先级、异步生命周期、评论提交竞态和配色对比度；保留原有草稿保存与发布语义。

Chrome 使用 mock API 验证桌面浅色（1280×900）与手机深色（390×844）的 28 个页面状态；axe 的 WCAG 2 A/AA、2.1 A/AA、2.2 AA 及 best-practice 标签检查无违规、无页面横向溢出、无浏览器异常。另行检查弹窗 Esc／焦点返回、图片缩放平移、评论提交、编辑器 StrictMode 单实例、导航 Popover 及不支持 Popover 时的回退。50 个 Bun 测试、类型检查与生产构建通过；配色测试覆盖所有色板的明暗模式及 UI／代码文字对比度。

上述结果针对测试内容与浏览器，不是正式合规认证。文章作者提供的 Markdown 仍可能缺少图片尺寸或跳过标题层级；真实后端、真机软键盘／IME、Safari、Firefox 和真实读屏器仍需专项验证。构建保留原有大分块与 Browserslist 数据过旧提示。`legacy-scan` 的 35 条确定性规则未发现遗留模式，但其覆盖范围仅约为指导库的 20%。

## 附件与链接卡片（2026-11-11）

通过 Crepe 原生 `/` 菜单或块手柄 `+` 插入附件/链接卡片，支持拖入附件，单文件 100 MB。图片保持原 ImageBlock/WebP 上传流程。

卡片最大宽度330px、居中，左侧96px正方形图标区，右侧文字左对齐（水平内边距20px）。手机图标区88px。文件显示对应类型图标与文件名；链接有description显示描述，没有才显示URL。metadata图标失败依次回退网站/favicon.ico和通用图标。悬浮或键盘聚焦切换下载/打开图标，支持减少动态效果设置。

编辑器中首次点击选中高亮并显示右上角删除按钮，再次点击进入JSON源码区；点卡片外取消选中/结束有效源码编辑。正文方向键可连续进入源码：左右按起点/终点，上下尽量保留横向位置。源码由ProseMirror textblock/contentDOM管理，支持原生IME与撤销。无效JSON保留为resource-card代码围栏，重新打开可修复，不静默丢失内容。普通行内链接保留原生功能。

保存仍为标准Markdown链接：附件title为attachment:<字节数>；旧link-card与link-card:<icon URL>兼容。包含description时使用link-card:v2:<URI编码JSON>，JSON字段为icon、description。源码无效时以resource-card代码围栏保存。

作者metadata接口GET /api/v1/links/metadata?url=...需要JWT与upload_image权限，返回url/title/icon/description。阅读页直接使用已保存metadata；不在每次浏览时抓取网页。附件公开链接可下载，非私密存储，后端接口及存储说明见后端README。

Vite resolve.dedupe确保ProseMirror构造函数一致。验证：bun test components/ResourceLink.test.jsx components/resourceCardMarkdown.test.jsx；npx tsc --noEmit；npm run build。浏览器另外验证选中/编辑/点外退出、方向键、无效源码恢复、删除与撤销。

源码区显式启用原生 caret，避免 Crepe 虚拟光标隐藏浏览器光标的冲突；只有源码编辑状态禁用虚拟光标绘制。展开/收起使用轻阻尼高度动画，减少动态效果设置下关闭动画。

## 移动端编辑与草稿发布（2026-11-11）

编辑页使用 `PostEditorShell`：标题与正文共享页面留白，标题自动换行。顶部只保留返回，摘要在标题下方折叠展开、原位编辑；放弃修改位于预览页底部。手机非输入状态下，底部提供插入、格式和预览；输入时隐藏底栏，选中文字时仅保留单行紧凑工具：粗体、斜体、删除线、行内代码、行内公式和链接，与桌面选区工具功能对齐，这三个新增格式也可从“格式”面板使用。桌面恢复 Crepe 原有的选区浮动工具栏，以及行内加号与斜杠菜单，底部只保留预览。插入面板没有额外标题、说明或关闭图标，通过下滑手柄、点击遮罩或 Esc 关闭。面板使用原生 dialog，并保留 ProseMirror 选区，保证插入与格式操作的位置正确。

预览使用 Markdown 渲染，支持资源卡片、表格和公式；返回编辑不会重建正文或清空撤销历史。发布按钮只出现在预览页，沿用现有草稿保存与版本检查逻辑。界面不显示常驻保存状态或阅读说明，离线只显示“网络不可用”，保存错误与版本冲突保留必要的恢复操作。触摸目标至少 44px，布局适配安全区和 `visualViewport`；上传或发布时禁用可能造成内容丢失的操作。

新版直接替换后台 `/admin` 中的编辑器，自适应浏览器实际宽度，不使用手机框或 iframe。插入面板的“更多”提供代码块、表格、公式和分割线，常用面板仍保持精简。

本地试玩运行 `npm run dev -- --mode editor-demo --host 127.0.0.1 --port 3101`，入口为 `http://127.0.0.1:3101/__demo/editor`。仅在 `.env.editor-demo.local` 显式设置 `VITE_EDITOR_DEMO=true` 时启用入口：它向独立测试后端登录后跳转 `/admin?edit=文章ID`，后续创建、保存、上传、发布、撤销修改与版本冲突均走正式 `Admin` 和 API 流程。没有另一套模拟编辑器或本机发布逻辑，试玩入口与登录中间件不进入生产构建。开发 API 和静态资源的代理地址分别通过 `DEV_API_PROXY_TARGET`、`DEV_ASSET_PROXY_TARGET` 设置；测试账号和文章通过 `EDITOR_DEMO_USER`、`EDITOR_DEMO_PASSWORD`、`EDITOR_DEMO_POST_ID` 设置，均只在本地环境文件中配置。

### 自动保存与显式发布

同一文章 ID 下保留线上内容与编辑草稿。自动保存只更新草稿；读者继续看到上一次已发布的标题、摘要和正文。已发布文章保存草稿后仍保持发布状态，并标记“有未发布修改”。只有点击“发布”或“更新发布”，才把最新草稿原子更新到线上版本；文章地址、评论等已有引用保持关联。

编辑内容变更后会短暂等待再自动保存。一次编辑会话只有一个写请求在途，后续输入排队继续保存；旧响应只确认自己发送的内容，不会把更新的输入误标为已保存。新文章创建使用稳定的 `clientRequestId`，供后端识别重试请求，避免重复创建。手动保存、发布和正常返回前会读取编辑器最新 Markdown 并等待草稿同步。发布时暂时锁定编辑输入，避免发布请求期间产生尚未包含的新内容。放弃修改前有确认，并保留本地备份；已发布文章恢复线上版本，未发布文章清空当前草稿。

### 版本冲突与本地恢复

草稿接口携带 `version`，后端使用 CAS（比较并交换）检查更新版本。其他窗口或设备先保存后，旧版本请求返回 HTTP 409；当前编辑器停止自动重试覆盖，保留本地内容并显示冲突提示。用户明确点击“载入服务器草稿”后，才会备份当前本地内容并载入服务器版本，需要合并的改动可从本地备份找回。

未同步内容保存在当前浏览器的 `localStorage`，再次进入编辑页时可确认恢复。页面隐藏时会同步本地缓存，并尽力提交草稿；浏览器关闭、系统杀进程或断网时，网络提交不保证完成，因此保存状态仍以服务器确认结果为准。本地缓存属于当前浏览器，清除网站数据、无痕会话结束或更换设备不会保留这份未同步副本。网络错误会显示错误状态并自动重试，也可点击错误提示中的“重试保存”主动重试。返回前保存失败时，会提示是否保留本地内容后离开。

### 发布时间语义

- `publishedAt` 表示可确认的最早发布时间，后续发布不覆盖。
- `publishedUpdatedAt` 仅在已发布内容确实再次更新发布时记录；单纯修改或自动保存草稿不改变公开时间。
- `draftUpdatedAt` 是编辑草稿的保存时间，`createdAt`／`updatedAt` 是数据记录时间，均不替代公开发布时间。
- 页面统一按北京时间（`Asia/Shanghai`）显示发布事件。历史数据若无法确认首次发布时间，在数据层通过 `publicationTimeKnown` 保留来源状态，页面按现有记录显示“发布时间”，缺少日期则省略；不把创建时间或迁移当天时间冒充首次发布。

后端需要同步部署支持上述草稿、版本和发布接口。相关回归：`bun test services/draftSaveCoordinator.test.jsx services/publicationDates.test.jsx`；结合卡片测试、`npx tsc --noEmit` 和 `npm run build` 检查集成。手机窄屏布局可在浏览器中验证，真实输入法、软键盘和 Safari 安全区仍应做真机复核。

## 图片管理与大图预览

后台“图片管理”支持分页缩略图、尺寸与原图大小、放大预览、复制 URL/Markdown、上传和删除，替换原 Upgrade Images 页面。删除前核实文章正文、封面与草稿引用；后端也会拒绝删除仍在使用的图片。

上传保留原图下载，600/1200px 用于正文预览；大图预览限制长边 8192px、总像素 16MP，避免超宽全景图超过 WebP 限制。图片处理在 Worker 中执行，并限制文件大小和处理时长。

## 配色

默认与设置失效时均使用 Solarized，旧灰白/靛蓝配色已移除。提供 Solarized、VS Code、GitHub、Dracula、Nord、Gruvbox、Catppuccin、Midnight、Monokai；每套都有浅色/深色显示，明暗模式也可跟随系统。选择保存在本机并同步到同源其他标签页。

普通点击右下角按钮切换明暗；手机长按约550ms、桌面右键或键盘Shift+F10打开配色弹窗。长按时淡环从顶部逆时针填满，提前松开、滑动或取消会停止；长按完成后的合成点击不会再次切换明暗。弹窗支持Esc、点击外侧及关闭按钮。

全站界面、文章代码高亮、Milkdown/CodeMirror和资源卡片共用配色变量；切换不会重建编辑文档或清空撤销历史。色板来自[VS Code](https://github.com/microsoft/vscode/tree/main/extensions/theme-defaults)、[GitHub Primer](https://github.com/primer/primitives)、[Dracula / Alucard](https://draculatheme.com/spec)、[Nord](https://www.nordtheme.com/docs/colors-and-palettes/)、[Gruvbox](https://github.com/morhetz/gruvbox)、[Catppuccin](https://catppuccin.com/palette/)、[Solarized](https://ethanschoonover.com/solarized/)及[Monokai](https://github.com/microsoft/vscode/tree/main/extensions/theme-monokai)，按网页对比度适配；Midnight为本站午夜蓝方案。

手机配色弹窗提供“摇一摇换配色”开关，默认开启，并保留用户主动关闭的选择。无需额外授权的手机会自动监听；要求手势授权的浏览器显示“授权启用”，点击后申请运动权限；连续往返晃动会随机选择另一套配色，保留明暗模式，并短暂提示新配色。设置仅保存在当前浏览器；要求交互授权的浏览器在重新打开页面后需再次点击启用。

运动检测优先使用去重力加速度，缺失时过滤含重力读数；需要三次强度足够的反向脉冲，触发后冷却2.2秒。转屏暂停检测，页面进入后台或关闭开关会重置检测，停用时移除监听。运动数据不上传。回归覆盖运动过滤、冷却、权限拒绝和随机去重；浏览器使用模拟传感器验证，实际手感仍需手机确认。API依据[W3C Device Orientation and Motion](https://w3c.github.io/deviceorientation/)。
