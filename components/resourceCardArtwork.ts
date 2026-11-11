export type FileKind = 'archive' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'image' | 'audio' | 'video' | 'code' | 'file';

const groups: Array<[FileKind, string, string[]]> = [
  ['archive', '压缩包', ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'zst']],
  ['pdf', 'PDF 文档', ['pdf']],
  ['document', '文档', ['doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'epub']],
  ['spreadsheet', '表格', ['xls', 'xlsx', 'ods', 'csv', 'tsv']],
  ['presentation', '演示文稿', ['ppt', 'pptx', 'odp', 'key']],
  ['image', '图片', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'heic', 'bmp', 'tiff', 'ico']],
  ['audio', '音频', ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus']],
  ['video', '视频', ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v']],
  ['code', '代码文件', ['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'py', 'go', 'rs', 'java', 'sh', 'ps1', 'yml', 'yaml', 'xml', 'sql']],
];

export function getFileType(name: string) {
  const extension = name.split(/[\\/]/).pop()?.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || '';
  const group = groups.find(([, , extensions]) => extensions.includes(extension));
  return { kind: group?.[0] || 'file' as FileKind, label: group?.[1] || '文件', extension: extension.toUpperCase() };
}

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const page = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>';
const fileIcons: Record<FileKind, string> = {
  archive: svg('<rect x="3" y="3" width="18" height="5" rx="1.5"/><path d="M5 8v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 11h4M10 14h4M10 17h4"/>'),
  pdf: svg(page + '<path d="M8 16h8M8 12h3M8 19h5"/>'),
  document: svg(page + '<path d="M8 12h8M8 16h8M8 19h5"/>'),
  spreadsheet: svg(page + '<rect x="7" y="12" width="10" height="7" rx=".5"/><path d="M12 12v7M7 15.5h10"/>'),
  presentation: svg('<path d="M3 3h18M5 3v12h14V3M12 15v6M8 21l4-3 4 3M8 11l3-3 3 2 2-3"/>'),
  image: svg(page + '<circle cx="9" cy="12" r="1"/><path d="m7 19 4-4 2 2 2-2 2 4"/>'),
  audio: svg(page + '<path d="M12 12v6M12 12l4-1v6"/><ellipse cx="10" cy="18" rx="2" ry="1.5"/><ellipse cx="14" cy="17" rx="2" ry="1.5"/>'),
  video: svg(page + '<path d="m10 12 6 3.5-6 3.5z"/>'),
  code: svg(page + '<path d="m9 12-3 3 3 3m6-6 3 3-3 3m-2-6-2 6"/>'),
  file: svg(page),
};

// All markup is defined here, never interpolated from filenames or website metadata.
export const fileIconMarkup = (name: string) => fileIcons[getFileType(name).kind];
export const linkIconMarkup = svg('<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>');
export const downloadIconMarkup = svg('<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>');
export const externalLinkIconMarkup = svg('<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>');

export function faviconForLink(url: string): string {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) ? `${parsed.origin}/favicon.ico` : '';
  } catch {
    return /^\/(?!\/)/.test(url) ? '/favicon.ico' : '';
  }
}
