# IMPLEMENTATION-NOTES — P1/P2 sanitização (md2pdf)

Engineer notes da mudança R3 "md2pdf-sanitize-p1" (plano
`.factory/plans/md2pdf-sanitize-p1.md`). Critérios A1–A10 todos passando no
`npx playwright test` (16/16, ver relatório do engineer).

## Fora desta delegação (registrado, não escondido)

- **M1/M2** (gate chamar o código de produção): o plano lista em "Ordem" como
  passo 3, separado de P1+P2 (passo 2). Esta delegação cobriu P1+P2 apenas;
  o `test/print-profile.spec.js` continua replicando o documento de impressão
  até o M1/M2 ser delegado.
- **P3–P6, CSP (D3)** — follow-ups registrados no plano/SECURITY-REVIEW.

## Decisões de implementação (dentro do escopo, com razão)

### 1. `data:` em `a[href]` exige `ADD_DATA_URI_TAGS: ['a']` — confirmado por PoC

O DOMPurify 3.4.16 **bloqueia** `data:` em `a[href]` por padrão
(verificado empiricamente: `DOMPurify.sanitize('<a href="data:text/plain,ola">x</a>')`
→ `<a>x</a>`). A decisão do plano exige `data:` em `a[href]`, então o
`Sanitize.html` usa `ADD_DATA_URI_TAGS: ['a']`. `img[src]` com `data:` já é
aceito por padrão (img está em `DATA_URI_TAGS`). Provado por teste A6.
Risco residual registrado: `data:` em âncora é vetor de navegação em
browsers legados; navegadores modernos bloqueiam navegação top-level `data:`.

### 2. Marca d'água sanitizada também na leitura (não só no sink CSS)

O plano manda sanitizar "antes de interpolar no CSS". A **mesma** string é
interpolada num segundo ponto: `value="${this.settings.watermark}"` no
re-render do modal (`showSettings`) — um `"` no valor quebraria o atributo e
injetaria handler (`onfocus=`). O `init()` zera a marca d'água persistida, então
o vetor só existe na mesma sessão, mas sanitizar na leitura
(`pdf-generator.js:148`) fecha os dois pontos com uma linha. O sink do CSS
continua sanitizando também (fronteira defensiva). Testes A8 + unit
(`Sanitize.watermark`) cobrem.

### 3. EPUB: título passa pelo sanitizador (completa A9)

`bookTitle` é interpolado cru em `<title>`, `<dc:title>` e na nav do XHTML.
Um primeiro heading hostil (`# </title><script>...`) injetaria `<script>` no
EPUB gerado — violando A9 ("não contém on*= nem <script>"). `bookTitle` agora
passa por `Sanitize.html(...)` em `epub-generator.js:90`. Provado no teste A9
(título hostil → `<title>` limpo).

### 4. EPUB: void elements self-closed (completa A9 "XHTML válido")

O serializer HTML do `DOMParser` emite `<img>`/`<hr>`/`<br>` **sem** a barra
de self-closing; interpolado no template XHTML, o XML fica malformado
(parse error em `content.xhtml`). Defeito pré-existente (o marked já emitia
`<img>` sem `/`), mas A9 exige "XHTML válido" — corrigido com replace
quote-aware dos void elements no `contentHTML` final (antes do template).
Provado no teste A9 (imagem data: embutida + `<hr>` presentes, `parsererror`
= 0).

## Residual pré-existente registrado (NÃO corrigido nesta mudança)

- **`&` no título do EPUB**: `DOMPurify.sanitize('Título & Teste')` não
  escapa `&` em texto puro (verificado por execução). Título com `&` continua
  gerando XHTML inválido em `content.xhtml` (via `bookTitle`) e em `nav.xhtml`
  (via `innerText` do TOC, `epub-generator.js:30`). Sem impacto de segurança
  (não executa); é bug de serialização pré-existente, mesma classe do item 4,
  fora do escopo P1/P2. Dono sugerido: engineer, follow-up.
- **`getBookTitle()` (pdf-generator.js)**: filtro denylist por caracteres de
  nome de arquivo Windows — frágil por desenho (registrado no SECURITY-REVIEW
  P2). Não tocado; verificado não explorável no contexto atual.
