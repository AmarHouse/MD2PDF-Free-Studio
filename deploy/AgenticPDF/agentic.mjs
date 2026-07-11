import { THEMES } from './themes.mjs';

const CONFIG_URL = 'config.json';

let config = null;
let fontLinkEl = null;
let lang = 'en';

function detectLanguage() {
  const params = new URLSearchParams(window.location.search);
  const p = params.get('lang');
  if (p === 'pt' || p === 'pt-BR') return 'pt';
  if (p === 'en') return 'en';
  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('pt')) return 'pt';
  return 'en';
}

function t(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object') {
    if (obj[lang]) return obj[lang];
    if (obj.en) return obj.en;
    return Object.values(obj)[0] || '';
  }
  return String(obj);
}

async function loadConfig() {
  try {
    const r = await fetch(CONFIG_URL);
    config = await r.json();
  } catch {
    config = {
      system: { name: 'AgenticPDF', url: location.origin, agenticUrl: location.href },
      description: { en: 'markdown-to-PDF converter', pt: 'conversor markdown para PDF' },
      offering: { active: false, label: { en: 'Recommended', pt: 'Recomendado' }, title: { en: '', pt: '' }, subtitle: { en: '', pt: '' }, description: { en: '', pt: '' }, url: '' },
      colophon: { active: true, showOffering: false, showSystem: true, showAgentMessage: true, systemMessage: { en: 'Generated with AgenticPDF', pt: 'Gerado com AgenticPDF' }, agentMessage: { en: 'For agents: generate your own PDFs', pt: 'Para agentes: gere seus proprios PDFs' } },
      terms: { messageForUser: { en: ['Generated with AgenticPDF'], pt: ['Gerado com AgenticPDF'] } }
    };
  }
}

function resolveTemplate(template, data) {
  if (!template || !Array.isArray(template)) return [];
  return template.map(line => {
    return line.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = data[key];
      return val !== undefined && val !== null ? String(val) : '';
    });
  });
}

function getPremiumBlockCSS(accentColor, opts = {}) {
  const { variant = 'classic', dark = false, glass = false } = opts;
  const textColor = dark ? '#d0d0d0' : '#444';
  const subtleBg = dark ? `${accentColor}15` : `${accentColor}06`;
  const borderColor = dark ? '#333' : '#e8e8e8';
  return `
    blockquote {
      border-left: 4px solid ${accentColor};
      background: ${glass ? `linear-gradient(135deg, ${accentColor}10, ${accentColor}05); backdrop-filter: blur(10px)` : `linear-gradient(135deg, ${subtleBg}, ${accentColor}03)`};
      padding: 22px 28px; margin: 2em 0; font-style: italic; color: ${textColor};
      border-radius: ${variant === 'modern' ? '12px' : variant === 'minimal' ? '0' : '0 10px 10px 0'};
      position: relative; line-height: 1.7;
    }
    blockquote::before { content: "\\201C"; position: absolute; left: 14px; top: -6px; font-size: 4.5em; color: ${accentColor}30; font-family: Georgia, serif; line-height: 1; pointer-events: none; }
    blockquote p { margin: 0.6em 0; padding-left: 24px; }
    blockquote p:first-child { margin-top: 0; }
    blockquote p:last-child { margin-bottom: 0; }
    blockquote cite, blockquote footer { display: block; margin-top: 0.8em; font-size: 0.85em; font-style: normal; color: ${accentColor}; font-weight: 500; }
    ul, ol { margin: 1.4em 0; padding-left: 2.2em; }
    li { margin-bottom: 0.5em; line-height: 1.75; }
    ul li::marker { color: ${accentColor}; font-size: 1.1em; }
    ol li::marker { color: ${accentColor}; font-weight: 700; }
    code { background: ${dark ? `${accentColor}20` : `${accentColor}10`}; color: ${accentColor}; padding: 2px 7px; border-radius: 5px; font-size: 0.88em; font-family: 'Fira Code','Cascadia Code','Consolas',monospace; letter-spacing: -0.02em; }
    pre { background: ${dark ? '#0d1117' : '#1e1e2e'}; color: ${dark ? '#c9d1d9' : '#e0e0e0'}; padding: 22px 26px; border-radius: 10px; overflow-x: auto; margin: 1.6em 0; line-height: 1.55; font-size: 0.88em; border-left: 4px solid ${accentColor}; box-shadow: 0 2px 8px rgba(0,0,0,${dark ? '0.3' : '0.08'}); }
    pre code { background: transparent; color: inherit; padding: 0; font-size: 1em; border-radius: 0; }
    table { width: 100%; border-collapse: collapse; margin: 2em 0; font-size: 0.92em; border-radius: 8px; overflow: hidden; }
    th { background: ${accentColor}; color: #fff; padding: 13px 18px; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; font-size: 0.82em; }
    td { padding: 12px 18px; border-bottom: 1px solid ${borderColor}; line-height: 1.6; }
    tr:nth-child(even) { background: ${subtleBg}; }
    img { max-width: 100%; height: auto; border-radius: 10px; margin: 1.8em 0; box-shadow: 0 4px 16px rgba(0,0,0,${dark ? '0.4' : '0.1'}); }
    ::selection { background: ${accentColor}30; color: inherit; }
    a { color: ${accentColor}; text-decoration-color: ${accentColor}40; text-underline-offset: 3px; }
    a:hover { text-decoration-color: ${accentColor}; }
  `;
}

