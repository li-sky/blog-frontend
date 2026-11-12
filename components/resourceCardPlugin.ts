import { $node, $prose, $remark, $view } from '@milkdown/utils';
import { editorViewCtx } from '@milkdown/core';
import { Plugin, Selection, TextSelection, NodeSelection } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import type { Ctx } from '@milkdown/ctx';
import { api } from '../services/api';
import { cardToParagraph, formatFileSize, isSafeCardUrl, remarkResourceCards, type CardAttrs } from './resourceCardMarkdown';
import { fileIconMarkup, linkIconMarkup, downloadIconMarkup, externalLinkIconMarkup, faviconForLink } from './resourceCardArtwork';
import './resource-card.css';
import './resource-card-editor.css';

const cardSource = (attrs: CardAttrs) => JSON.stringify(attrs.kind === 'file'
  ? { fileName: attrs.name, url: attrs.url, size: attrs.size }
  : { title: attrs.name, url: attrs.url, description: attrs.description || '', icon: attrs.icon || '' }, null, 2);

function parseCardSource(source: string, fallback: Partial<CardAttrs> = {}): CardAttrs | null {
  try {
    const value = JSON.parse(source);
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.url !== 'string') return null;
    const file = 'fileName' in value || fallback.kind === 'file';
    const name = file ? value.fileName : value.title;
    if (typeof name !== 'string' || (value.url && !isSafeCardUrl(value.url))) return null;
    if (value.icon && (typeof value.icon !== 'string' || !/^https?:\/\//i.test(value.icon))) return null;
    if (value.description !== undefined && typeof value.description !== 'string') return null;
    if (file && (typeof value.size !== 'number' || !Number.isFinite(value.size) || value.size < 0)) return null;
    return { kind: file ? 'file' : 'link', name, url: value.url, size: file ? value.size : 0, description: value.description || '', icon: value.icon || '' };
  } catch { return null; }
}

export const resourceCardSchema = $node('resource_card', () => ({
  group: 'block', content: 'text*', code: true, marks: '', defining: true, draggable: true,
  attrs: { kind: { default: 'link' }, url: { default: '' }, name: { default: '' }, size: { default: 0 }, icon: { default: '' }, description: { default: '' } },
  parseDOM: [{ tag: 'div[data-resource-card]', preserveWhitespace: 'full', contentElement: 'code', getAttrs: (dom) => {
    const el = dom as HTMLElement;
    return { kind: el.dataset.resourceCard === 'file' ? 'file' : 'link', url: el.dataset.url || '', name: el.dataset.name || '', size: Number(el.dataset.size || 0), icon: el.dataset.icon || '', description: el.dataset.description || '' };
  } }],
  toDOM: (node) => ['div', { 'data-resource-card': node.attrs.kind, 'data-url': node.attrs.url, 'data-name': node.attrs.name, 'data-size': node.attrs.size, 'data-icon': node.attrs.icon, 'data-description': node.attrs.description }, ['pre', ['code', 0]]],
  parseMarkdown: {
    match: (node) => node.type === 'resourceCard',
    runner: (state, node, type) => {
      const attrs = { kind: node.kind || 'link', url: node.url || '', name: node.name || '', size: node.size || 0, icon: node.icon || '', description: node.description || '' } as CardAttrs;
      state.openNode(type, attrs); state.addText(typeof node.source === 'string' ? node.source : cardSource(attrs)); state.closeNode();
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'resource_card',
    runner: (state, node) => {
      const attrs = parseCardSource(node.textContent,node.attrs);
      if (!attrs) { state.addNode('code', undefined, node.textContent, { lang: 'resource-card' }); return; }
      const paragraph = cardToParagraph(attrs);
      state.addNode('paragraph', 'children' in paragraph ? paragraph.children as any : []);
    },
  },
}));

const resourceCardRemark = $remark('resource-card-markdown', () => remarkResourceCards);
// Invalid source is persisted verbatim as a fenced block and reopened for repair.
const resourceCardDraftRemark = $remark('resource-card-drafts', () => () => (tree: any) => {
  const visit = (parent: any) => parent.children?.forEach((node: any,index: number) => {
    if (node.type === 'code' && node.lang === 'resource-card') {
      const attrs = parseCardSource(node.value) || { kind: node.value?.includes('"fileName"') ? 'file' : 'link', name: '', url: '', size: 0 };
      parent.children[index] = { type: 'resourceCard', ...attrs, source: node.value };
    } else visit(node);
  }); visit(tree);
});

const resourceCardNearby = $prose(() => new Plugin({
  appendTransaction(transactions,_old,state) {
    if (!transactions.some(transaction => transaction.docChanged)) return null;
    const transaction = state.tr;
    state.doc.descendants((node,pos) => {
      if (node.type.name !== 'resource_card') return;
      const attrs = parseCardSource(node.textContent,node.attrs);
      if (attrs && Object.entries(attrs).some(([key,value]) => node.attrs[key] !== value)) transaction.setNodeMarkup(pos,undefined,attrs);
    });
    return transaction.docChanged ? transaction.setMeta('addToHistory',false) : null;
  },
  props: {
    handleKeyDown(view,event) {
      const { selection } = view.state;
      if (selection instanceof NodeSelection && selection.node.type.name === 'resource_card' && event.key === 'Enter') {
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,selection.from + 1))); event.preventDefault(); return true;
      }
      if (!selection.empty || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
      const { $from } = selection;
      const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
      const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
      const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown';
      const caretX = vertical ? view.coordsAtPos(selection.from).left : 0;
      // Both dispatches are synchronous: expand/collapse first, then resolve the
      // destination visual line against its actual new DOM geometry.
      const keepColumn = () => {
        if (!vertical) return;
        const current = view.state.selection;
        if (!current.$from.parent.isTextblock || !current.$from.depth) return;
        const line = view.coordsAtPos(current.from);
        const nodeDOM = view.nodeDOM(current.$from.before());
        const host = nodeDOM instanceof HTMLElement
          ? current.$from.parent.type.name === 'resource_card' ? nodeDOM.querySelector('code') || nodeDOM : nodeDOM
          : view.dom;
        const bounds = host.getBoundingClientRect();
        const left = Math.max(bounds.left + 1,Math.min(caretX,bounds.right - 1));
        const found = view.posAtCoords({ left, top: (line.top + line.bottom) / 2 });
        if (!found) return;
        const position = Math.max(current.$from.start(),Math.min(found.pos,current.$from.end()));
        if (position !== current.from) view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,position)).scrollIntoView());
      };
      const atEdge = (back: boolean) => vertical
        ? view.endOfTextblock(back ? 'up' : 'down')
        : back ? $from.parentOffset === 0 : $from.parentOffset === $from.parent.content.size;
      if ($from.parent.type.name === 'resource_card') {
        // Leave native movement between source lines untouched.
        if (event.key !== 'Escape' && !((backward || forward) && atEdge(backward))) return false;
        const direction = event.key === 'Escape' ? 1 : backward ? -1 : 1;
        const boundary = direction < 0 ? $from.before() : $from.after();
        const transaction = view.state.tr;
        if ((direction < 0 && boundary === 0) || (direction > 0 && boundary === transaction.doc.content.size)) {
          transaction.insert(boundary,view.state.schema.nodes.paragraph.create());
        }
        const target = direction < 0 && boundary === 0 ? 1 : boundary;
        transaction.setSelection(Selection.near(transaction.doc.resolve(target),direction));
        view.dispatch(transaction.scrollIntoView()); keepColumn(); event.preventDefault(); return true;
      }
      if (!$from.parent.isTextblock || (!backward && !forward) || !atEdge(backward)) return false;
      const boundary = backward ? $from.before() : $from.after();
      const card = backward ? view.state.doc.resolve(boundary).nodeBefore : view.state.doc.nodeAt(boundary);
      if (card?.type.name !== 'resource_card') return false;
      // Horizontal traversal is exact: previous paragraph -> source start;
      // following paragraph -> source end. Vertical traversal keeps caret X.
      const position = backward ? boundary - 1 : boundary + 1;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,position)).scrollIntoView());
      keepColumn(); event.preventDefault(); return true;
    },
    decorations(state) {
      const decorations: Decoration[] = [];
      const { from,to,$from } = state.selection;
      const parentStart = $from.depth ? $from.before() : from;
      const parentEnd = $from.depth ? $from.after() : to;
      state.doc.descendants((node,pos) => {
        if (node.type.name !== 'resource_card') return;
        const active = from > pos && from < pos + node.nodeSize;
        const invalid = !parseCardSource(node.textContent,node.attrs);
        const classes = [active ? 'card-source-active' : '', invalid ? 'card-source-invalid' : '', node.nodeSize + pos === parentStart || pos === parentEnd ? 'card-near' : ''].filter(Boolean).join(' ');
        if (classes) decorations.push(Decoration.node(pos,pos + node.nodeSize,{ class: classes }));
      });
      return DecorationSet.create(state.doc as unknown as Parameters<typeof DecorationSet.create>[0],decorations);
    },
  },
}));