- **`preview.js:95-96/111-112`**: `buildThemeCSS(theme)` é função de side
  effect (não retorna CSS) e o retorno é atribuído a `styleEl.innerHTML`
  (vira texto "undefined" inerte). Código latente pré-existente, não tocado.

## Ambiente / artefatos

- `serve.log` (raiz do produto): artefato de debug do servidor de teste
  (`npx serve`); não pôde ser removido (política de comandos destrutivos).
  Pode ser apagado no próximo gate.
- `test-results/`, `test/.print-doc*.html`, `test/.out-*.pdf`: artefatos do
  Playwright, já cobertos pelo `.gitignore` do produto.

---

# IMPLEMENTATION-NOTES — P7/P8 + regressão da marca d'água (md2pdf)

Delegação pós-gates de 2026-10-02 (SECURITY-REVIEW P7/P8 + CODE-REVIEW
achados 1/N2). Objetivo: fechar a classe P1 nos sinks **fora** do `marked`
(toast, preview/status de imagem), remover `data:` de `a[href]` sem requisito
(P8) e parar a regressão de caracteres na marca d'água (N2) sem reabrir o
breakout de `</style>` (P2).

## O que mudou (produção)

| Arquivo | Mudança |
|---|---|
| `js/image-manager.js` | Preview de URL via `document.createElement('img')` + `.src`/`.alt` (nunca interpolação em HTML; `onerror` virou `addEventListener`). Preview do upload (data URL) idem. Status de upload e mensagem de erro (`error.message` pode vir da API ImgBB) via `textContent` + `<i>` via DOM. `isValidImageUrl` reescrita. |
| `js/app.js` | `showToast` monta `<i>` via DOM e texto via `textContent` (visual `fas`+ícone preservado). |
| `js/sanitize.js` | `ADD_DATA_URI_TAGS: ['a']` removido (P8); `WATERMARK_ALLOWED` (allowlist estreita) virou `WATERMARK_BLOCKED` (denylist dos 9 caracteres de breakout). |

## Decisões com razão (dentro do escopo)

### 1. DOM em vez de sanitizador nos sinks de imagem (P7a/P7b)

Escolhi **criar o elemento via DOM** (`img.src = url`) em vez de passar a URL
por `Sanitize.html()`. Razão: o sanitizador limparia o HTML, mas o problema
original é a **interpolação da string crua num contexto de atributo**; com
`img.src` (propriedade IDL) a URL **não entra em contexto de atributo em
nenhum momento** — o parser HTML nunca vê a string. É a fronteira mais forte e
não depende de o DOMPurify estar presente (fail-closed não é necessário aqui).
O fallback de erro passou de atributo `onerror` inline para
`addEventListener('error')` (handler próprio, constante).

### 2. `isValidImageUrl` — hostname parseado, protocolo, pathname e guarda crua

- **Hostname**: `new URL(url).hostname` contra a lista explícita
  (`imgur.com`, `imgbb.com`, `cloudinary.com`, `unsplash.com`, com subdomínios)
  — `https://evil.com/?x=imgur.com` morre (hostname = `evil.com`).
- **Protocolo**: só `http:`/`https:` (e `data:` restrito a `data:image/`).
- **Extensão**: verificada no `parsed.pathname`, nunca na string crua — o vetor
  `a.jpg?x=" onerror="` morre (a query não participa do teste).
- **Guarda de string crua** `["<>]` (fronteira defensiva, princípio 14): uma
  URL real nunca contém `"`; se um caller futuro voltar a interpolar, o
  delimitador de atributo já não chega ao sink. **Consequência registrada**:
  `data:image/svg+xml` com `<` literal passa a ser rejeitado (o fluxo do
  produto gera `data:image/...;base64` via `readAsDataURL` — sem `<`/`>` — e
  o fluxo de URL é http(s); nenhuma feature quebrada, coberto pelo A6/A12).

### 3. Marca d'água: denylist em vez de escape (decisão registrada)

