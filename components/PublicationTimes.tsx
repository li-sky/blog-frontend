import React from 'react';
import { Calendar, PenBoxIcon } from 'lucide-react';
import { publicationEvents, type PublicationEvents } from '../services/publicationDates';

export function PublicationTimes({ post, compact = false }: { post: PublicationEvents; compact?: boolean }) {
  const { first, updated, firstKnown, firstLabel, missingLabel } = publicationEvents(post);
  const iconClass = compact ? 'h-3 w-3 shrink-0' : 'h-4 w-4 shrink-0';
  return <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1" title="北京时间（Asia/Shanghai）">
    <span className="inline-flex items-center gap-1.5">
      <Calendar className={iconClass} aria-hidden="true" />
      {first ? <><span>{firstLabel}</span><time dateTime={first.iso}>{first.label}</time></> : <span>{missingLabel}</span>}
    </span>
    {first && !firstKnown && <span className="text-xs">首次发布时间待确认</span>}
    {updated && <span className="inline-flex items-center gap-1.5">
      <PenBoxIcon className={iconClass} aria-hidden="true" />
      <span>更新发布</span><time dateTime={updated.iso}>{updated.label}</time>
    </span>}
    {!compact && first && <span className="text-xs">北京时间</span>}
  </span>;
}
