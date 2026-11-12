import { expect, test } from 'bun:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { useContext } from 'react';
import { markdownLink, MarkdownLinkContext, ResourceLink } from './ResourceLink';
import { serializeCardMetadata } from './resourceCardMarkdown';

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

test('linked Markdown images can retain anchor semantics without nesting a zoom button', () => {
  function ImageWithZoom() {
    return useContext(MarkdownLinkContext) ? <img src="/sample.png" alt="示例" /> : <button type="button">查看大图</button>;
  }
  const html = renderToStaticMarkup(<ResourceLink href="https://example.com"><ImageWithZoom /></ResourceLink>);
  expect(html).toContain('<a href="https://example.com"><img');
  expect(html).not.toContain('<button');
});

test('metadata icon cards retain full URL and split artwork/body structure', async () => {
  const url = 'https://example.com/path/to/page?query=full';
  const html = await render(markdownLink('页面标题', url, 'link-card:https://example.com/site-icon.png'));
  expect(html).toContain('class="resource-card-artwork"');
  expect(html).toContain('class="resource-card-body"');
  expect(html).toContain('resource-card-artwork-primary');
  expect(html).toContain('resource-card-artwork-action');
  expect(html).toContain('<small>https://example.com/path/to/page?query=full</small>');
  expect(html).toContain('src="https://example.com/site-icon.png"');
  expect(html).toContain('referrerPolicy="no-referrer"');
});

test('unsafe metadata icon URLs fall back to the target favicon', async () => {
  const html = await render(markdownLink('页面标题', 'https://example.com', 'link-card:javascript:alert(1)'));
  expect(html).toContain('resource-card');
  expect(html).toContain('src="https://example.com/favicon.ico"');
  expect(html).not.toContain('src="javascript:');
  expect(html).toContain('resource-card-symbol');
});

test('file cards select an archive pictogram and keep size in the accessible label', async () => {
  const html = await render(markdownLink('备份.tar.gz', '/api/v1/files/id/download', 'attachment:2048'));
  expect(html).toContain('data-file-type="archive"');
  expect(html).toContain('下载 备份.tar.gz，压缩包，2.0 KB');
  expect(html).toContain('<strong>备份.tar.gz</strong>');
  expect(html).not.toContain('<small>');
});


test('legacy link cards try the target origin favicon without saved metadata', async () => {
  const html = await render(markdownLink('旧链接', 'https://example.com/path', 'link-card'));
  expect(html).toContain('src="https://example.com/favicon.ico"');
  expect(html).toContain('resource-card-symbol');
});


test('description replaces the URL in the preview while preserving the destination', async () => {
 const description = '这是页面的 metadata 描述，包含中文。';
 const title = serializeCardMetadata({icon:'https://example.com/favicon.ico',description});
 const html = await render(markdownLink('页面标题','https://example.com/target',title));
 expect(html).toContain('href="https://example.com/target"');
 expect(html).toContain('class="resource-card-description"');
 expect(html).toContain(`title="${description}"`);
 expect(html).toContain(`>${description}</small>`);
 expect(html).not.toContain('<small>https://example.com/target</small>');
});

test('damaged metadata still renders a card with URL fallback', async () => {
 const html = await render(markdownLink('页面标题','https://example.com/target','link-card:v2:%broken'));
 expect(html).toContain('resource-card');
 expect(html).toContain('<small>https://example.com/target</small>');
});
