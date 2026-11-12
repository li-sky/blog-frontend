import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from './Button';

test('loading keeps a button disabled even when the caller passes disabled=false', () => {
  const markup = renderToStaticMarkup(<Button isLoading disabled={false}>Save</Button>);
  expect(markup).toContain('disabled=""');
  expect(markup).toContain('aria-busy="true"');
  expect(markup).toContain('aria-hidden="true"');
});

test('a caller can disable an idle button and enable it again', () => {
  expect(renderToStaticMarkup(<Button disabled>Save</Button>)).toContain('disabled=""');
  const markup = renderToStaticMarkup(<Button disabled={false}>Save</Button>);
  expect(markup).not.toContain('disabled=');
  expect(markup).not.toContain('aria-busy=');
});
