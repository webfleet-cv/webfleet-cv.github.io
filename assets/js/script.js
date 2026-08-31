(() => {
  'use strict';

  const menuButton = document.querySelector('.mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');

  function closeMenu() {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    menu.hidden = true;
    document.body.classList.remove('menu-open');
  }

  function openMenu() {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Close navigation');
    menu.hidden = false;
    document.body.classList.add('menu-open');
  }

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeMenu(); else openMenu();
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  const escapeHtml = (value) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  function span(cls, value) {
    return `<span class="${cls}">${escapeHtml(value)}</span>`;
  }

  function highlightJson(source) {
    const token = /"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|-?\b\d+(?:\.\d+)?\b|\b(?:true|false|null)\b/g;
    let out = '';
    let last = 0;
    for (const match of source.matchAll(token)) {
      out += escapeHtml(source.slice(last, match.index));
      const value = match[0];
      if (value.startsWith('"')) {
        const tail = source.slice(match.index + value.length);
        out += span(/^\s*:/.test(tail) ? 'tok-key' : 'tok-string', value);
      } else if (/^(true|false|null)$/.test(value)) {
        out += span('tok-keyword', value);
      } else {
        out += span('tok-number', value);
      }
      last = match.index + value.length;
    }
    return out + escapeHtml(source.slice(last));
  }

  function highlightCode(source, language) {
    if (language === 'json') return highlightJson(source);

    const patterns = {
      shell: /#[^\n]*|"(?:\\.|[^"\\])*"|'[^']*'|\b(?:curl|sh|go|webfleet|export|sudo|systemctl)\b/g,
      javascript: /\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|return|async|await|function|true|false|null)\b|\b\d+(?:\.\d+)?\b/g
    };
    const regex = patterns[language];
    if (!regex) return escapeHtml(source);

    let out = '';
    let last = 0;
    for (const match of source.matchAll(regex)) {
      out += escapeHtml(source.slice(last, match.index));
      const value = match[0];
      let cls = 'tok-keyword';
      if (value.startsWith('#') || value.startsWith('//')) cls = 'tok-comment';
      else if (/^["'`]/.test(value)) cls = 'tok-string';
      else if (/^\d/.test(value)) cls = 'tok-number';
      out += span(cls, value);
      last = match.index + value.length;
    }
    return out + escapeHtml(source.slice(last));
  }

  function highlightHtml(source) {
    let out = '';
    let last = 0;
    const tagPattern = /<\/?[a-zA-Z][^>]*>/g;
    for (const match of source.matchAll(tagPattern)) {
      out += escapeHtml(source.slice(last, match.index));
      const tag = match[0];
      const nameMatch = tag.match(/^<\/?([a-zA-Z0-9-]+)/);
      if (!nameMatch) {
        out += escapeHtml(tag);
      } else {
        const name = nameMatch[1];
        const prefix = tag.startsWith('</') ? '</' : '<';
        const restStart = prefix.length + name.length;
        const closing = tag.endsWith('/>') ? '/>' : '>';
        const rest = tag.slice(restStart, tag.length - closing.length);
        let renderedRest = '';
        let restLast = 0;
        const attrPattern = /([a-zA-Z:-]+)(\s*=\s*)("[^"]*"|'[^']*')/g;
        for (const attr of rest.matchAll(attrPattern)) {
          renderedRest += escapeHtml(rest.slice(restLast, attr.index));
          renderedRest += span('tok-attr', attr[1]) + escapeHtml(attr[2]) + span('tok-string', attr[3]);
          restLast = attr.index + attr[0].length;
        }
        renderedRest += escapeHtml(rest.slice(restLast));
        out += escapeHtml(prefix) + span('tok-tag', name) + renderedRest + escapeHtml(closing);
      }
      last = match.index + tag.length;
    }
    return out + escapeHtml(source.slice(last));
  }

  function highlight(code, language) {
    const source = code.textContent || '';
    code.innerHTML = language === 'html' ? highlightHtml(source) : highlightCode(source, language);
  }

  document.querySelectorAll('.docs-sidebar a').forEach((link) => {
    const current = new URL(window.location.href);
    const target = new URL(link.href, current);
    if (target.pathname === current.pathname) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  document.querySelectorAll('pre > code').forEach((code) => {
    const pre = code.parentElement;
    const languageClass = Array.from(code.classList).find((name) => name.startsWith('language-'));
    const language = languageClass ? languageClass.slice('language-'.length) : 'text';
    const raw = code.textContent || '';
    highlight(code, language);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.setAttribute('aria-label', 'Copy code');
    button.title = 'Copy code';
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>';
    button.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(raw);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = raw;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          textarea.remove();
        }
        button.classList.add('copied');
        button.setAttribute('aria-label', 'Copied');
        window.setTimeout(() => {
          button.classList.remove('copied');
          button.setAttribute('aria-label', 'Copy code');
        }, 1300);
      } catch (_) {
        button.setAttribute('aria-label', 'Copy failed');
      }
    });
    pre.appendChild(button);
  });
})();
