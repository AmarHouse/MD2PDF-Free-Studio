# API — md2pdf

Dono: arquiteto. **Este produto não tem backend e não expõe endpoints
REST/HTTP próprios.** A única "API" é a **API interna de JavaScript** — os
módulos globais que os scripts se chamam entre si. Este documento lista
somente o que existe no código (verificado por leitura em 2026-10-02);
nada aqui foi inventado. O que não pôde ser confirmado está marcado como
**não verificado**.

## 1. Contrato de carregamento (wiring)

Ordem de scripts em `index.html:342-364` (todos `defer`, ordem de documento
preservada):

```
1.  marked 9.1.2 (CDN)                  index.html:342
2.  jszip 3.10.1 (CDN)                  index.html:343
3.  FileSaver 2.0.5 (CDN)               index.html:344
4.  js/vendor/dompurify.min.js          index.html:347   ← antes de sanitize (ADR-003)
5.  js/sanitize.js                      index.html:348   ← antes de preview
6.  js/i18n.js                          index.html:350
7.  js/storage.js                       index.html:351
8.  js/themes.js                        index.html:352
9.  js/markdown-normalize.js            index.html:353   ← antes de preview
10. js/preview.js                       index.html:354   ← antes do 1º render
11. js/find-replace.js                  index.html:355
12. js/stats.js                         index.html:356
13. js/image-manager.js                 index.html:357
14. js/templates.js                     index.html:358
15. js/theme-editor.js                  index.html:359
16. js/pdf-generator.js                 index.html:360
17. js/epub-generator.js                index.html:361
18. js/pix.js                           index.html:362
19. js/editor.js                        index.html:363
20. js/app.js                           index.html:364   ← último: App.init() no DOMContentLoaded
```

Restrição funcional: `DOMPurify` (4) **antes** de `Sanitize` (5) **antes**
de `Preview` (10) — o primeiro render só ocorre em `App.init()`
(`app.js:561`, `DOMContentLoaded`), então a ordem é garantida, mas invertê-la
quebra o fail-closed (sem DOMPurify, `Sanitize.html` devolve `''`).

## 2. Módulos globais e o que expõem

Todos os módulos são globais (`const X = {...}` ou IIFE). Nomes e membros
verificados por leitura.

### App — `js/app.js` (composição e boot)

`App`: `init()`, `cacheDOM()`, `populateThemes()`, `bindEvents()`,
`cycleTheme(dir)`, `handleFileUpload(e)`, `readFile(file)`,
`insertAtCursor(text)`, `insertMarkdown(prefix, suffix)`, `showToast(msg,
type='info')`, `processSpecialBlocks(html)`, `loadAccentColor()`,
`updateWelcome()`, `updatePreview()`, `initMobileTabs()`,
`setupResizeHandle()`. Props: `currentIndex`, `dom` (input, preview, select,
btnPrev/Next/Random, tocCheck, mdInput, btnUploadMd, exportBtn, toastArea).
`App.closeModal` **não existe** (chamado em `themes.js:3752`, ver
ARCHITECTURE.md §6).

`ModalManager` (mesmo arquivo): `create({title, size='md', content,
buttons=[]})` → retorna o overlay (`Element`); `close(modal)`. Constantes:
`SIZES_ALLOWED`, `BTN_CLASS_RE`, `ACTION_RE`. **Contrato**: `title` e
`buttons[].text` são TEXTO (via `textContent`); `buttons[].class`/`action`
validados por regex; `content` é **HTML por contrato** (P13) — os 9
chamadores atuais não passam dado não-confiável (auditado no gate de
segurança, rodada 3).

### Preview — `js/preview.js`

`init()`, `initScrollSync()`, `loadThemeFonts(theme)`, `update()`
(debounce 150 ms), `render()`, `renderSync()`. Props: `debounceTimer`,
`DEBOUNCE_DELAY: 150`, `fontLinkEl`, `syncing`. `render`/`renderSync` são o
único lugar que escreve o sink do preview:
`marked.parse(MarkdownNormalize.normalize(text))` →
`App.processSpecialBlocks(html)` → `App.dom.preview.innerHTML =
Sanitize.html(html)` (`preview.js:90-93` / `:111-114`).

### Editor — `js/editor.js`