O achado 2 (N2) pedia "escapar em vez de remover, se não quebrar o
`content:`". **Não escapei.** Razão: `Sanitize.watermark` é **uma função
compartilhada por dois sinks** com escapes incompatíveis — o CSS `content:
"..."` exige `\"`/`\\`, e o atributo HTML `value="..."` do modal exige
`&quot;`/`&amp;`. Uma única string não pode ser segura nos dois contextos ao
mesmo tempo (ex.: `\"` é seguro no CSS mas **quebra** o atributo HTML).
Remover os 9 caracteres do vetor P2 (`< > " \ & { }` + CR/LF) é independente
de contexto e provadamente seguro; **todo o resto** (incluindo `º ª « » — × ÷`,
aspas tipográficas, `©®™`) é preservado. A8 continua provando o bloqueio do
breakout; A14 prova a preservação e o `content:` íntegro.

### 4. `showToast` e `type`

`type` é parâmetro interno (default `'info'`); auditei os 31 call sites:
todos usam constantes (`success`/`error`/`info`/`warning`). Mesmo forjado, vai
só para `el.className` (propriedade — sem parse de HTML) e para o ternário do
ícone (3 constantes) — sem contexto de atributo. API inalterada.

### 5. Escopo tocado além dos 3 pontos nomeados (justificado)

- `image-manager.js:125` (preview do upload): `previewUpload.innerHTML = <img
  src="${ev.target.result}">` — mesma classe de sink, na mesma função que o
  P7b mandou tratar. A data URL vem do `readAsDataURL` (base64 + mime do
  browser, sem `"`) — não explorável hoje —, mas a fronteira defensiva
  (princípio 14) manda não interpolar dado de arquivo em HTML; convertido para
  DOM pela mesma razão.
- `image-manager.js:218` (erro do upload): `Erro: ${error.message}` —
  `error.message` pode vir da **resposta da API ImgBB** (`result.error.message`),
  dado de terceiros; o texto do P7b dizia "dado de arquivo/**resposta**".
- Nenhuma mudança em `themes.js`/`templates.js`/`pdf-generator.js`/`preview.js`/
  `epub-generator.js` (assinatura de `Sanitize.html`/`Sanitize.watermark` e a
  contagem `Sanitize.watermark(` = 2 do A1 intactas).

## Testes (estendidos em `test/sanitize-p1-p2.spec.js`)

- **A6 (ajustado, P8)**: `img[src]` `data:image/` continua sobrevivendo
  (default do DOMPurify); `a[href]` com `data:` agora é **removido** (a âncora
  com o texto sobrevive) — prova que a superfície sem requisito fechou.
- **A11 (P7a, diferencial)**: payload `https://imgur.com/x?a=" onerror="alert(1)`.
  Diferencial: o sink antigo (innerHTML + onerror inline) cria o atributo
  injetado **e executa** `alert(1)` (dispatch manual de `error`, determinístico).
  Caminho corrigido (modal real): nenhum elemento `[onerror]`, nenhum `alert`,
  HTML do preview sem `onerror`. Prova positiva: URL legítima cria `<img>` via
  DOM, sem `onerror`, `src` preservado.
- **A12 (P7a, diferencial)**: os 3 bypasses (`evil.com/?x=imgur.com`,
  `x.com/a.jpg?x=" onerror="`, `imgur.com/x?a=" onerror="`) — a função antiga
  aceitava os 3, a nova rejeita os 3; `javascript:` e `data:` não-imagem
  rejeitados; subdomínio imgur, host genérico com extensão no pathname e
  `data:image/` aceitos.
- **A13 (P7c, diferencial)**: `file.name` com `<img src=x onerror=...>` — o
  sink antigo criaria o `<img>` **e o handler executa** (descoberta: o Chromium
  dispara `onerror` mesmo em subárvore destacada — usei isso como prova de
  execução, com contador isolado). O toast corrigido não contém elemento,
  texto literal, ícone preservado; `type` forjado não cria atributo.
