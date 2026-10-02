# Changelog — md2pdf

Formato baseado em Keep a Changelog. O CHANGELOG.md é de propriedade do
devops-engineer na release; o estado importado abaixo é registrado pelo
intake (ADR-012).

## [2.1.0] — 2026-10-02 — Perfil de impressão + fecho de segurança (P1–P12)

> **Decisão de versão (release 2026-10-02).** A entrada 2.1.0 foi preparada em
> 2026-09-30 (perfil de impressão) mas **nunca publicada** — o upstream
> `AmarHouse/MD2PDF-Free-Studio` segue no commit `01ce614` (2026-07-12), e a
> única tag upstream é `v1.0.0`. O trabalho de segurança (rodadas 1–3,
> 2026-10-02: P1/P2/P7/P8/P9/P10/P11/P12 + S1–S8) foi **dobrado dentro da
> 2.1.0** em vez de gerar uma 2.2.0. Razão: 2.1.0 nunca saiu, então não existe
> estado intermediário "perfil de impressão sem o fecho de segurança" que um
> usuário tenha visto; publicar 2.2.0 criaria uma versão que inclui um perfil
> de impressão que o usuário nunca viu e faria a 2.1.0 constar como publicada
> sem ter sido. A 2.1.0 é a **primeira publicação de produção** deste produto
> na fábrica (registry `status: production`, `last_release: 2026-10-02`).

**Corrigido** — quebra de página fora do padrão ao colar saída de IA.

### Correção

- `h1, h2 { page-break-before: always }` removido de **4 lugares**
  (`js/themes.js` `pageBreakCSS` e `getPrintCSS`, `js/pdf-generator.js`,
  `css/print.css`). Era a causa raiz: todo `#` e todo `##` abria página nova.
  Agora **só `h1` abre página**, e o primeiro não abre. `.cover-block` e
  `.toc-block` preservados — fechar página em capa e sumário está correto.
- Botão de quebra de página da barra de ferramentas (`js/editor.js`) inseria
  `---`, que é thematic break no CommonMark e nunca produziu quebra alguma.
  Agora insere `\pagebreak`.
- O fixture de teste do gate rende 5 páginas; com o CSS anterior eram 7.

### Adicionado

- `js/markdown-normalize.js` — sanitiza a entrada antes do `marked.parse`:
  remove frontmatter YAML inicial, normaliza hierarquia de títulos (IA pula
  níveis), colapsa linhas em branco, remove espaços à direita. Idempotente,
  com contrato defensivo e cache de uma entrada (roda a cada tecla).
  Blocos de código são preservados verbatim.
- **Quebra de página explícita**: `\pagebreak` e `\newpage` em linha isolada
  (convenção Pandoc/Quarto). Indicador visual no preview. `---` continua
  thematic break — não virou quebra.
- **Numeração de páginas opcional**: checkbox e seletor de posição no modal de
  exportação. Default ligado em `@bottom-center`, preservando o
  comportamento anterior. 6 posições mapeadas, rótulos em pt/en/es.
  A primeira página não é numerada.
- Perfil de impressão: cabeçalho de tabela repete entre páginas, `pre` com
  quebra de linha, tabela larga com `word-break`, imagens limitadas a 200mm,
  URLs com `overflow-wrap`.
- `docs/PRINT-PROFILE.md` — o perfil como norma do produto, com as fontes
  (CSS Paged Media L3, CSS Fragmentation L3, CommonMark, Pandoc, Typora).
- Gate de impressão: `playwright.config.js`, `test/print-profile.spec.js`
  (8 testes), `test/verify-pdf.py` (8 critérios sobre o PDF extraído) e o
  fixture `test/fixtures/print-profile.md`.
- `sw.js`: `markdown-normalize.js` adicionado ao pre-cache, `CACHE_VERSION`
  v2 → v3 (achado F1 do gate de segurança, corrigido).

### Corrigido no caminho

- `stripFrontmatter` podia **apagar conteúdo do usuário**: um documento
  CommonMark válido começando com `---` e com outro `---` adiante perdia tudo
  entre eles. Endurecido com quatro guardas — a 2ª linha tem de ser chave ou
  comentário YAML, o bloco tem de conter pelo menos uma chave, toda linha até
  o fechamento tem de ser YAML/vazia/comentário, e o fechamento exige linha em
  branco depois. Teto de 200 linhas.