`init()`, `executeAction(action)`, `insertHeading()`, `wrapSelection(prefix,
suffix)`, `insertLinePrefix(prefix)`, `insertCodeBlock()`, `insertLink()`,
`insertTable()`, `insertFootnote()`, `insertAtCursor(text)`,
`setupKeyboardShortcuts()`, `setupTabSupport()`, `setupAutoSaveShortcut()`,
`saveState()`, `undo()`, `redo()`, `showProjectManager()`,
`showVersionHistory(projectName)`, `showShortcutsModal()`,
`toggleFullscreenPreview()`, `cycleLanguage()`. Props: `undoStack`,
`redoStack`, `maxUndo: 50`.

### PDFGenerator — `js/pdf-generator.js`

`init()` (lê `md2pdf_pdfSettings` e coage — N11), `showSettings()` (modal),
`getBookTitle()`, `buildPrintDocument({html, theme, settings, title})`,
`generate()` (async). Props/constantes: `defaultSettings` (pageSize a4,
orientation portrait, margens 25/25/30/25 mm, watermark '', opacity 0.1,
size 48, rotation −45, showPageNumbers true, position bottom-center),
`pageNumberPositions` (6 posições de margin box), `settings`.

### EPUBGenerator — `js/epub-generator.js`

`generate()` (async) — único membro. Lê o DOM na hora (sem estado
persistido); `Sanitize.html` no corpo e no título; JSZip + `saveAs`.

### Sanitize — `js/sanitize.js` (fronteira de segurança, ADR-003)

`html(dirty, opts)`, `watermark(value)`, `color(value)`, `attr(value)` —
contratos detalhados na §3. Internos: `OPTIONS = {}`, `WATERMARK_BLOCKED`,
`COLOR_RE`, `COLOR_BLOCKED`.

### MarkdownNormalize — `js/markdown-normalize.js`

`normalize(text)` — único membro exposto. Contrato na §3.

### ThemeManager — `js/themes.js` (após `THEMES`, 50 temas)

`init()`, `getAll()`, `getGroups()`, `getThemeById(id)`, `get(id)`,
`getThemeCSS(theme)`, `getPrintCSS(theme)`, `getColorOverride()`,
`buildThemeCSS(theme)` (**side-effect**: cria `<style id="theme-style">`,
não retorna CSS), `renderList()`, `selectTheme(themeId)`,
`updatePreview()`, `initThemeEditor()`, `applyCustomTheme(theme)`,
`resetToDefault()`, `saveUserTheme(theme)`.

Também globais em `themes.js`: `getGoogleFontsLink(headFont, bodyFont)` →
string (HTML `<link>` ou `''`; usada por `preview.js:68` e
`pdf-generator.js:228`); shim `StorageManager` (`getSettings()`/
`updateSettings(partial)` sobre `md2pdf_settings`, criado por capacidade
porque `window.StorageManager` é a interface nativa da Storage API no
Chromium).

### Storage / ProjectManager / AutoSave — `js/storage.js`

`Storage`: `PREFIX: 'md2pdf_'`, `save(key, value)` → boolean, `load(key)` →
parsed|null, `remove(key)`, `clear()`, `getUsage()` → number,
`formatSize(bytes)` → string.

`ProjectManager`: `KEY: 'projects'`, `MAX_VERSIONS: 20`,
`MAX_NAME_LENGTH: 100`, `sanitizeProjectName(name)` → string|null,
`isValidProjectName(name)` → boolean, `getAll()` → object, `get(name)` →
project|null, `saveProject(name, data)` → boolean, `deleteProject(name)`,
`renameProject(oldName, newName)`, `getVersions(name)` → array,
`restoreVersion(name, index)` → version|null, `exportProject(name)` →
string|null (JSON), `importProject(jsonString)` → boolean, `listNames()` →
string[].

`AutoSave`: `INTERVAL: 30000`, `enabled`, `init()`, `start()`, `stop()`,
`save()` (grava `md2pdf_autosave`), `restore()` → boolean, `toggle()`.

### ImageManager — `js/image-manager.js`

