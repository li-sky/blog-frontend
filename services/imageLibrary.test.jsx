import { expect, test } from 'bun:test';
import { unified } from 'unified';
import parse from 'remark-parse';
import { imageMarkdown, imageOriginalURL } from './imageLibrary';
test('copied image Markdown preserves literal brackets and malicious-looking alt text',()=>{
 const url='https://example.com/a%20b.png';
 const text='报告 [最终] \\ ![x](bad).png';
 const tree=unified().use(parse).parse(imageMarkdown(text,url));
 expect(tree.children[0].children[0].type).toBe('image');
 expect(tree.children[0].children[0].url).toBe(url);
 expect(tree.children[0].children[0].alt).toBe(text);
});
test('legacy missing original URL resolves a safe encoded uploads path',()=>{
 expect(imageOriginalURL({url:'undefined',storagePath:'uploads/报告.png'})).toBe('/images/%E6%8A%A5%E5%91%8A.png');
 expect(imageOriginalURL({url:'https://cdn.example.com/a.png'})).toBe('https://cdn.example.com/a.png');
 expect(imageOriginalURL({url:'javascript:alert(1)',filename:'safe.png'})).toBe('/images/safe.png');
});