- **A14 (N2/P2, diferencial)**: a allowlist antiga removia `º ª « » — × ÷` e
  aspas tipográficas (regressão provada); a nova preserva tudo isso **e**
  continua bloqueando `</style><script>`; `buildPrintDocument` gera o
  `content: "..."` íntegro com a marca d'água completa.
- **A15 (regressão)**: fluxo real `App.readFile(new File(...))` → toast
  `Arquivo "relatório-final-v2.md" carregado.` por extenso, sem injeção.

### Descoberta de teste (registrada)

O `sw.js` do produto (cache-first, `skipWaiting`/`claim`) **intercepta os
requests** e o `page.route` do Playwright não os enxerga — a imagem legítima
do preview caía na rede real (indeterminístico). Os testes novos rodam num
`test.describe` com `test.use({ serviceWorkers: 'block' })` (o `register()` do
`index.html` tem `.catch(() => {})` — sem pageerror; o app funciona sem SW,
que é aprimoramento de PWA). A1–A10 seguem no ambiente original.

## Verificação executada (fato, saída real)

- `npx playwright test --reporter=list` → **21/21 PASS** (16 existentes + 5
  novos A11–A15; A6 ajustado). Sem pageerror nos testes novos.
- `python test/verify-pdf.py` → **C1–C8 PASS** (5 páginas numerado/não
  numerado). Regra de ouro (preview/PDF concordam) preservada — A8 e C1–C8
  passam.

## O que NÃO foi verificado (honesto)

- **Execução em macOS/Linux com nomes de arquivo hostis reais** — só simulado
  em Chromium headless com `new File([...], '<img ...>.png')`; o comportamento
  do navegador (parsing/file.name) é o mesmo, mas não rodei nos SOs.
- **Firefox/Safari** — não testados (limitação registrada desde ADR-001); a
  correção usa APIs DOM básicas (`createElement`, `textContent`) com suporte
  universal.
- **Rede real para `i.imgur.com`** — a prova positiva do A11 usa rota
  interceptada (determinístico); não confirmei o fluxo com a rede real do
  imgur (o sink é idêntico — DOM).
- **`data:image/svg+xml` com `<` literal** — comportamento mudou (agora
  rejeitado); não há feature do produto que gere esse formato (registrado na
  decisão 2).
- **Artefatos de investigação**: dois probes temporários criados durante o
  diagnóstico foram **movidos** para `C:\Users\Admin\AppData\Local\Temp\opencode\`
  (política de comandos destrutivos impede `Remove-Item`); nenhum arquivo de
  investigação permanece no produto.

---

# IMPLEMENTATION-NOTES — M1/M2: o gate chama o código de produção (md2pdf)

Delegação do passo 3 do plano (M1/M2), após P1+P2. Objetivo: o gate de
impressão deixa de reconstruir o documento e passa a chamar
`PDFGenerator.buildPrintDocument()` — a MESMA função que o `generate()` usa
em produção.

## O que mudou

- `js/pdf-generator.js`: extraída `buildPrintDocument({ html, theme, settings, title })`
  → string, pura (sem `window.open`, `document.write`, timers, toast).
  `generate()` agora só resolve `previewContent`, `bookTitle`, `theme` e chama
  a função; o `document.write` recebe o retorno dela. Sanitização preservada
  dentro da função: corpo via `Sanitize.html(html)` e marca d'água via
  `Sanitize.watermark(s.watermark)` (fronteira defensiva no sink).
  `ThemeManager.getPrintCSS` e `getGoogleFontsLink` ficaram dentro da função
  (o documento testado é o de produção). Defaults defensivos: settings
  parcial/ausente cai nos defaults; `pageSize` inválido cai em `a4`.
- `test/print-profile.spec.js`: teste 4 agora chama
  `PDFGenerator.buildPrintDocument(...)` via `page.evaluate` e grava os
  `.print-doc*.html`; a template replicada do `<style>` (e as regras de
  compensação `#preview-content .page-break`) foi deletada. Testes 5/6
  (page.pdf) inalterados.
