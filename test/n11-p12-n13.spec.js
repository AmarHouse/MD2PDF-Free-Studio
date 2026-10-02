// Fecho dos achados não-bloqueantes do review/security de 2026-10-02:
//
//   N11 (review-2026-10-02b, MÉDIA)  PDFGenerator.init() nunca é chamado
//       pela produção (só pelos testes) — o único ponto que lê pdfSettings
//       do localStorage. Consequência: preferências de página (margens,
//       tamanho, orientação, numeração) nunca são restauradas entre
//       sessões e o modal abre com inputs vazios no primeiro uso.
//   P12 (security-2026-10-02c, BAIXA) isValidProjectName não rejeita
//       chaves de protótipo ('__proto__'/'constructor'/'prototype') —
//       importProject com name:"__proto__" passava e o saveProject
//       poluía Object.prototype antes do TypeError abortar.
//   N13 (review-2026-10-02b, BAIXA)  3 setters CSSOM do preview de tema
//       (themes.js buildThemeCSS) recebiam theme.color cru — inerte,
//       mas inconsistente com Sanitize.color usado nos demais sinks.
//
// Convenção de prova (mesma da suíte): cada teste tem uma FASE 1 que
// reconstrói o comportamento pré-correção em memória (prova que o código
// antigo falharia) e uma FASE 2 no caminho corrigido de produção. Nenhum
// teste edita arquivos de produção.

const { test, expect } = require('@playwright/test');

const BASE = process.env.MD2PDF_BASE || 'http://127.0.0.1:8099';

async function openApp(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    typeof Sanitize === 'object' && typeof window.DOMPurify === 'function');
  return errors;
}

test.describe('N11 — PDFGenerator.init() chamado pela produção (restaura pdfSettings)', () => {
  test.use({ serviceWorkers: 'block' });

  test('preferências de página salvas são restauradas ao recarregar e abrir o modal (diferencial)', async ({ page }) => {
    // Semeia pdfSettings ANTES do load (mesmo padrão do print-profile: o
    // estado persiste entre sessões via localStorage), com valores DISTINTOS
    // dos defaults de fábrica — só assim a restauração é observável. A
    // posição é 'top-right' de propósito: com settings vazio o <select> cai
    // na PRIMEIRA opção (default do browser), então 'top-left' não
    // diferenciaria o bug.
    await page.addInitScript(() => {
      localStorage.setItem('md2pdf_pdfSettings', JSON.stringify({
        pageSize: 'a5',
        orientation: 'landscape',
        marginTop: 12, marginBottom: 18, marginLeft: 35, marginRight: 8,
        watermark: '', watermarkOpacity: 0.2, watermarkSize: 60, watermarkRotation: -30,
        showPageNumbers: false,
        pageNumberPosition: 'top-right'
      }));
    });

    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() =>
      typeof PDFGenerator === 'object' && typeof App === 'object' && typeof I18n === 'object');

    // FASE 1 — DIFERENCIAL: o estado que a produção deixava até hoje —
    // App.init() sem PDFGenerator.init() ⇒ settings permanece {} — renderiza
    // inputs de margem vazios (o <input type="number"> recebe value="undefined"
    // e o browser zera; no export, parseInt('') || 20 devolve 20mm em vez das
    // margens salvas). A posição NÃO é diferenciador aqui: com settings vazio
    // o <select> cai na primeira opção (default do browser).
    const old = await page.evaluate(() => {
      const backup = PDFGenerator.settings;
      PDFGenerator.settings = {};
      PDFGenerator.showSettings();
      const q = s => document.querySelector(s);
      const out = {
        marginTop: q('#pdf-margin-top') ? q('#pdf-margin-top').value : null,
        marginLeft: q('#pdf-margin-left') ? q('#pdf-margin-left').value : null
      };
      if (document.querySelector('.modal-overlay')) {
        // remoção SÍNCRONA: ModalManager.close() tem fade de 200ms e a FASE 2
        // roda imediatamente — o modal velho ficaria no DOM e o querySelector
        // da FASE 2 pegaria os valores vazios dele.
        const m = document.querySelector('.modal-overlay');
        ModalManager.close(m);
        m.remove();
      }
      PDFGenerator.settings = backup;
      return out;
    });
    expect(old.marginTop, 'diferencial: settings {} ⇒ input de margem vazio').toBe('');
    expect(old.marginLeft, 'diferencial: settings {} ⇒ input de margem vazio').toBe('');

    // FASE 2 — caminho de produção: NENHUM PDFGenerator.init() manual —
    // quem restaura é o App.init() da página (após o fix N11).
    const r = await page.evaluate(() => {
      PDFGenerator.showSettings();
      const q = s => document.querySelector(s);
      const out = {
        settingsCarregados:
          PDFGenerator.settings.marginTop === 12 &&
          PDFGenerator.settings.marginLeft === 35 &&
          PDFGenerator.settings.pageSize === 'a5' &&
          PDFGenerator.settings.orientation === 'landscape' &&
          PDFGenerator.settings.showPageNumbers === false &&
          PDFGenerator.settings.pageNumberPosition === 'top-right',
        marginTop: q('#pdf-margin-top') ? q('#pdf-margin-top').value : null,
        marginLeft: q('#pdf-margin-left') ? q('#pdf-margin-left').value : null,
        marginBottom: q('#pdf-margin-bottom') ? q('#pdf-margin-bottom').value : null,
        marginRight: q('#pdf-margin-right') ? q('#pdf-margin-right').value : null,
        pageSize: q('#pdf-page-size') ? q('#pdf-page-size').value : null,
        orientation: q('#pdf-orientation') ? q('#pdf-orientation').value : null,
        showPageNumbers: q('#pdf-show-page-numbers') ? q('#pdf-show-page-numbers').checked : null,
        position: q('#pdf-page-number-position') ? q('#pdf-page-number-position').value : null,
        positionGroupHidden: q('#pdf-page-number-position-group')
          ? q('#pdf-page-number-position-group').hidden : null
      };
      if (document.querySelector('.modal-overlay')) {
        ModalManager.close(document.querySelector('.modal-overlay'));
      }
      return out;
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.settingsCarregados, 'N11: settings restaurados pelo init de produção').toBe(true);
    expect(r.marginTop, 'margem superior restaurada (12)').toBe('12');
    expect(r.marginLeft, 'margem esquerda restaurada (35)').toBe('35');
    expect(r.marginBottom, 'margem inferior restaurada (18)').toBe('18');
    expect(r.marginRight, 'margem direita restaurada (8)').toBe('8');
    expect(r.pageSize, 'tamanho de página restaurado (a5)').toBe('a5');
    expect(r.orientation, 'orientação restaurada (landscape)').toBe('landscape');
    expect(r.showPageNumbers, 'numeração restaurada (desligada)').toBe(false);
    expect(r.position, 'posição do número restaurada (top-right)').toBe('top-right');
    expect(r.positionGroupHidden, 'grupo de posição oculto quando numeração desligada').toBe(true);
  });
});

