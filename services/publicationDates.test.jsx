import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { publicationEvents, publicationTime } from './publicationDates';
import { PublicationTimes } from '../components/PublicationTimes';

test('publishing timestamps display in Shanghai to the minute independent of source offset', () => {
  expect(publicationTime('2026-11-11T03:04:59Z')).toEqual({iso:'2026-11-11T03:04:59.000Z',label:'2026-11-11 11:04'});
  expect(publicationTime('2026-11-11T11:04:59+08:00')?.label).toBe('2026-11-11 11:04');
  expect(publicationTime('2026-11-10T16:00:00Z')?.label).toBe('2026-11-11 00:00');
});

test('only a subsequent publishing event produces an update label', () => {
  const first='2026-11-01T00:00:00Z';
  expect(publicationEvents({publishedAt:first}).updated).toBeNull();
  expect(publicationEvents({publishedAt:first,publishedUpdatedAt:first}).updated).toBeNull();
  expect(publicationEvents({publishedAt:first,publishedUpdatedAt:'2026-10-30T00:00:00Z'}).updated).toBeNull();
  expect(publicationEvents({publishedAt:first,publishedUpdatedAt:'2026-11-02T00:00:00Z'}).updated?.label).toBe('2026-11-02 08:00');
});

test('unknown, zero and ambiguous dates never become invented publishing times', () => {
  for (const value of [null,undefined,'','not-a-date','0001-01-01T00:00:00Z','2026-11-11 10:00:00']) expect(publicationTime(value)).toBeNull();
  const events=publicationEvents({status:'published',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-11-11T00:00:00Z',publishedUpdatedAt:'2026-11-11T00:00:00Z'});
  expect(events.first).toBeNull(); expect(events.updated?.label).toBe('2026-11-11 08:00'); expect(events.missingLabel).toBe('发布时间待确认');
  expect(publicationEvents({status:'draft'}).missingLabel).toBe('未发布');
});

test('rendered publication metadata is semantic and does not confuse saves with publishing', () => {
  const html=renderToStaticMarkup(React.createElement(PublicationTimes,{post:{publicationTimeKnown:true,publishedAt:'2026-11-01T00:00:00Z',publishedUpdatedAt:'2026-11-02T00:00:00Z'}}));
  expect(html).toContain('首次发布'); expect(html).toContain('更新发布'); expect(html).toContain('北京时间');
  expect(html.match(/<time /g)).toHaveLength(2); expect(html).toContain('dateTime="2026-11-01T00:00:00.000Z"');
  const unknown=renderToStaticMarkup(React.createElement(PublicationTimes,{post:{status:'published'}}));
  expect(unknown).toContain('发布时间待确认'); expect(unknown).not.toContain('<time ');
});


test('legacy publication timestamps are explicitly qualified, never claimed as the earliest publication', () => {
  const html=renderToStaticMarkup(React.createElement(PublicationTimes,{post:{status:'published',publishedAt:'2026-11-01T00:00:00Z'}}));
  expect(html).toContain('历史发布记录'); expect(html).toContain('首次发布时间待确认');
  expect(html).not.toContain('<span>首次发布</span>');
  const verified=publicationEvents({publicationTimeKnown:true,publishedAt:'2026-11-01T00:00:00Z'});
  expect(verified.firstKnown).toBe(true); expect(verified.firstLabel).toBe('首次发布');
});
