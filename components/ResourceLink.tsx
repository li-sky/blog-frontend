import React, { useEffect, useState } from 'react';
import { downloadIconMarkup, externalLinkIconMarkup, fileIconMarkup, getFileType, linkIconMarkup, faviconForLink } from './resourceCardArtwork';
import './resource-card.css';

export const markdownLink = (name: string, url: string, title: string) =>
  `[${name.replace(/[\\\[\]]/g, '\\$&').replace(/[\r\n]/g, ' ')}](<${url.replace(/</g, '%3C').replace(/>/g, '%3E')}> "${title}")`;

function textContent(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    return React.isValidElement<{ children?: React.ReactNode }>(child) ? textContent(child.props.children) : '';
  }).join('');
}

export function ResourceLink({ href, title, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const file = title?.match(/^attachment:(\d+)$/);
  const card = title === 'link-card' || title?.startsWith('link-card:') || !!file;
  const safe = href && (/^https?:\/\//i.test(href) || /^\/(?!\/)/.test(href));
  const icon = title?.startsWith('link-card:') ? title.slice('link-card:'.length) : '';
  const safeIcon = /^https?:\/\//i.test(icon) ? icon : '';
  const favicon = faviconForLink(href || '');
  const [imageStage, setImageStage] = useState(0);
  useEffect(() => setImageStage(0), [safeIcon, favicon]);
  const imageSrc = imageStage === 0 ? (safeIcon || favicon) : imageStage === 1 ? favicon : '';
  const nextIcon = () => setImageStage(imageStage === 0 && safeIcon && favicon && safeIcon !== favicon ? 1 : 2);
  if (!card || !safe) return <a {...props} href={href} title={title}>{children}</a>;
  const name = textContent(children);
  const bytes = Number(file?.[1] || 0);
  const size = bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  const type = getFileType(name);
  return <a className="resource-card not-prose" data-kind={file ? 'file' : 'link'} data-file-type={file ? type.kind : undefined}
    href={href} target={file ? undefined : '_blank'} rel="noopener noreferrer" download={file ? true : undefined}
    aria-label={file ? `下载 ${name}，${type.label}，${size}` : `在新窗口打开 ${name}：${href}`}>
    <span className="resource-card-artwork" aria-hidden="true">
      <span className="resource-card-artwork-primary">
        <span className="resource-card-symbol" dangerouslySetInnerHTML={{ __html: file ? fileIconMarkup(name) : linkIconMarkup }} />
        {!file && imageSrc && <img className="resource-card-site-icon" src={imageSrc} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={nextIcon} />}
        {file && type.extension && <span className="resource-card-extension">{type.extension}</span>}
      </span>
      <span className="resource-card-artwork-action" dangerouslySetInnerHTML={{ __html: file ? downloadIconMarkup : externalLinkIconMarkup }} />
    </span>
    <span className="resource-card-body"><strong>{children}</strong>{!file && <small>{href}</small>}</span>
  </a>;
}
