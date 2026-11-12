import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { MarkdownTable } from './MarkdownTable';
import { ResourceLink } from './ResourceLink';
import 'katex/dist/katex.min.css';

export function EditorPreview({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: false, ignoreMissing: true }]]}
    urlTransform={defaultUrlTransform}
    components={{ a: ResourceLink, table: MarkdownTable, th: props => <th {...props} scope="col" />,
      img: props => <img {...props} loading="lazy" decoding="async" /> }}>{content}</ReactMarkdown>;
}
