import { $node, $prose, $remark, $view } from '@milkdown/utils';
import { editorViewCtx } from '@milkdown/core';
import { Plugin, Selection } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import type { Ctx } from '@milkdown/ctx';
import { api } from '../services/api';
import { cardToParagraph, formatFileSize, isSafeCardUrl, remarkResourceCards, type CardAttrs } from './resourceCardMarkdown';
import { fileIconMarkup, linkIconMarkup, downloadIconMarkup, externalLinkIconMarkup, faviconForLink } from './resourceCardArtwork';
import './resource-card.css';
import './resource-card-editor.css';

export const resourceCardSchema = $node('resource_card', () => ({
  group: 'block', atom: true, draggable: true, selectable: true,
  attrs: { kind: { default: 'link' }, url: { default: '' }, name: { default: '' }, size: { default: 0 }, icon: { default: '' } },
  parseDOM: [{ tag: 'div[data-resource-card]', getAttrs: (dom) => {
    const el = dom as HTMLElement;
    return { kind: el.dataset.resourceCard === 'file' ? 'file' : 'link', url: el.dataset.url || '', name: el.dataset.name || '', size: Number(el.dataset.size || 0), icon: el.dataset.icon || '' };
  } }],
  toDOM: (node) => ['div', { 'data-resource-card': node.attrs.kind, 'data-url': node.attrs.url, 'data-name': node.attrs.name, 'data-size': node.attrs.size, 'data-icon': node.attrs.icon }, node.attrs.name || '链接卡片'],
  parseMarkdown: {
    match: (node) => node.type === 'resourceCard',
    runner: (state, node, type) => { state.addNode(type, { kind: node.kind, url: node.url, name: node.name, size: node.size, icon: node.icon || '' }); },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'resource_card',
    runner: (state, node) => {
      const paragraph = cardToParagraph(node.attrs as CardAttrs);
      state.addNode('paragraph', 'children' in paragraph ? paragraph.children as any : []);
    },
  },
}));

const resourceCardRemark = $remark('resource-card-markdown', () => remarkResourceCards);

// Node decorations refresh on every selection change, without mutating saved content.
const resourceCardNearby = $prose(() => new Plugin({
  props: { decorations(state) {
    const decorations: Decoration[] = [];
    const { from, to, $from } = state.selection;
    const parentStart = $from.depth ? $from.before() : from;
    const parentEnd = $from.depth ? $from.after() : to;
    state.doc.descendants((node, pos) => {
      if (node.type.name !== 'resource_card') return;
      const end = pos + node.nodeSize;
      if ((from <= end && to >= pos) || end === parentStart || pos === parentEnd) {
        decorations.push(Decoration.node(pos, end, { class: 'card-near' }));
      }
    });
    // Vite dedupes the runtime model; transitive package declarations still differ.
    return DecorationSet.create(state.doc as unknown as Parameters<typeof DecorationSet.create>[0], decorations);
  } },
}));