test.describe('P12 — chaves de protótipo rejeitadas na fronteira do storage', () => {
  test.use({ serviceWorkers: 'block' });

  test('__proto__/constructor/prototype não passam na validação nem poluem Object.prototype (diferencial)', async ({ page }) => {
    const errors = await openApp(page);

    // FASE 1 — DIFERENCIAL: a validação pré-P12 aceita '__proto__' e o
    // saveProject antigo POLUÍA Object.prototype (seta updated/current)
    // antes do TypeError em .versions abortar o import.
    const old = await page.evaluate(() => {
      delete Object.prototype.updated;
      delete Object.prototype.current;
      // validação pré-P12 (sem rejeição de chaves de protótipo)
      const oldIsValid = (name) => {
        if (typeof name !== 'string') return false;
        const trimmed = name.trim();
        if (!trimmed || trimmed.length > 100) return false;
        return !/[<>"'&]/.test(trimmed);
      };
      // saveProject pré-P12 sobre um objeto plano: projects['__proto__']
      // resolve para Object.prototype (truthy) → pula a criação → seta
      // updated/current no protótipo global.
      const projects = {};
      const name = '__proto__';
      const data = { markdown: '# x', themeId: 0 };
      const now = new Date().toISOString();
      const aceita = oldIsValid(name);
      let poluiu = false;
      if (aceita && data && typeof data === 'object' && typeof data.markdown === 'string') {
        if (!projects[name]) projects[name] = { created: now, versions: [] };
        projects[name].updated = now;
        projects[name].current = data;
        poluiu = Object.prototype.hasOwnProperty('updated') || Object.prototype.hasOwnProperty('current');
      }
      // limpeza: a FASE 2 roda na MESMA página
      delete Object.prototype.updated;
      delete Object.prototype.current;
      return { aceita, poluiu };
    });
    expect(old.aceita, 'diferencial: a validação antiga aceitava __proto__').toBe(true);
    expect(old.poluiu, 'diferencial: o saveProject antigo POLUÍA Object.prototype').toBe(true);

    // FASE 2 — caminho corrigido.
    const r = await page.evaluate(() => {
      const out = {};
      delete Object.prototype.updated;
      delete Object.prototype.current;
      out.semPoluicaoInicial =
        !Object.prototype.hasOwnProperty('updated') && !Object.prototype.hasOwnProperty('current');

      out.valida = {
        proto: ProjectManager.isValidProjectName('__proto__'),
        constructor: ProjectManager.isValidProjectName('constructor'),
        prototype: ProjectManager.isValidProjectName('prototype')
      };

      const saveRet = ProjectManager.saveProject('__proto__', { markdown: '# x', themeId: 0 });
      out.save = {
        retornou: saveRet,
        poluiu: Object.prototype.hasOwnProperty('updated') || Object.prototype.hasOwnProperty('current')
      };
      delete Object.prototype.updated;
      delete Object.prototype.current;

      const importRet = ProjectManager.importProject(JSON.stringify({
        name: '__proto__', current: { markdown: '# x', themeId: 0 }
      }));
      out.import = {
        retornou: importRet,
        poluiu: Object.prototype.hasOwnProperty('updated') || Object.prototype.hasOwnProperty('current')
      };
      delete Object.prototype.updated;
      delete Object.prototype.current;

      // chaves legítimas continuam funcionando (round-trip save/list/get)
      const ok = ProjectManager.saveProject('Projeto P12', { markdown: '# T', themeId: 0 });
      const lido = ProjectManager.get('Projeto P12');
      out.legitimo = ok && ProjectManager.listNames().includes('Projeto P12') &&
        !!lido && lido.current.markdown === '# T';
      ProjectManager.deleteProject('Projeto P12');

      return out;
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.semPoluicaoInicial, 'página começa sem poluição (limpeza da FASE 1)').toBe(true);
    expect(r.valida.proto, 'P12: __proto__ rejeitado').toBe(false);
    expect(r.valida.constructor, 'P12: constructor rejeitado').toBe(false);
    expect(r.valida.prototype, 'P12: prototype rejeitado').toBe(false);
    expect(r.save.retornou, 'saveProject(__proto__) falha limpo').toBe(false);
    expect(r.save.poluiu, 'saveProject(__proto__) NÃO polui').toBe(false);
    expect(r.import.retornou, 'importProject(__proto__) falha limpo').toBe(false);
    expect(r.import.poluiu, 'importProject(__proto__) NÃO polui').toBe(false);
    expect(r.legitimo, 'nomes legítimos continuam funcionando').toBe(true);
  });
});

test.describe('N13 — theme.color passa por Sanitize.color nos setters CSSOM do preview', () => {
  test.use({ serviceWorkers: 'block' });

  test('buildThemeCSS aplica cor sanitizada nos elementos de preview do editor de tema (diferencial)', async ({ page }) => {
    const errors = await openApp(page);

    // FASE 1 — DIFERENCIAL: o setter antigo recebia theme.color cru. Nome de
    // cor fora da allowlist ('red') era aplicado; entrada hostil era
    // descartada pelo CSSOM (style.color vira ''). Nenhum dos dois é o
    // comportamento do Sanitize.color (#333 para ambos).
    const old = await page.evaluate(() => {
      const a = document.createElement('div');
      const b = document.createElement('div');
      a.style.color = 'red';
      b.style.color = 'red; } body { color: blue }';
      return { nomeAplicado: a.style.color, hostilDescartado: b.style.color };
    });
    expect(old.nomeAplicado, 'diferencial: setter antigo aplicaria o nome de cor cru').toBe('red');
    expect(old.hostilDescartado, 'diferencial: setter antigo descartaria o valor hostil (vazio)').toBe('');

    // FASE 2 — caminho corrigido: os 3 setters passam por Sanitize.color.
    const r = await page.evaluate(() => {
      const el = (id, tag) => {
        const e = document.createElement(tag || 'div');
        e.id = id;
        document.body.appendChild(e);
        return e;
      };
      const heading = el('theme-preview-heading', 'h3');
      const block = el('theme-preview-blockquote', 'blockquote');
      const code = el('theme-preview-code', 'code');
      el('theme-preview-current');

      const base = {
        name: 'N13', group: 'Meus Temas',
        fonts: { head: "'Inter', sans-serif", body: "'Inter', sans-serif" },
        css: ''
      };
      // cor hostil (breakout de CSS) e nome de cor fora da allowlist
      ThemeManager.buildThemeCSS({ ...base, id: 99902, color: 'red; } body { color: blue }' });
      const out = {
        heading: heading.style.color,
        blockquote: block.style.borderLeftColor,
        code: code.style.color
      };
      // regressão: cor hex legítima do produto continua aplicada
      heading.style.color = '';
      block.style.borderLeftColor = '';
      code.style.color = '';
      ThemeManager.buildThemeCSS({ ...base, id: 99903, color: '#2d5a27' });
      out.hex = {
        heading: heading.style.color,
        blockquote: block.style.borderLeftColor,
        code: code.style.color
      };
      ['theme-preview-heading', 'theme-preview-blockquote', 'theme-preview-code', 'theme-preview-current']
        .forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
      return out;
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    // Sanitize.color('red; } body...') → '#333' → rgb(51,51,51) no CSSOM
    expect(r.heading, 'heading com cor hostil cai no neutro #333').toBe('rgb(51, 51, 51)');
    expect(r.blockquote, 'blockquote com cor hostil cai no neutro #333').toBe('rgb(51, 51, 51)');
    expect(r.code, 'code com cor hostil cai no neutro #333').toBe('rgb(51, 51, 51)');
    // '#2d5a27' preservado → rgb(45, 90, 39)
    expect(r.hex.heading, 'cor hex legítima preservada no heading').toBe('rgb(45, 90, 39)');
    expect(r.hex.blockquote, 'cor hex legítima preservada no blockquote').toBe('rgb(45, 90, 39)');
    expect(r.hex.code, 'cor hex legítima preservada no code').toBe('rgb(45, 90, 39)');
  });
});