// Fecho da CLASSE de sinks "interpolar dado não-constante em innerHTML"
// (rodada 3 — SECURITY-REVIEW P10/P11 + inventário S1–S8):
//
//   S1  ModalManager.create (title/content/buttons)  → app.js
//   S2  nome de projeto no modal (editor.js)         → P10
//   S3  importProject sem validação (storage.js)      → P10
//   S4  value="${settings.watermark}" (pdf-generator) → latente (init zera)
//   S5  theme.color/theme.name na lista de temas      → themes.js renderList
//   S6  fullCSS em <style> vivo (fonts = lista fixa)  → preview.js dead sink
//   S7  stats.js (números + i18n)                     → verificado SEGURO
//   S8  \f fora da denylist da marca d'água           → P11
//
// Convenção de prova (mesma do build gate P7): cada teste tem uma FASE 1
// com o sink ANTIGO em memória (page.evaluate) que prova que o código
// pré-correção injetaria/executaria, e uma FASE 2 no caminho corrigido
// com os MESMOS payloads. Nenhum teste edita arquivos de produção.

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

// Mesma premissa dos describes A11–A15/QA-DIF: sem SW para o page.evaluate
// não depender de cache-first (o register() tem .catch(() => {}) — sem
// pageerror; o app funciona sem SW).
test.describe('P10/S3/S2 — nome de projeto importado e modal de projetos', () => {
  test.use({ serviceWorkers: 'block' });

  test('importProject rejeita JSON hostil e o modal renderiza o nome como texto (diferencial)', async ({ page }) => {
    const errors = await openApp(page);
    const HOSTIL = JSON.stringify({
      name: '<img src=x onerror="window.__oldP10=1">.png',
      current: { markdown: '# x', themeId: 0 }
    });

    // FASE 1 — DIFERENCIAL: o import antigo aceitava qualquer data.name e o
    // modal interpolava ${name} em innerHTML (3 pontos: data-project,
    // .project-name, data-name). O payload EXECUTA no Chromium.
    const old = await page.evaluate((json) => {
      window.__oldP10 = 0;
      // import antigo (sem validação)
      const oldImport = (s) => { const d = JSON.parse(s); return !!(d.name && d.current); };
      // render antigo (interpolação)
      const c = document.createElement('div');
      c.innerHTML = `<li class="project-item" data-project="${'<img src=x onerror="window.__oldP10=1">.png'}">` +
        `<div class="project-name">${'<img src=x onerror="window.__oldP10=1">.png'}</div></li>`;
      return {
        importAceitava: oldImport(json),
        imgs: c.querySelectorAll('img').length,
        onerr: c.querySelectorAll('[onerror]').length
      };
    }, HOSTIL);
    await page.waitForTimeout(200);
    const oldExecutou = await page.evaluate(() => window.__oldP10);
    expect(old.importAceitava, 'diferencial: o import antigo aceitava o payload').toBe(true);
    expect(old.imgs, 'diferencial: o render antigo criaria <img>').toBeGreaterThanOrEqual(1);
    expect(old.onerr).toBeGreaterThanOrEqual(1);
    expect(oldExecutou, 'diferencial: o render antigo EXECUTARIA o onerror').toBe(1);

    // FASE 2 — caminho corrigido.
    const r = await page.evaluate((json) => {
      window.__p10 = 0;
      const res = {};
      // S3: JSON hostil é REJEITADO (nome com < > " ' & e/ou estrutura inválida)
      res.hostilRejeitado = !ProjectManager.importProject(json);
      res.currentNaoObjeto = !ProjectManager.importProject(
        JSON.stringify({ name: 'ok', current: 'não-objeto' }));
      res.markdownNaoString = !ProjectManager.importProject(
        JSON.stringify({ name: 'ok', current: { markdown: 42 } }));
      res.themeIdNaoNumero = !ProjectManager.importProject(
        JSON.stringify({ name: 'ok', current: { markdown: '# x', themeId: '0' } }));
      res.saveHostilRejeitado = !ProjectManager.saveProject('<b>', { markdown: 'x' });

      // Import legítimo continua funcionando (round-trip do export).
      res.importOk = ProjectManager.importProject(
        JSON.stringify({ name: 'Projeto A', current: { markdown: '# T', themeId: 0 } }));

      // S2: render via DOM — nome vira textContent/dataset, nunca HTML.
      // Inclui um nome legado hostil pré-validado no localStorage (dados
      // antigos têm de renderizar como texto também) — MESCLADO com o que
      // já existe, para não apagar o 'Projeto A' importado acima.
      const projects = JSON.parse(localStorage.getItem('md2pdf_projects') || '{}');
      projects['<img src=x onerror="window.__p10=2">.png'] = { updated: new Date().toISOString(), versions: [] };
      localStorage.setItem('md2pdf_projects', JSON.stringify(projects));

      Editor.showProjectManager();
      const list = document.querySelector('#pm-list');
      const items = [...list.querySelectorAll('.project-item')];
      const itemA = items.find(i => i.dataset.project === 'Projeto A');
      const itemHostil = items.find(i => i.dataset.project === '<img src=x onerror="window.__p10=2">.png');
      const nameA = itemA ? itemA.querySelector('.project-name').textContent : null;
      const loadA = itemA ? itemA.querySelector('.pm-load') : null;
      const nameHostil = itemHostil ? itemHostil.querySelector('.project-name').textContent : null;
      res.render = {
        achouProjetoA: !!itemA,
        nomeLiteralA: nameA,
        dataNameBotao: loadA ? loadA.dataset.name : null,
        nomeLegadoHostilLiteral: nameHostil,
        imgsNaLista: list.querySelectorAll('img').length,
        onerrNaLista: list.querySelectorAll('[onerror]').length,
        executou: window.__p10
      };
      ModalManager.close(document.querySelector('.modal-overlay'));
      return res;
    }, HOSTIL);

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.hostilRejeitado, 'S3: import de JSON com nome hostil é rejeitado').toBe(true);
    expect(r.currentNaoObjeto, 'S3: data.current não-objeto é rejeitado').toBe(true);
    expect(r.markdownNaoString, 'S3: current.markdown não-string é rejeitado').toBe(true);
    expect(r.themeIdNaoNumero, 'S3: themeId não-número é rejeitado').toBe(true);
    expect(r.saveHostilRejeitado, 'S3: saveProject com nome hostil é rejeitado').toBe(true);
    expect(r.importOk, 'import legítimo continua funcionando').toBe(true);
    expect(r.render.achouProjetoA).toBe(true);
    expect(r.render.nomeLiteralA, 'nome renderizado como texto').toBe('Projeto A');
    expect(r.render.dataNameBotao, 'data-name via dataset').toBe('Projeto A');
    expect(r.render.nomeLegadoHostilLiteral, 'nome legado hostil aparece literal').toBe('<img src=x onerror="window.__p10=2">.png');
    expect(r.render.imgsNaLista, 'nenhum elemento injetado na lista').toBe(0);
    expect(r.render.onerrNaLista).toBe(0);
    expect(r.render.executou, 'nenhum handler disparou').toBe(0);
  });
});

