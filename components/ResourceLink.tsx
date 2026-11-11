import React from 'react';
import { Download, ExternalLink, FileText, Link2 } from 'lucide-react';
import './resource-card.css';

export const markdownLink = (name: string, url: string, title: string) =>
  `[${name.replace(/[\\\[\]]/g, '\\$&').replace(/[\r\n]/g, ' ')}](<${url.replace(/</g, '%3C').replace(/>/g, '%3E')}> "${title}")`;

export function ResourceLink({ href, title, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const file = title?.match(/^attachment:(\d+)$/);
  const card = title === 'link-card' || !!file;
  const safe = href && (/^https?:\/\//i.test(href) || (/^\/(?!\/)/.test(href)));
  if (!card || !safe) return <a {...props} href={href} title={title}>{children}</a>;
  const bytes = Number(file?.[1] || 0);
  const size = bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  let host = href;
  try { host = new URL(href, window.location.origin).hostname; } catch {}
  return <a className="resource-card not-prose" href={href} target={file ? undefined : '_blank'} rel="noopener noreferrer" download={file ? true : undefined}>
    <span className="resource-card-icon">{file ? <FileText size={24} /> : <Link2 size={24} />}</span>
    <span className="resource-card-body"><strong>{children}</strong><small>{file ? `${size} · 点击下载` : host}</small></span>
    <span className="resource-card-action">{file ? <Download size={20} /> : <ExternalLink size={20} />}</span>
  </a>;
}