- Fim de linha normalizado para LF: um documento CRLF colapsava blanks para
  `"\r\n\n"`, mistura de CR e LF. É o caso comum, não o raro, porque a entrada
  vem de um textarea no Windows.

### Mudado

- `page-break-*` legado migrado para `break-*` nos pontos tocados (CSS
  Fragmentation L3 substitui CSS2.1 §13.3). As duas formas funcionam no
  Chromium; o padrão é a moderna.

### Números de página — o que mudou de verdade

Antes eu afirmava que `@bottom-center` não funcionava no Chrome e que todo PDF
sazia sem numeração. **Estava errado.** O Chromium implementa margin boxes do
CSS Paged Media L3 nativamente desde a v131 (nov/2024) — verificado em
Chromium 154, com o número extraído do PDF. Não havia polyfill faltando.
O que faltava era o controle: a posição era fixa e não havia como desligar.

### Notas

- O motor de PDF continua sendo `window.print()` (ADR-001). O diálogo de
  impressão do navegador é o último passo e pode sobrescrever margens.
- Firefox e Safari têm suporte parcial a margin boxes, não verificado.
- Achados pré-existentes registrados em `docs/SECURITY-REVIEW.md`: XSS via
  `marked` sem sanitizar, injeção de CSS via marca d'água, CDN sem SRI, payload
  PIX enviado a terceiro. Não introduzidos por esta mudança.

## Segurança — fecho da classe XSS (rodadas 1–3, 2026-10-02)

A rodada de segurança fechou, por allowlist no sink + varredura exaustiva de
sinks, a classe "interpolar dado não-constante em HTML". Evidência:
`.factory/gates/md2pdf/security-2026-10-02T000000Z.yaml`, `security-2026-10-02b.yaml`,
`security-2026-10-02c.yaml` e `docs/SECURITY-REVIEW.md` (rodadas 1–3, todas
PASS com ressalvas registradas).

### Adicionado

- `js/vendor/dompurify.min.js` (DOMPurify 3.4.16, self-hosted) + `js/sanitize.js`
  — `Sanitize.html` fail-closed (não-string ou sem `window.DOMPurify` → `''`)
  aplicado **no sink** dos 3 caminhos do `marked`: preview (`preview.js`),
  documento de impressão (`pdf-generator.js` `buildPrintDocument`) e XHTML do
  EPUB (`epub-generator.js` corpo + título). Wiring: vendor → sanitize →
  preview no `index.html`, pre-cache no `sw.js` (`CACHE_VERSION` v3 → v4).
  (ADR-003; P1)
- `Sanitize.watermark` (denylist `[<>"\\&{}\r\n\f]`) aplicada na leitura do
  modal e no sink CSS da marca d'água — fecha o breakout de `</style>`
  preservando tipografia pt-BR (P2, N2, P11).
- `Sanitize.color` (allowlist de formato de cor) e `Sanitize.attr` (contexto
  de atributo e RCDATA) usados em temas, editor de tema e settings (S5/S6).
- `isValidImageUrl` novo (hostname parseado + extensão no pathname, recusa
  `"<>` na string crua) — fecha o bypass de preview de URL (P7).
- Guard do `StorageManager` por capacidade em `themes.js` (o guard antigo por
  `typeof` nunca disparava no Chromium).

### Corrigido

- **P7**: sinks fora do `marked` deixaram de interpolar dado de terceiros em
  `innerHTML` — toast de arquivo (`app.js`), preview de URL/upload e erro
  ImgBB (`image-manager.js`) agora usam DOM properties/`textContent`
  (A11/A12/A13).
- **P8**: `ADD_DATA_URI_TAGS: ['a']` removido — `data:image/` em `img[src]`
  segue default do DOMPurify (A6).
- **P9**: `.gitignore` da raiz do monorepo passou a cobrir
  `browser-state-*.json` e `.playwright-mcp/` — um `git add .` na raiz não
  versiona mais cookies de sessão (classe A1 re-materializada; os arquivos
  continuam no disco — exclusão = owner).