const resourceCardView = $view(resourceCardSchema, () => (initialNode, view, getPos) => {
  let node = initialNode;
  let editing = !node.attrs.url;
  let destroyed = false;
  let disposeForm = () => {};
  const dom = document.createElement('div');
  dom.className = 'editor-resource-card';
  dom.contentEditable = 'false';
  const update = (attrs: Partial<CardAttrs>) => {
    const pos = getPos();
    if (destroyed || pos === undefined) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
  };
  const remove = () => {
    const pos = getPos();
    if (pos === undefined) return;
    view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize));
    view.focus();
  };
  const button = (text: string, action: () => void) => {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = text;
    el.addEventListener('click', action); return el;
  };
  const render = () => {
    disposeForm();
    const attrs = node.attrs as CardAttrs;
    const isFile = attrs.kind === 'file';
    dom.dataset.resourceCard = attrs.kind;
    dom.classList.toggle('is-editing', editing);
    dom.replaceChildren();
    const actions = document.createElement('div'); actions.className = 'editor-resource-card-toolbar';
    actions.setAttribute('aria-label', isFile ? '附件编辑操作' : '链接卡片编辑操作');
    if (!editing) actions.append(button('编辑', () => { editing = true; render(); dom.querySelector('input')?.focus(); }));
    actions.append(button('删除', remove)); dom.append(actions);

    const link = document.createElement('a'); link.className = 'resource-card editor-resource-card-preview'; link.dataset.kind = attrs.kind;
    if (isSafeCardUrl(attrs.url)) link.href = attrs.url;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    if (isFile) { link.download = ''; link.removeAttribute('target'); }
    const artwork = document.createElement('span'); artwork.className = 'resource-card-artwork'; artwork.setAttribute('aria-hidden','true');
    const primary = document.createElement('span'); primary.className = 'resource-card-artwork-primary';
    // SVG comes only from static application artwork, never metadata or user input.
    const symbol = document.createElement('span'); symbol.className = 'resource-card-symbol';
    symbol.innerHTML = isFile ? fileIconMarkup(attrs.name) : linkIconMarkup; primary.append(symbol);
    const favicon = isFile ? '' : faviconForLink(attrs.url);
    const metadataIcon = /^https?:\/\//i.test(attrs.icon || '') ? attrs.icon! : '';
    const initialIcon = metadataIcon || favicon;
    if (!isFile && initialIcon) {
      const image = document.createElement('img'); image.className = 'resource-card-site-icon'; image.src = initialIcon; image.alt = ''; image.referrerPolicy = 'no-referrer';
      let triedFavicon = initialIcon === favicon;
      image.addEventListener('error', () => {
        if (!triedFavicon && favicon) { triedFavicon = true; image.src = favicon; }
        else image.remove();
      }); primary.append(image);
    }
    const action = document.createElement('span'); action.className = 'resource-card-artwork-action'; action.innerHTML = isFile ? downloadIconMarkup : externalLinkIconMarkup;
    artwork.append(primary, action);
    const body = document.createElement('span'); body.className = 'resource-card-body';
    const title = document.createElement('strong'); title.textContent = attrs.name || (isFile ? '附件' : '填写链接信息');
    const subtitle = document.createElement('small'); if (isFile) subtitle.className = 'sr-only'; subtitle.textContent = isFile ? formatFileSize(attrs.size) : attrs.url;
    body.append(title, subtitle); link.append(artwork, body); dom.append(link);

    if (editing) {
      let closed = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let controller: AbortController | undefined;
      let generation = 0;
      let titleDirty = false;
      let iconDirty = false;
      disposeForm = () => { closed = true; generation++; clearTimeout(timer); controller?.abort(); };
      const form = document.createElement('form'); form.className = 'editor-resource-card-form';
      const nameLabel = document.createElement('label'); nameLabel.textContent = isFile ? '文件名（显示名称）' : '卡片标题';
      const name = document.createElement('input'); name.type = 'text'; name.placeholder = isFile ? '文件名' : '自动读取网站标题，也可手动填写'; name.value = attrs.name; name.required = isFile;
      name.addEventListener('input', () => { titleDirty = true; }); nameLabel.append(name);
      const urlLabel = document.createElement('label'); urlLabel.textContent = isFile ? '下载地址' : '链接地址';
      const url = document.createElement('input'); url.type = isFile ? 'text' : 'url'; url.placeholder = 'https://example.com'; url.value = attrs.url; url.required = true; url.readOnly = isFile; urlLabel.append(url);
      const iconLabel = document.createElement('label'); iconLabel.textContent = '网站图标';
      const icon = document.createElement('input'); icon.type = 'url'; icon.placeholder = '自动读取 favicon，也可手动填写图片 URL'; icon.value = attrs.icon || '';
      icon.addEventListener('input', () => { iconDirty = true; }); iconLabel.append(icon);
      const status = document.createElement('span'); status.className = 'editor-resource-card-status'; status.setAttribute('aria-live', 'polite');
      const error = document.createElement('span'); error.className = 'editor-resource-card-error'; error.setAttribute('role', 'alert');
      const readMetadata = async () => {
        clearTimeout(timer); controller?.abort();
        const current = url.value.trim();
        let parsed: URL;
        try { parsed = new URL(current); if (!['http:', 'https:'].includes(parsed.protocol)) return; } catch { return; }
        const version = ++generation;
        controller = new AbortController(); status.textContent = '正在读取网站信息…';
        try {
          const metadata = await api.links.metadata(parsed.href, controller.signal);
          if (closed || version !== generation || current !== url.value.trim()) return;
          if (!titleDirty) name.value = metadata.title;
          if (!iconDirty) icon.value = metadata.icon;
          status.textContent = '已读取网站信息，可继续修改';
        } catch (failure) {
          if (closed || version !== generation || controller.signal.aborted) return;
          status.textContent = '无法读取网站信息，请手动填写标题或图标';
        }
      };
      if (!isFile) {
        url.addEventListener('input', () => { generation++; controller?.abort(); clearTimeout(timer); timer = setTimeout(() => void readMetadata(), 500); });
        url.addEventListener('change', () => void readMetadata());
        form.append(urlLabel, nameLabel, iconLabel, button('重新读取网站信息', () => void readMetadata()), status);
      } else form.append(nameLabel, urlLabel);
      const controls = document.createElement('div'); controls.className = 'editor-resource-card-actions';
      const save = document.createElement('button'); save.type = 'submit'; save.textContent = '保存卡片';
      const cancel = () => { if (!attrs.url) remove(); else { editing = false; render(); view.focus(); } };
      controls.append(save, button('取消', cancel)); form.append(error, controls);
      form.addEventListener('submit', event => {
        event.preventDefault();
        let parsed: URL | undefined;
        if (!isFile) {
          try { parsed = new URL(url.value.trim()); if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error(); }
          catch { error.textContent = '请输入有效的 http/https 地址'; return; }
          if (icon.value && !/^https?:\/\//i.test(icon.value.trim())) { error.textContent = '图标地址必须使用 http/https'; return; }
        }
        editing = false;
        update({ name: name.value.trim() || parsed?.hostname || attrs.name, ...(isFile ? {} : { url: parsed!.href, icon: icon.value.trim() }) });
        render(); view.focus();
      });
      form.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); cancel(); } });
      dom.append(form);
    }
  };
  render();
  return {
    dom,
    update(next: typeof initialNode) { if (next.type !== node.type) return false; const changed = JSON.stringify(next.attrs) !== JSON.stringify(node.attrs); node = next; if (changed) render(); return true; },
    stopEvent(event: Event) { return !!(event.target as HTMLElement)?.closest('input, button, a, form'); },
    ignoreMutation: () => true,
    selectNode() { dom.classList.add('ProseMirror-selectednode'); },
    deselectNode() { dom.classList.remove('ProseMirror-selectednode'); },
    destroy() { destroyed = true; disposeForm(); },
  };
});

export const resourceCardPlugins = [...resourceCardRemark, resourceCardSchema, resourceCardNearby, resourceCardView];

export function insertResourceCard(ctx: Ctx, attrs: Partial<CardAttrs> = {}) {
  const view = ctx.get(editorViewCtx);
  const card = resourceCardSchema.type(ctx).create(attrs);
  const transaction = view.state.tr.replaceSelectionWith(card);
  let after = transaction.selection.to;
  transaction.doc.descendants((node, position) => { if (node === card) after = position + node.nodeSize; });
  if (!transaction.doc.nodeAt(after)?.isTextblock) transaction.insert(after, view.state.schema.nodes.paragraph.create());
  transaction.setSelection(Selection.near(transaction.doc.resolve(after + 1)));
  view.dispatch(transaction.scrollIntoView()); view.focus();
}
