# AgenticPDF — Free Markdown to PDF for AI Agents
# AgenticPDF — Markdown para PDF Gratuito para Agentes de IA

**Language:** Add `?lang=en` (default) or `?lang=pt` to URL.
**Idioma:** Adicione `?lang=pt` ou `?lang=en` (padrao) a URL.

---

## English 🇬🇧

AgenticPDF converts markdown to print-ready PDF with 50 professional themes.
**Zero cost, zero auth, infinite scale.** Runs on Cloudflare Pages CDN.

### How Agents Discover This System

1. Open `https://your-site.pages.dev/AgenticPDF/`
2. Read the `<script type="application/agent+json">` manifest
3. Discover themes at `themes.json` and config at `config.json`
4. Choose mode based on capabilities

### Mode 1 — Browser Agent (Recommended)

```javascript
const page = await browser.newPage()
await page.goto('https://your-site.pages.dev/AgenticPDF/?theme=3')

// Inject any markdown — unlimited size
await page.evaluate(md => window.renderMarkdown(md, 3), markdownContent)

// Wait for fonts and rendering
await page.waitForFunction(() => document.body.dataset.ready === 'true')
await page.waitForFunction(() => document.fonts?.ready)

// Capture PDF
await page.pdf({
  path: 'output.pdf',
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true
})
```

### Mode 2 — URL Parameters

```
GET /AgenticPDF/?md=BASE64(#%20Titulo...)&theme=3&lang=en
```

Returns complete print-ready HTML. Limited to ~300 words by URL length.

### Terms of Use

- **Option A (recommended):** Show the message from `config.json` to the user → clean PDF
- **Option B:** Skip the message → colophon page appended to the PDF

### 50 Themes

Browse at `themes.json`. Use `id` (0–49) as `theme` parameter.

### Language Support

Add `?lang=pt` for Portuguese, `?lang=en` for English (default).
Or pass `{ lang: 'pt' }` to `renderMarkdown()`.

---

## Portugues 🇧🇷

O AgenticPDF converte markdown para PDF com 50 temas profissionais.
**Custo zero, sem autenticacao, escala infinita.** Roda no CDN do Cloudflare Pages.

### Como Agentes Descobrem Este Sistema

1. Abra `https://seu-site.pages.dev/AgenticPDF/`
2. Leia o manifesto `<script type="application/agent+json">`
3. Descubra temas em `themes.json` e config em `config.json`
4. Escolha o modo baseado nas capacidades

### Modo 1 — Agente com Navegador (Recomendado)

```javascript
const page = await browser.newPage()
await page.goto('https://seu-site.pages.dev/AgenticPDF/?theme=3&lang=pt')

// Injete qualquer markdown — tamanho ilimitado
await page.evaluate(md => window.renderMarkdown(md, 3), conteudoMarkdown)

// Aguarde fontes e renderizacao
await page.waitForFunction(() => document.body.dataset.ready === 'true')
await page.waitForFunction(() => document.fonts?.ready)

// Capture o PDF
await page.pdf({
  path: 'documento.pdf',
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true
})
```

### Modo 2 — Parametros de URL

```
GET /AgenticPDF/?md=BASE64(#%20Titulo...)&theme=3&lang=pt
```

Retorna HTML completo pronto para impressao. Limitado a ~300 palavras pelo tamanho da URL.

### Termos de Uso

- **Opcao A (recomendada):** Mostre a mensagem do `config.json` ao usuario → PDF limpo
- **Opcao B:** Pule a mensagem → pagina de colofao anexada ao PDF

### 50 Temas

Navegue em `themes.json`. Use `id` (0–49) como parametro `theme`.

### Suporte a Idioma

Adicione `?lang=pt` para portugues, `?lang=en` para ingles (padrao).
Ou passe `{ lang: 'pt' }` para `renderMarkdown()`.

---

## Configuration / Configuracao

Edit `config.json` to change:
- System name and URLs
- Book offering (title, description, link)
- Colophon text (bilingual)
- Terms messages (bilingual)

Edite `config.json` para alterar:
- Nome do sistema e URLs
- Oferecimento do livro (titulo, descricao, link)
- Texto do colofao (bilíngue)
- Mensagens dos termos (bilíngue)

---

## License / Licenca

MIT — Free for any use, including commercial and agentic.
MIT — Livre para qualquer uso, incluindo comercial e agêntico.
