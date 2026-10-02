// GATE DE BUILD 2026-10-02b (qa-engineer) — auditoria de diferencialidade da
// mudança P7/P8/N2 que veio DEPOIS do primeiro gate do dia.
//
// O que este spec prova (independente dos blocos diferenciais que o engineer
// embutiu em A11–A14):
//   1. DIF-A11: com o sink ANTIGO de preview de URL (innerHTML + interpolação
//      + onerror inline), servido via page.route no lugar de
//      js/image-manager.js, as asserções de A11 (temOnErrorEmQualquerElemento
//      === 0, htmlContemOnError === false, nenhum alert) FALHAM.
//   2. DIF-A12: com o validador ANTIGO (includes() na string crua), os 3
//      bypasses do P7 são aceitos — as asserções de A12 (novoRejeita =
//      [false,false,false]) FALHAM.
//   3. DIF-A13: com o showToast ANTIGO (innerHTML), o file.name hostil injeta
//      <img> e EXECUTA onerror — as asserções de A13 (injetouImg=0,
//      temOnError=0, executou=0) FALHAM.
//   4. N2: bateria de payloads de breakout de CSS string / raw-text / XHTML
//      contra a denylist da marca d'água, com parse REAL no Chromium
//      (DOMParser + CSSOM): nenhum produz </style> extra, <script> ou regra
//      inválida. Inclui \ (escape CSS), LF, CR, FF (newline do css-syntax),
//      & (entidade XHTML), { }, aspas, NUL.
//   5. N2: a marca d'água legítima pt-BR (º ª « » — × ÷ “ ” ’ ©) sobrevive
//      intacta e o CSS parseia — a regressão N2 está fechada.
//   6. P7: isValidImageUrl rejeita data:image/svg+xml com < literal mas
//      aceita base64 — e nenhum fluxo do produto produz data URL com <
//      literal (readAsDataURL só gera base64).
//
// Nenhum teste aqui escreve em disco (.out-*.pdf / .print-doc*.html não são
// tocados): o fluxo documentado do gate (playwright → verify-pdf.py) fica
// intacto. A mutação é em runtime (route/evaluate) e por construção reversível
// (contexto novo por teste; zero edição de arquivos de produção).

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

// Constrói o image-manager.js PRÉ-correção (P7) por cirurgia de string no
// arquivo real: o sink de preview volta a interpolar em innerHTML com onerror
// inline, e o validador volta ao includes() na string crua. A cirurgia é
// autocontida: se qualquer âncora não bater (arquivo mudou), o teste falha em
// vez de servir código atual por engano.
function buildOldImageManager() {
  // Normaliza CRLF → LF: os anchors abaixo usam \n e o arquivo pode vir com
  // fim de linha do Windows. O conteúdo servido ao browser não depende de
  // fim de linha (JS).
  const file = fs.readFileSync(path.join(ROOT, 'js', 'image-manager.js'), 'utf8')
    .replace(/\r\n/g, '\n');

  // --- Sink antigo (substitui o bloco DOM por innerHTML + onerror inline) ---
  const sinkParts = file.split('if (url && this.isValidImageUrl(url)) {');
  if (sinkParts.length !== 2) throw new Error('QA-DIF: âncora do sink (if url) não encontrada');
  const tailParts = sinkParts[1].split("previewUrl.classList.add('has-image');\n                } else {");
  if (tailParts.length !== 2) throw new Error('QA-DIF: fim do bloco do sink não encontrado');

  const OLD_SINK =
    'if (url && this.isValidImageUrl(url)) {\n' +
    '                    previewUrl.innerHTML = `<img src="${url}" onerror="window.__oldSink=1;alert(1)">`;\n' +
    '                    previewUrl.classList.add(\'has-image\');\n' +
    '                } else {';

  let mutated = sinkParts[0] + OLD_SINK + tailParts[1];

  // --- Validador antigo (substitui o corpo do método) ---
  const valParts = mutated.split('isValidImageUrl(url) {');
  if (valParts.length !== 2) throw new Error('QA-DIF: âncora do validador não encontrada');
  const afterMethod = valParts[1].split('    async fetchImageForEPUB(url) {');
  if (afterMethod.length !== 2) throw new Error('QA-DIF: fim do método do validador não encontrado');

  const OLD_VALID =
    'isValidImageUrl(url) {\n' +
    '        try { new URL(url); } catch { return false; }\n' +
    '        return /\\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)(\\?.*)?$/i.test(url)\n' +
    '            || url.includes(\'imgur.com\') || url.includes(\'imgbb.com\')\n' +
    '            || url.includes(\'cloudinary.com\') || url.includes(\'unsplash.com\')\n' +
    '            || url.startsWith(\'data:image/\');\n' +
    '    },\n\n' +
    '    async fetchImageForEPUB(url) {';

  mutated = valParts[0] + OLD_VALID + afterMethod[1];

  // Autoverificação da cirurgia (nunca servir código atual por engano):
  if (!mutated.includes('window.__oldSink')) throw new Error('QA-DIF: sink antigo não presente no arquivo servido');
  if (mutated.includes('img.addEventListener')) throw new Error('QA-DIF: sink novo ainda presente no arquivo servido');
  if (!mutated.includes("url.includes('imgur.com')")) throw new Error('QA-DIF: validador antigo não presente');
  return mutated;
}

