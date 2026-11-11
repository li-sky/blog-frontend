export interface PublicationEvents {
  status?: string;
  publicationTimeKnown?: boolean;
  publishedAt?: string | null;
  publishedUpdatedAt?: string | null;
}

export interface PublicationTime {
  iso: string;
  label: string;
}

const shanghaiTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function publicationTime(value?: string | null): PublicationTime | null {
  // Publishing events come from server timestamps, never from the creation/save clock.
  // Require an explicit timezone to avoid interpreting legacy values differently per device.
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim())) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() <= 1) return null;
  const parts = Object.fromEntries(shanghaiTime.formatToParts(date).map(part => [part.type, part.value]));
  return { iso: date.toISOString(), label: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}` };
}

export function publicationEvents(post: PublicationEvents) {
  const first = publicationTime(post.publishedAt);
  const candidate = publicationTime(post.publishedUpdatedAt);
  const updated = candidate && (!first || Date.parse(candidate.iso) > Date.parse(first.iso)) ? candidate : null;
  return { first, updated, firstKnown: post.publicationTimeKnown === true, firstLabel: post.publicationTimeKnown === true ? '首次发布' : '发布时间', missingLabel: post.status === 'draft' ? '未发布' : null };
}