Constantes: `IMGBB_API_KEY` (hardcoded, pública), `IMGBB_API_URL`,
`ALLOWED_IMAGE_HOSTS` (imgur.com, imgbb.com, cloudinary.com, unsplash.com).
Métodos: `init()`, `bindEvents()`, `showInsertModal()`,
`setupModalEvents(modal)`, `insertFromUrl(url, alt)`, `insertFromUpload(...)`
(async), `isValidImageUrl(url)` → boolean, `fetchImageForEPUB(url)` (async),
`getMimeType(url)` → string, `getExtension(url)` → string.

### FindReplace — `js/find-replace.js`

`init()`, `toggle(showReplace=false)`, `close()`, `find()`, `goToMatch(index)`,
`findNext()`, `findPrev()`, `replace()`, `replaceAll()`, `updateInfo()`,
`clearHighlights()`. Props: `active`, `matches`, `currentIndex`.

### Stats — `js/stats.js`

`update()`, `updateDisplay(...)`, `updateStatusBar(...)`,
`showStatsModal()`. Interpola só números (`toLocaleString`) e constantes
i18n — sem vetor (S7). Side-effect de load: injeta `statsStyle` no `<head>`.

### I18n — `js/i18n.js`

`t(key)` → string, `setLang(lang)`, `updateUI()`. Props: `currentLang`,
`translations` (pt-BR/en/es).

### Templates — `js/templates.js`

`showSelector()`, `apply(templateId)`, `showCoverEditor()`. Props:
`activeTemplate`, `templates` (constantes do produto; **corpo dos métodos e
dos templates não lido integralmente — não verificado**).

### ThemeEditor — `js/theme-editor.js`

`showEditor(existingTheme=null)`, `bindEditorEvents(modal)`,
`updateLivePreview(modal)`, `saveTheme(modal)`, `getFontOptions(selected)`.
Prop: `editingTheme`. Grava via `ThemeManager.saveUserTheme` (chave
`userThemes`).

### PIX — `js/pix.js` (funções globais, não é objeto)

`PIX_CONFIG` (chave `pedroluz@yahoo.com`), `pixTlv(tag, value)` →
string, `crc16ccitt(str)` → string, `generatePixPayload(chave, nome,
cidade, amount, message)` → string (BR Code), `openPixModal()`,
`closePixModal()`, `selectPixValue(val, btn)`, `generatePix()` (monta QR via
`api.qrserver.com`), `copiarPix()`.

### Bibliotecas de terceiros (globais)

`marked` (9.1.2), `JSZip` (3.10.1), `saveAs` (FileSaver 2.0.5),
`window.DOMPurify` (3.4.16 self-hosted).

## 3. Funções públicas com contrato (as que o resto do código chama)

### `Sanitize.html(dirty, opts)` → string  — `sanitize.js:35-49`

- **Contrato defensivo**: `dirty` não-string → `''`. Sem `window.DOMPurify`
  → `''` + `console.error` + toast (uma vez) — **fail-closed** (ADR-003 D2).
- `opts` (opcional) é mesclado sobre `OPTIONS = {}` (default do DOMPurify,
  sem acréscimos — P8 removido). Permite `data:` em `img[src]` por default
  do DOMPurify; **não** em `a[href]`.
- **Uso**: sink dos 3 caminhos — preview (`preview.js:93,114`), corpo da
  janela de impressão (`pdf-generator.js:295` dentro de `buildPrintDocument`)
  e XHTML do EPUB (`epub-generator.js:17` e `:90` título).

### `Sanitize.watermark(value)` → string — `sanitize.js:51-54`

- Contrato: não-string → `''`; remove `[<>"\\&{}\r\n\f]` (denylist dos
  caracteres que fecham string CSS/atributo — P2/P11) e faz `trim()`.
- **Uso**: 2 pontos — leitura no modal (`pdf-generator.js:175`) e sink CSS
  (`pdf-generator.js:270`).

### `Sanitize.color(value)` → string — `sanitize.js:65-72`

- Contrato: não-string → `'#333'`; allowlist `COLOR_RE`
  (`#hex` 3-8, `rgb()/rgba()`, `hsl()/hsla()`, case-insensitive) + bloqueio
  de `[;{}"'<>\\\n\r\f]`; inválido → `'#333'` (neutro).
- **Uso**: `themes.js` (`getPrintCSS`, `buildThemeCSS`, `renderList`) e
  setters CSSOM do preview do editor.

