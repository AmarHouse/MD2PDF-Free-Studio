// Gate de impressão: verifica os 8 critérios de aceite do plano
// .factory/plans/md2pdf-print-profile.md contra o CSS real do produto.
//
// O motor de PDF é window.print() (ADR-001), então o gate monta o documento
// com PDFGenerator.buildPrintDocument() — a MESMA função pura que o
// generate() usa em produção (M1/M2) — e usa page.pdf(), que é o mesmo
// pipeline de impressão do Chromium, em vez do diálogo nativo.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIXTURE = path.join(__dirname, 'fixtures', 'print-profile.md');
const BASE = process.env.MD2PDF_BASE || 'http://127.0.0.1:8099';

test.describe('perfil de impressão', () => {
  test('normalizador: não perde conteúdo e remove só frontmatter real', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof MarkdownNormalize === 'object');

    const r = await page.evaluate(() => {
      const N = MarkdownNormalize.normalize;
      const kept = (o, targets) => targets.filter(t => !o.includes(t));
      const gone = (o, targets) => targets.filter(t => o.includes(t));
      const cases = [
        // Documentos CommonMark válidos que começam com `---` (thematic break)
        // e têm outro adiante: NENHUM conteúdo pode ser perdido.
        ['CommonMark: --- inicial + --- adiante',
          '---\n\nSecao um com conteudo.\n\n---\n\nSecao dois tambem.',
          kept(N('---\n\nSecao um com conteudo.\n\n---\n\nSecao dois tambem.'), ['Secao um', 'Secao dois'])],
        ['--- inicial + lista',
          '---\n\n- item um\n- item dois\n',
          kept(N('---\n\n- item um\n- item dois\n'), ['item um', 'item dois'])],
        ['--- inicial + codigo',
          '---\n\n# Secao A\n\ntexto A\n\n```\n---\ncodigo\n```\n',
          kept(N('---\n\n# Secao A\n\ntexto A\n\n```\n---\ncodigo\n```\n'), ['# Secao A', 'texto A', 'codigo'])],
        ['--- inicial + paragrafos + --- final',
          '---\n\nParagrafo um.\n\nParagrafo dois.\n\n---\n\nFim.',
          kept(N('---\n\nParagrafo um.\n\nParagrafo dois.\n\n---\n\nFim.'), ['Paragrafo um', 'Paragrafo dois', 'Fim'])],
        // Frontmatter legítimo tem de ser removido
        ['frontmatter simples removido',
          '---\ntitle: R\nauthor: F\n---\n\n# Corpo',
          gone(N('---\ntitle: R\nauthor: F\n---\n\n# Corpo'), ['title: R', 'author: F'])],
        ['frontmatter com comentario e blank',
          '---\n# c\ntitle: R\n\nauthor: F\n---\n\ncorpo',
          gone(N('---\n# c\ntitle: R\n\nauthor: F\n---\n\ncorpo'), ['title: R', 'author: F'])],
        ['frontmatter com lista',
          '---\ntitle: R\ntags:\n  - a\n  - b\n---\n\ncorpo',
          gone(N('---\ntitle: R\ntags:\n  - a\n  - b\n---\n\ncorpo'), ['title: R', 'tags:'])],
        ['fechamento ... removido',
          '---\ntitle: R\n...\n\ncorpo',
          gone(N('---\ntitle: R\n...\n\ncorpo'), ['title: R'])],
      ];
      return cases.map(([nome, , problemas]) => ({ nome, problemas }));
    });

    for (const c of r) {
      expect(c.problemas, `${c.nome}: ${c.problemas.join(' | ')}`).toEqual([]);
    }
    expect(errors).toEqual([]);
  });

  test('normalizador: idempotente e com contrato defensivo', async ({ page }) => {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof MarkdownNormalize === 'object');

    const r = await page.evaluate(() => {
      const N = MarkdownNormalize.normalize;
      const docs = [
        '---\ntitle: X\n---\n\n### Deep\n\n#### Deeper\n\n\n\ntexto   \n',
        '### Foo\n\n#### Bar',
        '# H\n\n\\pagebreak\n\nx\n\n\\newpage\n\ny',
        '# H\n\na\n\n---\n\nb',
        '# H\n\n```\n\\pagebreak\n```\n',
        'texto normal\r\ncom CRLF\r\n\r\n\r\nfim',
        '',
        '   ',
      ];
      const naoIdempotentes = docs.filter(d => d.trim() !== '' && N(N(d)) !== N(d));
      const crlfOk = N('a\r\n\r\n\r\n\r\nb') === 'a\n\nb';
      const defensivo = [null, undefined, 42, {}, [], true, NaN, '   ', '']
        .every(v => N(v) === '');
      return { naoIdempotentes, crlfOk, defensivo };
    });

    expect(r.naoIdempotentes, 'documentos que quebram a idempotência').toEqual([]);
    expect(r.defensivo, 'contrato defensivo: input inválido tem de retornar ""').toBe(true);
    expect(r.crlfOk, 'CRLF tem de virar LF e colapsar blanks').toBe(true);
  });

  test('normalizador: \\pagebreak e \\newpage convertem, --- nunca', async ({ page }) => {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof MarkdownNormalize === 'object');

    const r = await page.evaluate(() => {
      const N = MarkdownNormalize.normalize;
      return {
        // linha inteira
        pagebreakSozinho: N('# H\n\n\\pagebreak\n\nx').includes('<div class="page-break"></div>'),
        newpageSozinho: N('# H\n\n\\newpage\n\nx').includes('<div class="page-break"></div>'),
        // no meio da frase = texto literal
        dentroDaFrase: !N('# H\n\ntexto \\pagebreak mais').includes('page-break'),
        // dentro de bloco de código = verbatim
        emFence: !N('# H\n\n```\n\\pagebreak\n```\n').includes('page-break'),
        // --- é thematic break, nunca quebra de página
        thematicBreak: !N('# H\n\na\n\n---\n\nb').includes('page-break'),
      };
    });

    expect(r.pagebreakSozinho).toBe(true);
    expect(r.newpageSozinho).toBe(true);
    expect(r.dentroDaFrase).toBe(true);
    expect(r.emFence).toBe(true);
    expect(r.thematicBreak).toBe(true);
  });

  test('renderiza o fixture e monta o documento de impressão', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof MarkdownNormalize === 'object');

    await page.evaluate(fixture => {
      const ta = document.getElementById('markdown-input');
      ta.value = fixture;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, fs.readFileSync(FIXTURE, 'utf8'));

    await page.waitForTimeout(600);

    // Critérios 2 e 3 partly: o frontmatter não pode vazar e o --- não pode
    // virar quebra de página.
    const view = await page.evaluate(() => {
      const c = document.getElementById('preview-content');
      return {
        pageBreaks: c.querySelectorAll('.page-break').length,
        hrs: c.querySelectorAll('hr').length,
        frontmatterVazado: /author:\s*Fixture do gate/.test(c.textContent),
        theadDisplay: getComputedStyle(c.querySelector('thead')).display
      };
    });

    expect(errors, `erros de página: ${errors.join('; ')}`).toEqual([]);
    expect(view.pageBreaks, '\\pagebreak deve virar .page-break').toBe(1);
    expect(view.hrs, '--- deve continuar thematic break').toBe(1);
    expect(view.frontmatterVazado, 'frontmatter nao pode vazar').toBe(false);
    expect(view.theadDisplay).toBe('table-header-group');

    // Monta o documento de impressão com a função de produção
    // (PDFGenerator.buildPrintDocument — M1/M2): o gate testa o código real,
    // não uma cópia do CSS inline. O corpo já vem do preview sanitizado.
    const docs = await page.evaluate(() => {
      const theme = ThemeManager.get(App.currentIndex);
      const base = {
        ...PDFGenerator.defaultSettings,
        pageNumberPosition: 'bottom-center'
      };
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
  });

  test('PDF sem numeração não tem contador de página', async ({ page }) => {
    await page.setContent(fs.readFileSync(path.join(__dirname, '.print-doc-nonumber.html'), 'utf8'));
    await page.pdf({ path: path.join(__dirname, '.out-nonumber.pdf'), format: 'A4', printBackground: true });
  });

  test('PDF com numeração numera a partir da segunda página', async ({ page }) => {
    await page.setContent(fs.readFileSync(path.join(__dirname, '.print-doc.html'), 'utf8'));
    await page.pdf({ path: path.join(__dirname, '.out-numbered.pdf'), format: 'A4', printBackground: true });
  });
});