- `test/sanitize-p1-p2.spec.js` (A1): a asserção de grep
  `Sanitize.html(previewContent.innerHTML)` virou `Sanitize.html(html)` —
  o call site migrou para dentro de `buildPrintDocument` (mesmo sink, mesmo
  comportamento). Instrumentação segue a estrutura de produção; a contagem
  `Sanitize.watermark(` = 2 (modal + sink) permanece.

## Verificações executadas

- `npx playwright test --reporter=list` → 16/16 PASS (8 print-profile + 8
  sanitize), antes e depois da prova de cobertura.
- `python test/verify-pdf.py` → C1–C8 PASS, 5 páginas (numerado e não
  numerado). O documento do gate agora inclui o link do Google Fonts de
  produção; o PDF embute `SourceSerif4` (webfont carregou) e a paginação
  permaneceu 5 páginas — sem mudança de expectativa.
- Prova de cobertura (M1/M2): mutação temporária em produção
  (`.page-break { break-after: page }` → `auto`) fez o gate FALHAR
  (PDF 5→4 páginas; C1 "texto antes na p4, texto apos na p4" e C4
  "paginas=4 (esperado 5)"); revertido, tudo verde de novo. Antes do M1/M2
  essa mutação passaria despercebida (o spec tinha cópia própria do CSS).

## Nuance de assinatura

O plano sugere `buildPrintDocument({ html, theme, settings })` (exemplo).
Foi adicionado o parâmetro `title`: `getBookTitle()` lê `App.dom.input`
(DOM), o que quebraria a pureza da função; `generate()` continua resolvendo
o título e o passa como dado. Sem mudança de comportamento de produção.

---

# IMPLEMENTATION-NOTES — Rodadas 2 e 3 de segurança (P7/P8/N2 e S1–S8) + fecho N11/P12/N13

Registro dos fechos das rodadas 2 e 3 do gate de segurança (2026-10-02) e
dos achados não-bloqueantes do review/security do mesmo dia. O objetivo é
fechar a CLASSE "interpolar dado não-constante em `innerHTML`" (P7/P10 e
S1–S8) e os achados N11 (bug de usuário), P12 (poluição de protótipo) e
N13 (consistência de sanitização).

## Rodada 2 (gate `security-2026-10-02b`) — P7/P8/N2 (resumo + registro)

As mudanças de código da rodada 2 já estão detalhadas na seção
"P7/P8 + regressão da marca d'água" acima. O que este registro adiciona é
o fecho do gate:

- **P7 (Média → MITIGADO)**: sinks fora do `marked` (toast de arquivo,
  preview/status/erro de imagem) montados via DOM + `textContent`;
  `isValidImageUrl` reescrito (hostname/protocolo/pathname + recusa de
  `"<>` na string crua). Bypass concreto do gate anterior
  (`?x=" onerror="`) rejeitado.
- **P8 (Baixa → MITIGADO)**: `ADD_DATA_URI_TAGS: ['a']` removido;
  `data:image/` em `img[src]` segue default do DOMPurify (A6 prova os dois
  lados).
- **N2 (Média funcional → MITIGADO)**: allowlist → denylist dos 9
  caracteres de breakout (`[<>"\\&{}\r\n]`) — a pontuação pt-BR
  (`º ª « » — × ÷`, aspas tipográficas) é preservada (A14).
- **P9 (Média–Alta operacional → MITIGADO, cobertura)**: `.gitignore` da
  raiz cobre `browser-state-*.json` + `.playwright-mcp/`; apagar os 4
  arquivos do disco é ação de owner (fora do produto).
- **Achados novos da rodada 2**: P10 (Média — nome de projeto importado
  → XSS no modal) e P11 (Baixa — `\f` fora da denylist), ambos tratados na
  rodada 3 (abaixo).

## Rodada 3 (gate `security-2026-10-02c`) — S1–S8: fecho da CLASSE

Varredura sistemática de todos os sinks `innerHTML`/`document.write`/etc.
do produto; a classe "interpolar dado não-constante" foi fechada nos
caminhos com dado de terceiros:

