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
  let destroyed = false;
  let titleManual = false;
  let iconManual = false;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let advancedOpen = false;
  const isFile = node.attrs.kind === 'file';
  const dom = document.createElement('div'); dom.className = 'editor-resource-card'; dom.contentEditable = 'false'; dom.dataset.resourceCard = node.attrs.kind;
  const button = (text: string, action: () => void) => {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = text; el.addEventListener('click', action); return el;
  };
  const update = (attrs: Partial<CardAttrs>) => {
    const pos = getPos();
    if (destroyed || pos === undefined || Object.entries(attrs).every(([key,value]) => node.attrs[key] === value)) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
  };
  const cancelMetadata = () => { generation++; clearTimeout(timer); controller?.abort(); };
  const toolbar = document.createElement('div'); toolbar.className = 'editor-resource-card-toolbar'; toolbar.setAttribute('aria-label',isFile ? '附件操作' : '链接卡片操作');
  const preview = document.createElement('div'); preview.className = 'resource-card editor-resource-card-preview'; preview.dataset.kind = node.attrs.kind;
  const artwork = document.createElement('a'); artwork.className = 'resource-card-artwork editor-resource-card-open';
  artwork.setAttribute('aria-label', isFile ? '下载附件' : '在新窗口打开链接'); artwork.rel = 'noopener noreferrer';
  if (isFile) artwork.download = ''; else artwork.target = '_blank';
  const primary = document.createElement('span'); primary.className = 'resource-card-artwork-primary'; primary.setAttribute('aria-hidden','true');
  const action = document.createElement('span'); action.className = 'resource-card-artwork-action'; action.setAttribute('aria-hidden','true'); action.innerHTML = isFile ? downloadIconMarkup : externalLinkIconMarkup;
  artwork.append(primary,action);
  const body = document.createElement('span'); body.className = 'resource-card-body';
  const makeField = (className: string,label: string,placeholder: string) => {
    const field = document.createElement('textarea'); field.className = className; field.rows = 1; field.setAttribute('aria-label',label); field.placeholder = placeholder; field.spellcheck = false; return field;
  };
  const name = makeField('editor-resource-card-title',isFile ? '文件名（显示名称）' : '卡片标题',isFile ? '文件名' : '链接标题');
  const url = makeField('editor-resource-card-url','链接地址','https://example.com');
  const size = document.createElement('small'); size.className = 'sr-only';
  body.append(name,isFile ? size : url); preview.append(artwork,body);
  const status = document.createElement('span'); status.className = 'editor-resource-card-status'; status.setAttribute('aria-live','polite');
  const error = document.createElement('span'); error.className = 'editor-resource-card-error'; error.setAttribute('role','alert');
  const advanced = document.createElement('div'); advanced.className = 'editor-resource-card-form'; advanced.hidden = true;
  const iconLabel = document.createElement('label'); iconLabel.textContent = '网站图标';
  const icon = document.createElement('input'); icon.type = 'url'; icon.placeholder = '图标 URL（可选）'; iconLabel.append(icon);
  if (!isFile) toolbar.append(button('高级设置', () => { advancedOpen = !advancedOpen; advanced.hidden = !advancedOpen; if (advancedOpen) icon.focus(); }));
  toolbar.append(button('删除', () => {
    const pos = getPos(); if (pos === undefined) return; cancelMetadata(); view.dispatch(view.state.tr.delete(pos,pos + node.nodeSize)); view.focus();
  }));
  dom.append(toolbar,preview,status,error); if (!isFile) dom.append(advanced);
  const resize = (field: HTMLTextAreaElement) => { field.style.height = 'auto'; field.style.height = `${Math.max(field.scrollHeight, isFile || field === name ? 24 : 18)}px`; };
  const normalizeURL = (value: string) => {
    try { const parsed = new URL(value.trim()); return ['http:','https:'].includes(parsed.protocol) ? parsed : null; } catch { return null; }
  };
  let artworkKey = '';
  const syncArtwork = () => {
    const attrs = node.attrs as CardAttrs;
    const key = JSON.stringify([attrs.kind,attrs.url,attrs.icon,isFile ? attrs.name : '']);
    if (artworkKey === key) return; artworkKey = key;
    if (isSafeCardUrl(attrs.url)) artwork.href = attrs.url; else artwork.removeAttribute('href');
    primary.replaceChildren();
    const symbol = document.createElement('span'); symbol.className = 'resource-card-symbol'; symbol.innerHTML = isFile ? fileIconMarkup(attrs.name) : linkIconMarkup; primary.append(symbol);
    const favicon = isFile ? '' : faviconForLink(attrs.url);
    const metadataIcon = /^https?:\/\//i.test(attrs.icon || '') ? attrs.icon! : '';
    const source = metadataIcon || favicon;
    if (!isFile && source) {
      const image = document.createElement('img'); image.className = 'resource-card-site-icon'; image.src = source; image.alt = ''; image.referrerPolicy = 'no-referrer';
      let triedFavicon = source === favicon;
      image.addEventListener('error', () => { if (!triedFavicon && favicon) { triedFavicon = true; image.src = favicon; } else image.remove(); }); primary.append(image);
    }
  };
  const sync = () => {
    // Preserve the focused field and its DOM across transactions and IME composition.
    if (document.activeElement !== name) name.value = node.attrs.name;
    if (document.activeElement !== url) url.value = node.attrs.url;
    if (document.activeElement !== icon) icon.value = node.attrs.icon || '';
    size.textContent = formatFileSize(node.attrs.size); syncArtwork(); resize(name); if (!isFile) resize(url);
  };
  const readMetadata = async () => {
    clearTimeout(timer); controller?.abort();
    const current = url.value.trim(); const parsed = normalizeURL(current); if (!parsed || isFile) return;
    const version = ++generation; const request = new AbortController(); controller = request; status.textContent = '正在读取网站信息…';
    try {
      const metadata = await api.links.metadata(parsed.href,request.signal);
      if (destroyed || version !== generation || current !== url.value.trim()) return;
      const attrs: Partial<CardAttrs> = {};
      if (!titleManual && document.activeElement !== name) { attrs.name = metadata.title; name.value = metadata.title; resize(name); }
      if (!iconManual && document.activeElement !== icon) { attrs.icon = metadata.icon; icon.value = metadata.icon; }
      // URL may still be focused: commit only its validated value, without touching that DOM field.
      attrs.url = parsed.href; update(attrs); status.textContent = '已读取网站信息';
    } catch {
      if (!destroyed && version === generation && !request.signal.aborted) status.textContent = '无法读取网站信息，可直接填写标题；图标将尝试 favicon';
    }
  };
  advanced.append(iconLabel,button('重新读取网站信息', () => void readMetadata()));
  name.value = node.attrs.name; url.value = node.attrs.url; icon.value = node.attrs.icon || '';
  let composing = false;
  name.addEventListener('compositionstart', () => { composing = true; }); name.addEventListener('compositionend', () => { composing = false; resize(name); });
  url.addEventListener('compositionstart', () => { composing = true; }); url.addEventListener('compositionend', () => { composing = false; resize(url); });
  name.addEventListener('input', () => { titleManual = true; resize(name); });
  name.addEventListener('blur', () => { update({ name: name.value.trim() || node.attrs.name || (!isFile ? normalizeURL(url.value)?.hostname || '' : '') }); name.value = node.attrs.name; resize(name); });
  url.addEventListener('input', () => {
    resize(url); error.textContent = ''; cancelMetadata(); timer = setTimeout(() => void readMetadata(),500);
  });
  url.addEventListener('blur', () => {
    const parsed = normalizeURL(url.value);
    if (!parsed) { if (url.value.trim()) error.textContent = '请输入有效的 http/https 地址'; return; }
    const changed = node.attrs.url !== parsed.href;
    update({ url: parsed.href }); url.value = parsed.href; resize(url);
    if (changed) void readMetadata();
  });
  icon.addEventListener('input', () => { iconManual = true; });
  icon.addEventListener('blur', () => {
    const value = icon.value.trim(); if (value && !normalizeURL(value)) { error.textContent = '图标地址必须使用 http/https'; return; }
    update({ icon: value }); error.textContent = '';
  });
  const keyboard = (field: HTMLTextAreaElement | HTMLInputElement, key: 'name' | 'url' | 'icon') => field.addEventListener('keydown',event => {
    if (event.isComposing || composing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (key === 'url') { cancelMetadata(); status.textContent = ''; }
      field.value = node.attrs[key] || ''; error.textContent = ''; if (field instanceof HTMLTextAreaElement) resize(field); field.blur(); view.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (key === 'name' && !isFile) url.focus(); else { field.blur(); view.focus(); }
    }
  });
  keyboard(name,'name'); keyboard(url,'url'); keyboard(icon,'icon');
  preview.addEventListener('click',event => { if (event.target === preview || event.target === body) name.focus(); });
  sync(); queueMicrotask(() => { if (!destroyed) sync(); });
  return {
    dom,
    update(next: typeof initialNode) {
      if (next.type !== node.type) return false;
      const previousURL = node.attrs.url; node = next;
      if (previousURL !== node.attrs.url && document.activeElement !== url) cancelMetadata();
      sync(); return true;
    },
    stopEvent(event: Event) { return !!(event.target as HTMLElement)?.closest('textarea,input,button,a,form'); },
    ignoreMutation: () => true,
    selectNode() { dom.classList.add('ProseMirror-selectednode'); },
    deselectNode() { dom.classList.remove('ProseMirror-selectednode'); },
    destroy() { destroyed = true; cancelMetadata(); },
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