test.describe('numeração opcional — controles', () => {
  test('modal expõe toggle e as posições traduzidas nos 3 idiomas', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // O produto persiste as preferencias do modal, então o estado pode vir de
    // um teste anterior. Este teste afirma os DEFAULTS de fábrica — limpa antes.
    await page.addInitScript(() => {
      try { localStorage.removeItem('md2pdf_pdfSettings'); } catch (e) {}
    });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof PDFGenerator === 'object' && typeof I18n === 'object');

    const view = await page.evaluate(() => {
      PDFGenerator.init();
      PDFGenerator.showSettings();
      const q = s => document.querySelector(s);
      const toggle = q('#pdf-show-page-numbers');
      const pos = q('#pdf-page-number-position');
      const group = q('#pdf-page-number-position-group');
      return {
        modalAberto: !!q('[data-action="export"]'),
        toggleMarcadoPorPadrao: toggle ? toggle.checked : null,
        rotuloToggle: toggle ? toggle.parentElement.textContent.trim() : null,
        opcoes: pos ? [...pos.options].map(o => o.value) : [],
        posicaoPadrao: PDFGenerator.settings.pageNumberPosition,
        grupoVisivelPorPadrao: group ? !group.hidden : null
      };
    });

    expect(errors).toEqual([]);
    expect(view.modalAberto).toBe(true);
    expect(view.toggleMarcadoPorPadrao).toBe(true);
    expect(view.posicaoPadrao).toBe('bottom-center');
    expect(view.grupoVisivelPorPadrao).toBe(true);
    // Toda região exposta precisa existir na tabela de posições do produto
    for (const key of ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']) {
      expect(view.opcoes).toContain(key);
    }
    // pt / en / es traduzidos — string sem tradução cairia na chave crua
    const i18n = await page.evaluate(() => {
      const out = {};
      for (const lang of ['pt-BR', 'en', 'es']) {
        I18n.currentLang = lang;
        out[lang] = {
          numbering: I18n.t('pageNumbering'),
          position: I18n.t('pageNumberPosition'),
          bottomCenter: I18n.t('positionBottomCenter'),
          topRight: I18n.t('positionTopRight')
        };
      }
      I18n.currentLang = 'pt-BR';
      return out;
    });
    for (const lang of ['pt-BR', 'en', 'es']) {
      for (const [k, v] of Object.entries(i18n[lang])) {
        expect(v, `${lang}.${k} não traduzido`).not.toBe(k);
        expect(v.trim().length, `${lang}.${k} vazio`).toBeGreaterThan(0);
      }
    }
    expect(new Set(Object.values(i18n).map(v => v.numbering)).size).toBe(3);
  });

  test('toggle controla a visibilidade e a posição persiste', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.removeItem('md2pdf_pdfSettings'); } catch (e) {}
    });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof PDFGenerator === 'object');

    const r = await page.evaluate(() => {
      PDFGenerator.init();
      PDFGenerator.showSettings();
      const toggle = document.querySelector('#pdf-show-page-numbers');
      const group = document.querySelector('#pdf-page-number-position-group');

      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));
      const ocultaDesligado = group.hidden;
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));
      const visivelLigado = !group.hidden;

      document.querySelector('#pdf-page-number-position').value = 'top-right';
      document.querySelector('[data-action="export"]').click();
      // Storage usa o prefixo `md2pdf_`
      const salvo = JSON.parse(localStorage.getItem('md2pdf_pdfSettings') || '{}');

      return {
        ocultaDesligado,
        visivelLigado,
        posicaoAplicada: PDFGenerator.settings.pageNumberPosition,
        posicaoPersistida: salvo.pageNumberPosition
      };
    });

    expect(r.ocultaDesligado).toBe(true);
    expect(r.visivelLigado).toBe(true);
    expect(r.posicaoAplicada).toBe('top-right');
    expect(r.posicaoPersistida).toBe('top-right');

    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('md2pdf_pdfSettings') || '{}');
      s.pageNumberPosition = 'posicao-que-nao-existe';
      localStorage.setItem('md2pdf_pdfSettings', JSON.stringify(s));
      PDFGenerator.init();
    });
    const fallback = await page.evaluate(() => PDFGenerator.settings.pageNumberPosition);
    expect(fallback, 'posição inválida deve cair no padrão').toBe('bottom-center');
  });
});