test.describe('S1 — ModalManager.create: título/botões como texto, content HTML por contrato', () => {
  test.use({ serviceWorkers: 'block' });

  test('title e buttons[].text não interpolam; class/action validados; content preserva formulário (diferencial)', async ({ page }) => {
    const errors = await openApp(page);

    // FASE 1 — DIFERENCIAL: o create antigo interpolava title e buttons[].text
    // em innerHTML — o payload EXECUTA no Chromium.
    const old = await page.evaluate(() => {
      window.__oldM = 0;
      const title = '<img src=x onerror="window.__oldM=1">';
      const text = '<img src=x onerror="window.__oldM=2">';
      const c = document.createElement('div');
      c.innerHTML = `<div class="modal"><h3>${title}</h3>` +
        `<button class="btn btn-secondary" data-action="close">${text}</button></div>`;
      return { imgs: c.querySelectorAll('img').length, onerr: c.querySelectorAll('[onerror]').length };
    });
    await page.waitForTimeout(200);
    const oldExecutou = await page.evaluate(() => window.__oldM);
    expect(old.imgs, 'diferencial: o create antigo criaria <img> no título e no botão').toBeGreaterThanOrEqual(2);
    expect(old.onerr).toBeGreaterThanOrEqual(2);
    expect(oldExecutou, 'diferencial: o create antigo EXECUTARIA os handlers').toBeGreaterThanOrEqual(1);

    // FASE 2 — caminho corrigido.
    const r = await page.evaluate(() => {
      window.__m = 0;
      const m = ModalManager.create({
        title: '<img src=x onerror="window.__m=1">',
        size: 'md',
        // content é HTML por contrato — formulário com atributos preservado
        // (Sanitize.html() quebraria value=/checked=/selected).
        content: '<div class="form-group">' +
          '<input id="f1" value="x" checked>' +
          '<select id="f2"><option selected>A</option></select>' +
          '</div>',
        buttons: [
          { text: '<img src=x onerror="window.__m=2">', class: 'x" onmouseover="alert(1)', action: 'close' },
          { text: 'Exportar', class: 'btn-primary', action: 'export' },
          { text: 'Invalida', class: 'btn-primary', action: 'bad" onmouseover="alert(1)' }
        ]
      });
      const h3 = m.querySelector('.modal-header h3');
      const body = m.querySelector('.modal-body');
      const footer = m.querySelector('.modal-footer');
      const btns = [...footer.querySelectorAll('button')];
      const out = {
        tituloLiteral: h3.textContent,
        tituloSemImg: h3.querySelectorAll('img').length,
        inputPreservado: body.querySelector('#f1') ? body.querySelector('#f1').value : null,
        checkedPreservado: body.querySelector('#f1') ? body.querySelector('#f1').checked : null,
        selectedPreservado: body.querySelector('#f2') ? body.querySelector('#f2').options[0].selected : null,
        qtdBotoes: btns.length,
        btn0Class: btns[0] ? btns[0].className : null,
        btn0Text: btns[0] ? btns[0].textContent : null,
        btn0Action: btns[0] ? btns[0].dataset.action : null,
        btn0SemImg: btns[0] ? btns[0].querySelectorAll('img').length : -1,
        btn1Class: btns[1] ? btns[1].className : null,
        btn1Action: btns[1] ? btns[1].dataset.action : null,
        btn1Text: btns[1] ? btns[1].textContent : null,
        temExport: !!m.querySelector('[data-action="export"]'),
        onerrTotal: m.querySelectorAll('[onerror],[onmouseover]').length,
        executou: window.__m
      };
      ModalManager.close(m);
      return out;
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.tituloLiteral, 'título hostil vira texto literal').toBe('<img src=x onerror="window.__m=1">');
    expect(r.tituloSemImg, 'nenhum <img> no título').toBe(0);
    expect(r.inputPreservado, 'content HTML: value preservado').toBe('x');
    expect(r.checkedPreservado, 'content HTML: checked preservado').toBe(true);
    expect(r.selectedPreservado, 'content HTML: selected preservado').toBe(true);
    expect(r.qtdBotoes, 'botão com action inválida é descartado; 2 válidos').toBe(2);
    expect(r.btn0Class, 'class inválida cai no default btn-secondary').toBe('btn btn-secondary');
    expect(r.btn0Text, 'texto do botão vira texto literal').toBe('<img src=x onerror="window.__m=2">');
    expect(r.btn0Action).toBe('close');
    expect(r.btn0SemImg, 'nenhum <img> no botão').toBe(0);
    expect(r.btn1Class).toBe('btn btn-primary');
    expect(r.btn1Action).toBe('export');
    expect(r.btn1Text).toBe('Exportar');
    expect(r.temExport, 'seletor de clique [data-action="export"] continua funcionando').toBe(true);
    expect(r.onerrTotal, 'nenhum atributo on*=').toBe(0);
    expect(r.executou, 'nenhum handler disparou').toBe(0);
  });
});

test.describe('S5/S6 — cor e nome de tema (lista de temas + CSS vivo)', () => {
  test.use({ serviceWorkers: 'block' });

  test('Sanitize.color valida; renderList via DOM; buildThemeCSS sem injeção (diferencial)', async ({ page }) => {
    const errors = await openApp(page);

    // FASE 1 — DIFERENCIAL: o item antigo interpolava ${theme.color} em
    // style="..." (breakout de CSS) e ${theme.name} em HTML.
    const old = await page.evaluate(() => {
      window.__oldT = 0;
      const color = 'red; } body { background: url(x) }';
      const name = '<img src=x onerror="window.__oldT=1">';
      const c = document.createElement('div');
      c.innerHTML = `<div class="theme-item-color" style="background: ${color}"></div>` +
        `<span class="theme-item-name">${name}</span>`;
      return { imgs: c.querySelectorAll('img').length, onerr: c.querySelectorAll('[onerror]').length };
    });
    await page.waitForTimeout(200);
    const oldExecutou = await page.evaluate(() => window.__oldT);
    expect(old.imgs, 'diferencial: o item antigo criaria <img> no nome').toBeGreaterThanOrEqual(1);
    expect(old.onerr).toBeGreaterThanOrEqual(1);
    expect(oldExecutou, 'diferencial: o item antigo EXECUTARIA o onerror').toBe(1);

    // FASE 2 — caminho corrigido.
    const r = await page.evaluate(() => {
      window.__t = 0;
      const out = {};
      // Validador de cor: formas do produto aceitas; resto cai no neutro.
      out.aceita = {
        hex3: Sanitize.color('#abc'),
        hex6: Sanitize.color('#2d5a27'),
        rgb: Sanitize.color('rgb(10,20,30)'),
        rgba: Sanitize.color('rgba(10,20,30,0.5)'),
        hsl: Sanitize.color('hsl(120,50%,50%)')
      };
      out.rejeita = {
        cssBreakout: Sanitize.color('red; } body { color: red'),
        tag: Sanitize.color('<script>'),
        attr: Sanitize.color('x" onmouseover="alert(1)'),
        naoString: Sanitize.color(null),
        vazio: Sanitize.color('')
      };
      const HOSTIL = {
        id: 99901,
        name: '<img src=x onerror="window.__t=1">',
        group: 'Meus Temas',
        color: 'red; } body { background: url(https://evil) }',
        fonts: { head: "'Inter', sans-serif", body: "'Inter', sans-serif" },
        css: ''
      };
      ThemeManager.saveUserTheme(HOSTIL);

      // renderList: monta o container real (a UI atual não tem #theme-list —
      // a função é chamada por ThemeManager.init/selectTheme).
      const container = document.createElement('div');
      container.id = 'theme-list';
      document.body.appendChild(container);
      ThemeManager.renderList();
      const item = container.querySelector('[data-theme-id="99901"]');
      const nameSpan = item ? item.querySelector('.theme-item-name') : null;
      const colorBox = item ? item.querySelector('.theme-item-color') : null;
      out.renderList = {
        achou: !!item,
        nomeLiteral: nameSpan ? nameSpan.textContent : null,
        imgs: container.querySelectorAll('img').length,
        onerr: container.querySelectorAll('[onerror]').length,
        backgroundNaoVazia: colorBox ? colorBox.style.background !== '' : false,
        backgroundSemInjecao: colorBox ? !/red;|url\(x\)|}/.test(colorBox.style.background) : false
      };

      // buildThemeCSS (side-effect: cria #theme-style com textContent) e
      // getPrintCSS: o CSS gerado não pode conter a declaração hostil.
      ThemeManager.buildThemeCSS(HOSTIL);
      const live = document.getElementById('theme-style');
      const liveCSS = live ? live.textContent : '';
      const printCSS = ThemeManager.getPrintCSS(HOSTIL);
      out.css = {
        liveSemColorRed: !liveCSS.includes('color: red'),
        liveSemUrl: !liveCSS.includes('url(https://evil)'),
        liveTemFallback: liveCSS.includes('#333'),
        printSemColorRed: !printCSS.includes('color: red'),
        printSemUrl: !printCSS.includes('url(https://evil)')
      };
      out.executou = window.__t;
      return out;
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.aceita).toEqual({ hex3: '#abc', hex6: '#2d5a27', rgb: 'rgb(10,20,30)', rgba: 'rgba(10,20,30,0.5)', hsl: 'hsl(120,50%,50%)' });
    expect(r.rejeita.cssBreakout, 'cor hostil cai no neutro').toBe('#333');
    expect(r.rejeita.tag).toBe('#333');
    expect(r.rejeita.attr).toBe('#333');
    expect(r.rejeita.naoString).toBe('#333');
    expect(r.rejeita.vazio).toBe('#333');
    expect(r.renderList.achou).toBe(true);
    expect(r.renderList.nomeLiteral, 'nome do tema via textContent').toBe('<img src=x onerror="window.__t=1">');
    expect(r.renderList.imgs, 'nenhum <img> na lista').toBe(0);
    expect(r.renderList.onerr).toBe(0);
    expect(r.renderList.backgroundNaoVazia, 'cor válida aplicada na propriedade style').toBe(true);
    expect(r.renderList.backgroundSemInjecao, 'style.background sem breakout').toBe(true);
    expect(r.css.liveSemColorRed, 'CSS do preview sem a declaração hostil').toBe(true);
    expect(r.css.liveSemUrl).toBe(true);
    expect(r.css.liveTemFallback, 'cor inválida cai no fallback #333').toBe(true);
    expect(r.css.printSemColorRed, 'CSS de impressão sem a declaração hostil').toBe(true);
    expect(r.css.printSemUrl).toBe(true);
    expect(r.executou, 'nenhum handler disparou').toBe(0);
  });
});

test.describe('S4/N7 — buildPrintDocument valida settings e título (fronteira L3)', () => {
  test.use({ serviceWorkers: 'block' });

  test('settings numéricos coagidos e título escapado no documento de impressão (diferencial)', async ({ page }) => {
    const errors = await openApp(page);

    // FASE 1 — DIFERENCIAL: o documento antigo interpolava settings crus e
    // title cru — breakout de CSS, de atributo e de elemento.
    const old = await page.evaluate(() => {
      const s = {
        marginTop: '25; } body { color: red',
        watermark: '</style><script>window.__oldW=1</script>',
        watermarkRotation: '0; } body { color: red'
      };
      const title = 'T"><meta x="';
      const doc = `<style>@page { margin: ${s.marginTop}mm; } body::before { content: "${s.watermark}"; rotate(${s.watermarkRotation}deg); }</style><title>${title}</title>`;
      return {
        marginInjeta: doc.includes('color: red'),
        watermarkInjeta: doc.includes('</style><script>'),
        tituloBreakout: doc.includes('"><meta')
      };
    });
    expect(old.marginInjeta, 'diferencial: margem hostil sairia do valor CSS').toBe(true);
    expect(old.watermarkInjeta, 'diferencial: watermark hostil fecharia o <style>').toBe(true);
    expect(old.tituloBreakout, 'diferencial: título hostil quebraria o atributo meta').toBe(true);

    // FASE 2 — caminho corrigido (buildPrintDocument de produção).
    const r = await page.evaluate(() => {
      const doc = PDFGenerator.buildPrintDocument({
        html: '<p>corpo</p>',
        theme: ThemeManager.get(App.currentIndex),
        settings: {
          ...PDFGenerator.defaultSettings,
          marginTop: '25; } body { color: red',
          marginLeft: '30" onmouseover="alert(1)',
          watermark: '</style><script>window.__wm=1</script>',
          watermarkSize: '48; } body { display:none',
          watermarkRotation: '0; } body { color: red'
        },
        title: 'Título</title><script>window.__t=1</script><meta x="'
      });
      const parsed = new DOMParser().parseFromString(doc, 'text/html');
      return {
        styleFechamentos: (doc.match(/<\/style>/g) || []).length,
        temScriptTag: doc.indexOf('<script') !== -1,
        temOnMouseOver: doc.indexOf('onmouseover') !== -1,
        temColorRed: doc.indexOf('color: red') !== -1,
        margemNumerica: doc.indexOf('margin: 25mm 25mm 25mm 30mm;') !== -1,
        tituloEscapado: doc.indexOf('<title>Título&lt;/title&gt;') !== -1,
        metaEscapado: !doc.includes('content="Título</title>'),
        watermarkVazio: !doc.includes('content: "</style>'),
        scriptsParse: parsed.querySelectorAll('script').length
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.styleFechamentos, 'exatamente um </style> (o legítimo)').toBe(1);
    expect(r.temScriptTag, 'nenhum <script> no documento').toBe(false);
    expect(r.temOnMouseOver, 'nenhum atributo injetado').toBe(false);
    expect(r.temColorRed, 'nenhuma declaração CSS injetada').toBe(false);
    expect(r.margemNumerica, 'margem hostil vira o default numérico').toBe(true);
    expect(r.tituloEscapado, 'título escapado no <title>').toBe(true);
    expect(r.metaEscapado, 'sem breakout do meta content').toBe(true);
    expect(r.watermarkVazio, 'watermark hostil sanitizado (vazio)').toBe(true);
    expect(r.scriptsParse, 'parse real: 0 <script>').toBe(0);
  });
});

test.describe('S8/P11 — form feed fora da denylist da marca d\'água', () => {
  test.use({ serviceWorkers: 'block' });

  test('\\f (U+000C) é removido e o CSS continua íntegro (diferencial)', async ({ page }) => {
    const errors = await openApp(page);

    // FASE 1 — DIFERENCIAL: a denylist antiga (sem \f) deixava o FF passar.
    const old = await page.evaluate(() => {
      const OLD_DENYLIST = /[<>"\\&{}\r\n]/g;
      return { ffSobrevive: 'abc\u000Cdef'.replace(OLD_DENYLIST, '').includes('\u000C') };
    });
    expect(old.ffSobrevive, 'diferencial: a denylist antiga preservava o form feed').toBe(true);

    const r = await page.evaluate(() => {
      const wm = Sanitize.watermark('abc\u000Cdef');
      const hostil = Sanitize.watermark('abc\u000Cb</style><script>window.__ff=1</script>');
      const doc = PDFGenerator.buildPrintDocument({
        html: '<p>corpo</p>',
        theme: ThemeManager.get(App.currentIndex),
        settings: { ...PDFGenerator.defaultSettings, watermark: 'abc\u000Cb</style><script>window.__ff=1</script>' },
        title: 'T'
      });
      const parsed = new DOMParser().parseFromString(doc, 'text/html');
      const styleEl = parsed.querySelector('style');
      const probe = document.createElement('style');
      probe.textContent = styleEl.textContent;
      document.head.appendChild(probe);
      const regras = probe.sheet ? probe.sheet.cssRules.length : -1;
      probe.remove();
      return {
        wm,
        semVetor: !/[<>"\\&{}\r\n\f]/.test(hostil),
        semFechamento: !hostil.includes('</style') && !/<script/i.test(hostil),
        styles: parsed.querySelectorAll('style').length,
        scripts: parsed.querySelectorAll('script').length,
        regras,
        docSemFF: !doc.includes('\u000C')
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.wm, '\\f removido da marca d\'água').toBe('abcdef');
    expect(r.semVetor, 'nenhum caractere do vetor (incluindo FF) sobrevive').toBe(true);
    expect(r.semFechamento).toBe(true);
    expect(r.styles, 'documento com exatamente 1 <style>').toBe(1);
    expect(r.scripts, '0 <script>').toBe(0);
    expect(r.regras, 'CSS parseia normalmente').toBeGreaterThanOrEqual(1);
    expect(r.docSemFF, 'nenhum FF no documento gerado').toBe(true);
  });
});

test.describe('Regressão — os 9 modais do ModalManager continuam abrindo', () => {
  test.use({ serviceWorkers: 'block' });

  test('todos os chamadores abrem com o conteúdo esperado', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(() => {
      const results = [];
      const check = (name, modal, probe) => {
        const ok = !!modal && !!modal.querySelector(probe);
        if (modal) { ModalManager.close(modal); modal.remove(); }
        results.push({ name, ok });
      };

      Editor.showProjectManager();
      check('projetos', document.querySelector('.modal-overlay'), '#pm-list');

      Editor.showVersionHistory('projeto-inexistente');
      check('versoes', document.querySelector('.modal-overlay'), '.version-list');

      Editor.showShortcutsModal();
      check('atalhos', document.querySelector('.modal-overlay'), '.shortcuts-grid');

      ImageManager.showInsertModal();
      check('imagem', document.querySelector('.modal-overlay'), '#img-url-input');

      PDFGenerator.showSettings();
      check('pdf', document.querySelector('.modal-overlay'), '#pdf-watermark');

      Stats.showStatsModal();
      check('stats', document.querySelector('.modal-overlay'), '.stats-grid');

      Templates.showSelector();
      const sel = document.querySelector('.modal-overlay');
      const cards = sel ? sel.querySelectorAll('.template-card').length : 0;
      if (sel) { ModalManager.close(sel); sel.remove(); }
      results.push({ name: 'template', ok: cards > 0 });

      Templates.showCoverEditor();
      check('capa', document.querySelector('.modal-overlay'), '#cover-title');

      ThemeEditor.showEditor();
      const te = document.querySelector('.modal-overlay');
      results.push({
        name: 'theme-editor',
        ok: !!te && !!te.querySelector('#te-name') && !!te.querySelector('#te-css')
          && !!te.querySelector('[data-action="save"]')
      });
      if (te) { ModalManager.close(te); te.remove(); }

      return results;
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    for (const row of r) {
      expect(row.ok, `modal "${row.name}" deve abrir com o conteúdo esperado`).toBe(true);
    }
  });
});