import { expect, test } from 'bun:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { markdownLink, ResourceLink } from './ResourceLink';

const render = async (source) => {
  const result = await unified().use(remarkParse).use(remarkRehype)
    .use(rehypeReact, { Fragment, jsx, jsxs, components: { a: ResourceLink } })
    .process(source);
  return renderToStaticMarkup(result.result);
};

test('attachment metadata survives Markdown serialization and renders a download card', async () => {
  const processor = unified().use(remarkParse).use(remarkStringify);
  const markdown = markdownLink('报告 [最终].zip', '/api/v1/files/id/download', 'attachment:2048');
  const saved = processor.stringify(processor.parse(markdown));
  const html = await render(saved);
  expect(html).toContain('resource-card');
  expect(html).toContain('报告 [最终].zip');
  expect(html).toContain('2.0 KB');
  expect(html).toContain('download=""');
});

test('link cards open a new tab while normal links stay inline', async () => {
  const html = await render(markdownLink('示例网站', 'https://example.com/path', 'link-card'));
  expect(html).toContain('resource-card');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('noopener noreferrer');
  expect(await render('[普通链接](https://example.com)')).not.toContain('resource-card');
});

test('unsafe protocols cannot become cards', async () => {
  expect(await render('[恶意链接](javascript:alert "link-card")')).not.toContain('resource-card');
});
