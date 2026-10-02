// Artefato de auditoria do gate de build final (build-2026-10-02c):
//
//   1) M1/M2 — prova de que o gate audita PRODUÇÃO: uma mutação de 1 regra
//      de CSS em js/pdf-generator.js (`.page-break { break-after: page; }`
//      → `auto`) tem de derrubar o verificador (C1/C4). A mutação é servida
//      via page.route (nunca edita o disco); o teste M1M2-MUTACAO grava os
//      PDFs mutados nos nomes do verificador e o teste M1M2-REGENERA restaura
//      os PDFs íntegros no MESMO arquivo — o estado final do repositório
//      depois de `npx playwright test` é sempre o de código íntegro.
//      Para o gate: rode `npx playwright test test/qa-s1s8-regressoes.spec.js --grep MUTACAO`
//      → `python -m pytest test/verify-pdf.py -s` (C1/C4 FALHAM) →
//      `npx playwright test test/qa-s1s8-regressoes.spec.js --grep REGENERA`
//      → `python -m pytest test/verify-pdf.py -s` (8/8 PASS).
//
//   2) REGRESSOES — sondas que ninguém pediu explicitamente:
//      - Sanitize.color não pode quebrar nenhum dos 50 temas (cor preservada,
//        não cai no fallback #333; buildThemeCSS/getPrintCSS sem exceção);
//      - Sanitize.watermark preserva marca d'água pt-BR legítima (regressão
//        N2 do gate b não pode voltar);
//      - coerção numérica de settings não zera margens/página válidas;
//      - validação de nome de projeto não quebra nomes legítimos (acentos,
//        espaços, hífen, ponto) — `&` é rejeitado POR DESIGN (documentado na
//        UI: "evite < > \" ' &").

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.MD2PDF_BASE || 'http://127.0.0.1:8099';
const FIXTURE = path.join(__dirname, 'fixtures', 'print-profile.md');
const { runtimeRoot } = require('./runtime-root');
const PDF_GEN_PATH = path.join(runtimeRoot(__dirname), 'js', 'pdf-generator.js');

const GOOD_RULE = '.page-break { break-after: page; }';
const MUT_RULE = '.page-break { break-after: auto; }';

async function loadApp(page, routeMutated) {
  if (routeMutated) {
    const real = fs.readFileSync(PDF_GEN_PATH, 'utf8');
    const occurrences = real.split(GOOD_RULE).length - 1;
    if (occurrences !== 1) {
      throw new Error(`âncora de mutação ausente: esperava 1 ocorrência de "${GOOD_RULE}", achei ${occurrences}`);
    }
    const mutated = real.replace(GOOD_RULE, MUT_RULE);
    if (!mutated.includes(MUT_RULE)) {
      throw new Error('mutação não aplicada — nunca servir código íntegro por engano');
    }
    await page.route('**/js/pdf-generator.js', route => {
      route.fulfill({ body: mutated, contentType: 'application/javascript' });
    });
  }
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    typeof Sanitize === 'object' && typeof PDFGenerator === 'object' && typeof DOMPurify === 'function');
  return errors;
}

