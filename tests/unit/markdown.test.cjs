const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { Window } = require('happy-dom');

describe('renderMarkdown pipeline', () => {
  let window;
  let renderMarkdown;
  let installLinkHandling;
  let opened = [];

  before(() => {
    window = new Window({ url: 'https://nous.local/' });
    globalThis.window = window;
    globalThis.document = window.document;
    // happy-dom leaves `compatMode` undefined; KaTeX treats anything short of
    // "CSS1Compat" as quirks mode and refuses to render. Emulate a standards
    // document (as Chromium provides) before KaTeX is loaded.
    Object.defineProperty(window.document, 'compatMode', {
      value: 'CSS1Compat',
      configurable: true,
    });

    // marked's UMD CommonJS export is empty and its browser branch is hidden
    // by the ambient `exports`/`module` globals; run it with an explicit fake
    // module and harvest the namespace it populates.
    const fakeModule = { exports: {} };
    new Function(
      'module',
      'exports',
      require('node:fs').readFileSync(
        require('node:path').resolve('node_modules/marked/lib/marked.umd.js'),
        'utf8'
      )
    )(fakeModule, fakeModule.exports);
    globalThis.marked = fakeModule.exports;
    const createPurify = require('../../node_modules/dompurify/dist/purify.min.js');
    globalThis.DOMPurify = createPurify(window);
    globalThis.katex = require('../../node_modules/katex/dist/katex.min.js');
    const autoRender = require('../../node_modules/katex/dist/contrib/auto-render.min.js');
    globalThis.renderMathInElement =
      typeof autoRender === 'function' ? autoRender : autoRender.renderMathInElement;

    const markdown = require('../../src/renderer/shared/markdown.js');
    renderMarkdown = markdown.renderMarkdown;
    installLinkHandling = markdown.installLinkHandling;
  });

  const render = (source) => {
    const el = window.document.createElement('article');
    renderMarkdown(el, source);
    return el;
  };

  // Note: happy-dom + DOMPurify drop a *leading* block-level wrapper
  // (h1/ul/pre/table...) when it is the first node of the fragment, while
  // Chromium keeps it. Sources below that begin with a block element therefore
  // open with an intro paragraph so the assertions match real renderer
  // behaviour.
  it('renders headings', () => {
    const el = render('Lead in.\n\n# Big thing\n\n## Smaller\n\n### Even smaller');
    assert.equal(el.querySelectorAll('h1,h2,h3').length, 3);
    assert.equal(el.querySelector('h1').textContent, 'Big thing');
    assert.equal(el.querySelector('h3').textContent, 'Even smaller');
  });

  it('renders bold and italic text', () => {
    const el = render('**bold**, *italic*, and `inline` too');
    assert.equal(el.querySelector('strong').textContent, 'bold');
    assert.equal(el.querySelector('em').textContent, 'italic');
    assert.ok(el.querySelector(':not(pre) > code'));
  });

  it('renders bullet and numbered lists', () => {
    const el = render('Before the list:\n\n- one\n- two\n- three');
    assert.equal(el.querySelectorAll('ul li').length, 3);
    const numbered = render('Steps:\n\n1. first\n2. second');
    assert.equal(numbered.querySelectorAll('ol li').length, 2);
    assert.equal(numbered.querySelector('ol li').textContent, 'first');
  });

  it('renders blockquotes and tables', () => {
    const el = render('Intro\n\n> quote');
    assert.equal(el.querySelector('blockquote').textContent.trim(), 'quote');
    const table = render('Table:\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    assert.equal(table.querySelectorAll('table tr').length, 2);
    assert.equal(table.querySelector('table td').textContent, '1');
  });

  it('wraps fenced code in a copyable card', () => {
    const el = render('Code:\n\n```js\nconst x = 1;\n```');
    const card = el.querySelector('.code-card');
    assert.ok(card);
    assert.equal(card.querySelector('header span').textContent, 'js');
    assert.equal(card.querySelector('pre code').textContent.trim(), 'const x = 1;');
    assert.ok(card.querySelector('header button').textContent === 'Copy');
  });

  it('renders display and inline math with KaTeX', () => {
    const el = render('The equation $$E = mc^2$$ is famous, and $x_i$ scales.');
    assert.equal(el.querySelectorAll('.katex-display').length, 1, 'display math should render');
    assert.ok(el.querySelectorAll('.katex').length >= 2, 'inline math should render too');
  });

  const H = '\\hat{H} = -\\frac{\\hbar^2}{2m} \\frac{d^2}{dx^2} + V(x)';
  const displayCount = (el) => el.querySelectorAll('.katex-display .katex').length;

  it('renders multi-line display math across line boundaries', () => {
    const el = render('The Hamiltonian is:\n\n$$\n' + H + '\n$$\n\nfor a particle of mass m.');
    assert.ok(displayCount(el) >= 1, 'multi-line $$ block should render as display math');
    assert.equal(el.innerHTML.includes('NOUSMATH'), false, 'no guard token should remain');
  });

  it('renders \\[...\\] and \\begin{aligned} display blocks', () => {
    const br = render('Line above.\n\n\\[\n' + H + '\n\\]');
    assert.ok(displayCount(br) >= 1);
    const aligned = render(
      'Here:\n\n\\begin{aligned}\n\\frac{d}{dx}x^2 &= 2x \\\\\ny &= mx + c\n\\end{aligned}'
    );
    assert.ok(displayCount(aligned) >= 1);
  });

  it('renders bare bracket display math used by models', () => {
    const el = render('The operator is:\n\n[ ' + H + ' ]\n\nin one dimension.');
    assert.ok(displayCount(el) >= 1, 'bare [ latex ] line should render as display math');
    assert.equal(el.innerHTML.includes('NOUSMATH'), false, 'no guard token should remain');
  });

  it('does not treat plain prose brackets as math', () => {
    const el = render('Steps: [ add 1, then the (result) ] on a fresh line.');
    assert.equal(el.querySelectorAll('.katex').length, 0);
  });

  it('skips math inside code blocks', () => {
    const el = render('Code:\n\n```\n$not math$\n```');
    assert.ok(el.querySelector('.code-card'));
    assert.equal(el.querySelectorAll('.katex').length, 0);
  });

  it('sanitizes injected HTML and javascript links', () => {
    const el = render('<script>alert(1)</script>hi [x](javascript:alert(1))');
    assert.equal(el.querySelectorAll('script').length, 0);
    assert.equal(el.querySelector('a'), null);
  });

  it('opens only http(s) anchors via the callback', async () => {
    opened = [];
    const container = window.document.createElement('div');
    container.innerHTML =
      '<a href="https://example.com/a">a</a><a href="javascript:x">bad</a>';
    installLinkHandling(container, (url) => opened.push(url));

    container.querySelector('a').dispatchEvent(
      new window.Event('click', { bubbles: true, cancelable: true })
    );
    const bad = container.querySelectorAll('a')[1];
    bad.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
    assert.deepEqual(opened, ['https://example.com/a']);
  });
});