const resourceCardView = $view(resourceCardSchema, () => (initialNode, view, getPos) => {
  let node = initialNode;
  let destroyed = false;
  let controller: AbortController | undefined;
  let generation = 0;
  let wasActive = false;
  let lastMetadataURL = '';
  let artworkKey = '';
  const dom = document.createElement('div'); dom.className = 'editor-resource-card';
  let modeInitialized = false;
  let wasSourceVisible = false;
  let animationFrame = 0;
  let heightAnimation: Animation | undefined;
  let fadeAnimation: Animation | undefined;
  const animateModeChange = (fromHeight: number, sourceVisible: boolean) => {
    cancelAnimationFrame(animationFrame);
    heightAnimation?.cancel(); heightAnimation = undefined;
    fadeAnimation?.cancel(); fadeAnimation = undefined;
    dom.classList.remove('is-card-transitioning');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !dom.animate) return;
    // Outer decorations and contentDOM children are updated after NodeView.update.
    // Measure their natural target height on the next frame; never touch selection.
    animationFrame = requestAnimationFrame(() => {
      animationFrame = 0;
      if (destroyed || !dom.isConnected || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const toHeight = dom.getBoundingClientRect().height;
      if (Math.abs(fromHeight - toHeight) < 1) return;
      dom.classList.add('is-card-transitioning');
      const animation = dom.animate([{ height: `${fromHeight}px` },{ height: `${toHeight}px` }],{
        duration:270, easing:'cubic-bezier(.22,1.12,.36,1)',
      });
      heightAnimation = animation;
      const complete = () => {
        if (heightAnimation !== animation) return;
        heightAnimation = undefined; dom.classList.remove('is-card-transitioning');
      };
      animation.onfinish = complete; animation.oncancel = complete;
      fadeAnimation = (sourceVisible ? sourcePanel : preview).animate([{ opacity:.72 },{ opacity:1 }],{ duration:190, easing:'ease-out' });
    });
  };
  const enter = () => { const pos = getPos(); if (pos === undefined) return; view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,pos + 1))); view.focus(); };
  const preview = document.createElement('div'); preview.className = 'resource-card editor-resource-card-preview'; preview.contentEditable = 'false';
  const artwork = document.createElement('a'); artwork.className = 'resource-card-artwork editor-resource-card-open'; artwork.rel = 'noopener noreferrer';
  const primary = document.createElement('span'); primary.className = 'resource-card-artwork-primary'; primary.setAttribute('aria-hidden','true');
  const action = document.createElement('span'); action.className = 'resource-card-artwork-action'; action.setAttribute('aria-hidden','true'); artwork.append(primary,action);
  const body = document.createElement('span'); body.className = 'resource-card-body';
  const title = document.createElement('strong'); const subtitle = document.createElement('small'); body.append(title,subtitle); preview.append(artwork,body);
  const sourcePanel = document.createElement('div'); sourcePanel.className = 'editor-resource-card-source';
  const pre = document.createElement('pre'); const contentDOM = document.createElement('code'); pre.append(contentDOM); sourcePanel.append(pre);
  const error = document.createElement('div'); error.className = 'editor-resource-card-error'; error.contentEditable = 'false';
  const status = document.createElement('div'); status.className = 'editor-resource-card-status'; status.contentEditable = 'false'; status.setAttribute('aria-live','polite');
  const removeButton = document.createElement('button');
  removeButton.type = 'button'; removeButton.className = 'editor-resource-card-delete'; removeButton.textContent = '×'; removeButton.setAttribute('aria-label','删除卡片');
  removeButton.addEventListener('mousedown',event => event.preventDefault());
  removeButton.addEventListener('click',event => { event.preventDefault(); event.stopPropagation(); const pos = getPos(); if (pos === undefined) return; view.dispatch(view.state.tr.delete(pos,pos + node.nodeSize)); view.focus(); });
  dom.append(removeButton,preview,sourcePanel,error,status);
  preview.addEventListener('mousedown',event => event.preventDefault());
  preview.addEventListener('click',event => {
    event.preventDefault(); event.stopPropagation(); const pos = getPos(); if (pos === undefined) return;
    if (view.state.selection instanceof NodeSelection && view.state.selection.from === pos) enter();
    else { view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc,pos))); view.focus(); }
  });
  const active = () => { const pos = getPos(); return pos !== undefined && view.state.selection.from > pos && view.state.selection.from < pos + node.nodeSize; };
  const fetchMetadata = async () => {
    const attrs = parseCardSource(node.textContent,node.attrs);
    if (!attrs || attrs.kind === 'file' || !/^https?:\/\//i.test(attrs.url) || (attrs.name && attrs.icon && attrs.description) || attrs.url === lastMetadataURL) return;
    lastMetadataURL = attrs.url; controller?.abort(); const request = new AbortController(); controller = request; const version = ++generation; const source = node.textContent;
    status.textContent = '正在读取网站信息…';
    try {
      const metadata = await api.links.metadata(attrs.url,request.signal);
      if (destroyed || request.signal.aborted || version !== generation || node.textContent !== source || active()) return;
      const next = { ...attrs, name: attrs.name || metadata.title, icon: attrs.icon || metadata.icon, description: attrs.description || metadata.description || '' };
      const pos = getPos(); if (pos === undefined) return;
      const transaction = view.state.tr.insertText(cardSource(next),pos + 1,pos + node.nodeSize - 1);
      view.dispatch(transaction.setMeta('addToHistory',false)); status.textContent = '';
    } catch { if (!destroyed && version === generation && !request.signal.aborted) status.textContent = '网站信息读取失败，图标将尝试 favicon'; }
  };
  const sync = () => {
    const attrs = parseCardSource(node.textContent,node.attrs);
    const sourceVisible = active() || !attrs;
    const modeChanged = modeInitialized && sourceVisible !== wasSourceVisible && dom.isConnected;
    const oldHeight = modeChanged ? dom.getBoundingClientRect().height : 0;
    const current = attrs || node.attrs as CardAttrs; const isFile = current.kind === 'file';
    dom.dataset.resourceCard = current.kind; preview.dataset.kind = current.kind;
    title.textContent = current.name || (isFile ? '附件' : '链接卡片');
    removeButton.setAttribute('aria-label', `删除卡片：${title.textContent}`);
    subtitle.textContent = isFile ? formatFileSize(current.size) : current.description?.trim() || current.url;
    subtitle.className = isFile ? 'sr-only' : current.description ? 'resource-card-description' : '';
    subtitle.title = current.description || current.url;
    error.textContent = attrs ? '' : 'JSON 尚未完成或字段无效；源码将保留，修正后恢复卡片。';
    const key = JSON.stringify([current.kind,current.url,current.icon,isFile ? current.name : '']);
    if (key !== artworkKey) {
      artworkKey = key; primary.replaceChildren();
      artwork.setAttribute('aria-label',isFile ? '下载附件' : '在新窗口打开链接');
      if (isSafeCardUrl(current.url)) artwork.href = current.url; else artwork.removeAttribute('href');
      if (isFile) { artwork.download = ''; artwork.removeAttribute('target'); } else { artwork.removeAttribute('download'); artwork.target = '_blank'; }
      const symbol = document.createElement('span'); symbol.className = 'resource-card-symbol'; symbol.innerHTML = isFile ? fileIconMarkup(current.name) : linkIconMarkup; primary.append(symbol);
      action.innerHTML = isFile ? downloadIconMarkup : externalLinkIconMarkup;
      const favicon = isFile ? '' : faviconForLink(current.url); const imageURL = /^https?:\/\//i.test(current.icon || '') ? current.icon! : favicon;
      if (!isFile && imageURL) { const image = document.createElement('img'); image.className = 'resource-card-site-icon'; image.src = imageURL; image.alt = ''; image.referrerPolicy = 'no-referrer'; let tried = imageURL === favicon; image.addEventListener('error', () => { if (!tried && favicon) { tried = true; image.src = favicon; } else image.remove(); }); primary.append(image); }
    }
    const isActive = active();
    if (isActive && !wasActive) { generation++; controller?.abort(); status.textContent = ''; }
    if (!isActive && wasActive) queueMicrotask(() => { if (!destroyed) void fetchMetadata(); });
    wasActive = isActive;
    if (modeChanged) animateModeChange(oldHeight,sourceVisible);
    wasSourceVisible = sourceVisible; modeInitialized = true;
  };
  // Clicking outside must leave the card even when the destination is not editable.
  const leaveOnOutside = (event: Event) => {
    const target = event.target as Node | null;
    const pos = getPos();
    if (destroyed || !target || dom.contains(target) || pos === undefined) return;
    const selection = view.state.selection;
    const selected = selection instanceof NodeSelection && selection.from === pos;
    if (!selected && !active()) return;
    const transaction = view.state.tr;
    const after = pos + node.nodeSize;
    if (after === transaction.doc.content.size) transaction.insert(after,view.state.schema.nodes.paragraph.create());
    transaction.setSelection(Selection.near(transaction.doc.resolve(after),1));
    view.dispatch(transaction); // Do not steal focus from the clicked destination.
  };
  document.addEventListener('pointerdown',leaveOnOutside,true);
  sync();
  return {
    dom,contentDOM,
    update(next: typeof initialNode) { if (next.type !== node.type) return false; node = next; sync(); return true; },
    stopEvent(event: Event) { return !!(event.target as HTMLElement)?.closest('button,a'); },
    ignoreMutation(mutation: { type: string; target: Node }) { return mutation.type !== 'selection' && !contentDOM.contains(mutation.target); },
    selectNode() { dom.classList.add('ProseMirror-selectednode'); },
    deselectNode() { dom.classList.remove('ProseMirror-selectednode'); },
    destroy() { destroyed = true; generation++; controller?.abort(); cancelAnimationFrame(animationFrame); heightAnimation?.cancel(); fadeAnimation?.cancel(); document.removeEventListener('pointerdown',leaveOnOutside,true); },
  };
});

export const resourceCardPlugins = [...resourceCardRemark, ...resourceCardDraftRemark, resourceCardSchema, resourceCardNearby, resourceCardView];

export function insertResourceCard(ctx: Ctx, attrs: Partial<CardAttrs> = {}) {
  const view = ctx.get(editorViewCtx);
  const type = resourceCardSchema.type(ctx);
  const full = { kind: 'link', name: '', url: '', size: 0, icon: '', description: '', ...attrs } as CardAttrs;
  const card = type.create(full,type.schema.text(cardSource(full)));
  const transaction = view.state.tr.replaceSelectionWith(card);
  let after = transaction.selection.to;
  transaction.doc.descendants((node, position) => { if (node === card) after = position + node.nodeSize; });
  if (!transaction.doc.nodeAt(after)?.isTextblock) transaction.insert(after, view.state.schema.nodes.paragraph.create());
  transaction.setSelection(TextSelection.create(transaction.doc,after - card.nodeSize + 1));
  view.dispatch(transaction.scrollIntoView()); view.focus();
}
