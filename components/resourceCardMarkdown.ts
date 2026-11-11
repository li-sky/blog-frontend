import type { Root, Link, RootContent } from 'mdast';

export interface CardAttrs {
  kind: 'link' | 'file';
  url: string;
  name: string;
  size: number;
  icon?: string;
  description?: string;
}

export const isSafeCardUrl = (url: string) => /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url);

export interface CardMetadata { icon?: string; description?: string }

const safeMetadataIcon = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  try {
    const parsed = new URL(value);
    return ['https:', 'http:'].includes(parsed.protocol) ? value : '';
  } catch { return ''; }
};

/** Legacy titles and versioned metadata use the same portable Markdown link. */
export function parseCardMetadata(title?: string | null): CardMetadata | null {
  if (title !== 'link-card' && !title?.startsWith('link-card:')) return null;
  let metadata: Record<string, unknown> = {};
  if (title.startsWith('link-card:v2:')) {
    try {
      const decoded = JSON.parse(decodeURIComponent(title.slice('link-card:v2:'.length)));
      if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) metadata = decoded;
    } catch { /* Damaged metadata still renders a usable link card. */ }
  } else if (title.startsWith('link-card:')) metadata.icon = title.slice('link-card:'.length);
  const icon = safeMetadataIcon(metadata.icon);
  const description = typeof metadata.description === 'string' ? metadata.description.trim() : '';
  return { ...(icon ? { icon } : {}), ...(description ? { description } : {}) };
}

export function serializeCardMetadata(metadata: CardMetadata): string {
  const icon = safeMetadataIcon(metadata.icon);
  const description = metadata.description?.trim() || '';
  if (description) return 'link-card:v2:' + encodeURIComponent(JSON.stringify({ ...(icon ? { icon } : {}), description }));
  return icon ? `link-card:${icon}` : 'link-card';
}

export function cardFromParagraph(node: { type: string; children?: unknown[] }): CardAttrs | null {
  if (node.type !== 'paragraph' || node.children?.length !== 1) return null;
  const link = node.children[0] as Link;
  if (link.type !== 'link') return null;
  const match = link.title?.match(/^attachment:(\d+)$/);
  const metadata = parseCardMetadata(link.title);
  if (metadata === null && !match) return null;
  // Empty URLs are drafts created in the editor; unsafe URLs stay ordinary links.
  if (link.url && !isSafeCardUrl(link.url)) return null;
  const text = (nodes: Link['children']): string => nodes.map(node => 'value' in node ? node.value : 'children' in node ? text(node.children as Link['children']) : '').join('');
  return { kind: match ? 'file' : 'link', url: link.url, name: text(link.children), size: Number(match?.[1] || 0), ...(metadata || {}) };
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
    title: attrs.kind === 'file' ? `attachment:${attrs.size}` : serializeCardMetadata(attrs),
    children: [{ type: 'text', value: attrs.name || (attrs.kind === 'file' ? '附件' : '链接卡片') }],
  }] };
}

export function formatFileSize(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}
