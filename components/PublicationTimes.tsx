import React from 'react';
import { Calendar, PenBoxIcon } from 'lucide-react';
import { publicationEvents, type PublicationEvents } from '../services/publicationDates';

export function PublicationTimes({ post, compact = false, dateOnly = false }: { post: PublicationEvents; compact?: boolean; dateOnly?: boolean }) {
  const { first, updated, firstLabel, missingLabel } = publicationEvents(post);
  if (!first && !updated && !missingLabel) return null;
  const iconClass = compact ? 'h-3 w-3 shrink-0' : 'h-4 w-4 shrink-0';
  return <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1" title="北京时间（Asia/Shanghai）">
    {(first || missingLabel) && <span className="inline-flex items-center gap-1.5">
      <Calendar className={iconClass} aria-hidden="true" />
      {first ? <>{!dateOnly && <span>{firstLabel}</span>}<time dateTime={first.iso}>{dateOnly ? first.label.slice(0,10) : first.label}</time></> : <span>{missingLabel}</span>}
    </span>}
    {updated && <span className="inline-flex items-center gap-1.5">
      <PenBoxIcon className={iconClass} aria-hidden="true" />
      {!dateOnly && <span>更新发布</span>}<time dateTime={updated.iso}>{dateOnly ? updated.label.slice(0,10) : updated.label}</time>
    </span>}
    {!compact && first && <span className="text-xs">北京时间</span>}
  </span>;
}
