import type { Root, Link, RootContent } from 'mdast';

export interface CardAttrs {
  kind: 'link' | 'file';
  url: string;
  name: string;
  size: number;
  icon?: string;
}

export const isSafeCardUrl = (url: string) => /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url);

export function cardFromParagraph(node: { type: string; children?: unknown[] }): CardAttrs | null {
  if (node.type !== 'paragraph' || node.children?.length !== 1) return null;
  const link = node.children[0] as Link;
  if (link.type !== 'link') return null;
  const match = link.title?.match(/^attachment:(\d+)$/);
  const isLinkCard = link.title === 'link-card' || link.title?.startsWith('link-card:');
  if (!isLinkCard && !match) return null;
  // Empty URLs are drafts created in the editor; unsafe URLs stay ordinary links.
  if (link.url && !isSafeCardUrl(link.url)) return null;
  const text = (nodes: Link['children']): string => nodes.map(node => 'value' in node ? node.value : 'children' in node ? text(node.children as Link['children']) : '').join('');
  const icon = link.title?.startsWith('link-card:') ? link.title.slice('link-card:'.length) : '';
  return { kind: match ? 'file' : 'link', url: link.url, name: text(link.children), size: Number(match?.[1] || 0), ...(icon && /^https?:\/\//i.test(icon) ? { icon } : {}) };
}

// Parsing only: serialization emits standard paragraphs/links for portability.
export function remarkResourceCards() {
  return (tree: Root) => {
    const visit = (parent: { children?: unknown[] }) => {
      parent.children?.forEach((child, index) => {
        const node = child as { type: string; children?: unknown[] };
        const card = cardFromParagraph(node);
        if (card) parent.children![index] = { type: 'resourceCard', ...card };
        else if (node.type !== 'link') visit(node);
      });
    };
    visit(tree);
  };
}

export function cardToParagraph(attrs: CardAttrs): RootContent {
  return { type: 'paragraph', children: [{ type: 'link', url: attrs.url,
    title: attrs.kind === 'file' ? `attachment:${attrs.size}` : attrs.icon && /^https?:\/\//i.test(attrs.icon) ? `link-card:${attrs.icon}` : 'link-card',
    children: [{ type: 'text', value: attrs.name || (attrs.kind === 'file' ? '附件' : '链接卡片') }],
  }] };
}

export function formatFileSize(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}
