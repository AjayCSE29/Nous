// Shared markdown + math renderer for both windows.
// Loaded as a plain browser script after the vendored libs (marked, DOMPurify,
// KaTeX auto-render) and before each window's app.js. Also requireable from
// Node tests with a DOM global (happy-dom).
// Dependencies are read from globals so top-level requires never touch the DOM.

function renderMarkdown(el, source) {
  if (!source) {
    el.replaceChildren();
    return;
  }

  const marked = globalThis.marked;
  const purify = globalThis.DOMPurify;
  const renderMath = globalThis.renderMathInElement;

  const guarded = extractMathBlocks(source);

  let html;
  try {
    html = marked ? marked.parse(guarded.text, { gfm: true, breaks: true }) : String(guarded.text);
  } catch {
    html = String(guarded.text);
  }
  if (purify) html = purify.sanitize(html);
  el.innerHTML = html;

  restoreMathGuards(el, guarded.blocks);

  if (renderMath && globalThis.katex) {
    try {
      renderMath(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      });
    } catch {
      // Leave math source visible if KaTeX refuses input.
    }
  }

  wrapCodeCards(el);
}

// The marked `breaks: true` splits newlines into <br>, and KaTeX auto-render
// only matches delimiters inside a single text node, so multi-line display
// math ($...$ across lines, \[...\], \begin{env}...\end{env}) never renders.
// Some models also wrap one-line display math in bare brackets:
//   [ \hat{H} = -\frac{\hbar^2}{2m} \frac{d^2}{dx^2} + V(x) ]
// Guard those forms before markdown runs and rehydrate them with KaTeX HTML
// afterwards. Inline $...$ / \(...\) math is left to auto-render.
function extractMathBlocks(source) {
  const blocks = [];
  const token = (body, display, original) => {
    blocks.push({ body, display, original });
    return `NOUSMATH${blocks.length - 1}`;
  };
  let text = source;

  text = text.replace(
    /\\\[\s*([\s\S]*?)\s*\\\]/g,
    (m, body) => token(body.trim(), true, m)
  );

  text = text.replace(
    /\\begin\{([A-Za-z*]+)\}([\s\S]*?)\\end\{\1\}/g,
    (m, env, body) => {
      const name = env.replace(/\*$/, '');
      const mapped =
        name === 'align' || name === 'alignat'
          ? name === 'align' ? 'aligned' : 'alignedat'
          : name === 'gather' ? 'gathered' : name;
      return token(`\\begin{${mapped}}${body}\\end{${mapped}}`, true, m);
    }
  );

  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (m, body) =>
    body.includes('\n') ? token(body.trim(), true, m) : m
  );

  const laTeXish = /\\[A-Za-z]+\w*/;
  text = text.replace(/^[ \t]*\[(.*)\][ \t]*$/gm, (m, inner) =>
    laTeXish.test(inner) ? token(inner, true, m) : m
  );
  text = text.replace(/^[ \t]*\((.*)\)[ \t]*$/gm, (m, inner) =>
    laTeXish.test(inner) ? token(inner, true, m) : m
  );

  return { text, blocks };
}

function restoreMathGuards(root, blocks) {
  if (!blocks.length || !globalThis.katex || !root || !root.childNodes) return;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const match = /^(NOUSMATH(\d+))$/.exec((child.textContent || '').trim());
        if (!match) continue;
        const block = blocks[Number(match[2])];
        if (!block) continue;
        const inCode = typeof child.closest === 'function' && child.closest('.code-card, pre, code');
        if (inCode || !block.display) {
          child.textContent = block.original;
          continue;
        }
        let html = '';
        try {
          html =
            globalThis.katex.renderToString(block.body, {
              displayMode: true,
              throwOnError: false,
              strict: false,
            }) || '';
        } catch {
          html = '';
        }
        if (!html) {
          child.textContent = block.original;
          continue;
        }
        const span = document.createElement('span');
        span.innerHTML = html;
        child.parentNode.replaceChild(span, child);
      } else if (child.nodeType === 1) {
        walk(child);
      }
    }
  };
  walk(root);
}

function wrapCodeCards(root) {
  for (const pre of root.querySelectorAll('pre')) {
    if (pre.closest('.code-card')) continue;
    const code = pre.querySelector('code') || pre;
    const text = code.textContent;
    const label = code.className.match(/language-([\w+-]+)/)?.[1] || 'code';

    const card = document.createElement('section');
    card.className = 'code-card';
    const bar = document.createElement('header');
    const lang = document.createElement('span');
    lang.textContent = label;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(text);
        copy.textContent = 'Copied';
        setTimeout(() => (copy.textContent = 'Copy'), 1400);
      } catch {
        copy.textContent = 'Unavailable';
      }
    };
    bar.append(lang, copy);
    card.append(bar);
    const parent = pre.parentNode;
    if (!parent) continue;
    parent.insertBefore(card, pre);
    card.append(pre);
  }
}

// Opens http/https links via the allow-listed IPC only and never navigates
// the window. Non-http(s) links are rendered inert.
function installLinkHandling(container, openExternal) {
  container.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    event.preventDefault();
    if (!openExternal) return;
    let href;
    try {
      href = new URL(anchor.getAttribute('href'), globalThis.location?.href).toString();
    } catch {
      return;
    }
    if (href.startsWith('http:') || href.startsWith('https:')) {
      openExternal(href);
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderMarkdown, installLinkHandling, wrapCodeCards };
}