async function buildAndWritePdfs(page) {
  await page.evaluate(fixture => {
    const ta = document.getElementById('markdown-input');
    ta.value = fixture;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, fs.readFileSync(FIXTURE, 'utf8'));
  await page.waitForTimeout(600);

  const docs = await page.evaluate(() => {
    const theme = ThemeManager.get(App.currentIndex);
    const base = { ...PDFGenerator.defaultSettings, pageNumberPosition: 'bottom-center' };
    const html = document.getElementById('preview-content').innerHTML;
    return {
      numerado: PDFGenerator.buildPrintDocument({
        html, theme,
        settings: { ...base, showPageNumbers: true },
        title: 'Fixture do gate'
      }),
      semNumero: PDFGenerator.buildPrintDocument({
        html, theme,
        settings: { ...base, showPageNumbers: false },
        title: 'Fixture do gate'
      })
    };
  });

  fs.writeFileSync(path.join(__dirname, '.print-doc.html'), docs.numerado);
  fs.writeFileSync(path.join(__dirname, '.print-doc-nonumber.html'), docs.semNumero);

  await page.setContent(docs.semNumero);
  await page.pdf({ path: path.join(__dirname, '.out-nonumber.pdf'), format: 'A4', printBackground: true });
  await page.setContent(docs.numerado);
  await page.pdf({ path: path.join(__dirname, '.out-numbered.pdf'), format: 'A4', printBackground: true });

  return { numerado: docs.numerado, semNumero: docs.semNumero };
}

test.describe('M1/M2 — prova de auditoria de produção', () => {
  test.use({ serviceWorkers: 'block' });

  test('M1M2-MUTACAO: break-after page→auto derruba o verificador (C1/C4)', async ({ page }) => {
    const errors = await loadApp(page, true);
    const docs = await buildAndWritePdfs(page);
    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    // A mutação foi realmente servida (âncora autoverificada na route):
    // o CSS de produção chega ao documento MUTADO.
    expect(docs.numerado).toContain(MUT_RULE);
    expect(docs.numerado).not.toContain(GOOD_RULE);
    // Prova interna mínima: sem quebra após o marcador, o texto pós-\pagebreak
    // não pode estar garantidamente em página posterior (o verificador C1 mede
    // a RELAÇÃO p4 < p5; a contagem de páginas cai de 5 para 4 — C4).
    // A prova externa é o verify-pdf.py rodado logo após este teste.
  });

  test('M1M2-REGENERA: PDFs íntegros restaurados no estado final', async ({ page }) => {
    const errors = await loadApp(page, false);
    const docs = await buildAndWritePdfs(page);
    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    expect(docs.numerado).toContain(GOOD_RULE);
    expect(docs.numerado).not.toContain(MUT_RULE);
  });
});

test.describe('Regressões da rodada S1–S8', () => {
  test.use({ serviceWorkers: 'block' });

  test('REGRESSOES: 50 temas, marca d\'água legítima, settings e nomes de projeto', async ({ page }) => {
    const errors = await loadApp(page, false);

    const r = await page.evaluate(() => {
      const out = {};

      // 1) Sanitize.color preserva a cor dos 50 temas (não cai no #333)
      const themes = ThemeManager.getAll();
      out.temaCount = themes.length;
      out.temaCorPreservada = themes.filter(t => Sanitize.color(t.color) === t.color).length;
      out.temaCorDiferente = themes.filter(t => Sanitize.color(t.color) !== t.color)
        .map(t => ({ id: t.id, color: t.color, saida: Sanitize.color(t.color) }));
      // buildThemeCSS/getPrintCSS não podem lançar nem produzir CSS vazio
      const cssProblemas = [];
      for (const t of themes) {
        try {
          ThemeManager.buildThemeCSS(t);
          const printCss = ThemeManager.getPrintCSS(t);
          if (!printCss || printCss.trim() === '') cssProblemas.push(`print vazio id=${t.id}`);
          const live = document.getElementById('theme-style');
          if (!live || (live.textContent || '').trim() === '') cssProblemas.push(`live vazio id=${t.id}`);
        } catch (e) {
          cssProblemas.push(`exceção id=${t.id}: ${e.message}`);
        }
      }
      out.cssProblemas = cssProblemas;

      // 2) Marca d'água legítima pt-BR (regressão N2 do gate b) intacta
      const LEGIT = 'Rascunho — versão 2º e 3ª «confidencial» × 4 ÷ 2 “aspas” ’apóstrofo’ ©2026';
      out.watermark = Sanitize.watermark(LEGIT);
      const doc = PDFGenerator.buildPrintDocument({
        html: '<p>corpo</p>',
        theme: ThemeManager.get(0),
        settings: { ...PDFGenerator.defaultSettings, watermark: LEGIT },
        title: 'T'
      });
      const parsed = new DOMParser().parseFromString(doc, 'text/html');
      out.watermarkNoDoc = doc.includes('content: "Rascunho — versão 2º e 3ª «confidencial» × 4 ÷ 2 “aspas” ’apóstrofo’ ©2026"');
      out.docStyles = parsed.querySelectorAll('style').length;
      out.docScripts = parsed.querySelectorAll('script').length;

      // 3) Coerção numérica de settings: defaults reais e valores válidos
      const d = PDFGenerator.defaultSettings;
      const m = s => PDFGenerator.buildPrintDocument({
        html: '<p>x</p>', theme: ThemeManager.get(0), settings: s, title: 'T'
      }).match(/margin: ([^;]+);/)[1];
      out.margemDefaults = m({ ...d });
      out.margemDefaultsSemSettings = m(undefined); // contrato defensivo
      out.margemStringsValidas = m({ ...d, marginTop: '10', marginLeft: '35' });
      out.margemDecimal = m({ ...d, marginTop: 12.5 });
      out.margemHostil = m({ ...d, marginTop: '25; } body { color: red', marginLeft: '30" onmouseover="alert(1)' });
      out.margemZeraNao = m({ ...d, marginTop: '0', marginLeft: 0 }); // 0 legítimo permanece 0
      out.pageSizeOk = PDFGenerator.buildPrintDocument({
        html: '<p>x</p>', theme: ThemeManager.get(0), settings: { ...d }, title: 'T'
      }).includes('size: 210mm 297mm');

      // 4) Nomes de projeto legítimos exóticos
      out.nome = {
        acentos: ProjectManager.isValidProjectName('Relatório Final'),
        espacos: ProjectManager.isValidProjectName('Meu Projeto'),
        hifen: ProjectManager.isValidProjectName('Plano-A'),
        ponto: ProjectManager.isValidProjectName('v1.2'),
        amp: ProjectManager.isValidProjectName('Pesquisa & Relatório'),
        longo: ProjectManager.isValidProjectName('a'.repeat(101)),
        vazio: ProjectManager.isValidProjectName('   ')
      };
      const saveOk = ProjectManager.saveProject('Relatório Final', { markdown: '# T', themeId: 3 });
      const listado = ProjectManager.listNames().includes('Relatório Final');
      const lido = ProjectManager.get('Relatório Final');
      out.nome.roundTrip = saveOk && listado && !!lido && lido.current.markdown === '# T';
      const importOk = ProjectManager.importProject(
        JSON.stringify({ name: 'Projeto Ünïcode — Final', current: { markdown: '# X', themeId: 1 } }));
      out.nome.importAcentoOk = importOk && ProjectManager.listNames().includes('Projeto Ünïcode — Final');
      // limpeza (não afeta projetos reais do usuário no navegador de teste)
      ProjectManager.deleteProject('Relatório Final');
      ProjectManager.deleteProject('Projeto Ünïcode — Final');

      return out;
    });

    expect(errors, `pageerror: ${errors.join('; ')}`).toEqual([]);
    // 1) 50 temas, todas as cores preservadas, nenhum CSS vazio/exceção
    expect(r.temaCount, 'devem ser 50 temas').toBe(50);
    expect(r.temaCorPreservada, 'todas as 50 cores passam por Sanitize.color sem cair no fallback').toBe(50);
    expect(r.temaCorDiferente, 'nenhuma cor alterada').toEqual([]);
    expect(r.cssProblemas, 'nenhuma exceção/CSS vazio nos 50 temas').toEqual([]);
    // 2) marca d'água legítima intacta e documento íntegro
    expect(r.watermark, 'marca d\'água legítima preservada caractere a caractere').toBe('Rascunho — versão 2º e 3ª «confidencial» × 4 ÷ 2 “aspas” ’apóstrofo’ ©2026');
    expect(r.watermarkNoDoc, 'marca d\'água legítima entra inteira no content:').toBe(true);
    expect(r.docStyles).toBe(1);
    expect(r.docScripts).toBe(0);
    // 3) coerção: defaults e valores válidos preservados (nada zerado)
    expect(r.margemDefaults, 'defaults reais 25/25/25/30').toBe('25mm 25mm 25mm 30mm');
    expect(r.margemDefaultsSemSettings, 'sem settings → defaults').toBe('25mm 25mm 25mm 30mm');
    expect(r.margemStringsValidas, 'strings numéricas válidas coagidas sem zerar').toBe('10mm 25mm 25mm 35mm');
    expect(r.margemDecimal, 'decimal preservado').toBe('12.5mm 25mm 25mm 30mm');
    expect(r.margemHostil, 'settings hostis caem nos defaults (não zeram)').toBe('25mm 25mm 25mm 30mm');
    expect(r.margemZeraNao, '0 explícito permanece 0 (comportamento correto)').toBe('0mm 25mm 25mm 0mm');
    expect(r.pageSizeOk, 'página A4 preservada').toBe(true);
    // 4) nomes de projeto
    expect(r.nome.acentos, 'acentos aceitos').toBe(true);
    expect(r.nome.espacos, 'espaços aceitos').toBe(true);
    expect(r.nome.hifen, 'hífen aceito').toBe(true);
    expect(r.nome.ponto, 'ponto aceito').toBe(true);
    expect(r.nome.amp, '& rejeitado por design (documentado na UI)').toBe(false);
    expect(r.nome.longo, '>100 caracteres rejeitado').toBe(false);
    expect(r.nome.vazio, 'vazio/whitespace rejeitado').toBe(false);
    expect(r.nome.roundTrip, 'save/get/list com nome acentuado funciona').toBe(true);
    expect(r.nome.importAcentoOk, 'import de nome acentuado funciona').toBe(true);
  });
});