### `Sanitize.attr(value)` → string — `sanitize.js:79-87`

- Contrato: não-string → `''`; escapa na ordem `& < > " '`. Para slots de
  TEXTO em markup confiável do produto (atributo duplo-quotado e
  `<textarea>` RCDATA) — não é sanitizador de HTML.
- **Uso**: `theme-editor.js:26,43-44,61` e `pdf-generator.js:135`.

### `MarkdownNormalize.normalize(text)` → string — `markdown-normalize.js:292-301`

- Contrato defensivo: não-string → `''`; vazio → `''`; só-whitespace →
  `''` (sem lançar). **Idempotente** (`normalize(normalize(x)) ===
  normalize(x)`); cache de 1 entrada. Normaliza CRLF→LF, remove BOM,
  frontmatter YAML inicial, rebaixa hierarquia de títulos, colapsa 3+
  blanks, remove espaços à direita, converte `\pagebreak`/`\newpage`
  (linha inteira) em `<div class="page-break"></div>`. Blocos de código
  são verbatim.
- **Uso**: antes de todo `marked.parse` (`preview.js:91,112`,
  `epub-generator.js:15`).

### `PDFGenerator.buildPrintDocument({ html, theme, settings, title })` → string — `pdf-generator.js:199-373`

- **Função pura** (M1/M2): sem `window.open`, `document.write`, timers ou
  toast — o gate de teste chama a mesma função que o `generate()` usa.
- Contrato defensivo: `settings` parcial/ausente cai nos `defaultSettings`
  (mesclado e **re-coagido** numericamente via `num()` — S4); `theme`
  ausente → `ThemeManager.get(0)`; `pageSize` inválido → `a4`; posição de
  número inválida → `bottom-center`; `title` não-string/vazio →
  `'Documento'` (escapado com `esc()`: `& < > "`).
- Sanitiza **dentro** da função: corpo via `Sanitize.html(html)` (`:295`) e
  marca d'água via `Sanitize.watermark(s.watermark)` (`:270`) — fronteira
  no sink.
- Retorna documento HTML completo (string) com `@page` (tamanho/margens),
  numeração opcional (`counter(page)` + `@page :first`), CSS do tema,
  Google Fonts e o perfil de impressão (PRINT-PROFILE.md).

### `PDFGenerator.generate()` → Promise — `pdf-generator.js:375-405`

- Lê `#preview-content` (já sanitizado), `getBookTitle()`, tema atual;
  `window.open('', '_blank')` (throw se popup bloqueado — `:384`);
  `document.write(buildPrintDocument(...))`; `print()` após 500 ms; toast
  "PDF pronto!" emitido antes de qualquer PDF existir (mensagem enganosa —
  dívida registrada, ADR-001).

### `ProjectManager.importProject(jsonString)` → boolean — `storage.js:162-177`

- `JSON.parse` em try/catch; exige `name` string válida (`isValidProjectName`),
  `current` objeto, `current.markdown` string, `current.themeId` número se
  presente; grava só via `saveProject` (que revalida). Payload hostil →
  `false`, sem gravar (P10/S3, P12).

### `ProjectManager.saveProject(name, data)` → boolean — `storage.js:100-121`

- Revalida nome (`isValidProjectName`, inclui rejeição de chaves de
  protótipo) e `data` (`object` com `markdown` string). Mantém até 20
  versões. Grava `md2pdf_projects`.

### `ImageManager.isValidImageUrl(url)` → boolean — `image-manager.js:262-297`

- Fronteira defensiva: não-string → `false`; rejeita `"<>` na string crua;
  `new URL()` em try/catch; `data:` só `data:image/`; protocolo só
  `http(s)`; hostname parseado (allowlist com subdomínios) ou extensão de
  imagem no `pathname` (nunca na string crua). Vetor `?x=" onerror="` morre
  no teste da string crua (P7/A12).

### `Storage.save(key, value)` → boolean / `Storage.load(key)` → parsed|null — `storage.js:8-26`

- Grava `JSON.stringify(value)` sob `md2pdf_<key>`; `QuotaExceededError` →
  `false` + `console.warn` (**silencioso para o usuário — P5**). `load`
  devolve `null` em erro/ausência.