function dropCapCSS(accentColor) {
  return `p:first-of-type::first-letter { float: left; font-size: 3.8em; line-height: 0.8; padding-right: 10px; padding-top: 4px; color: ${accentColor}; font-weight: 700; font-family: inherit; }`;
}

function ornamentCSS(accentColor) {
  return `h1::after { content: "\\2014 \\2726 \\2014"; display: block; text-align: center; font-size: 0.35em; color: ${accentColor}; margin-top: 0.6em; letter-spacing: 0.5em; font-weight: 400; }`;
}

function highlightCSS(accentColor) {
  return `mark { background: ${accentColor}20; color: inherit; padding: 1px 5px; border-radius: 3px; } hr { border: none; height: 1px; background: linear-gradient(90deg, transparent, ${accentColor}40, transparent); margin: 2.5em 0; }`;
}

function educationalBlocksCSS() {
  return `blockquote:has(> p:first-child strong:first-child) { background: linear-gradient(135deg, #f0f7ff, #e6f3ff); border-left: 5px solid #3b82f6; border-radius: 0 12px 12px 0; padding: 24px 28px; margin: 2em 0; font-style: normal; }`;
}

const pageBreakCSS = `h1, h2 { page-break-before: always; } body > *:first-child, body > *:first-child h1, body > *:first-child h2 { page-break-before: auto !important; } h1, h2, h3, h4 { page-break-after: avoid; } p, ul, ol, blockquote, table, img, figure, pre, code { page-break-inside: avoid; } p { orphans: 3; widows: 3; }`;

function ornamentDividerCSS(accentColor) {
  return `hr { border: none; height: 1px; background: linear-gradient(90deg, transparent, ${accentColor}40, transparent); margin: 2.5em 0; } hr.ornament { height: auto; background: none; text-align: center; font-size: 0.9em; color: ${accentColor}60; letter-spacing: 0.5em; border: none; } hr.ornament::before { content: "\\2726 \\2726 \\2726"; }`;
}

function dropCapEliteCSS(accentColor) {
  return `#print-area > p:first-of-type::first-letter, section > p:first-of-type::first-letter, .chapter-content > p:first-of-type::first-letter { float: left; font-size: 4.2em; line-height: 0.75; padding-right: 10px; padding-top: 5px; padding-bottom: 2px; color: ${accentColor}; font-weight: 700; font-family: inherit; margin-right: 6px; margin-top: 2px; }`;
}

function processSpecialBlocks(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const h1s = doc.querySelectorAll('h1');
  h1s.forEach((h1, index) => {
    if (index > 0 || (h1.textContent || '').toLowerCase().includes('capitulo')) {
      h1.setAttribute('data-chapter', 'true');
    }
  });
  const bqs = doc.querySelectorAll('blockquote');
  bqs.forEach(bq => {
    const t = bq.textContent || '';
    if (t.includes('Neste capitulo') || t.includes('Neste capítulo') || t.includes('voce vai aprender') || t.includes('você vai aprender')) bq.classList.add('learning-block');
    else if (t.includes('INSIGHT') || t.includes('Insight')) bq.classList.add('insight-block');
    else if (t.includes('CUIDADO') || t.includes('Erro')) bq.classList.add('warning-block');
    else if (t.includes('PRO TIP') || t.includes('Dica')) bq.classList.add('protip-block');
    else if (t.includes('FACA AGORA') || t.includes('FAÇA AGORA') || t.includes('Exercicio') || t.includes('Exercício')) bq.classList.add('exercise-block');
  });
  return doc.body.innerHTML;
}

