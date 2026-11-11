import { expect, test } from 'bun:test';
import { unified } from 'unified';
import parse from 'remark-parse';
import stringify from 'remark-stringify';
import { cardFromParagraph, cardToParagraph, remarkResourceCards } from './resourceCardMarkdown';

test('standalone marked links become card blocks, including old saved content', () => {
 const processor = unified().use(parse).use(remarkResourceCards);
 const tree = processor.runSync(processor.parse('[资料.zip](/files/id "attachment:2048")\n\n[网站](https://example.com "link-card")'));
 expect(tree.children[0]).toEqual({type:'resourceCard',kind:'file',url:'/files/id',name:'资料.zip',size:2048});
 expect(tree.children[1]).toEqual({type:'resourceCard',kind:'link',url:'https://example.com',name:'网站',size:0});
});

test('ordinary and inline links remain native editable text', () => {
 const processor = unified().use(parse).use(remarkResourceCards);
 const tree = processor.runSync(processor.parse('[普通链接](https://example.com)\n\n正文 [链接](https://example.com "link-card") 后续'));
 expect(tree.children.map(node=>node.type)).toEqual(['paragraph','paragraph']);
});

test('card serialization preserves literal filenames and draft cards', () => {
 const processor = unified().use(parse).use(stringify);
 for (const attrs of [
  {kind:'file',url:'/files/id',name:'报告 *[最终]* \\ 版本.zip',size:2048},
  {kind:'link',url:'https://example.com/?a=1&b=2',name:'标题',size:0},
  {kind:'link',url:'',name:'链接卡片',size:0},
 ]) {
  const source = processor.stringify({type:'root',children:[cardToParagraph(attrs)]});
  const parsed = cardFromParagraph(processor.parse(source).children[0]);
  expect(parsed).toEqual(attrs);
 }
});

test('nested cards are parsed but code and unsafe links stay unchanged', () => {
 const processor = unified().use(parse).use(remarkResourceCards);
 const tree = processor.runSync(processor.parse('> [网站](https://example.com "link-card")\n\n```markdown\n[网站](https://example.com "link-card")\n```\n\n[危险](javascript:alert "link-card")'));
 expect(tree.children[0].children[0].type).toBe('resourceCard');
 expect(tree.children[1].type).toBe('code');
 expect(tree.children[2].type).toBe('paragraph');
});


test('link metadata icons roundtrip and unsafe icon protocols are dropped', () => {
 const processor = unified().use(parse).use(stringify);
 const attrs = {kind:'link',url:'https://example.com/path',name:'Metadata title',size:0,icon:'https://cdn.example.com/favicon.png?v=1&theme=dark'};
 const source=processor.stringify({type:'root',children:[cardToParagraph(attrs)]});
 expect(cardFromParagraph(processor.parse(source).children[0])).toEqual(attrs);
 const unsafe=processor.parse('[标题](https://example.com "link-card:javascript:alert(1)")');
 expect(cardFromParagraph(unsafe.children[0]).icon).toBeUndefined();
});