const OLD_IMAGE_MANAGER = buildOldImageManager();

// O sw.js (cache-first) interceptaria os requests; sem bloqueio o page.route
// não enxerga. Mesma premissa do describe A11–A15 do engineer.
test.describe('QA-DIF — diferencialidade P7/P8/N2 (código pré-correção falha)', () => {
  test.use({ serviceWorkers: 'block' });

  test('DIF-A11: sink antigo de preview de URL injeta onerror e executa — A11 falharia', async ({ page }) => {
    // Serve o arquivo PRÉ-correção para o browser, como o produto tinha antes do P7.
    await page.route('**/js/image-manager.js', route => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: OLD_IMAGE_MANAGER
    }));
    await page.route(/imgur\.com/, route => route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(PNG_1PX.split(',')[1], 'base64')
    }));

    const errors = await openApp(page);

    const PAYLOAD = 'https://imgur.com/x?a=" onerror="alert(1)';
    await page.evaluate((payload) => {
      window.__alerts = [];
      window.alert = (m) => window.__alerts.push(m);
      ImageManager.showInsertModal();
      const input = document.getElementById('img-url-input');
      input.value = payload;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, PAYLOAD);
    await page.waitForTimeout(600); // debounce de 300ms

    const r = await page.evaluate(() => {
      const preview = document.getElementById('img-preview-url');
      const img = preview.querySelector('img');
      if (img) img.dispatchEvent(new Event('error')); // dispara o onerror injetado
      return {
        onerrorAttr: preview.querySelectorAll('[onerror]').length,
        htmlContemOnError: / onerror=/.test(preview.innerHTML),
        alertas: window.__alerts.length
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    // As asserções de A11 no caminho corrigido exigem 0 / false / 0.
    // No sink antigo, TODAS falham:
    expect(r.onerrorAttr, 'A11 exigiria temOnErrorEmQualquerElemento === 0; o sink antigo injeta').toBeGreaterThanOrEqual(1);
    expect(r.htmlContemOnError, 'A11 exigiria htmlContemOnError === false; o sink antigo interpola').toBe(true);
    expect(r.alertas, 'A11 exigiria nenhum alert novo; o sink antigo EXECUTA alert(1)').toBeGreaterThanOrEqual(1);
  });

  test('DIF-A12: validador antigo aceita os 3 bypasses do P7 — A12 falharia', async ({ page }) => {
    await page.route('**/js/image-manager.js', route => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: OLD_IMAGE_MANAGER
    }));

    const errors = await openApp(page);

    const r = await page.evaluate(() => {
      const casos = [
        'https://evil.com/?x=imgur.com',
        'https://x.com/a.jpg?x=" onerror="alert(1)',
        'https://imgur.com/x?a=" onerror="alert(1)'
      ];
      return { aceitos: casos.map(u => ImageManager.isValidImageUrl(u)) };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    // A12 exige novoRejeita = [false, false, false]; o validador antigo
    // (includes na string crua) aceita os 3 — A12 falharia.
    expect(r.aceitos, 'A12 exigiria [false,false,false]; o validador antigo aceita os 3').toEqual([true, true, true]);
  });

  test('DIF-A13: showToast antigo (innerHTML) injeta <img> e EXECUTA onerror — A13 falharia', async ({ page }) => {
    const errors = await openApp(page);

    await page.evaluate(() => {
      // Sink antigo (P7 pré-correção): interpolação direta em innerHTML.
      App.showToast = function (msg, type = 'info') {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<i class="fas fa-check"></i> ${msg}`;
        document.getElementById('toast-area').appendChild(el);
      };
      window.__x = 0;
      const nome = '<img src=x onerror="window.__x=1">.png';
      App.showToast(`Arquivo "${nome}" carregado.`, 'success');
    });
    await page.waitForTimeout(200);

    const r = await page.evaluate(() => {
      const area = document.getElementById('toast-area');
      return {
        injetouImg: area.querySelectorAll('img').length,
        temOnError: area.querySelectorAll('[onerror]').length,
        executou: window.__x
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    // A13 exige injetouImg=0, temOnError=0, executou=0 — o sink antigo
    // falha nas três (o onerror do <img> com src inválido DISPARA no
    // Chromium e seta window.__x = 1).
    expect(r.injetouImg, 'A13 exigiria injetouImg=0; o sink antigo cria <img>').toBeGreaterThanOrEqual(1);
    expect(r.temOnError, 'A13 exigiria temOnError=0; o sink antigo cria [onerror]').toBeGreaterThanOrEqual(1);
    expect(r.executou, 'A13 exigiria executou=0; o sink antigo EXECUTA o handler').toBe(1);
  });
});

test.describe('QA-N2 — caça a buraco na denylist da marca d\'água', () => {
  test('N2: bateria de breakout de CSS string/raw-text/XHTML — nenhum escapa (parse real no Chromium)', async ({ page }) => {
    const errors = await openApp(page);

    // Vetores: fechar string ("), escape CSS (\), newlines do css-syntax
    // (LF, CR, FF), entidade XHTML (&), regra ({ }), NUL, </style> com
    // variações de espaçamento.
    const BATTERY = [
      '</style><script>alert(1)</script>',
      '";}</style><script>alert(1)</script>{color:red}',
      '\\3c\\2fstyle\\3e',                     // CSS escape de </style>
      '\\22 onmouseover\\3d alert(1)',
      'abc\n</style><script>',                 // LF
      'abc\r</style><script>',                 // CR
      'abc\u000Cb</style><script>',            // FF (newline do css-syntax!)
      '&lt;/style&gt;&lt;script&gt;',          // entidades (contexto XHTML)
      '{ color: red; }',
      'x" onmouseover="alert(1)',
      "' onmouseover='alert(1)",
      'a\\" ; }',
      'a\u0000b</style>',                      // NUL
      '</style >',                             // espaço antes de >
      '</style\t>'                             // tab antes de >
    ];

    const r = await page.evaluate((battery) => {
      const out = [];
      for (const p of battery) {
        const wm = Sanitize.watermark(p);
        // 1) string-level: nenhum caractere do vetor sobrevive
        const temVetor = /[<>"\\&{}\r\n]/.test(wm);
        const temFechamento = wm.includes('</style') || /<script/i.test(wm);
        // 2) parse real do documento de impressão no Chromium
        const doc = PDFGenerator.buildPrintDocument({
          html: '<p>corpo</p>',
          theme: ThemeManager.get(App.currentIndex),
          settings: { ...PDFGenerator.defaultSettings, watermark: p },
          title: 'T'
        });
        const parsed = new DOMParser().parseFromString(doc, 'text/html');
        const styles = parsed.querySelectorAll('style').length;
        const scripts = parsed.querySelectorAll('script').length;
        const styleEl = parsed.querySelector('style');
        let regras = -1;
        if (styleEl) {
          const probe = document.createElement('style');
          probe.textContent = styleEl.textContent;
          document.head.appendChild(probe);
          try { regras = probe.sheet ? probe.sheet.cssRules.length : -1; } catch (e) { regras = -2; }
          probe.remove();
        }
        out.push({
          input: p.replace(/\u000C/g, '<FF>').replace(/\u0000/g, '<NUL>').replace(/\r/g, '<CR>').replace(/\n/g, '<LF>'),
          wm: wm.replace(/\u000C/g, '<FF>').replace(/\u0000/g, '<NUL>').replace(/\r/g, '<CR>').replace(/\n/g, '<LF>'),
          temVetor, temFechamento,
          styles, scripts, regras
        });
      }
      return out;
    }, BATTERY);

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    for (const row of r) {
      expect(row.temVetor, `payload ${row.input} → saída "${row.wm}" ainda tem caractere do vetor`).toBe(false);
      expect(row.temFechamento, `payload ${row.input} → saída "${row.wm}" fecha style/script`).toBe(false);
      expect(row.styles, `payload ${row.input} → documento com ${row.styles} <style>`).toBe(1);
      expect(row.scripts, `payload ${row.input} → documento com ${row.scripts} <script>`).toBe(0);
      expect(row.regras, `payload ${row.input} → CSS com ${row.regras} regras (parse)`).toBeGreaterThanOrEqual(1);
    }
  });

  test('N2: marca d\'água pt-BR legítima sobrevive intacta e o CSS parseia (regressão fechada)', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(() => {
      const bom = 'Rascunho — versão 2º e 3ª «confidencial» × 4 ÷ 2 “aspas” ’apóstrofo’ ©2026';
      const comAspasSimples = "it's confidential";
      const wm = Sanitize.watermark(bom);
      const wm2 = Sanitize.watermark(comAspasSimples);
      const doc = PDFGenerator.buildPrintDocument({
        html: '<p>corpo</p>',
        theme: ThemeManager.get(App.currentIndex),
        settings: { ...PDFGenerator.defaultSettings, watermark: bom },
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
        wm, wm2,
        preservou: ['—', 'º', 'ª', '«', '»', '×', '÷', '“', '”', '’', '©'].every(c => wm.includes(c)),
        aspasSimplesPreservadas: wm2 === "it's confidential",
        docContem: doc.includes(`content: "${bom}";`),
        styles: parsed.querySelectorAll('style').length,
        scripts: parsed.querySelectorAll('script').length,
        regras
      };
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.preservou, `a denylist removeu pontuação pt-BR legítima: ${r.wm}`).toBe(true);
    expect(r.aspasSimplesPreservadas, 'aspas simples são seguras em string CSS "..." e não podem ser removidas').toBe(true);
    expect(r.docContem, 'a marca d\'água entra inteira no content: "..."').toBe(true);
    expect(r.styles).toBe(1);
    expect(r.scripts).toBe(0);
    expect(r.regras, `CSS com ${r.regras} regras`).toBeGreaterThanOrEqual(1);
  });
});

test.describe('QA-P7 — regressão do validador de URL (data:image/svg+xml)', () => {
  test('P7: < literal em data URL é rejeitado, base64 aceito; nenhum fluxo produz data URL com <', async ({ page }) => {
    const errors = await openApp(page);

    const r = await page.evaluate(() => ({
      svgBase64: ImageManager.isValidImageUrl('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=='),
      svgLiteral: ImageManager.isValidImageUrl('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      pngBase64: ImageManager.isValidImageUrl('data:image/png;base64,iVBORw0KGgo=')
    }));

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(r.svgBase64, 'data:image/svg+xml;base64 do readAsDataURL tem de ser aceito').toBe(true);
    expect(r.svgLiteral, 'data:image/svg+xml com < literal é rejeitado (não é produzido por nenhum fluxo)').toBe(false);
    expect(r.pngBase64).toBe(true);

    // Confirma por leitura do fluxo: o único produtor de data URL no upload
    // é FileReader.readAsDataURL (sempre base64), e nenhum arquivo constrói
    // data:image/svg+xml com < literal.
    const jsDir = path.join(ROOT, 'js');
    const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
    const constroiSvgLiteral = [];
    for (const f of files) {
      const src = fs.readFileSync(path.join(jsDir, f), 'utf8');
      if (/data:image\/svg\+xml,[^;]/.test(src) || /['"]data:image\/svg\+xml,\s*</.test(src)) {
        constroiSvgLiteral.push(f);
      }
    }
    const im = fs.readFileSync(path.join(jsDir, 'image-manager.js'), 'utf8');
    expect(im, 'upload via readAsDataURL (base64) é o produtor de data URLs').toContain('reader.readAsDataURL(file)');
    expect(constroiSvgLiteral, 'nenhum arquivo constrói data:image/svg+xml com < literal').toEqual([]);
  });
});