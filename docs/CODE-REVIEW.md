# CODE-REVIEW — md2pdf · Sanitização P1/P2 + gate real (M1/M2) (R3)

| Campo | Valor |
|---|---|
| Gate | Revisão de código (code-reviewer) — gate obrigatório da mudança R3 "md2pdf-sanitize-p1" |
| Produto | `softwares/md2pdf/` (intake de `AmarHouse/MD2PDF-Free-Studio`, deploy R5 em Cloudflare Pages) |
| Mudança avaliada | Sanitização por allowlist no sink (P1, XSS alta) + allowlist de caracteres na marca d'água (P2) + extração de `PDFGenerator.buildPrintDocument()` (M1/M2). DOMPurify 3.4.16 self-hosted (`js/vendor/dompurify.min.js`), `js/sanitize.js`, wiring em `index.html`/`sw.js` (CACHE_VERSION v3→v4) |
| Base de comparação | `.factory/staging-source/deploy/` (árvore de intake; produto untracked no git — diff via leitura integral) |
| Data | 2026-10-02 |
| Referências | Plano `.factory/plans/md2pdf-sanitize-p1.md` (D1–D4, A1–A10); ADR-003; `docs/SECURITY-REVIEW.md` (2026-10-02, PASS com ressalvas); gate anterior `review-2026-09-30.yaml` (FAIL, 2 bloqueantes) + `-final.yaml` (PASS); `docs/IMPLEMENTATION-NOTES.md` (alegações do engineer — tratadas como alegação, verificadas por leitura) |
| Método | Leitura integral de `js/sanitize.js`, `js/pdf-generator.js`, `js/preview.js`, `js/epub-generator.js`, `js/app.js`, `js/image-manager.js`, `js/stats.js`, `js/markdown-normalize.js`, `js/pix.js` (parcial), `index.html`, `sw.js`, `test/sanitize-p1-p2.spec.js`, `test/print-profile.spec.js`, `test/verify-pdf.py` (parcial), vendor e README; grep de sinks (`innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`srcdoc`/`eval`/`new Function`/`setTimeout`/`setInterval`/`href`/`src`) em todo `js/`; grep de `marked.parse`/`processSpecialBlocks`; **sem execução de testes** (sandbox: shell restrito a git) e **sem edição de código de produção** |

## Veredito

> ## ✅ **PASSA** — sem bloqueantes.
>
> P1 fechado nos 3 sinks da saída do `marked` (preview `render`+`renderSync`,
> `document.write` da janela de impressão, XHTML do EPUB3 + título), fail-closed
> real (D2), P2 fechado com allowlist de caracteres aplicada nos 2 pontos
> (modal + sink). M1/M2 é real: o gate chama `PDFGenerator.buildPrintDocument()`
> — a mesma função pura que o `generate()` usa — e a cópia replicada do CSS foi
> deletada. Os 2 bloqueantes do gate anterior (BQ1: gate passava no código com
> defeito; BQ2: `stripFrontmatter` perdia conteúdo) continuam corrigidos e com
> cobertura no spec.
>
> **Ressalvas honestas** (registradas, não escondidas): (1) a execução da suite
> (16/16 alegados pelo engineer) **não foi reproduzida por este gate** — é
> evidência do build gate; (2) a classe P1 **não está 100% fechada no produto**:
> 3 sinks fora do `marked` continuam interpolando input de terceiros sem
> sanitização (`app.js:276` toast com `file.name`; `image-manager.js:96` preview
> de URL com bypass de validação; `image-manager.js:136` status de upload) —
> pré-existentes, **não cobertos** por esta mudança, registrados como P7 pelo
> security gate, que recomenda correção **antes do release**; (3) a allowlist da
> marca d'água corta caracteres legítimos (`º`, `ª`, `«»`, `—`, `×`, `÷`).

---

## Pontos fortes (verificados por leitura, não por confiança no relatório)

1. **Sanitização no sink, nos 3 caminhos do `marked`** — e nenhum outro.
   Grep de `marked.parse`: só `preview.js:91,107` e `epub-generator.js:15`;
   os 3 alimentam `Sanitize.html` antes de qualquer escrita no DOM:
   `preview.js:93,109` (`innerHTML`), `pdf-generator.js:246` (`bodyHtml`
   dentro de `buildPrintDocument`, antes do `document.write` em `:345`),
   `epub-generator.js:17` (corpo) e `:90` (título). Ordem do pipeline correta:
   `marked.parse` → `App.processSpecialBlocks` (round-trip DOMParser) →
   `Sanitize.html` por último (o ponto de mXSS do reparse fica antes da
   sanitização). ✅ (G-R-01)
2. **Fail-closed é real, não cosmético.** `sanitize.js:25-33`: sem
   `window.DOMPurify` → `''` + `console.error` + toast único; não-string →
   `''` (`:24`). Testado por execução no spec (A10: apaga o global e assere
   `''`; também `null/undefined/42/{}/[]/true`). Nenhum HTML não-sanitizado
   passa em estado degradado. ✅ (G-R-02)
3. **`buildPrintDocument` é função pura de verdade.** `pdf-generator.js:172-324`:
   sem `window.open`, sem `document.write`, sem timers, sem toast, sem leitura
   de DOM (título e html entram como parâmetros). `generate()` (`:338-345`)
   resolve `previewContent`/`bookTitle`/`theme` e chama a função; o
   `document.write` recebe o retorno. Defaults defensivos: settings parcial →
   `defaultSettings` (`:174`), `pageSize` inválido → `a4` (`:192-193`), title
   vazio → `'Documento'` (`:176`). O spec (teste 4) chama **a mesma função**
   via `page.evaluate`; a template replicada do `<style>` e as regras de
   compensação foram deletadas. ✅ (G-R-04, G-R-05)
4. **P2 fechado nos 2 pontos de interpolação da marca d'água.** `sanitize.js:39-42`
   remove `< > " \ & { }` e newline — nada que feche uma string CSS ou um
   atributo sobrevive; aplicado na leitura do modal (`pdf-generator.js:148`,
   protege também o `value="${...}"` do re-render) e no sink CSS (`:221`).
   A8 cobre por execução (exatamente 1 `</style>`, sem `<script`, sem `on*=`,
   corpo presente). ✅ (G-R-06, parte segurança)
5. **Allowlist preserva as features do produto.** Classes `page-break`,
   `cover-block`, `toc-block`, `learning-block`, `insight-block`,
   `warning-block`, `protip-block`, `exercise-block` e `data-chapter` (A5);
   `data:image/` em `img[src]` (default do DOMPurify, A6); 50 temas renderizando
   (A7, itera `ThemeManager.getGroups()` com `renderSync` real). ✅ (G-R-03)
6. **Wiring correto e completo.** `index.html:347-348`: vendor → sanitize →
   `preview.js:354`, todos `defer` (ordem preservada). `sw.js:5` `CACHE_VERSION
   = 'v4'`; `LOCAL_ASSETS` inclui `js/vendor/dompurify.min.js` (`:23`) e
   `js/sanitize.js` (`:24`). A1 assere tudo isso por grep. ✅ (G-R-07)
7. **Os 2 bloqueantes do gate anterior seguem corrigidos e testados.**
   `stripFrontmatter` (`markdown-normalize.js:241-276`) tem as 4 guardas
   (2ª linha YAML/comentário, `sawKey`, validação linha-a-linha, blank line
   após fechamento + teto de 200 linhas); teste 1 do `print-profile.spec.js`
   cobre 4 documentos CommonMark (conteúdo preservado) e 4 frontmatters
   (removidos). C1/C4 do `verify-pdf.py` são diferenciais. ✅
8. **Testes A1–A10 são reais, não decorativos.** A2/A3/A4 executam payloads no
   browser e asserem que **nenhum handler dispara** (`window.__xss === 0`),
   não apenas que a string some; A8 stuba `window.open` e captura o
   `document.write` real; A9 gera o EPUB de verdade (JSZip no page), extrai
   `content.xhtml`, parseia como `application/xhtml+xml` e exige `parsererror =
   0`; A10 testa o fail-closed apagando o global. Cada critério do plano tem
   asserção executável. ✅
9. **Vendor íntegro na forma.** Banner oficial Cure53 `DOMPurify 3.4.16`,
   wrapper UMD padrão do `dist/purify.min.js`, `README.md` do vendor documenta
   origem/licença/procedimento de update. Hash vs upstream não comparável aqui
   (sem rede) — pinar na release (ver ressalvas). ✅ (com ressalva)
10. **Escopo declarado e justificado.** As adições fora do enunciado literal —
    título sanitizado no EPUB (`epub-generator.js:90`), void elements
    self-closed (`:81-84`), ajuste da asserção A1 (M1/M2) — são exigências
    diretas dos critérios A9 ("XHTML válido, sem `<script>`") e da migração do
    call site para `buildPrintDocument`; registradas no
    `IMPLEMENTATION-NOTES.md` com razão. Não mascaram nada: A9 prova o EPUB
    limpo e parseável, e a contagem `Sanitize.watermark(` = 2 permanece
    verdadeira. ✅ (G-R-08)

---

## Achados

### BLOQUEANTES

Nenhum.

### NÃO-BLOQUEANTES (ordenados por severidade)

#### N1 — [ALTA] XSS em sinks fora do `marked` — pré-existente, NÃO coberto por esta mudança (= P7 do security gate)

- **Arquivo:linha**: `js/image-manager.js:96` (preview de URL de imagem);
  `js/app.js:276` (toast ← `file.name` em `app.js:256`); `js/image-manager.js:136`
  (status de upload ← `file.name`)
- **O que está errado**: a varredura de sinks revelou 3 `innerHTML` que
  interpolam strings influenciadas por terceiros sem passar pelo
  `Sanitize.html` novo. O mais grave tem **bypass concreto**: `isValidImageUrl`
  (`image-manager.js:227-239`) aceita
  `https://x.com/a.jpg?x=" onerror="alert(1)` — `new URL()` não lança
  (percent-encoda), o regex `\.(jpg)(\?.*)?$` casa (o `"` fica dentro do
  `\?.*`), e a string crua é interpolada em
  `<img src="${url}" onerror="...">` → o `"` fecha o atributo `src`, o
  `onerror="alert(1)"` vira o primeiro `onerror` (o parser HTML mantém o
  primeiro) → dispara quando a imagem falha. O `includes('imgur.com'|
  'imgbb.com'|'cloudinary.com'|'unsplash.com')` é um segundo bypass.
- **Por que importa**: mesma classe de P1 (input não-confiável → `innerHTML`)
  em fluxos que esta mudança não tocou. Vetor realista: abrir um `.md` baixado
  de terceiro com nome hostil (macOS/Linux permitem `< > "` em nomes) ou colar
  URL de IA no modal de imagem. O security gate classificou como Média (Alta em
  macOS/Linux) e **recomendou corrigir antes do release**.
- **Correção sugerida**: passar `file.name`/`url` por `Sanitize.html()` (ou
  usar `textContent`); validar a URL no **objeto** `new URL(...)` (exigir
  protocolo `http(s)` e host), não na string crua; eliminar o `onerror` inline
  da template de preview.

#### N2 — [MÉDIA] Allowlist da marca d'água corta caracteres legítimos (G-R-06, degradação)

- **Arquivo:linha**: `js/sanitize.js:19`
- **O que está errado**: a classe `[^A-Za-z0-9À-ÖØ-öø-ÿ ...]` cobre Latin-1
  **de 0xC0 para cima** + `°` explícito, mas o bloco 0x80–0xBF (fora dos
  ranges) e pontuação tipográfica são removidos: **`º` (U+00BA) e `ª` são
  apagados** ("RASCUNHO Nº1" → "RASCUNHO N1"), assim como `«»`, `—` (em-dash),
  `×`, `÷`, aspas inteligentes, `©®™`, emoji e scripts não-Latin-1. Acentos
  agudos/graves/circunflexos/til/cedilha, `°`, `!`, `?`, hífen, parênteses e
  colchetes são preservados (verificação por codepoint — determinística).
- **Por que importa**: degradação funcional pequena (marca d'água é decorativa)
  mas visível para o público pt-BR (ordinais são usuais). Segurança intacta —
  nada que feche string CSS/atributo sobrevive.
- **Correção sugerida**: adicionar `\u00AA\u00BA` (e, se desejado, `«»—`),
  ou — mais robusto — **escapar** o valor para `content: "..."` (só `"` e `\`
  exigem escape) e `value="..."` (só `"`, `&`, `<`) em vez de descartar
  caracteres.

#### N3 — [BAIXA] `ADD_DATA_URI_TAGS: ['a']` libera `data:` em `a[href]` sem requisito de produto (= P8 do security gate)

- **Arquivo:linha**: `js/sanitize.js:12`; codificado no teste A6
  (`test/sanitize-p1-p2.spec.js:186-197`)
- **O que está errado**: a necessidade real (imagens `data:image/` do
  `readAsDataURL`) é default do DOMPurify para `img[src]`; o `['a']` amplia
  superfície (`data:text/html` em âncora) sem requisito. Navegadores modernos
  bloqueiam navegação top-level `data:`, mas o comportamento varia em leitores
  EPUB/browsers legados.
- **Correção sugerida**: remover `['a']` e ajustar a expectativa do A6.

#### N4 — [BAIXA] `buildPrintDocument` não valida `title` internamente (L3)

- **Arquivo:linha**: `js/pdf-generator.js:172-176, 253-255`
- **O que está errado**: função agora "pública" (chamada pelo gate) interpola
  `title` cru em `<title>` e `<meta content="...">` confiando no caller. Em
  produção o caller é `getBookTitle()` (denylist `[<>:"/\\|?*]` → não
  explorável hoje) e o gate passa string fixa — mas o princípio 14
  (função pública valida os próprios precondições) sugere escapar/validar
  dentro da função.
- **Correção sugerida**: `title.replace(/[<>&"]/g, ...)` ou `Sanitize.html`
  no `docTitle` dentro de `buildPrintDocument`.

#### N5 — [BAIXA] EPUB: `&` (e `<` no TOC) não escapados → XHTML malformado

- **Arquivo:linha**: `js/epub-generator.js:90, 116, 137` (título) e `:30`
  (TOC via `innerText`)
- **O que está errado**: `Sanitize.html('Título & Teste')` não escapa `&` em
  texto puro (verificado por leitura; condizente com o DOMPurify) → XML
  inválido em `content.xhtml`/`nav.xhtml`. Pré-existente, mesma classe do
  self-closing já corrigido; não executa script.
- **Correção sugerida**: escapar `&`/`<` antes do template XHTML (follow-up).

#### N6 — [BAIXA] `preview.js:96,112`: `buildThemeCSS` retorna `undefined` → `innerHTML = "undefined"` inerte

- **Arquivo:linha**: `js/preview.js:95-96, 111-112`; `js/themes.js:3596-3689`
- **O que está errado**: `buildThemeCSS` é side-effect (cria `<style
  id="theme-style">` via `textContent` e não retorna); `styleEl.innerHTML =
  undefined` vira o texto inerte "undefined" no `<style id="dynamic-book-theme">`.
  Código latente pré-existente — a alegação do engineer procede; não é sink
  explorável hoje.
- **Correção sugerida**: remover as duas linhas mortas quando passar por ali.

#### N7 — [BAIXA] `watermarkRotation` não validado numericamente

- **Arquivo:linha**: `js/pdf-generator.js:228` (`rotate(${s.watermarkRotation}deg)`)
- **O que está errado**: vem cru do `Storage` no `init()` (o modal não o grava);
  `opacity`/`size` fazem `parseFloat`/`parseInt`. Só explorável com controle
  prévio do `localStorage`. Hardening: validar como os irmãos.

#### N8 — [BAIXA] Integridade do vendor não pinada; sourceMappingURL pendurada

- **Arquivo:linha**: `js/vendor/dompurify.min.js:1-10`
- **O que está errado**: hash do arquivo local vs
  `dompurify@3.4.16/dist/purify.min.js` do npm **não comparado** (sem rede
  neste gate); o banner e a estrutura são genuínos (Cure53, UMD padrão), mas a
  prova de integridade fica para a release. O `//# sourceMappingURL=purify.min.js.map`
  aponta para arquivo ausente no vendor/ (só devtools; sem efeito).
- **Correção sugerida**: pinar o hash na release (security gate, follow-up 7) e
  remover a linha do sourcemap ou incluir o `.map`.

#### N9 — [BAIXA] Dependência de rede no gate de impressão

- **Arquivo:linha**: `js/pdf-generator.js:179` (`getGoogleFontsLink` dentro de
  `buildPrintDocument`)
- **O que está errado**: o documento de impressão agora inclui o `<link>` real
  do Google Fonts; a paginação medida pelo `page.pdf` do gate pode variar se a
  fonte não carregar no momento da captura (flakiness potencial em rede
  instável/offline). O engineer reportou que a fonte carregou e a paginação
  ficou em 5 páginas — sem mudança de expectativa.
- **Correção sugerida**: se aparecer flake, interceptar o font load no spec ou
  usar fontes locais no fixture.

#### N10 — [BAIXA] `browser-state-*.json` e `.playwright-mcp/` untracked na raiz do monorepo (= P9 do security gate)

- **Arquivo:linha**: raiz do monorepo (não é arquivo do produto)
- **O que está errado**: arquivos com cookies de sessão Google estão fora do
  `.gitignore` da raiz; um `git add .` na raiz os versionaria. Operacional,
  dono devops/owner, fora do escopo do produto — registrado para não ser
  perdido (o `.gitignore` do produto já cobre a classe).

---

## O que NÃO foi verificado (declarado com honestidade)

1. **Execução da suite (16/16)** — sandbox sem permissão de shell para
   Playwright/Node; a execução é alegação do engineer (IMPLEMENTATION-NOTES) e
   evidência do build gate. A análise aqui é por leitura integral dos specs;
   as asserções são reais e executáveis (nenhuma decorativa encontrada).
2. **Prova de mutação do M1/M2** (CSS `.page-break` → `auto` faz o gate falhar)
   — alegada, não reproduzida. A estrutura (gate chama a função de produção)
   torna a propriedade evidente por construção.
3. **Hash do vendor vs. upstream npm** e **bypass público atual do DOMPurify
   3.4.16** — sem rede.
4. **Teste empírico da regex da marca d'água** — análise por codepoint
   (determinística); a direção de segurança é coberta por execução no A8
   (build gate).
5. **Firefox/Safari** — margin boxes e `window.print()` são parcialmente
   suportados fora do Chromium (registrado desde ADR-001).
6. **`templates.js` (~95 KB) e o restante de `themes.js` (~108 KB)** — não
   lidos integralmente (herdado do gate anterior); grep de sinks não encontrou
   `innerHTML`/`document.write`/`eval` em `templates.js`; `themes.js:3714`
   interpola `theme.name`/`theme.color` (temas = constantes do produto ou
   criados pelo próprio usuário — classe self-XSS sem vetor cross-user).

---

## Observações

- **Convergência com o security gate**: os achados N1/N3/N10 desta revisão são
  exatamente P7/P8/P9 do `SECURITY-REVIEW.md` (2026-10-02) — varredura
  independente convergiu. P7 deve ser corrigido **antes do release** (ver N1);
  P9 antes de qualquer `git add .` na raiz.
- **Contagem de `on*=` inline**: o ADR-003 cita "52 handlers"; o security gate
  contou 17 no `index.html` + templates dinâmicas. A discrepância não muda a
  decisão D3 (sem CSP nesta mudança) — registrada como divergência de contagem,
  não de mérito.
- **`serve.log`** na raiz do produto: artefato de debug do `npx serve`,
  coberto pelo `.gitignore` (`*.log`); o engineer não pôde removê-lo (política
  de comandos destrutivos) — pode ser apagado no próximo gate.
- **A9 cobre o vetor de título hostil** (`# Capítulo</title><script>...`) e o
  self-closing de void elements — as duas adições de escopo do EPUB têm prova.

*Documento do gate de revisão de código da mudança R3 "md2pdf-sanitize-p1"
(P1/P2 + M1/M2). Reescrito em 2026-10-02 sobre o CODE-REVIEW de 2026-09-30
(histórico preservado nos gates: `review-2026-09-30.yaml` FAIL com 2
bloqueantes → `review-2026-09-30-final.yaml` PASS; bloqueantes BQ1/BQ2
reverificados corrigidos nesta mudança). Próximos passos: build gate executa
A1–A10 e o verify-pdf; corrigir N1/P7 antes do release.*

---

# CODE-REVIEW — Rodadas 2 e 3 (P7/P8/N2 + fecho da classe innerHTML)

Complemento ao gate de 2026-10-02 (acima). Avalia as duas rodadas de correção
que vieram **depois** do `review-2026-10-02.yaml` (PASS): rodada 2 (P7/P8/N2,
dirigida pelos achados do code-review e do security gate) e rodada 3 (varredura
sistemática da classe "interpolar dado não-constante em `innerHTML`", P10/P11 +
S1–S8). Método: leitura integral de `app.js`, `editor.js`, `storage.js`,
`pdf-generator.js`, `themes.js`, `preview.js`, `image-manager.js`,
`sanitize.js`, `theme-editor.js`, `templates.js` (callers do modal),
`test/sanitize-p10p11-class.spec.js`, `test/qa-differentiality-p7p8n2.spec.js`;
grep de sinks em todo `js/`; **sem execução de testes** (sandbox: shell
restrito a git) e **sem edição de código de produção**.

## Veredito

> ## ✅ **PASSA** — sem bloqueantes.
>
> A classe de sinks "interpolar dado não-constante em `innerHTML`" está fechada
> nos caminhos com dado de terceiros: ModalManager (`title`/`buttons` via
> `textContent` + regex de `class`/`action`/`size`), lista de projetos via DOM,
> `importProject`/`saveProject` validando na fronteira (`storage.js`),
> `Sanitize.color`/`Sanitize.attr` novos, coerção numérica no sink
> (`buildPrintDocument`), guard de `StorageManager` corrigido (capacidade, não
> nome), sink morto de `preview.js` convertido. P7 (toast/imagens) e N2
> (regressão pt-BR da marca d'água) da rodada 2 confirmados por leitura; P10 e
> P11 do security gate endereçados na rodada 3. Os 6 testes novos têm prova de
> diferencialidade real (FASE 1 com o sink antigo executa/injeta; FASE 2 no
> caminho corrigido) e o spec de auditoria do QA serve o `image-manager.js`
> pré-correção via `page.route`.
>
> **Ressalvas honestas**: (1) a suíte da rodada 3 (6 testes novos) **não foi
> executada por este gate** — o `build-2026-10-02b.md` rodou 27 testes no
> estado da rodada 2; a execução dos 6 novos (suíte esperada: 33) é do próximo
> build gate; (2) `PDFGenerator.init()` **nunca é chamado pela produção**
> (achado N11) — o sink continua protegido pela coerção própria de
> `buildPrintDocument`, mas a metade "modal" da fronteira alegada não roda; (3)
> docs desatualizados para as rodadas 2/3 (N12).

## Pontos fortes (verificados por leitura)

1. **`ModalManager.create` com contrato explícito** (`app.js:24-72`): `title` e
   `buttons[].text` via `textContent`; `class`/`action` por regex
   `^[A-Za-z0-9_-]+$` (injeção de atributo vira default/descarte); `size` por
   allowlist. `content` permanece HTML por contrato — **defensável**: os 9
   callers montam formulários (`value=`/`checked`/`selected`) e o `Sanitize.html`
   quebraria os atributos. **Os 9 callers foram verificados um a um** (G-R-01):
   `pdf-generator.js:75` (números coagidos + enums + `Sanitize.attr` no
   watermark), `theme-editor.js:18` (`Sanitize.attr`), `image-manager.js:30`
   (constantes), `templates.js:2881` (constantes do arquivo) e `:2946`
   (constantes + data local), `stats.js:75` (números `.toLocaleString()`),
   `editor.js:240` (constantes + lista via DOM), `:432` (datas via
   `new Date(...).toLocaleString()` — incapaz de produzir HTML; `data-index`
   numérico) e `:491` (constantes). Nenhum passa dado não-confiável cru em
   `content`.
2. **Fronteira em `storage.js`, não só na renderização** (`:63-77,88-109,
   150-165`): `isValidProjectName` (≤100, sem `[<>"'&]`) é chamado por
   `saveProject` **e** `importProject`; import valida estrutura
   (`current` objeto, `markdown` string, `themeId` número) e **rejeita** payload
   hostil em vez de corrigir silenciosamente; nomes legados hostis já em
   `localStorage` renderizam como texto (teste S2). A UI avisa "evite < > " ' &".
3. **`Sanitize.color` (G-R-03)** (`sanitize.js:62-72`): allowlist das formas do
   produto (`#hex{3,8}`, `rgb()/rgba()`, `hsl()/hsla()`) + bloqueio cru de
   `;{}"'<>\\\n\r\f`. Sem bypass: `\65 xpression` morre no `\`; `url(...)` não
   casa o prefixo; `rgb(url(x))` casa o regex mas é CSS inválido e inerte (a
   declaração é descartada — não há como fechar regra/declaração sem `;{}`);
   comentário não fecha nada; `[^)]*` não escapa porque `)` termina e `$` ancora.
4. **Coerção numérica no sink** (`pdf-generator.js:207-219` + `:44-49`):
   `Number(v)` + `Number.isFinite` — string hostil (`'25; } body…'`) cai no
   default; finitos não carregam metacaracteres CSS. Título escapado
   (`:220-225`). `Sanitize.attr` no `value` do watermark (`:135`).
5. **Guard de `StorageManager` corrigido por capacidade** (`themes.js:3393`):
   `typeof getSettings !== 'function'` dispara nos dois casos (browser sem a
   API e Chromium com a interface nativa — onde o guard antigo falhava).
6. **`renderList` via DOM** (`themes.js:3702-3742`): `colorBox.style.background
   = Sanitize.color(...)`, nome via `textContent`, `dataset.themeId`; sink morto
   de `preview.js:101,117` convertido para `textContent`.
7. **Testes diferenciais de verdade** (G-R-06): `sanitize-p10p11-class.spec.js`
   (6) — cada teste tem FASE 1 (reprodução em memória do sink antigo, com
   execução provada: `onerror` dispara no Chromium) e FASE 2 (caminho corrigido
   com os mesmos payloads); `qa-differentiality-p7p8n2.spec.js` (6) serve o
   `image-manager.js` pré-correção por cirurgia de string autocontida via
   `page.route` e sobrescreve `App.showToast` antigo — nenhum decorativo.

## Achados (rodadas 2–3)

#### N11 — [MÉDIA, não-bloqueante] `PDFGenerator.init()` é código morto na produção

- **Arquivo:linha**: `js/pdf-generator.js:42-72` (definição); chamadas só em
  `test/print-profile.spec.js:205,262,296`. `App.init()` (`app.js:86-112`),
  `editor.js:50` e `index.html` nunca o chamam.
- **O que está errado**: a alegação "coerção numérica de todos os settings em
  `init()`" não vale em produção: `this.settings` começa `{}`; o modal de PDF
  abre na primeira vez com `value="undefined"` nos campos numéricos e
  `showPageNumbers` desmarcado, e os `pdfSettings` persistidos só são lidos
  depois do primeiro export. **Segurança intacta** — `buildPrintDocument` tem a
  própria coerção (o sink real) e o handler de export reconstrói com
  `parseInt/parseFloat || default`. O gate não enxerga o bug porque os testes
  chamam `init()` (divergência teste/produção).
- **Correção sugerida**: chamar `PDFGenerator.init()` no `App.init()` (ou
  remover `init()` e manter só a coerção do sink).

#### N12 — [BAIXA] Docs não atualizados para as rodadas 2/3

- **Arquivo:linha**: `docs/IMPLEMENTATION-NOTES.md` (termina em M1/M2 — sem o
  contrato do ModalManager, `Sanitize.color/attr`, guard, P10/P11);
  `docs/SECURITY-REVIEW.md:125-126,709-710` (P10/P11 ainda "ABERTO").
- **Correção sugerida**: anexar notas da rodada 3 e marcar P10/P11 como
  mitigados com referência aos testes.

#### N13 — [BAIXA] `theme.color` cru em 3 atribuições CSSOM

- **Arquivo:linha**: `js/themes.js:3690,3694,3698` (`style.color`/
  `borderLeftColor`) sem `Sanitize.color`.
- **O que está errado**: setters de propriedade CSSOM parseiam só o valor da
  propriedade — `"red; } body…"` é valor inválido de `<color>` e é ignorado;
  sem breakout. Mas é inconsistente com o S5/S6.
- **Correção sugerida**: `Sanitize.color` nos 3 pontos.

#### N14 — [BAIXA] Decisão de excluir `theme.css` (textarea) e `applyCustomTheme` — **concordo, com ressalva**

- **Arquivo:linha**: `js/theme-editor.js:61,145`; `js/themes.js:3769-3797`.
- **Julgamento**: o CSS autoral do usuário (textarea) e o `customTheme` legado
  são **self-XSS por design** — os únicos escritores são o editor do próprio
  usuário e `localStorage` (same-origin). **Nenhum vetor cross-user**: não há
  import de temas de arquivo/URL, e o import de projetos (`storage.js:150-165`)
  valida apenas `name/markdown/themeId` — não carrega CSS. `applyCustomTheme` é
  caminho **sem escritor** no código atual (grep: só leitura `themes.js:3758` e
  remoção `:3800`) — inerte a menos que escrito por versão antiga ou devtools.
- **Correção sugerida**: registrar a decisão self-XSS no SECURITY-REVIEW; e
  **remover** `applyCustomTheme`/`initThemeEditor` (código morto) em vez de
  mantê-lo como sink permanente.

#### N15 — [INFO] Coerção `Number()` aceita formas não-decimais e magnitude sem limite

- **Arquivo:linha**: `js/pdf-generator.js:44-49,207-212`.
- **O que está errado**: `Number('0x10')=16`, `Number([])=0`, `Number(true)=1`,
  `Number('1e3')=1000`, `Number('-5')=-5` — todos finitos, passam. Nenhum
  carrega metacaractere CSS (sem injeção); só anomalia de layout (margem
  negativa/huge) com JSON adulterado.
- **Correção sugerida** (opcional): regex `^-?\d+(\.\d+)?$` para strings.

#### N16 — [INFO] `Sanitize.color` aceita valores semanticamente inválidos

- **Arquivo:linha**: `js/sanitize.js:62`.
- **O que está errado**: `rgb(url(x))`, `rgb(/**/)` casam o regex e passam —
  CSS inválido, descartado pelo parser, inerte. Sem impacto de segurança
  (bloqueio cru de `;{}"'<>\\` impede qualquer saída de declaração/regra).

#### N17 — [INFO] Validação de nome de projeto rejeita `'` e `&`

- **Arquivo:linha**: `js/storage.js:65,76`.
- **O que está errado**: `"D'Ávila"`/`"R&D"` são rejeitados — mais estrito que o
  necessário para atributos HTML (a renderização via DOM/textContent seria
  segura com `'`/`&`). Trade-off aceitável, comunicado no toast (`editor.js:332`).

#### N18 — [INFO] Chave ImgBB hardcoded no cliente (pré-existente)

- **Arquivo:linha**: `js/image-manager.js:10`.
- **O que está errado**: arquitetura client-only expõe a chave a qualquer
  usuário (necessário para o fluxo BYOK); risco operacional de abuso de cota.
  Pré-existente, fora do escopo das rodadas; registrar dono devops/product.

#### N19 — [INFO] Temas de usuário não são re-hidratados no load

- **Arquivo:linha**: `js/themes.js:3806-3814` (escreve `userThemes`) — nenhuma
  leitura no startup; `THEMES.push` é só em memória. Tema salvo some no reload
  (perda funcional, não segurança). Pré-existente.

## O que NÃO foi verificado (rodadas 2–3)

1. **Execução da suíte da rodada 3** (6 testes novos; suíte esperada 33) e
   re-execução do `verify-pdf.py` (C1–C8) após a rodada 3 — sandbox sem shell
   para Playwright/Node/Python; evidência executada disponível até agora é o
   `build-2026-10-02b.md` (27 testes, estado da rodada 2). Próximo build gate
   deve rodar a suíte completa.
2. **Comportamento runtime do `var StorageManager` em Chromium** (sombreado da
   interface nativa) — inferido da semântica de spec + do teste S5 que exercita
   `renderList` no browser; não executado por mim.
3. **Firefox/Safari**, **bypass público do DOMPurify** (herdados).
4. **Re-hidratação de `userThemes`** (N19) — confirmada por grep, não por
   execução.

*Gate: `review-2026-10-02b.yaml` (PASS, sem bloqueantes).*