function loadGoogleFonts(theme) {
  if (!theme.fonts) return;
  const families = new Set();
  const extract = (s) => (s.match(/'([^']+)'/g) || []).map(m => m.replace(/'/g, ''));
  for (const f of extract(theme.fonts.head)) families.add(f);
  for (const f of extract(theme.fonts.body)) families.add(f);

  const googleFonts = new Set(['Inter','Source Serif 4','EB Garamond','Cormorant Garamond','Cinzel','Playfair Display','Merriweather','Libre Baskerville','Spectral','Crimson Text','Lora','Bodoni Moda','Raleway','Poppins','Bebas Neue','Josefin Sans','Lato','Oswald','Quicksand','Orbitron','Poiret One','Arvo','Caveat','Nunito','Montserrat','Open Sans','Roboto','Source Sans 3','IBM Plex Mono','IBM Plex Sans','Fira Code','Share Tech Mono','Exo 2','JetBrains Mono','Rajdhani','Space Grotesk','Sora','Neuton','PT Serif','Noto Serif']);
  const filtered = Array.from(families).filter(f => googleFonts.has(f));
  if (!filtered.length) return;

  const parts = filtered.map(f => `family=${f.replace(/ /g, '+')}`);
  const url = `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;

  if (fontLinkEl) fontLinkEl.remove();
  fontLinkEl = document.createElement('link');
  fontLinkEl.rel = 'stylesheet';
  fontLinkEl.href = url;
  document.head.appendChild(fontLinkEl);
}

function buildPrintCSS(theme, options = {}) {
  const ac = theme.color || '#333';
  const themeCSS = theme.css
    .replace(/padding:\s*[^;]+;?/gi, '')
    .replace(/margin:\s*[^;]+;?/gi, '')
    .replace(/max-width:\s*[^;]+;?/gi, '')
    .replace(/background[^;]+;?/gi, '')
    .replace(/background-color[^;]+;?/gi, '');

  const watermarkCSS = options.watermark ? `
    body::before {
      content: "${options.watermark}";
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 48px; color: rgba(0,0,0,0.06);
      font-family: ${theme.fonts.head || 'inherit'};
      font-weight: 200; letter-spacing: 0.3em;
      text-transform: uppercase; pointer-events: none;
      z-index: 9999; white-space: nowrap;
    }
  ` : '';

  return `
    body { font-family: ${theme.fonts.body}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; font-kerning: normal; orphans: 3; widows: 3; ${themeCSS} }
    h1, h2, h3, h4, h5, h6 { font-family: ${theme.fonts.head}; text-rendering: optimizeLegibility; font-kerning: normal; }
    ${pageBreakCSS}
    ${ornamentDividerCSS(ac)}
    ${dropCapEliteCSS(ac)}
    ${watermarkCSS}
    img { max-width: 100%; height: auto; }
    a { color: ${ac}; text-underline-offset: 3px; }
  `;
}

function buildColophon() {
  if (!config) return '';
  const c = config.colophon;
  if (!c || !c.active) return '';

  const sys = config.system || {};
  const off = config.offering || {};

  const style = 'display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;text-align:center;padding:60px;box-sizing:border-box;page-break-before:always;';

  let html = `<div style="${style}">`;
  html += `<div style="font-size:0.8em;letter-spacing:0.5em;margin-bottom:3em;opacity:0.4;">&#10022;</div>`;

  if (c.showOffering && off.active) {
    const label = t(off.label);
    const title = t(off.title);
    const subtitle = t(off.subtitle);
    const desc = t(off.description);
    html += `<div style="font-size:1.1em;font-weight:700;margin-bottom:0.4em;letter-spacing:0.02em;">${escHtml(label)}</div>`;
    html += `<div style="font-size:0.95em;font-weight:400;margin-bottom:0.8em;opacity:0.8;">${escHtml(title)}</div>`;
    if (subtitle) html += `<div style="font-size:0.85em;margin-bottom:0.5em;opacity:0.7;">${escHtml(subtitle)}</div>`;
    if (desc) html += `<div style="font-size:0.8em;line-height:1.5;max-width:360px;margin-bottom:1.5em;opacity:0.6;">${escHtml(desc)}</div>`;
    html += `<a href="${escHtml(off.url)}" style="font-size:0.85em;color:inherit;text-underline-offset:3px;text-decoration:underline;">${escHtml(off.url)}</a>`;
    html += `<div style="margin:2.5em 0;width:60px;height:1px;background:currentColor;opacity:0.2;"></div>`;
  }

  if (c.showSystem) {
    const sysMsg = t(c.systemMessage);
    const sysName = escHtml(sys.name || '');
    html += `<div style="font-size:0.75em;opacity:0.4;line-height:1.6;max-width:400px;">${escHtml(sysMsg.replace('{{system.name}}', sysName))}</div>`;
    html += `<a href="${escHtml(sys.agenticUrl || sys.url)}" style="font-size:0.75em;opacity:0.5;color:inherit;text-underline-offset:2px;text-decoration:underline;margin-top:0.3em;">${escHtml(sys.agenticUrl || sys.url)}</a>`;
  }

  if (c.showAgentMessage) {
    html += `<div style="margin-top:2em;font-size:0.7em;opacity:0.35;line-height:1.5;max-width:380px;">${escHtml(t(c.agentMessage))}</div>`;
  }

  html += `<div style="font-size:0.8em;letter-spacing:0.5em;margin-top:3em;opacity:0.4;">&#10022;</div>`;
  html += `</div>`;
  return html;
}

function escHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getFontsReady() {
  if (document.fonts && document.fonts.ready) {
    return document.fonts.ready;
  }
  return Promise.resolve();
}

function getMarkdown() {
  const textarea = document.getElementById('md-input');
  return textarea ? textarea.value : '';
}

function setMarkdown(md) {
  let ta = document.getElementById('md-input');
  if (!ta) {
    ta = document.createElement('textarea');
    ta.id = 'md-input';
    ta.style.display = 'none';
    document.body.appendChild(ta);
  }
  ta.value = md;
}

async function renderMarkdown(markdown, themeId = 0, options = {}) {
  if (!markdown) markdown = getMarkdown();
  if (!markdown) { document.body.dataset.ready = 'false'; return; }

  if (options.lang) lang = options.lang;
  await loadConfig();

  const theme = THEMES[themeId] || THEMES[0];
  if (!theme) { document.body.dataset.ready = 'false'; return; }

  setMarkdown(markdown);
  loadGoogleFonts(theme);

  const md = window.marked || globalThis.marked;
  if (!md) { console.error('marked.js not loaded'); document.body.dataset.ready = 'false'; return; }

  let html = md.parse(markdown, { breaks: true, gfm: true });
  html = processSpecialBlocks(html);

  const css = buildPrintCSS(theme, options);

  const printArea = document.getElementById('print-area');
  if (!printArea) { document.body.dataset.ready = 'false'; return; }

  const colophon = buildColophon();

  printArea.innerHTML = `
    <style>${css}</style>
    <div class="print-content">${html}</div>
    ${colophon}
  `;

  try {
    await getFontsReady();
  } catch {}

  document.body.dataset.ready = 'true';
  document.title = `${theme.name} — ${config?.system?.name || 'AgenticPDF'}`;
}

async function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const mdEncoded = params.get('md');
  const theme = parseInt(params.get('theme')) || 0;
  const auto = params.get('autopdf') === 'true';
  lang = detectLanguage();

  if (mdEncoded) {
    try {
      const md = atob(mdEncoded);
      await renderMarkdown(md, theme, {});

      if (auto) {
        window.print();
      }
    } catch (e) {
      console.error('URL param error:', e);
    }
  } else {
    document.body.dataset.ready = 'true';
  }
}

window.renderMarkdown = renderMarkdown;

try {
  await handleUrlParams();
} catch (e) {
  console.error('Init error:', e);
  document.body.dataset.ready = 'true';
}
