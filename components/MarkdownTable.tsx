import type { TableHTMLAttributes } from 'react';
import './markdown-table.css';

export function MarkdownTable(props: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="markdown-table-scroll" role="region" aria-label="文章表格" tabIndex={0}>
      <table {...props} />
    </div>
  );
}
