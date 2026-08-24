import { HTML_COMMON_PROPERTIES } from '@/constants/HtmlCommonProperties';

describe('HTML_COMMON_PROPERTIES', () => {
  it('forwards language and writing-direction semantics to the host DOM', () => {
    expect(HTML_COMMON_PROPERTIES).toMatchObject({
      dir: { type: 'string', optional: true },
      lang: { type: 'string', optional: true },
    });
  });
});