| # | Mudança | Arquivo |
|---|---|---|
| S1 | `ModalManager.create`: `title`/`buttons[].text` via `textContent`; `class`/`action` validados por regex (token seguro ou default/descarte); `content` permanece HTML **por contrato** — os 9 chamadores auditados um a um, nenhum passa dado não-confiável (P13: contrato frágil para chamador futuro) | `js/app.js` |
| S2 | Lista de projetos do modal via `createElement` + `dataset` + `textContent` (nome nunca interpola em HTML); histórico de versões só datas/números | `js/editor.js` |
| S3 | Fronteira do storage: `isValidProjectName` (string, trim, ≤ 100, sem `[<>"'&]`) + `sanitizeProjectName`; `importProject` valida `name`/`current`/`markdown`/`themeId` **antes de gravar**; `saveProject` revalida (dupla defesa) | `js/storage.js` |
| S4 | Coerção numérica dos settings em `init()` **e** em `buildPrintDocument` (fronteira L3); título escapado em `<title>`/`<meta>`; watermark via `Sanitize.attr` no modal + `Sanitize.watermark` no sink CSS | `js/pdf-generator.js` |
| S5 | `renderList` de temas via DOM (nome `textContent`, cor `Sanitize.color` na propriedade `style`) | `js/themes.js` |
| S6 | `buildThemeCSS`/`getPrintCSS` com cor validada (`Sanitize.color`); sink morto do preview em `textContent` | `js/themes.js`/`js/preview.js` |
| S7 | `stats.js` auditado SEGURO (números `toLocaleString` + constantes i18n) | `js/stats.js` |
| S8/P11 | `\f` (U+000C) adicionado à denylist da marca d'água (`WATERMARK_BLOCKED`) — consistência com css-syntax-3; build gate `b` já provara inocuidade empírica | `js/sanitize.js` |

Gate: **PASS** com 1 achado novo — **P12** (Baixa): chaves de protótipo
(`__proto__`/`constructor`) passavam `isValidProjectName` e o `saveProject`
poluía `Object.prototype` antes do `TypeError` em `.versions` abortar o
import. Fechado abaixo.

## Fecho dos achados não-bloqueantes (N11/P12/N13 — esta delegação)

### N11 (MÉDIA, bug de usuário) — `PDFGenerator.init()` agora é chamado pela produção

`App.init()` (app.js) passou a chamar `PDFGenerator.init()` na ordem dos
demais módulos (após `ImageManager.init()`, antes de `Stats.init`).
`init()` é o **único** ponto que lê `pdfSettings` do `localStorage` — sem
a chamada, margens/tamanho/orientação/numeração nunca eram restauradas
entre sessões: o modal abria com `<input type="number">` vazio e o export
caía em `parseInt('') || 20` (20mm) em vez das margens salvas; a
numeração de página (feature 2.1.0) também não restaurava.

**EPUBGenerator/Storage não precisam de init** (verificado por leitura):
`EPUBGenerator` é sem estado persistido (só `generate()`, lê o DOM na
hora) e `Storage` é um wrapper stateless do `localStorage`.

**Prova empírica (teste novo, falha antes / passa depois)**:
`test/n11-p12-n13.spec.js` semeia `md2pdf_pdfSettings` com valores
distintos dos defaults (`12/18/35/8`, `a5`, `landscape`,
`showPageNumbers: false`, `top-right`), recarrega a página e abre o modal
**sem** `PDFGenerator.init()` manual. Com o código pré-correção o teste
falha (`settingsCarregados: false`, inputs vazios); com a correção passa
(valores restaurados no modal).

### P12 (BAIXA) — chaves de protótipo rejeitadas na fronteira do storage

`isValidProjectName` agora rejeita `__proto__`/`constructor`/`prototype`
(anchorado, `^...$`), e `sanitizeProjectName` idem — mantém o invariante
documentado de round-trip do export ("o nome exportado tem de ser a forma
que o import aceita"; antes, exportar `__proto__` geraria um JSON que o
import corrigido rejeitaria). Isso cobre `saveProject`, `importProject` e
`renameProject` (todos passam por `isValidProjectName`); `deleteProject`
com chave de protótipo é no-op inofensivo (`delete` de propriedade não
própria).