- **P10**: nome de projeto importado validado na fronteira (`storage.js`
  `isValidProjectName`/`sanitizeProjectName` + validação estrutural do
  import) e a lista de projetos renderiza via `dataset`/`textContent` —
  nomes legados hostis renderizam inertes (S2/S3).
- **P12**: chaves de protótipo (`__proto__`/`constructor`/`prototype`)
  rejeitadas na validação — fecha a poluição de `Object.prototype` no
  `saveProject` (verificado em `storage.js` + teste `n11-p12-n13.spec.js`).
- **S1–S8**: fecho da classe "interpolar dado não-constante em `innerHTML`" —
  `ModalManager.create` (title/buttons via `textContent`, class/action por
  regex), coerção numérica de settings + título escapado em
  `buildPrintDocument`, `renderList` via DOM, `stats.js` verificado seguro por
  leitura, `\f` na denylist da marca d'água (P11). Os 9 chamadores do modal
  foram auditados um a um (nenhum passa dado não-confiável em `content` —
  P13 fica como contrato para chamador futuro).
- **N11** (review): `PDFGenerator.init()` agora é chamado pelo `App.init()` —
  preferências de página (`pdfSettings`) são restauradas entre sessões e o
  modal abre com os valores salvos.
- **N13** (review): os 3 setters CSSOM do preview de tema passam por
  `Sanitize.color` (consistência com os demais sinks).

### Suíte de segurança (evidência de execução)

- `npx playwright test` — **39 passed**: A1–A21 (sanitização P1/P2/P7/P8/
  P10/P11), diferenciais DIF-A11–A13/N2/P7, regressões S1–S8 (50 temas, marca
  d'água pt-BR, 9 modais), N11/P12/N13, perfil de impressão M1/M2.
- `test/verify-pdf.py` — **C1–C8 8/8 PASS** (regressão do perfil de impressão
  intacta após as 3 rodadas).
- Auditoria de diferencialidade: cada teste novo prova que o código
  pré-correção falharia (mutação em runtime, nunca em disco); a prova M1/M2
  (gate chama o código de produção) foi reproduzida nas 3 rodadas.

### Pendências registradas (não fechadas nesta release)

- **A1**: rotação da sessão Google (cookies `AEC`/`NID`/`__Secure-STRP`
  versionados no upstream) — **pendência do owner**.
- **P3**: SRI/self-host dos CDN `marked`/`jszip`/`FileSaver`/font-awesome +
  PIN do hash do vendor (`dompurify.min.js`).
- **P4**: payload PIX a `api.qrserver.com` — owner.
- **P5**: cota de `localStorage` com falha silenciosa — engineer.
- **P6**: SW cache-first/`skipWaiting` sem disciplina de versão — devops
  (o F1 do gate anterior foi resolvido: `v4` + pre-cache completo).
- **P13**: `ModalManager.content` como HTML por contrato — revisitar quando
  os handlers inline saírem (CSP fase 2).
- **CSP**: fases 1–2 (direitivas ortogonais agora; `script-src 'self'` após
  refatorar handlers inline).

## [2.0.0] — 2026-09-30 — Estado importado

- Origem: `AmarHouse/MD2PDF-Free-Studio` (branch `main`, commit
  `01ce614`) — editor Markdown → PDF/EPUB3, 50 temas, PWA, 100%
  client-side.
- Importado **sem histórico** (ADR-012) de `.factory/staging-source/`:
  `deploy/` (index.html, manifest.json, sw.js, _redirects, css/, js/) +
  LICENSE. `deploy/AgenticPDF/` ficou fora do produto (experimento
  lateral, fora de escopo).
- Exclusões aplicadas na materialização: `.git/`, `node_modules/`,
  `dist/`, `build/`, `coverage/`, `*.tsbuildinfo`, `.env*`,
  `browser-state-*.json`.
- Correção aplicada no `.gitignore` do produto: `browser-state-*.json`
  (o upstream versionava cookies de sessão do Google; risco residual
  registrado em SECURITY-REVIEW.md, aceito pelo owner em 2026-09-30).
- Dívida conhecida: o motor de PDF é `window.print()`; o diálogo de
  impressão do navegador é o último passo e pode sobrescrever margens.
- Zero testes no repositório importado: o script `test` do upstream
  apontava para uma config Playwright inexistente. O gate é entregável
  do qa-engineer.