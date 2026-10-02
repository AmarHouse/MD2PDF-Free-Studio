// Gate de segurança da mudança R3 "sanitização P1/P2" — plano
// .factory/plans/md2pdf-sanitize-p1.md, critérios A1–A10.
//
// As duas direções são provadas em browser real (Playwright):
//  - payloads XSS morrem: A2/A3/A4 (preview), A8 (marca d'água/P2),
//    A9 (EPUB3) — e nenhum handler dispara (execução, não só string);
//  - features legítimas sobrevivem: A5 (page-break + classes do produto),
//    A6 (imagens data:), A7 (tabelas/código/listas/50 temas);
//  - A1 (sanitização em todos os 3 sinks, por grep do fonte + comportamento)
//    e A10 (fail-closed e contrato defensivo).
// A regra de ouro (preview e PDF concordam) é verificada em A8.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.MD2PDF_BASE || 'http://127.0.0.1:8099';
const { runtimeRoot } = require('./runtime-root');
const ROOT = runtimeRoot(__dirname);

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function openApp(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    typeof Sanitize === 'object' && typeof window.DOMPurify === 'function');
  return errors;
}

test.describe('P1/P2 — sanitização do pipeline de HTML', () => {
  test('A1: Sanitize.html aplicado nos 3 sinks e wiring correto (grep do fonte)', () => {
    const preview = fs.readFileSync(path.join(ROOT, 'js', 'preview.js'), 'utf8');
    const pdf = fs.readFileSync(path.join(ROOT, 'js', 'pdf-generator.js'), 'utf8');
    const epub = fs.readFileSync(path.join(ROOT, 'js', 'epub-generator.js'), 'utf8');
    const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

    // preview.js: render() e renderSync() são dois sinks
    expect(preview.match(/Sanitize\.html\(/g) || []).toHaveLength(2);
    // pdf-generator.js: a sanitização do body e da marca d'água vive na
    // função pura buildPrintDocument, usada tanto pelo generate() quanto
    // pelo gate de impressão (M1/M2) — o sink testado é o de produção
    expect(pdf).toContain('Sanitize.html(html)');
    expect(pdf.match(/Sanitize\.watermark\(/g) || []).toHaveLength(2);
    // epub-generator.js: XHTML do corpo + título
    expect(epub).toContain('contentHTML = Sanitize.html(contentHTML)');
    expect(epub).toContain('Sanitize.html(titleMatch[1])');

    // wiring: vendor antes do módulo, e ambos antes do preview
    const vendorIdx = index.indexOf('js/vendor/dompurify.min.js');
    const sanitizeIdx = index.indexOf('js/sanitize.js');
    const previewIdx = index.indexOf('js/preview.js');
    expect(vendorIdx).toBeGreaterThan(-1);
    expect(sanitizeIdx).toBeGreaterThan(vendorIdx);
    expect(previewIdx).toBeGreaterThan(sanitizeIdx);

    // sw.js: vendor no pre-cache e CACHE_VERSION bumpado (v3 → v4)
    expect(sw).toContain("'./js/vendor/dompurify.min.js'");
    expect(sw).toContain("'./js/sanitize.js'");
    expect(sw.match(/CACHE_VERSION = 'v\d+'/)[0]).toBe("CACHE_VERSION = 'v4'");
  });

  test('A10: Sanitize.html é fail-closed e o contrato é defensivo', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(() => {
      const dp = window.DOMPurify;
      delete window.DOMPurify;
      let semDp;
      try {
        semDp = Sanitize.html('<img src=x onerror="window.__x=1">');
      } catch (e) {
        semDp = 'LANÇOU: ' + e.message;
      }
      window.DOMPurify = dp;
      return {
        semDp,
        naoString: [null, undefined, 42, {}, [], true].map(v => Sanitize.html(v)),
        watermarkNaoString: [null, undefined, 42].map(v => Sanitize.watermark(v)),
        comDp: Sanitize.html('<b>ok</b>')
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.semDp, 'sem DOMPurify, nada de HTML não sanitizado passa').toBe('');
    expect(r.naoString.every(v => v === '')).toBe(true);
    expect(r.watermarkNaoString.every(v => v === '')).toBe(true);
    expect(r.comDp).toBe('<b>ok</b>');
  });

  test('A2/A3/A4: payloads XSS colados no Markdown não executam nem permanecem no preview', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(() => {
      window.__xss = 0;
      const ta = document.getElementById('markdown-input');
      ta.value = [
        '# Título', '',
        '<img src=x onerror="window.__xss=1">', '',
        '<script>window.__xss=2</script>', '',
        '<iframe src="https://evil.example" onload="window.__xss=3"></iframe>', '',
        '<a href="javascript:window.__xss=4">clique</a>', '',
        '<div onclick="window.__xss=5">clique div</div>'
      ].join('\n');
      Preview.renderSync();
      const c = document.getElementById('preview-content');
      return {
        xss: window.__xss,
        scripts: c.querySelectorAll('script').length,
        iframes: c.querySelectorAll('iframe').length,
        onAttr: c.querySelectorAll('[onerror],[onload],[onclick]').length,
        jsHref: [...c.querySelectorAll('a')]
          .filter(a => (a.getAttribute('href') || '').toLowerCase().indexOf('javascript:') === 0).length,
        imgs: [...c.querySelectorAll('img')].map(i => i.outerHTML)
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.xss, 'nenhum handler pode disparar').toBe(0);
    expect(r.scripts).toBe(0);
    expect(r.iframes).toBe(0);
    expect(r.onAttr).toBe(0);
    expect(r.jsHref).toBe(0);
  });

  test('A5: \\pagebreak e as classes do produto sobrevivem à sanitização', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(() => {
      const ta = document.getElementById('markdown-input');
      ta.value = [
        '# Capitulo 1', '',
        'Texto.', '',
        '\\pagebreak', '',
        '> Neste capítulo você vai aprender X', '',
        '> INSIGHT: dica', '',
        '> CUIDADO: erro comum', '',
        '> PRO TIP: atalho', '',
        '> FAÇA AGORA: exercício', '',
        '## Capítulo 2'
      ].join('\n');
      Preview.renderSync();
      const c = document.getElementById('preview-content');
      const direto = Sanitize.html(
        '<div class="page-break"></div><div class="cover-block"></div>' +
        '<div class="toc-block"></div><blockquote class="learning-block">a</blockquote>' +
        '<blockquote class="insight-block">b</blockquote><blockquote class="warning-block">c</blockquote>' +
        '<blockquote class="protip-block">d</blockquote><blockquote class="exercise-block">e</blockquote>' +
        '<h1 data-chapter="true">T</h1>'
      );
      return {
        pageBreaks: c.querySelectorAll('.page-break').length,
        learning: c.querySelectorAll('blockquote.learning-block').length,
        insight: c.querySelectorAll('blockquote.insight-block').length,
        warning: c.querySelectorAll('blockquote.warning-block').length,
        protip: c.querySelectorAll('blockquote.protip-block').length,
        exercise: c.querySelectorAll('blockquote.exercise-block').length,
        dataChapter: c.querySelectorAll('h1[data-chapter]').length,
        diretoOk: ['page-break', 'cover-block', 'toc-block', 'learning-block',
          'insight-block', 'warning-block', 'protip-block', 'exercise-block',
          'data-chapter="true"'].every(k => direto.includes(k))
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.pageBreaks, '\\pagebreak continua virando .page-break').toBe(1);
    expect(r.learning).toBe(1);
    expect(r.insight).toBe(1);
    expect(r.warning).toBe(1);
    expect(r.protip).toBe(1);
    expect(r.exercise).toBe(1);
    expect(r.dataChapter).toBeGreaterThanOrEqual(1);
    expect(r.diretoOk, 'allowlist preserva todas as classes do produto').toBe(true);
  });

  test('A6: imagens data:image/ (image-manager) sobrevivem em img[src]; data: em a[href] é removido (P8)', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate((png) => {
      const ta = document.getElementById('markdown-input');
      ta.value = `# T\n\n![logo](${png})`;
      Preview.renderSync();
      const c = document.getElementById('preview-content');
      const img = c.querySelector('img');
      const direto = Sanitize.html('<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><a href="data:text/plain,ola">x</a>');
      return {
        srcSobreviveu: !!img && img.getAttribute('src').indexOf('data:image/') === 0,
        imgDireto: direto.indexOf('<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">') === 0,
        // P8: data: em a[href] não tem requisito de produto — o default do
        // DOMPurify remove o href (a âncora com o texto sobrevive).
        aHrefDataRemovido: !direto.includes('data:text/plain'),
        aTextoPreservado: direto.includes('<a>x</a>')
      };
    }, PNG_1PX);

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.srcSobreviveu, 'img[src] data:image/ tem de sobreviver (readAsDataURL)').toBe(true);
    expect(r.imgDireto).toBe(true);
    expect(r.aHrefDataRemovido, 'sem requisito de produto: data: em a[href] sai (P8)').toBe(true);
    expect(r.aTextoPreservado).toBe(true);
  });

  test('A7: tabelas, blocos de código, listas e os 50 temas continuam renderizando', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(() => {
      const ta = document.getElementById('markdown-input');
      ta.value = [
        '# T', '',
        '| A | B |', '|---|---|', '| 1 | 2 |', '',
        '```js', 'const x = 1;', '```', '',
        '- item um', '- item dois', '',
        '1. um', '2. dois'
      ].join('\n');
      Preview.renderSync();
      const c = document.getElementById('preview-content');
      const estrutura = {
        tables: c.querySelectorAll('table').length,
        th: c.querySelectorAll('th').length,
        pre: c.querySelectorAll('pre').length,
        ul: c.querySelectorAll('ul').length,
        ol: c.querySelectorAll('ol').length
      };
      let total = 0, ok = 0, erro = null;
      const groups = ThemeManager.getGroups();
      for (const g of Object.keys(groups)) {
        for (const t of groups[g]) {
          total++;
          try {
            App.currentIndex = t.id;
            Preview.renderSync();
            // buildThemeCSS é side-effect (não retorna o CSS): o estilo
            // real fica no <style id="theme-style"> que ela cria.
            const style = document.getElementById('theme-style');
            if (style && style.textContent.length > 100 && c.children.length > 0) ok++;
          } catch (e) { erro = e.message; }
        }
      }
      return { estrutura, total, ok, erro };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.estrutura.tables).toBeGreaterThanOrEqual(1);
    expect(r.estrutura.th).toBeGreaterThanOrEqual(2);
    expect(r.estrutura.pre).toBeGreaterThanOrEqual(1);
    expect(r.estrutura.ul).toBeGreaterThanOrEqual(1);
    expect(r.estrutura.ol).toBeGreaterThanOrEqual(1);
    expect(r.total, 'o produto anuncia 50 temas').toBeGreaterThanOrEqual(50);
    expect(r.ok, `temas que renderizaram: ${r.erro || ''}`).toBe(r.total);
  });

  test('A8: marca d\'água com </style><script> não executa nem quebra o documento de impressão (P2)', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(() => {
      const ta = document.getElementById('markdown-input');
      ta.value = '# T\n\nCorpo de teste.\n\n\\pagebreak\n\nMais texto.';
      Preview.renderSync();
      const previewPageBreaks = document.getElementById('preview-content')
        .querySelectorAll('.page-break').length;

      const docs = [];
      const fakeWin = {
        document: {
          write(html) { docs.push(html); },
          close() {},
          title: ''
        },
        print() {},
        location: { href: 'about:blank' }
      };
      const origOpen = window.open;
      window.open = () => fakeWin;
      try {
        // Valor hostil direto em settings: o sink tem de neutralizar mesmo
        // se o estado vier de fora do modal (fronteira defensiva).
        PDFGenerator.settings = {
          ...PDFGenerator.defaultSettings,
          watermark: '</style><script>window.__wm=1</script>'
        };
        PDFGenerator.generate();
      } finally {
        window.open = origOpen;
      }
      const doc = docs[0] || '';
      return {
        previewPageBreaks,
        styleFechamentos: (doc.match(/<\/style>/g) || []).length,
        temScriptTag: doc.indexOf('<script') !== -1,
        temHandler: /\son\w+\s*=/.test(doc),
        breakout: doc.indexOf('</style><script') !== -1,
        corpo: doc.indexOf('Corpo de teste') !== -1,
        pageBreakNoPdf: doc.indexOf('class="page-break"') !== -1,
        watermarkUnit: Sanitize.watermark('</style><script>alert(1)</script>')
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.previewPageBreaks, 'preview preserva o pagebreak').toBe(1);
    expect(r.styleFechamentos, 'exatamente um </style> (o legítimo do template)').toBe(1);
    expect(r.temScriptTag).toBe(false);
    expect(r.temHandler).toBe(false);
    expect(r.breakout).toBe(false);
    expect(r.corpo, 'o corpo do documento continua presente').toBe(true);
    expect(r.pageBreakNoPdf, 'regra de ouro: PDF concorda com o preview').toBe(true);
    expect(r.watermarkUnit).not.toMatch(/[<>"\\&{}]/);
  });

  test('A9: EPUB3 gerado é XHTML válido e não contém on*= nem <script>', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(async (png) => {
      const ta = document.getElementById('markdown-input');
      // Título hostil (vetor do <title> XHTML) + payloads no corpo
      ta.value = [
        '# Capítulo</title><script>window.__ep=3</script>', '',
        '<img src=x onerror="window.__ep=1">', '',
        '<script>window.__ep=2</script>', '',
        '<a href="javascript:void(0)">bad</a>', '',
        '\\pagebreak', '',
        'corpo', '',
        '---', '',
        `![img](${png})`
      ].join('\n');
      window.__ep = 0;
      let saved = null;
      window.saveAs = (blob, name) => { saved = { blob, name }; };
      await EPUBGenerator.generate();
      if (!saved) return { erro: 'saveAs não foi interceptado' };
      const zip = await JSZip.loadAsync(saved.blob);
      const content = await zip.file('OEBPS/Text/content.xhtml').async('string');
      const nav = await zip.file('OEBPS/Text/nav.xhtml').async('string');
      const doc = new DOMParser().parseFromString(content, 'application/xhtml+xml');
      return {
        content,
        nav,
        parseErr: doc.getElementsByTagName('parsererror').length,
        temScript: /<script[\s>]/i.test(content) || /<script[\s>]/i.test(nav),
        temOn: /\son\w+\s*=/.test(content) || /\son\w+\s*=/.test(nav),
        executou: window.__ep,
        // o pipeline do EPUB extrai a data:image para dentro do zip e
        // aponta o src para a imagem embutida
        imgEmbarcada: content.indexOf('src="../Images/image_1.png"') !== -1,
        imgNoZip: !!zip.file('OEBPS/Images/image_1.png'),
        temTitulo: content.indexOf('<title>') !== -1
      };
    }, PNG_1PX);

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.erro).toBeUndefined();
    expect(r.parseErr, 'content.xhtml tem de ser XHTML válido').toBe(0);
    expect(r.temScript, 'sem <script> no EPUB (corpo e nav)').toBe(false);
    expect(r.temOn, 'sem atributos on*=').toBe(false);
    expect(r.executou, 'nenhum handler pode disparar').toBe(0);
    expect(r.imgEmbarcada, 'imagem data: é embutida no EPUB').toBe(true);
    expect(r.imgNoZip).toBe(true);
    expect(r.temTitulo).toBe(true);
  });
});

test.describe('P7/P8/N2 — fecho de sinks fora do marked e regressões', () => {
  // O sw.js (cache-first, skipWaiting/claim) intercepta os requests e o
  // page.route não os enxerga — sem bloquear, a imagem legítima do preview
  // cairia na rede real (indeterminístico). O bloqueio fica neste describe:
  // os testes A1–A10 seguem com o ambiente original (PWA). O app funciona
  // sem SW (é aprimoramento de PWA) e o register() do index.html tem
  // .catch(() => {}) — sem pageerror.
  test.use({ serviceWorkers: 'block' });

  test('A11: URL de imagem com payload não executa nem injeta atributo no preview (P7)', async ({ page }) => {
    const errors = await openApp(page);
    // Intercepta a carga do <img> do preview: determinístico, sem depender de
    // rede — a imagem "carrega" e o elemento permanece para inspeção.
    // Regex (não glob) para cobrir imgur.com e i.imgur.com.
    await page.route(/imgur\.com/, route => route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(PNG_1PX.split(',')[1], 'base64')
    }));

    const PAYLOAD = 'https://imgur.com/x?a=" onerror="alert(1)';

    // DIFERENCIAL: simula o sink pré-correção (innerHTML com interpolação +
    // onerror inline). O `"` do payload fecha o atributo src e o PRIMEIRO
    // onerror (o injetado) ganha.
    const old = await page.evaluate((payload) => {
      window.__alerts = [];
      window.alert = (m) => window.__alerts.push(m);
      const container = document.createElement('div'); // destacado: a carga real é interceptada pela rota; o erro é disparado manualmente
      container.innerHTML = `<img src="${payload}" onerror="this.parentElement.innerHTML='fallback'">`;
      const img = container.querySelector('img');
      const injetouOnError = !!img && img.hasAttribute('onerror');
      if (img) img.dispatchEvent(new Event('error'));
      return { injetouOnError, executou: window.__alerts.length > 0, alertas: window.__alerts.length };
    }, PAYLOAD);
    expect(old.injetouOnError, 'diferencial: o sink antigo criaria o atributo onerror injetado').toBe(true);
    expect(old.executou, 'diferencial: o sink antigo executaria alert(1)').toBe(true);

    // Caminho corrigido, com o MESMO payload, no modal real.
    await page.evaluate((payload) => {
      ImageManager.showInsertModal();
      const input = document.getElementById('img-url-input');
      input.value = payload;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, PAYLOAD);
    await page.waitForTimeout(500); // debounce de 300ms

    const novo = await page.evaluate(() => {
      const preview = document.getElementById('img-preview-url');
      return {
        temOnErrorEmQualquerElemento: preview.querySelectorAll('[onerror]').length,
        htmlContemOnError: / onerror=/.test(preview.innerHTML),
        novosAlertas: window.__alerts.length
      };
    });
    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(novo.temOnErrorEmQualquerElemento, 'nenhum elemento com onerror no preview').toBe(0);
    expect(novo.htmlContemOnError, 'o innerHTML do preview não contém onerror').toBe(false);
    expect(novo.novosAlertas, 'nenhum alert executou no caminho corrigido').toBe(old.alertas);

    // Prova positiva do sink: uma URL legítima cria o <img> via DOM, sem
    // atributo onerror e com o src preservado.
    await page.evaluate(() => {
      const input = document.getElementById('img-url-input');
      input.value = 'https://i.imgur.com/logo.png';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    const legit = await page.evaluate(() => {
      const preview = document.getElementById('img-preview-url');
      const img = preview.querySelector('img');
      return {
        imgExiste: !!img,
        temOnError: !!img && img.hasAttribute('onerror'),
        src: img ? img.getAttribute('src') : null
      };
    });
    expect(legit.imgExiste, 'URL legítima cria o preview').toBe(true);
    expect(legit.temOnError, 'o img criado via DOM não tem atributo onerror').toBe(false);
    expect(legit.src, 'o src preserva a URL').toBe('https://i.imgur.com/logo.png');
  });

  test('A12: isValidImageUrl valida hostname/protocolo e rejeita os bypasses do P7', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(() => {
      // DIFERENCIAL: a lógica antiga (includes() na string crua + regex na
      // string crua) aceitava os três bypasses; a nova rejeita.
      const OLD = (url) => {
        try { new URL(url); } catch { return false; }
        return /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)(\?.*)?$/i.test(url)
          || url.includes('imgur.com') || url.includes('imgbb.com')
          || url.includes('cloudinary.com') || url.includes('unsplash.com')
          || url.startsWith('data:image/');
      };
      const casos = [
        'https://evil.com/?x=imgur.com',
        'https://x.com/a.jpg?x=" onerror="alert(1)',
        'https://imgur.com/x?a=" onerror="alert(1)'
      ];
      return {
        oldAceitava: casos.map(OLD),
        novoRejeita: casos.map(u => ImageManager.isValidImageUrl(u)),
        rejeitaJavascript: ImageManager.isValidImageUrl('javascript:alert(1)'),
        rejeitaDataNaoImagem: ImageManager.isValidImageUrl('data:text/html,ola'),
        rejeitaVazio: ImageManager.isValidImageUrl(''),
        aceitaImgurSubdominio: ImageManager.isValidImageUrl('https://i.imgur.com/abc.png'),
        aceitaImgur: ImageManager.isValidImageUrl('https://imgur.com/abc'),
        aceitaHostGenericoComExtensao: ImageManager.isValidImageUrl('https://exemplo.com/foto.jpg?w=100'),
        aceitaDataImage: ImageManager.isValidImageUrl('data:image/png;base64,iVBORw0KGgo=')
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.oldAceitava, 'diferencial: a validação antiga aceitava os 3 bypasses').toEqual([true, true, true]);
    expect(r.novoRejeita, 'a nova rejeita os 3 bypasses').toEqual([false, false, false]);
    expect(r.rejeitaJavascript, 'protocolo javascript: rejeitado').toBe(false);
    expect(r.rejeitaDataNaoImagem, 'data: só para data:image/').toBe(false);
    expect(r.rejeitaVazio).toBe(false);
    expect(r.aceitaImgurSubdominio, 'subdomínio imgur aceito').toBe(true);
    expect(r.aceitaImgur).toBe(true);
    expect(r.aceitaHostGenericoComExtensao, 'extensão no pathname aceita').toBe(true);
    expect(r.aceitaDataImage, 'data:image/ aceita (readAsDataURL)').toBe(true);
  });

  test('A13: showToast com file.name contendo HTML não injeta elementos (P7)', async ({ page }) => {
    const errors = await openApp(page);

    // FASE 1 — DIFERENCIAL: o sink antigo interpolava em innerHTML. Em
    // Chromium um <img> com src inválido dispara onerror mesmo em subárvore
    // destacada — então o payload EXECUTA de verdade no caminho antigo.
    const old = await page.evaluate(() => {
      window.__xOld = 0;
      const nome = '<img src=x onerror="window.__xOld=1">.png';
      const container = document.createElement('div');
      container.innerHTML = `<i class="fas fa-check"></i> Arquivo "${nome}" carregado.`;
      return {
        injetouImg: container.querySelectorAll('img').length > 0,
        temOnError: container.querySelectorAll('[onerror]').length > 0
      };
    });
    await page.waitForTimeout(150);
    const oldExecutou = await page.evaluate(() => window.__xOld === 1);
    expect(old.injetouImg, 'diferencial: o sink antigo criaria um <img> no toast').toBe(true);
    expect(old.temOnError).toBe(true);
    expect(oldExecutou, 'diferencial: o sink antigo executaria o onerror').toBe(true);

    // FASE 2 — caminho corrigido, com o MESMO texto como file.name; contador
    // próprio zerado depois da diferencial.
    await page.evaluate(() => {
      window.__x = 0;
      const nome = '<img src=x onerror="window.__x=1">.png';
      App.showToast(`Arquivo "${nome}" carregado.`, 'success');
      // type é parâmetro interno (default 'info', call sites com constantes):
      // mesmo forjado, vai só para className (propriedade) e para o ternário
      // do ícone — não há contexto de atributo.
      App.showToast('msg', 'x" onmouseover="alert(1)');
    });
    await page.waitForTimeout(150);
    const novo = await page.evaluate(() => {
      const area = document.getElementById('toast-area');
      // O toast do arquivo é o que contém 'Arquivo "' (o segundo toast,
      // 'msg', é o teste do type forjado).
      const alvo = [...area.querySelectorAll('.toast')]
        .find(t => t.textContent.includes('Arquivo "'));
      return {
        injetouImg: area.querySelectorAll('img').length,
        temOnError: area.querySelectorAll('[onerror]').length,
        temOnMouseOver: area.querySelectorAll('[onmouseover]').length,
        executou: window.__x,
        textoLiteral: alvo ? alvo.textContent : null,
        temIcone: !!alvo && !!alvo.querySelector('i.fas')
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(novo.injetouImg, 'o toast corrigido não contém <img>').toBe(0);
    expect(novo.temOnError).toBe(0);
    expect(novo.temOnMouseOver, 'type forjado não cria atributo').toBe(0);
    expect(novo.executou, 'nenhum handler pode disparar').toBe(0);
    expect(novo.textoLiteral, 'o texto aparece literal').toContain('Arquivo "<img src=x onerror="window.__x=1">.png" carregado.');
    expect(novo.temIcone, 'o visual (ícone fas) é preservado').toBe(true);
  });

  test('A14: marca d\'água preserva pontuação tipográfica e continua bloqueando </style> (N2/P2)', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(() => {
      // DIFERENCIAL: a allowlist antiga (classe estreita de caracteres)
      // removia º ª « » — × ÷ e aspas tipográficas (regressão pt-BR).
      const OLD = /[^A-Za-z0-9À-ÖØ-öø-ÿ .,:;!?'()\[\]\-_/%°#]/g;
      const bom = 'Rascunho — versão 2º e 3ª «confidencial» × 4 ÷ 2 “aspas” ’apóstrofo’ ©2026';
      const antigo = bom.replace(OLD, '').trim();
      const novo = Sanitize.watermark(bom);
      const hostil = Sanitize.watermark('</style><script>window.__x=1</script>');
      // Prova no sink real: o content: "..." do CSS aceita os caracteres.
      const doc = PDFGenerator.buildPrintDocument({
        html: '<p>corpo</p>',
        theme: ThemeManager.get(App.currentIndex),
        settings: { ...PDFGenerator.defaultSettings, watermark: bom },
        title: 'T'
      });
      return {
        antigo,
        novo,
        hostil,
        antigoRemoveu: !['—', 'º', 'ª', '«', '»', '×', '÷', '“', '”', '’'].every(c => antigo.includes(c)),
        novoPreserva: ['—', 'º', 'ª', '«', '»', '×', '÷', '“', '”', '’', '©'].every(c => novo.includes(c)),
        bloqueiaBreakout: !/[<>"\\&{}]/.test(hostil)
          && !hostil.includes('</style>') && !hostil.includes('<script'),
        semCaracteresDeBreakout: !/[<>"\\&{}\r\n]/.test(novo),
        docOk: doc.includes(`content: "${bom}";`)
          && (doc.match(/<\/style>/g) || []).length === 1
          && !doc.includes('<script')
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.antigoRemoveu, `diferencial: a allowlist antiga removia os caracteres (ficou: ${r.antigo})`).toBe(true);
    expect(r.novoPreserva, `a nova preserva: ${r.novo}`).toBe(true);
    expect(r.bloqueiaBreakout, `hostil ficou: ${r.hostil}`).toBe(true);
    expect(r.semCaracteresDeBreakout).toBe(true);
    expect(r.docOk, 'o documento de impressão aceita a marca d\'água completa e continua íntegro').toBe(true);
  });

  test('A15: nome do arquivo aparece por extenso no toast "Arquivo X carregado" (regressão)', async ({ page }) => {
    const errors = await openApp(page);

    await page.evaluate(() => {
      // Fluxo real: readFile → showToast(`Arquivo "${file.name}" carregado.`)
      const nome = 'relatório-final-v2.md';
      const file = new File(['# Conteúdo'], nome, { type: 'text/markdown' });
      App.readFile(file);
    });
    await page.waitForTimeout(100);

    const r = await page.evaluate(() => {
      const area = document.getElementById('toast-area');
      const toasts = [...area.querySelectorAll('.toast')];
      const ultimo = toasts[toasts.length - 1];
      const nome = 'relatório-final-v2.md';
      return {
        achou: !!ultimo && ultimo.textContent.includes(`Arquivo "${nome}" carregado.`),
        texto: ultimo ? ultimo.textContent : null,
        injetouImg: area.querySelectorAll('img').length
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.achou, `toast: ${r.texto}`).toBe(true);
    expect(r.injetouImg).toBe(0);
  });
});