**Decisão registrada**: **não** usei `Object.create(null)`/`hasOwnProperty`
nos reads (`getAll`/`get`). Razão: a validação na fronteira fecha o vetor
de **escrita** com nomes controlados por terceiros; os reads só alcançam
nomes vindos de `Object.keys(getAll())` (chaves próprias) ou de UI, e o
render já é via `textContent`/`dataset` (S2) — `Object.create(null)`
mudaria o contrato de `getAll()` sem ganho no vetor já fechado.

**Prova empírica (teste novo, falha antes / passa depois)**: com a
validação atual, `saveProject('__proto__', ...)` lança o `TypeError`
exato do security gate (`Cannot read properties of undefined (reading
'unshift')`) após setar `Object.prototype.updated/current` (a FASE 1 do
teste reproduz a poluição em memória e prova); com a correção,
`saveProject`/`importProject` falham **limpo** (`false`) sem poluir e os
nomes legítimos continuam funcionando.

### N13 (BAIXA, consistência) — `Sanitize.color()` nos 3 setters CSSOM

Os 3 setters de `buildThemeCSS` (`js/themes.js`) que recebiam `theme.color`
cru passam por `Sanitize.color()`: `headingPreview.style.color`,
`blockPreview.style.borderLeftColor`, `codePreview.style.color`. Inertes
hoje (os elementos de preview não existem no DOM), mas consistentes com
`renderList`/`buildThemeCSS`/`getPrintCSS`. Cor hostil/fora da allowlist
cai no neutro `#333`; hex legítimo preservado (prova no teste novo e na
sonda dos 50 temas do `qa-s1s8-regressoes.spec.js`, que segue passando).

### Escopo e artefatos

- `test/qa-s1s8-regressoes.spec.js` (3 testes reais: M1/M2 + sondas)
  **mantido** — é rede de auditoria do build gate e roda na suíte.
- Nenhuma mudança em `templates.js`, `SECURITY-REVIEW.md`,
  `CODE-REVIEW.md`, CHANGELOG, ADR, `.factory/gates/**` ou
  `registry.yaml`. Sem commit, sem branch.
- `SECURITY-REVIEW.md` segue listando P12 como ABERTO no momento da
  escrita deste registro — a atualização do status é do security-engineer
  (dono do documento).

## Verificações executadas (saída real, 2026-10-02)

```
# Diferencialidade — código PRÉ-correção (revert temporário das 3 mudanças)
npx playwright test test/n11-p12-n13.spec.js
  3 failed
    N11: Error: N11: settings restaurados pelo init de produção — Expected: true, Received: false
    P12: Error: page.evaluate: TypeError: Cannot read properties of undefined (reading 'unshift')  (storage.js saveProject)
    N13: Error: heading com cor hostil cai no neutro #333 — Expected: "rgb(51, 51, 51)", Received: ""

# Código corrigido
npx playwright test test/n11-p12-n13.spec.js   → 3 passed
npx playwright test --reporter=list             → 39 passed (49.2s)
   (36 anteriores: 8 print-profile + 6 qa-differentiality + 3 qa-s1s8 + 13 sanitize-p1-p2 + 6 sanitize-p10p11 + 3 novos n11-p12-n13)
python test/verify-pdf.py                       → C1–C8 PASS, "TODOS OS CRITERIOS PASSARAM", 5 páginas (numerado e não)
```

Regra de ouro (preview e PDF concordam) preservada: C1–C8 passam e nenhum
teste de perfil de impressão regrediu.

## O que NÃO foi verificado (honesto)

- **Firefox/Safari**: não testados (limitação registrada desde ADR-001);
  as correções usam `localStorage`, `Sanitize.color` e CSSOM — APIs
  universais, mas não rodei nesses browsers.
- **Fluxo completo do export PDF com restauração**: `window.print()` não é
  automatizável; a restauração foi verificada no elo que faltava — o modal
  (valores dos inputs) — e o export usa `this.settings`, que agora carrega
  do storage no `App.init()`.
- **`SECURITY-REVIEW.md`** não foi lido/atualizado por mim além do
  necessário para localizar P12; o status final de P12 lá é do
  security-engineer.