### `ModalManager.create({title, size='md', content, buttons=[]})` → Element — `app.js:24-72`

- Contrato S1: `title`/`buttons[].text` via `textContent`; `class`/`action`
  via regex `^[A-Za-z0-9_-]+$` (senão default/descarte); `size` validado por
  `SIZES_ALLOWED`; `content` **HTML por contrato** (P13). Retorna o overlay;
  o caller faz `querySelector` para ligar eventos.

## 4. Persistência (`localStorage`)

Via wrapper `Storage` (prefixo `md2pdf_`):

| Chave | Escrita | Conteúdo |
|---|---|---|
| `md2pdf_projects` | `ProjectManager.saveProject` | `{ nome: { created, updated, current: { markdown, themeId }, versions: [...] } }` |
| `md2pdf_autosave` | `AutoSave.save` | `{ markdown, themeId, tocEnabled, timestamp }` |
| `md2pdf_autoSaveEnabled` | `AutoSave.toggle` / `AutoSave.init` | boolean |
| `md2pdf_pdfSettings` | `PDFGenerator` (modal export) | `defaultSettings` + numeração |
| `md2pdf_language` | `I18n.setLang` | `'pt-BR'` / `'en'` / `'es'` |

Direto (fora do wrapper — inconsistência de acesso, verificada por leitura):

| Chave | Escrita | Conteúdo |
|---|---|---|
| `md2pdf_settings` | `app.js` (accent picker), `themes.js` (shim `StorageManager`) | `{ accentColor, themeId }` — **com** prefixo, mas acesso direto |
| `customTheme` | `themes.js` (`initThemeEditor`, `resetToDefault`) | tema custom (JSON) — **sem** prefixo `md2pdf_` |
| `userThemes` | `themes.js` (`saveUserTheme`) | lista de temas do usuário (JSON) — **sem** prefixo `md2pdf_` |

## 5. Dependências de runtime

| Dependência | Versão | Origem | Nota |
|---|---|---|---|
| `marked` | 9.1.2 | CDN cdnjs (`index.html:342`) | Sem SRI — **P3**; não sanitiza desde a v5 |
| `jszip` | 3.10.1 | CDN cdnjs (`index.html:343`) | Sem SRI — **P3** |
| `FileSaver.js` (`saveAs`) | 2.0.5 | CDN cdnjs (`index.html:344`) | Sem SRI — **P3** |
| font-awesome | 6.4.0 | CDN cdnjs (`index.html:71`) | Sem SRI — **P3** |
| **DOMPurify** | **3.4.16** | **self-hosted** `js/vendor/dompurify.min.js` | ADR-003 D1; pré-cacheado no SW (`sw.js:23`); hash vs. upstream npm **não verificado** (pinar na release) |
| Google Fonts | — | `fonts.googleapis.com` / `fonts.gstatic.com` (`index.html:60`) | CSS + fontes dos temas; SW stale-while-revalidate |
| `api.qrserver.com` | — | PIX (`pix.js:102-104`) | Terceiro; payload PIX no GET — **P4** |
| `api.imgbb.com` | — | upload de imagem (`image-manager.js:11,214`) | Chave pública hardcoded (DoS por cota — observação do gate) |
| Service worker | — | `sw.js` (local) | Cache-first local, stale-while-revalidate CDN, network-first imagem/outros; `CACHE_VERSION 'v4'` (F1 resolvido) |

Sem build step (ADR-002): nenhuma dessas dependências passa por bundler;
`package.json` só tem devDependencies (`@playwright/test`, `serve`).

## 6. O que NÃO há

- **Sem endpoints próprios** — nenhuma rota, nenhuma API REST/HTTP do
  produto (o `_redirects` é vazio; o deploy é estático).
- **Sem autenticação** — sem login, sessão, tokens ou controle de acesso.
- **Sem chave de API obrigatória** — a chave ImgBB é pública e embutida no
  cliente (modelo ImgBB esperado); nenhuma configuração de ambiente é
  necessária.
- **Sem `.env` real** — `.env.example` existe por convenção da fábrica e é
  apenas um comentário: o produto não consome variável de ambiente alguma.
- **Sem banco** — a única persistência é `localStorage` (§4).