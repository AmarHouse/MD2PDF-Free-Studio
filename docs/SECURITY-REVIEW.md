# SECURITY-REVIEW — md2pdf · Sanitização do pipeline de HTML (P1/P2) + M1/M2 (R3)

| Campo | Valor |
|---|---|
| Gate | Segurança (security-engineer) — gate obrigatório da mudança R3 "md2pdf-sanitize-p1" |
| Produto | `softwares/md2pdf/` (intake de `AmarHouse/MD2PDF-Free-Studio`, deploy R5 em Cloudflare Pages) |
| Mudança avaliada | Sanitização por allowlist no sink (P1) + allowlist de caracteres na marca d'água (P2) + extração de `PDFGenerator.buildPrintDocument()` (M1/M2). DOMPurify 3.4.16 self-hosted, `js/sanitize.js`, wiring em `index.html`/`sw.js` (CACHE_VERSION v3→v4). **Rodada 3**: fecho da CLASSE "interpolar dado não-constante em `innerHTML`" (S1–S8) |
| Data | 2026-10-02 |
| Rodada | **3** (gate `security-2026-10-02c`) — fecho da classe P7/P10 por varredura sistemática (S1–S8): `ModalManager.create` (S1), lista de projetos (S2/P10), fronteira do `storage` (S3/P10), `pdf-generator` settings/título (S4), `renderList` de temas (S5), `buildThemeCSS`/`getPrintCSS` + sink morto do preview (S6), `stats.js` auditado SEGURO (S7), `\f` na denylist (S8/P11). As rodadas 2 (2026-10-02b) e 1 (2026-10-02T000000Z) estão preservadas abaixo como histórico — nada foi apagado |
| Referências | Gates: `security-2026-10-02T000000Z.yaml` (r1), `security-2026-10-02b.yaml` (r2), `security-2026-10-02c.yaml` (r3 — este gate); build gates `build-2026-10-02.md`, `build-2026-10-02b.md`, `build-2026-10-02c.md` (emitido pelo qa-engineer com 36/36 + C1–C8; suíte final **39/39 + C1–C8** com o spec `test/n11-p12-n13.spec.js`); specs `test/sanitize-p10p11-class.spec.js` e `test/n11-p12-n13.spec.js` (lidos integralmente); plano `.factory/plans/md2pdf-sanitize-p1.md`; ADR-003; `docs/IMPLEMENTATION-NOTES.md` (alegações); `docs/CODE-REVIEW.md`; gates de review |
| Modelo de ameaça | 100% client-side, sem backend/autenticação/banco. Input = **Markdown arbitrário colado pelo usuário ou por uma IA** (fonte não confiável por design). Sinks críticos de HTML: `marked.parse()` → `innerHTML` do preview (`preview.js`), `document.write()` da janela de impressão (`pdf-generator.js`), XHTML do EPUB (`epub-generator.js`). STRIDE: spoofing/tampering (XSS, injeção de CSS), information disclosure (PIX a terceiro, localStorage, chave ImgBB), DoS (cota, offline, abuso de chave), supply-chain (CDN sem SRI, SW, vendor self-host) |
| Método | Leitura integral dos arquivos da mudança e de todos os sinks de HTML do produto (grep de `innerHTML`/`document.write`/`insertAdjacentHTML`/`srcdoc` em `js/`); verificação estática da ordem do pipeline e do fail-closed; **execução de PoCs NÃO possível neste gate** (ambiente sem permissão de shell para Node/Playwright — ver "O que foi testado"); sem edição de código de produção, sem commit, sem tocar registry/CHANGELOG. Writes: somente este documento e o gate em `.factory/gates/md2pdf/` |

**Fatos medidos vs. hipóteses**: todo item abaixo está marcado. "Verificado por leitura" = fato observado no código. "Não verificado" = não executei (ambiente). As suites Playwright A1–A15 (rodada 2) e A1–A10 (rodada 1) foram **lidas integralmente**; a execução (21/21 + C1–C8 na rodada 2, segundo o orchestrator/build gate) **não foi reproduzida por mim** — é evidência do build gate, não fato medido por este gate. Executado por mim (sandbox restrito a git/audit): `git log --all -1 --format=%cI` e `git status --porcelain --ignored` (P9).

---

## Veredito — RODADA 3 (2026-10-02c)

> ## ✅ **PASSA** — com ressalvas registradas
>
> **P10 está MITIGADO com evidência em 2 camadas.** (1) **Fronteira em
> `storage.js`** (S3): `isValidProjectName` (string, trim não-vazio,
> ≤ 100, sem `[<>"'&]`) + `sanitizeProjectName`; `importProject` valida
> `data.name`, `data.current` como objeto, `current.markdown` como string
> e `current.themeId` como número **antes de gravar**; `saveProject`
> revalida (dupla defesa). (2) **Sink em `editor.js`** (S2): a lista de
> projetos é montada via `createElement` + `dataset` + `textContent` —
> nenhuma interpolação de `${name}` em HTML. **Nomes legados** já gravados
> no `localStorage` antes da correção renderizam **inertes** (o teste
> semeia `<img src=x onerror=...>` no `md2pdf_projects` e prova 0 `<img>`,
> 0 `onerror`, 0 execução). O fecho é duradouro: mesmo se um nome hostil
> existir no storage, não há mais sink que o interpole.
>
> **P11 está MITIGADO**: `\f` (U+000C) entrou na denylist da marca d'água
> (`sanitize.js:31`). O build gate `b` já provara empiricamente que FF era
> inócuo nos 2 sinks (15 payloads, 1 `<style>`, 0 `<script>`, 50 regras);
> o adendo é consistência com a definição de newline do css-syntax-3, não
> correção de buraco explorável.
>
> **Não voto verde absoluto.** Esta revisão tentou quebrar o que foi
> construído e achou **1 achado novo**:
>
> - **P12 (Baixa → MITIGADO em 2026-10-02)** — **poluição de protótipo via
>   nome de projeto** `__proto__`/`constructor`/`hasOwnProperty`:
>   `isValidProjectName` validava charset/tamanho, mas **não** rejeitava
>   chaves do protótipo — um JSON importado com `name: "__proto__"` passava
>   a validação; em `saveProject`, `projects['__proto__']` resolve para
>   `Object.prototype` (truthy) → pula a criação → seta
>   `Object.prototype.updated` e `Object.prototype.current` **antes** do
>   `TypeError` em `.versions` abortar o import. **Sem cadeia de XSS
>   encontrada**: todos os reads do `current` poluído (editor.js:384-386)
>   caem em caminhos sanitizados (textarea via DOM property +
>   `marked`→`Sanitize.html`; `themeId` → `parseInt` → `getThemeById`). Era
>   falha de robustez/fronteira, não vetor executável. **Corrigido na
>   fronteira** pelo engineer (fecho 2026-10-02): `storage.js:62`
>   `PROTOTYPE_KEY_RE = /^(?:__proto__|constructor|prototype)$/`, rejeitado
>   em `isValidProjectName` (`:87`) **e** em `sanitizeProjectName` (`:77` —
>   preserva o invariante round-trip do export); cobre `saveProject`,
>   `importProject` e `renameProject` — a fronteira, não a renderização.
>   Decisão registrada: **não** usar `Object.create(null)`; a fronteira
>   fecha o vetor de escrita, os reads vêm de `Object.keys(getAll())`
>   (chaves próprias) e o render já é `textContent` (S2). Evidência:
>   `test/n11-p12-n13.spec.js` (FASE 1 reproduz o `TypeError`
>   `Cannot read properties of undefined (reading 'unshift')` da poluição
>   de `Object.prototype.updated`/`current` em memória; FASE 2:
>   `saveProject`/`importProject('__proto__')` retornam `false` **sem
>   poluir**; `__proto__`/`constructor`/`prototype` rejeitados; nomes
>   legítimos seguem funcionando).
>
> **Auditorias solicitadas, com resultado:**
> - **`Sanitize.color()` — sem bypass.** Bateria de 11 vetores: `;`/`{`/`}`
>   `/`"`/`'`/`<`/`>`/`\`/`\n`/`\r`/`\f` bloqueados; `rgb(1,2,(3))` falha
>   na âncora `$`; `\65 xpression` e `\75 rl(...)` mortos pelo `\`;
>   `url(#x)` sem match; `/* */` e `rgba(/*x*/)` inertes (comentário dentro
>   de função não escapa — falta `)`/`;`); `#` 3-8 hex (5/7 dígitos são
>   inválidos → declaração descartada); `RGB(...)` maiúsculo válido por
>   `/i`. Único cinza: **U+2028/U+2029 não bloqueados** dentro de
>   `rgb()` — inertes em CSS (não são newline do css-syntax; sem `;{}"'`
>   não fecham nada) → hardening, não bypass.
> - **`Sanitize.attr()` — correto nos 2 contextos.** Atributo duplo-quotado:
>   `"`→`&quot;` bloqueia breakout, `&` escapado primeiro impede
>   double-decode (`&quot;` de entrada → `&amp;quot;` → literal). `<textarea>`
>   (RCDATA): `<`→`&lt;` mata `</textarea`; `>`/`"`/`'` sobrescapados são
>   decodificados de volta → **round-trip lossless** via `.value`. Sem
>   under-filtering (em RCDATA só `</textarea` importa) e sem over-filtering
>   funcional.
> - **ModalManager `content` por contrato — segurança REAL hoje.** Os 9
>   chamadores foram auditados um a um (ver seção Rodada 3): nenhum passa
>   dado não-confiável em `content` (os 3 que já passaram — projetos,
>   settings de PDF, tema do editor — foram corrigidos na origem). A
>   justificativa do engineer para não sanitizar ("quebraria
>   value=/checked=/selected") é **parcialmente incorreta**: esses atributos
>   estão no allowlist default do DOMPurify; o que de fato quebraria é o
>   `onclick` inline do `image-manager.js:56` e os `style=` inline. O
>   contrato é um footgun documentado para chamador futuro (P13).
> - **Coerção numérica (S4)**: `Number()` de string hostil ou vira número
>   puro ou cai no default — unidades vêm do template (`mm`/`px`/`deg`),
>   impossível injetar CSS via settings. `showPageNumbers: Boolean("false")`
>   = true é bug lógico sem injeção. `esc()` do título correto para
>   `<title>` (raw text) e `<meta content="...">` (atributo).
>
> **O que mudaria o veredito para BLOQUEIA**: reabertura de P10 (nome de
> projeto voltando a contexto de atributo/HTML), bypass de `Sanitize.color`
> com breakout real, ou cadeia de XSS viável a partir da poluição do P12.
> Não é o caso. **P12 (Baixa) foi fechado pelo engineer — MITIGADO em
> 2026-10-02** (ver evidência acima); P13 é contrato.

---

## Veredito — RODADA 2 (2026-10-02b)

> ## ✅ **PASSA** — com ressalvas registradas
>
> **P7 está MITIGADO com evidência** — os 3 sinks da classe (toast
> `app.js:272-291`, preview de URL `image-manager.js:106-115`, preview do
> upload `:145-151` e erro ImgBB `:247-253`) não interpolam mais valores de
> terceiros em HTML (DOM properties + `textContent`/`createTextNode`), e o
> `isValidImageUrl` novo (`image-manager.js:262-297`) mata o bypass concreto
> do gate anterior (`?x=" onerror="` — rejeitado pelo teste de `"<>` na
> string crua e pelo pathname). **Varredura completa de sinks fora do
> `marked` executada nesta rodada** — não confiei em alegação do engineer:
> `templates.js` (constantes do produto; sem sink), `theme-editor.js`
> (CSS via `textContent`; self-XSS), `find-replace.js` (textarea apenas),
> `stats.js` (números + constantes i18n), `i18n.js` (constantes),
> `themes.js:3714` (nomes de tema — self-XSS sem import cross-user),
> `pix.js`, `preview.js` (sinks sanitizados), `epub-generator.js` (TOC via
> `innerText` de conteúdo já sanitizado). A varredura encontrou **1 sink novo
> da mesma classe**: P10 (modal de projetos ← nome importado de JSON).
> **P8 MITIGADO** (`ADD_DATA_URI_TAGS` removido; `data:image/` em `img[src]`
> segue default do DOMPurify; A6 ajustado prova os dois lados). **N2
> MITIGADO** (denylist de 9 caracteres cobre o vetor completo de
> `content:"..."` + `value="..."`; resíduo teórico U+000C registrado como
> P11). **P9 MITIGADO** (`.gitignore` da raiz cobre `browser-state-*.json` +
> `.playwright-mcp/`; `git status --porcelain --ignored` **executado** mostra
> os 4 arquivos como ignorados — a exclusão do disco fica com o owner).
> **mXSS EPUB mantido como residual** (2 round-trips pós-sanitização; o
> `isValidImageUrl` não altera esse caminho — confirmado).
>
> **Não voto verde absoluto.** Achados novos desta rodada:
>
> - **P10 (Média, pré-existente, NÃO coberto)** — XSS via **nome de projeto
>   importado**: `ProjectManager.importProject` (`storage.js:121-132`) aceita
>   qualquer string em `data.name` sem validação; o modal de projetos
>   (`editor.js:253-269`) interpola `${name}` (e `data-project`/`data-name`)
>   em `innerHTML` → JSON de terceiro = XSS na origem (localStorage, chave
>   ImgBB, PIX). Mesma classe de P7; sink que a rodada 1 não varreu.
> - **P11 (Baixa, verificação empírica pendente)** — a denylist da marca
>   d'água (`sanitize.js:26`) não remove **U+000C (form feed)**, newline
>   legado do CSS2.1. Se um tokenizer encerrar a string CSS em FF, o restante
>   vira CSS dentro do `<style>` (sem `<`/`>` → sem breakout de elemento;
>   pior caso `@import url(...)` = beacon outbound + quebra de layout).
>   Self-XSS (o usuário digita a própria marca d'água). Sem execução neste
>   gate → verificar empiricamente e, se confirmado, adicionar `\f`.
>
> **O que mudaria o veredito para BLOQUEIA**: reabertura de P7 (URL/
> `file.name` voltando a contexto de atributo) ou quebra do fluxo
> `data:image/` do image-manager. Não é o caso. P10 deve entrar na release
> (mesmo tratamento dado a P7 na rodada 1); P11 é resíduo registrado.

---

## Veredito — RODADA 1 (2026-10-02, histórico preservado)

> ## ✅ **PASSA** — com ressalvas registradas
>
> **P1 está MITIGADO com evidência** no escopo que a mudança declara (os 3
> sinks da saída do `marked`: preview, janela de impressão e EPUB), e **P2 está
> MITIGADO**. A evidência deste gate é **estática** (ordem do pipeline,
> fail-closed, wiring) + leitura da suite A2–A4/A8–A10 que prova os PoCs por
> execução — mas **não reexecutei os PoCs** (limitação do ambiente), então o
> fecho é "mitigado com evidência estática + suite lida", não "comprovado por
> execução deste gate". A execução fica a cargo do build gate (já alegada pelo
> engineer).
>
> **Não voto verde absoluto.** Esta revisão encontrou **3 achados novos**:
>
> - **P7 (Média, pré-existente, NÃO coberto pela mudança)** — sinks de HTML
>   fora do `marked` continuam interpolando strings influenciadas por terceiros
>   em `innerHTML`: toast de "arquivo carregado" (`app.js:276` ← `file.name` de
>   `readFile`, `app.js:256`), status de upload de imagem
>   (`image-manager.js:136` ← `file.name`) e preview de URL de imagem
>   (`image-manager.js:96` ← `url`). A classe P1 não está 100% fechada — só o
>   pipeline do `marked`. Vetor realista: abrir um `.md` baixado de terceiro com
>   nome hostil (macOS/Linux permitem `<`, `>`, `"` em nomes de arquivo).
> - **P8 (Baixa, desta mudança)** — `ADD_DATA_URI_TAGS: ['a']` libera `data:` em
>   `a[href]` sem requisito de produto (a necessidade real, `img[src]`
>   `data:image/`, já é default do DOMPurify). Recomendo remover.
> - **P9 (Média–Alta, operacional)** — `browser-state-0/1*.json` (classe de
>   arquivo com cookies de sessão Google, ver A1) está **na raiz do monorepo,
>   untracked, e o `.gitignore` da raiz NÃO os cobre** (só o do produto cobre,
>   e eles não estão no produto). Um `git add .` na raiz versiona cookies de
>   sessão. A1 re-materializou em outra forma.
>
> **CSP (D3)**: a decisão do ADR (não adicionar CSP nesta mudança) é **aceitável
> hoje** — concordo que um CSP permissivo com `'unsafe-inline'` seria segurança
> aparente — mas está **incompleta**: há diretivas ortogonais (`object-src
> 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`) que podem entrar AGORA
> sem quebrar nada, e o caminho completo (refatorar os handlers inline →
> `script-src 'self'`) fica como follow-up com pré-requisito explícito.
>
> **O que mudaria o veredito para BLOQUEIA**: se a mudança tivesse deixado a
> saída do `marked` passar não-sanitizada em qualquer um dos 3 sinks, ou se o
> fail-closed não existisse. Não é o caso. P7/P8/P9 são pré-existentes ou
> operacionais, não invalidam o fecho de P1/P2 — mas **P7 deve ser corrigido
> antes do release** e P9 antes de qualquer `git add` na raiz.

### Tabela de severidade

| ID | Achado | Severidade | Origem | Status | Bloqueia? |
|---|---|---|---|---|---|
| P1 | XSS via Markdown: `marked` → `innerHTML`/`document.write`/XHTML (preview, impressão, EPUB) | Alta → **mitigado** | Pré-existente; fechado por **esta mudança** | **MITIGADO** — evidência estática (sanitize por último, fail-closed, 3/3 sinks) + suite A2–A4/A8–A10 lida; **PoC não re-executado neste gate** | Não |
| P2 | Breakout de `</style>` via marca d'água na janela de impressão | Média → **mitigado** | Pré-existente; fechado por **esta mudança** (D4) | **MITIGADO** — allowlist de caracteres em 2 pontos (leitura no modal `pdf-generator.js:148` + sink `:221`); A8 lido; **PoC-A não re-executado** | Não |
| P7 | XSS em sinks fora do `marked`: toast de arquivo (`app.js:276`←`file.name`), status de upload (`image-manager.js:136`←`file.name`), preview de URL (`image-manager.js:96`←`url`) | Média (Alta em macOS/Linux) | Pré-existente — **não coberto** pela mudança | **MITIGADO (rodada 2)** — DOM properties + `textContent` nos 3 sinks; `isValidImageUrl` novo rejeita o bypass (`"<>` cru + pathname + hostname); A11/A12/A13 provam por execução (build gate, 21/21) | Não |
| P8 | `ADD_DATA_URI_TAGS: ['a']` libera `data:` em `a[href]` sem requisito de produto | Baixa | **Esta mudança** | **MITIGADO (rodada 2)** — removido (`sanitize.js:13`, `OPTIONS = {}`); A6 ajustado: `img[src]` `data:image/` sobrevive (default DOMPurify), `a[href]` `data:` sai | Não |
| P9 | `browser-state-0/1*.json` na raiz do monorepo, untracked, **fora do `.gitignore` da raiz** (classe A1: cookies de sessão Google) | Média–Alta | Operacional (worktree do monorepo) | **MITIGADO (rodada 2)** — `.gitignore` da raiz (linhas 26–32) cobre `browser-state-*.json` + `.playwright-mcp/`; `git status --porcelain --ignored` executado mostra os 4 arquivos como `!!` (ignorados). **Resíduo**: apagar os arquivos do disco (owner) + rotação de sessão (A1) | Não |
| N2 | Regressão da marca d'água: allowlist antiga removia `º ª « » — × ÷` e aspas tipográficas (pt-BR) | Média (funcional) | CODE-REVIEW (achado 2) | **MITIGADO (rodada 2)** — allowlist → denylist dos 9 caracteres de breakout (`sanitize.js:26`); A14 prova preservação + bloqueio | Não |
| P10 | XSS via **nome de projeto importado**: `ProjectManager.importProject` (`storage.js:121-132`) sem validação de `data.name`; modal de projetos (`editor.js:253-269`) interpola `${name}`/`data-project`/`data-name` em `innerHTML` | **Média** (JSON de terceiro; Alto impacto — XSS na origem) | Pré-existente — **não coberto** por esta mudança; **novo na rodada 2** | **MITIGADO (rodada 3)** — 2 camadas: fronteira em `storage.js` (S3: `isValidProjectName` + validação estrutural do import; `saveProject` revalida) e sink em `editor.js` (S2: `dataset` + `textContent`, sem interpolação). Nomes legados hostis no localStorage renderizam inertes (teste semeia e prova). **Resíduo P12 fechado (2026-10-02)**: chaves de protótipo rejeitadas na fronteira — `PROTOTYPE_KEY_RE` (`storage.js:62`) | Não |
| P11 | Denylist da marca d'água não remove **U+000C (form feed)**, newline legado CSS2.1 — se o tokenizer encerrar a string em FF, o resto vira CSS no `<style>` (sem `<`/`>` → sem breakout; pior caso `@import` beacon). Self-XSS | Baixa | Rodada 2 (análise da denylist N2) | **MITIGADO (rodada 3)** — `\f` adicionado à denylist (`sanitize.js:31`); build gate `b` já provara inocuidade empírica (15 payloads, 1 `<style>`, 0 `<script>`, 50 regras); teste S8 prova remoção + integridade do CSS | Não |
| P12 | **Poluição de protótipo via nome de projeto**: `__proto__`/`constructor`/`prototype` passavam `isValidProjectName`; `saveProject('__proto__', ...)` setava `Object.prototype.updated/current` antes do `TypeError` em `.versions` abortar | **Baixa** (sem cadeia de XSS encontrada — reads do `current` poluído caem em caminhos sanitizados) | **Novo na rodada 3** (buraco na fronteira do S3) | **MITIGADO (2026-10-02)** — `PROTOTYPE_KEY_RE = /^(?:__proto__|constructor|prototype)$/` (`storage.js:62`) rejeitado em `isValidProjectName` e `sanitizeProjectName` (round-trip do export); cobre `saveProject`/`importProject`/`renameProject` (fronteira, não renderização); decisão de **não** usar `Object.create(null)`. Evidência: `test/n11-p12-n13.spec.js` (FASE 1 reproduz o `TypeError` pré-correção; FASE 2: `false` sem poluir + nomes legítimos ok) | Não |
| P13 | `ModalManager.create` — slot `content` é HTML por contrato (sink da classe por design); nenhum dos 9 chamadores atuais passa dado não-confiável, mas chamador futuro reabre a classe. Justificativa do engineer para não sanitizar é parcialmente incorreta (o que quebraria é o `onclick` inline do `image-manager.js:56`, não value/checked/selected) | Baixa (latente) | **Novo na rodada 3** (auditoria dos 9 chamadores) | **ABERTO (contrato)** — dono: security + engineer. Revisitar `Sanitize.html(content)` quando os handlers inline saírem (CSP fase 2) | Não |
| P3 | Dependências de CDN sem SRI (`marked`, `jszip`, `FileSaver`, font-awesome) | Média (supply-chain) | Pré-existente | **ABERTO** — superfície **reduzida** por esta mudança (DOMPurify saiu do CDN, virou self-host); os 4 restantes continuam follow-up. Dono: devops/product | Não |
| P4 | Payload PIX (valor + mensagem) a `api.qrserver.com` sem consentimento explícito | Baixa–Média | Pré-existente | **ABERTO** — dono: owner (inalterado) | Não |
| P5 | `localStorage` em claro + falha silenciosa de cota | Baixa | Pré-existente | **ABERTO** — dono: engineer (inalterado) | Não |
| P6 | SW cache-first + `skipWaiting`/`claim` sem disciplina de versão | Baixa | Pré-existente | **ABERTO** — dono: devops. **F1 do gate anterior RESOLVIDO** (v4 + pre-cache completo) | Não |
| F1 | (gate anterior) `sw.js` sem `markdown-normalize.js` no pre-cache; `CACHE_VERSION` sem bump | Baixa | Gate anterior (2026-09-30) | **RESOLVIDO** — `markdown-normalize.js`, `js/vendor/dompurify.min.js` e `js/sanitize.js` no `LOCAL_ASSETS`; `CACHE_VERSION = 'v4'` (verificado por leitura) | Não |
| A1 | Cookies de sessão Google no repositório upstream | — (aceito) | Aceito pelo owner 2026-09-30 | **ACEITO** (upstream) + **P9 reabre o risco na raiz do monorepo** — ver P9 e seção A1 | Não |

---

## Achados DESTA MUDANÇA

### P1 — XSS via Markdown — **MITIGADO** (com ressalva de evidência)

- **Ameaça (recorde do gate anterior)**: input = Markdown arbitrário (cola de
  IA/terceiros). `marked` 9.1.2 não sanitiza desde a v5; o produto atribuía a
  saída a `innerHTML` (`preview.js:93,109`) e ao corpo da janela de impressão
  (`document.write`, `pdf-generator.js:345` ← corpo montado em
  `buildPrintDocument`). PoC-B do gate anterior: `<img src=x onerror=...>`
  atravessou o `marked` e o handler disparou.
- **O que esta mudança fez (verificado por leitura)**:
  1. `js/sanitize.js` → `Sanitize.html(dirty, opts)` é **fail-closed**: não-string
     → `''`; sem `window.DOMPurify` → `''` + `console.error` + toast
     (D2). Nenhum HTML não-sanitizado passa em estado degradado.
  2. Aplicado nos **3 sinks**: `preview.js:93` e `:109`
     (`innerHTML = Sanitize.html(html)`), `pdf-generator.js:246` (`bodyHtml =
     Sanitize.html(html)` dentro de `buildPrintDocument`, antes do
     `document.write`), `epub-generator.js:17` (`contentHTML =
     Sanitize.html(contentHTML)`) e `:90` (título).
  3. **Ordem do pipeline (o ponto de mXSS)**: em `preview.js` e no EPUB,
     `marked.parse` → `App.processSpecialBlocks` (round-trip
     DOMParser→`innerHTML`) → **`Sanitize.html` por último**. O round-trip
     acontece **antes** da sanitização; o que entra no DOM é a saída do
     DOMPurify. Posição defensiva correta. ✓
  4. Wiring: `index.html:347` (vendor) antes de `:348` (`sanitize.js`) antes de
     `:354` (`preview.js`), todos `defer` (ordem preservada). ✓
  5. `sw.js`: vendor + sanitize.js no pre-cache, `CACHE_VERSION='v4'`. ✓
- **Evidência**: estática (acima) + suite `test/sanitize-p1-p2.spec.js` lida
  integralmente: A2 (onerror não dispara no preview), A3 (`<script>`/`<iframe>`
  removidos), A4 (`javascript:` neutralizado), A8 (marca d'água hostil), A9
  (EPUB XHTML válido sem `on*=`/`<script>`), A10 (fail-closed). **A execução
  (16/16) é alegação do engineer — não foi reproduzida por este gate.**
- **Probabilidade residual**: Baixa para o vetor original (requer bypass do
  DOMPurify 3.4.16 ou erro de wiring futuro).
- **Impacto residual**: Alto se o bypass ocorrer (origem do app; localStorage).
- **Risco residual**: Baixo, com 3 componentes registrados:
  - **Bypass público do DOMPurify 3.4.16**: não verificado contra a base de
    CVEs atual (sem rede/execução neste gate). Mitigação por desenho: a troca
    de versão é copiar-colar (sem build). 
  - **mXSS por reparse**: no preview e no PDF, sanitização é a última
    operação — reparse pós-sanitização **não existe** nesses caminhos. **No
    EPUB existe**: após `Sanitize.html` (linha 17), o conteúdo passa por **2
    round-trips DOMParser→`innerHTML`** (TOC, linhas 21–33; imagens, linhas
    40–76) antes de virar XHTML. Mesmo parser (Chromium) e DOMPurify é testado
    contra reparse no mesmo browser — risco baixo, mas o princípio "sanitize
    last" é violado no caminho EPUB. Registrado; se um bypass aparecer, o EPUB
    é o caminho a investigar primeiro.
  - **EPUB reparse por leitores**: leitores EPUB parseiam o XHTML como **XML
    estrito**, não como HTML — não há foster-parenting/namespace tricks de
    parser HTML; risco baixo (ver também `&` em P7/observações).
- **Status**: **MITIGADO** (escopo: os 3 sinks do `marked`). A **classe** P1
  não está 100% fechada — ver **P7** (sinks fora do `marked`).

### P2 — Breakout de `</style>` via marca d'água — **MITIGADO**

- **Ameaça (recorde)**: `pdf-generator.js` interpolava `this.settings.watermark`
  sem escape em `content: "..."` dentro de `<style>` (raw text) montado por
  `document.write`. PoC-A do gate anterior: `</style><script>...</script>`
  executou.
- **O que esta mudança fez (verificado por leitura)**:
  1. `Sanitize.watermark(value)` (`sanitize.js:39-42`): allowlist
     `A-Za-z0-9À-ÖØ-öø-ÿ .,:;!?'()[]-_/%°#`; remove `<`, `>`, `"`, `\`, `&`,
     `{`, `}`, newline — nada que feche uma string CSS ou um atributo
     sobrevive. Não-string → `''`.
  2. Aplicada em **2 pontos** (fronteira defensiva): leitura do modal
     (`pdf-generator.js:148`, `watermark: Sanitize.watermark(...)` — fecha
     também o `value="${...}"` do re-render do modal) e no sink CSS
     (`pdf-generator.js:221`, dentro de `buildPrintDocument`).
  3. `init()` continua zerando `settings.watermark` (`:39`).
- **Evidência**: estática + A8 lido (asserts: exatamente 1 `</style>` legítimo,
  sem `<script`, sem `on*=`, sem breakout, `watermarkUnit` sem `[<>"\\&{}]`).
  **PoC-A não re-executado neste gate.**
- **Risco residual**: Baixo. Observação: `watermarkRotation` (interpolado em
  `rotate(...deg)`, `pdf-generator.js:228`) **não** é parseFloat/parseInt como
  opacity/size — vem cru de `Storage` no `init()` (o modal não o grava). Só é
  explorável com controle prévio do `localStorage` (jogo perdido de qualquer
  forma); registrar como hardening: validar numericamente como os irmãos.
- **Status**: **MITIGADO**. **Nota da rodada 2**: a implementação mudou de
  allowlist positiva para **denylist dos 9 caracteres de breakout**
  (`sanitize.js:26`) — corrige a regressão pt-BR (N2 do CODE-REVIEW) e
  mantém o fecho de P2; a reavaliação da denylist (vetores `\0`, U+2028/29,
  `/* */`, `&#x3c;`, `\f`) está na seção "Rodada 2" → resíduo P11.

### M1/M2 — gate chama o código de produção — verificado por leitura

- `PDFGenerator.buildPrintDocument({html, theme, settings, title})` é função
  pura (`pdf-generator.js:172-324`); `generate()` e `test/print-profile.spec.js`
  (teste 4) usam a MESMA função. A sanitização do corpo e da marca d'água vive
  **dentro** da função (fronteira no sink). ✓
- **Nuance de fronteira defensiva (L3)**: `buildPrintDocument` agora é função
  "pública" (usada pelo gate) e interpola `title` cru em `<title>` e
  `<meta content="...">` **sem sanitizar internamente** — ela confia no caller.
  Em produção o caller é `getBookTitle()` (denylist que remove `<` `>` `"` →
  não explorável hoje), e o gate passa `'Fixture do gate'`. Mas o contrato
  defensivo da constituição (L3) diz que função pública valida os próprios
  precondições. Follow-up baixo: escapar `title` (e os meta) dentro de
  `buildPrintDocument`.

---

## Achados NOVOS (descobertos nesta revisão)

### P7 — XSS em sinks fora do `marked` (toast, upload, URL preview) — **Média → MITIGADO (rodada 2)**

- **Ameaça**: a varredura de sinks (`innerHTML` em `js/`) revelou 3 pontos que
  interpolam strings **influenciadas por terceiros** sem sanitização:
  1. `app.js:276` (`showToast`): `el.innerHTML = '<i class="fas fa-'+icon+'">
     '+msg`. Caller `app.js:256`: `App.showToast('Arquivo "'+file.name+'
     carregado.')` — `file.name` do `.md` aberto.
  2. `image-manager.js:136`: `uploadStatus.innerHTML = ... ${file.name}
     (${sizeText})` — `file.name` do upload.
  3. `image-manager.js:96`: `previewUrl.innerHTML = '<img src="${url}"
     onerror="...">'` — `url` digitada no campo. `isValidImageUrl`
     (`:227-239`) é contornável: `https://e.com/x.jpg?x=" onerror="alert(1)`
     casa `\.jpg(\?.*)?$` e o `new URL` percent-encoda, mas a **string crua** é
     interpolada → breakout de atributo → XSS no modal.
- **Reachability honesta**: (1) e (2) exigem abrir/upar arquivo com nome
  hostil. **macOS/Linux** permitem `<`, `>`, `"` em nomes de arquivo → o vetor
  é real para esses SOs; **Windows** sanitiza nomes no download, mas o
  drag&drop com arquivo local renomeado ainda vale. (3) é self-XSS (usuário
  digita a URL), classe igual à do P2 original. Nenhum dos três passa pelo
  `Sanitize.html` novo.
- **Probabilidade**: Baixa–Média (pré-condição: abrir/upar arquivo de terceiro;
  ou digitar URL hostil).
- **Impacto**: Alto quando explorado — execução na origem, leitura de todo o
  `localStorage` (documentos, ver P5).
- **Mitigação**: passar `file.name`/`url` por `Sanitize.html()` (ou
  `textContent`) nos 3 pontos; validar a URL no **URL parseado**, não na string
  crua; eliminar o `onerror` inline da template de preview.
- **Risco residual**: hoje Médio (Alto em macOS/Linux); Baixo após correção.
- **Status**: **MITIGADO (rodada 2, 2026-10-02b)** — ver seção "Rodada 2 — análise
  detalhada" (bypass a bypass + varredura completa de sinks). O recorde da
  rodada 1 (ABERTO, dono: engineer, correção antes do release) foi o gatilho
  da correção; o fecho usa evidência estática + suite A11/A12/A13 (execução
  pelo build gate).

### P8 — `ADD_DATA_URI_TAGS: ['a']` sem requisito de produto — **Baixa → MITIGADO (rodada 2)**

- **Ameaça**: `sanitize.js:12` libera `data:` em `a[href]`. A justificativa do
  plano é o `readAsDataURL` do `image-manager` — que produz `data:image/` para
  **`img[src]`**, já permitido por default (img está em `DATA_URI_TAGS` do
  DOMPurify — confirmado na própria doc do engineer). O `['a']` **não** tem
  requisito de produto: `a[href]` com `data:` só amplia superfície (navegação
  `data:` bloqueada em navegadores modernos, mas comportamento varia em
  leitores EPUB e em browsers legados).
- **Probabilidade**: Baixa (vetor de click com `data:` bloqueado nos browsers
  atuais).
- **Impacto**: Baixo; residual de compatibilidade/EPUB.
- **Mitigação**: remover `ADD_DATA_URI_TAGS: ['a']`; o teste A6 (`aDireto`)
  codifica a permissão desnecessária — ajustar a expectativa.
- **Risco residual**: Baixo após remoção; hoje Baixo.
- **Status**: **MITIGADO (rodada 2)** — `sanitize.js:8-13`: `OPTIONS = {}`, o
  `ADD_DATA_URI_TAGS: ['a']` saiu. O gerenciador de imagens continua
  funcionando porque `data:image/` em `img[src]` é default do DOMPurify (img ∈
  `DATA_URI_TAGS`) — provado pelo A6 ajustado (`srcSobreviveu=true`,
  `aHrefDataRemovido=true`) e pelo A9 (`imgEmbarcada` no EPUB), executados
  pelo build gate (21/21).

### P9 — `browser-state-*.json` na raiz do monorepo, fora do `.gitignore` — **Média–Alta → MITIGADO (rodada 2, cobertura)**

- **Ameaça**: `git status` (2026-10-02) mostra `browser-state-0.json`,
  `browser-state-0-fingerprint.json`, `browser-state-1.json`,
  `browser-state-1-fingerprint.json` **untracked na raiz do monorepo**. O
  `.gitignore` da raiz **não** cobre `browser-state-*.json` (cobre `.factory/`,
  `node_modules/`, `.env*`, build, logs). A classe de arquivo já foi
  documentada em **A1** como portadora de cookies de sessão Google (`AEC`,
  `NID`, `__Secure-STRP`). Um `git add .` na raiz versiona cookies de sessão
  no monorepo (o risco que A1 registrou no upstream, agora no nosso
  repositório). O `.gitignore` do produto cobre, mas os arquivos **não estão
  no produto** — estão na raiz. Relacionado: `.playwright-mcp/` (perfis de
  browser de ferramenta de teste) também untracked na raiz.
- **Probabilidade**: Média (commit acidental com `git add .`; fluxo comum).
- **Impacto**: Alto (sequestro de sessão Google do owner — ver A1).
- **Mitigação**: adicionar `browser-state-*.json` (+ `-fingerprint.json`) e
  `.playwright-mcp/` ao `.gitignore` da **raiz**; apagar os arquivos; manter a
  rotação da sessão (A1) como mitigação real.
- **Risco residual**: hoje Médio; Baixo após `.gitignore` + exclusão.
- **Status**: **MITIGADO (rodada 2, cobertura do `.gitignore`)** — o `.gitignore`
  da raiz (linhas 26–32) agora tem `browser-state-*.json` e `.playwright-mcp/`
  (verificado por leitura). **Evidência executada**: `git status --porcelain
  --ignored` mostra `!! browser-state-0.json`, `!! browser-state-0-fingerprint.json`,
  `!! browser-state-1.json`, `!! browser-state-1-fingerprint.json` e
  `!! .playwright-mcp/` — um `git add .` na raiz não os versiona mais.
  **Resíduo (ação de owner, fora do escopo deste gate)**: os 4 arquivos
  continuam no disco — apagar; e a rotação da sessão Google (A1) segue
  pendente.

---

## Rodada 2 — análise detalhada (2026-10-02b)

### P7 — reavaliação bypass a bypass (sinks fora do `marked`)

**Estado atual verificado por leitura** (arquivos: `image-manager.js`,
`app.js`, `pdf-generator.js`, `sanitize.js`):

1. **Preview de URL** (`image-manager.js:106-115`): `<img>` via
   `document.createElement`, `.src`/`.alt` como DOM properties, fallback de
   erro via `addEventListener('error')`. A URL **nunca entra em contexto de
   atributo** — o parser HTML não vê a string. ✓
2. **Preview do upload** (`:145-151`) e **erro ImgBB** (`:247-253`):
   `createElement` + `.src` e `textContent`/`createTextNode`
   (`error.message` é texto da API ImgBB — terceiro — nunca innerHTML). ✓
3. **Toast** (`app.js:272-291`): `<i>` via `createElement`, mensagem via
   `textContent`; `type` vai só para `className` e para o ternário do ícone
   (sem contexto de atributo — A13 forja `type` e prova). ✓
4. **Validador** (`isValidImageUrl`, `image-manager.js:262-297`): string +
   trim; recusa `"` `<` `>` na string crua; `new URL()`; `data:` só
   `data:image/`; protocolo só `http:`/`https:`; allowlist por **hostname**
   parseado (`host === h || host.endsWith('.'+h)`, com `www.` removido); e
   fallback por **extensão no pathname** (nunca na string crua com query).

**Bypasses tentados contra o validador novo (por raciocínio estático — sem
execução):**

| Vetor | Resultado | Por quê |
|---|---|---|
| `https://x.com/a.jpg?x=" onerror="alert(1)` | **Rejeitado** | `"` na string crua → `false` (linha 272) — antes mesmo do parse; A12 prova |
| `https://imgur.com/x?a=" onerror="alert(1)` | **Rejeitado** | idem (é o payload exato do P7/A11) |
| `javascript:alert(1)` | **Rejeitado** | protocolo ≠ http(s)/data (A12) |
| `data:text/html,...` | **Rejeitado** | `data:` exige prefixo `data:image/` (A12) |
| `data:image/svg+xml;base64,...` | **Aceito — sem impacto** | chega só a `img.src`/`<img>` do markdown → SVG em contexto de `<img>` **não executa script** (regra de browser); `"<>` inexistentes no base64. Resíduo Baixo: leitores EPUB com script habilitado (fora do nosso controle) |
| `https://imgur.com.evil.tld/x.jpg` | **Rejeitado** | hostname `imgur.com.evil.tld` não `=== imgur.com` nem `endsWith('.imgur.com')` |
| `https://evilimgur.com/x.jpg` | **Rejeitado** | idem (sem o ponto) |
| `https://imgur.com@evil.com/x.jpg` | **Rejeitado** | `parsed.hostname = evil.com` (userinfo não conta) |
| `https://evil.com/?x=imgur.com` | **Rejeitado** | hostname = evil.com; query não participa (A12) |
| `http://[::1]/x.jpg` (IPv6) | **Aceito (fallback de extensão)** | qualquer host com extensão de imagem no path é aceito — intencional ("URL de qualquer imagem da web"); client-side, sem servidor → sem SSRF real; carrega só no browser do usuário |
| `https://imgur.com/x.jpg%0d%0a...` | **Inerte** | `\r\n` cru é percent-encoded pelo `new URL`; e a URL nunca é interpolada em HTML — CRLF perdeu relevância |
| IDN/punycode/unicode (`。`) | **Inerte** | URL parser normaliza para hostname; cai no fallback de extensão — mesmo caso do IPv6 |

**Conclusão P7**: o bypass concreto morreu (string crua com `"` → rejeitada; e
mesmo que passasse, `img.src` é DOM property, não atributo). Os resíduos
honestos: (a) `data:image/svg+xml` aceito — sem script em `<img>`, Baixo; (b)
o fallback de extensão aceita qualquer host — client-side, Baixo; (c) o
`Sanitize.html` continua dependendo do DOMPurify 3.4.16 sem hash pinado
(P3); (d) o `isValidImageUrl` é **fronteira defensiva** — um chamador futuro
que volte a interpolar sem passar por ele reabre a classe (registrado como
contrato; A12 cobre o comportamento atual).

### N2 — reavaliação da denylist da marca d'água (9 caracteres)

**Contextos do valor**: (1) CSS `content: "${watermark}"` no `<style>` da
janela de impressão (`pdf-generator.js:225`); (2) `value="${watermark}"` do
`<input>` no modal (`pdf-generator.js:108` — na prática sempre `''`, pois
`init()` zera `settings.watermark` e o modal grava só valor sanitizado —
dupla defesa).

**Denylist** `[<>"\\&{}\r\n]` (`sanitize.js:26`) remove: `"` (fecha string
CSS e atributo), `\` (escapes CSS), `<`/`>` (`</style>`/tag), `&` (entidades
no atributo), `{`/`}` (blocos de declaração), `\r\n` (newlines CSS).

| Vetor testado (estático) | Resultado |
|---|---|
| `</style><script>` (P2 original) | Bloqueado — `<` e `>` removidos (A8/A14 provam) |
| `</style` sem `>` | Impossível — `<` removido |
| `\0` (null byte) | Inerte — pré-processamento CSS/HTML troca por U+FFFD; não fecha string nem atributo |
| U+2028/U+2029 (line/paragraph separator) | Inerte — **não** são newline no CSS (newline = CR/LF/FF); literais dentro da string e do atributo |
| `/* */` comentários | Inerte — literais dentro da string; sem `"`/`{` o resto não vira declaração |
| `&#x3c;` | Impossível — `&` removido (em raw text do `<style>` nem faria sentido; no atributo, sem `&` não há entidade) |
| U+000C **form feed** | **NÃO removido** — newline legado do CSS2.1; se o tokenizer encerrar a string em FF, o restante vira CSS dentro do `<style>`. Sem `<`/`>` não há breakout de elemento; pior caso `@import url(...)` (beacon outbound) + quebra de layout. **Self-XSS** (o usuário digita a própria marca d'água; sem vetor cross-user — localStorage é same-origin). → **P11** (verificação empírica pendente) |

**Conclusão N2**: a denylist cobre o vetor completo dos 2 contextos
declarados; a fragilidade conceitual (denylist exige lembrar de estender
para um contexto futuro) fica registrada como dívida de manutenção, e o
único caractere questionável (FF) vira P11. A regressão pt-BR
(`º ª « » — × ÷`, aspas tipográficas) está corrigida — A14 prova a
preservação com o documento de impressão real.

### P8 — reavaliação (allowlist do `Sanitize.html`)

`OPTIONS = {}` — sem acréscimos. `img[src]` `data:image/` é default do
DOMPurify (img ∈ `DATA_URI_TAGS`) → o fluxo `readAsDataURL` →
`![alt](data:image/...)` → preview/PDF/EPUB continua funcionando (A6
ajustado: `srcSobreviveu`, `aHrefDataRemovido`, `aTextoPreservado`; A9:
`imgEmbarcada`). Sem quebra de requisito. ✓

### mXSS no caminho EPUB — mantido como residual

O `isValidImageUrl` **não altera** o caminho do EPUB: as URLs de imagem do
corpo vêm do markdown através do `marked` → `Sanitize.html` (DOMPurify) e
dos round-trips DOMParser (`epub-generator.js:22,41,76`); o validador só é
usado no modal de inserção. Os 2 round-trips **após** `Sanitize.html`
continuam existindo (TOC + imagens) — residual Baixo mantido (mesmo parser
do DOMPurify; leitores EPUB parseiam XML estrito). Confirmado por leitura.

### P10 — XSS via nome de projeto importado (NOVO, Média)

- **Cadeia**: `ProjectManager.importProject(jsonString)` (`storage.js:121-132`)
  faz `JSON.parse` e, se `data.name && data.current`, chama
  `saveProject(data.name, data.current)` **sem validar o nome** (tipo,
  tamanho, charset). O nome vira chave em `localStorage['md2pdf_projects']`.
- **Sink**: `Editor.showProjectManager()` (`editor.js:253-269`) renderiza
  `${name}` em `innerHTML` (via `ModalManager.create`) em **3 pontos**: o
  `<li class="project-item" data-project="${name}">`, o
  `<div class="project-name">${name}</div>` e os
  `data-name="${name}"` dos botões. `"` → breakout de atributo; `<`/`>` →
  elemento arbitrário; `onerror=`/`onmouseover=` executam.
- **Reachability**: import de JSON de terceiro ("projeto que recebi") —
  mesma classe de P7 (arquivo externo). Também self-XSS via `prompt()` na
  criação. **Cross-user**: sim, via arquivo importado.
- **Impacto**: Alto quando explorado — XSS na origem: leitura/escrita de
  todo o `localStorage` (documentos, temas, chave ImgBB utilizável), PIX.
- **Mitigação**: renderizar o nome com `textContent`/DOM properties (e
  `data-*` via `dataset`), ou `Sanitize.html(name)` antes do template;
  validar `data.name` no `importProject` (string, length ≤ N, sem
  `[<>"&]`).
- **Status**: **ABERTO (novo)** — dono: engineer. Pré-existente (não
  introduzido por esta mudança); entrar na release (tratamento de P7).

### P11 — U+000C (form feed) fora da denylist da marca d'água (NOVO, Baixa)

- **Ameaça**: `WATERMARK_BLOCKED` não remove `\f`. FF é newline legado do
  CSS2.1; se o tokenizer do browser tratar FF como fim de string, o restante
  da marca d'água é parseado como CSS dentro do `<style>` — sem `<`/`>`
  (removidos) não há breakout de elemento; o pior caso é `@import url(...)`
  (beacon GET outbound do browser do usuário para host do atacante, sem
  credenciais nossas) e quebra de layout do documento de impressão.
- **Probabilidade**: Baixa (self-XSS — o usuário digita a própria marca
  d'água; comportamento do tokenizer depende do browser).
- **Impacto**: Baixo.
- **Mitigação**: adicionar `\f` ao denylist (custo zero) e/ou validar
  empiricamente com um teste Playwright.
- **Status**: **ABERTO (verificação pendente)** — dono: engineer. **Não
  verificado por execução** neste gate (ambiente sem browser).

### Observações novas da varredura (hardening, não achados)

- **N7 ampliado**: `buildPrintDocument` interpola `s.watermarkRotation`,
  `s.watermarkSize`, `s.watermarkOpacity` em CSS **sem validação numérica
  interna** (fronteira pública/L3). Hoje seguro: o modal faz
  `parseFloat`/`parseInt` (e rotação nem é gravada pelo modal). Um caller
  futuro com settings crus reabriria injeção CSS no documento de impressão
  (mesma raiz do N4 — title). Unificar a validação numérica dentro de
  `buildPrintDocument`.
- **Fontes de tema** (`themes.js:382`): a família vai **raw** no `href` do
  `getGoogleFontsLink` e em `font-family: ${...}` do CSS de impressão —
  self-XSS (temas = constantes do produto ou localStorage do próprio
  usuário; sem import cross-user — verificado: só há import de **projetos**,
  não de temas). Hardening: `encodeURIComponent` na família.
- **Zip-slip EPUB via mime de data URL**: **descartado por leitura** —
  `epub-generator.js:53` faz `matches[1].split('/')[1]` (2º segmento do
  mime) → nunca contém `/` → filename `image_N.<subtype>` sem traversal.
- **`stats.js:22,55`**: interpola apenas números (`toLocaleString`) e
  constantes i18n — sem vetor.

---

## Rodada 3 — análise detalhada (2026-10-02c)

### P10 — reavaliação do vetor `importProject` → nome → `innerHTML` (fechado?)

**Veredito: fechado, com 2 camadas independentes.**

1. **Fronteira (`storage.js`, S3)** — o vetor de entrada foi cortado:
   - `sanitizeProjectName` (`:63-68`): string? remove `[<>"'&]`, trim, slice
     ≤ 100. Usado no export (round-trip: o JSON gerado é a forma que o
     import aceita).
   - `isValidProjectName` (`:72-77`): string, trim não-vazio, ≤ 100, sem
     `[<>"'&]`.
   - `importProject` (`:150-165`): `JSON.parse` em try/catch; `data.name`
     **validado**; `data.current` deve ser **objeto**; `current.markdown`
     **string**; `current.themeId` **número** (se presente); grava só via
     `saveProject` — que **revalida** o nome e o `data`.
   - Payloads hostis rejeitados: nome com `< > " ' &`, `current` não-objeto,
     `markdown` não-string, `themeId` não-número (teste S3/FASE 2).
2. **Sink (`editor.js`, S2)** — mesmo que um nome hostil **já exista** no
   `localStorage` (legado pré-correção), a renderização não interpola:
   `li.dataset.project`, `b.dataset.name`, `nameDiv.textContent`,
   `metaDiv.textContent` (datas/números). O modal de versões interpola só
   `Date.toLocaleString` e números. O load grava `App.dom.input.value`
   (DOM property) → `marked` → `Sanitize.html`.
3. **Teste com nome legado hostil**: o spec semeia
   `<img src=x onerror="window.__p10=2">.png` diretamente em
   `md2pdf_projects` e asserts que o modal renderiza o nome **literal**,
   com 0 `<img>`, 0 `[onerror]`, 0 execução — exatamente o cenário "dado
   gravado antes da correção".

**Falha encontrada na fronteira (P12)**: `isValidProjectName` não rejeitava
chaves do protótipo (`__proto__`, `constructor`, `hasOwnProperty`, ...).
`saveProject('__proto__', data)`: `projects['__proto__']` resolve para
`Object.prototype` (truthy) → pula a criação → `Object.prototype.updated`
e `Object.prototype.current` são setados **antes** do `TypeError` em
`.versions.unshift` abortar o import. A poluição persiste na página; o
import falha (return false). **Não encontrei cadeia de XSS**: os únicos
reads de `.current` (`editor.js:384-386`) caem em `input.value` (safe) e
`marked→Sanitize.html` (safe); `themeId` hostil → `parseInt` → NaN →
`getThemeById` → tema default. Severidade Baixa, robustez/fronteira.

**Fechado em 2026-10-02 (pós-gate, pelo engineer)** — `PROTOTYPE_KEY_RE =
/^(?:__proto__|constructor|prototype)$/` (`storage.js:62`), rejeitado em
`isValidProjectName` (`:87`) e em `sanitizeProjectName` (`:77`, round-trip
do export); `saveProject` (`:101`), `importProject` (`:166`) e
`renameProject` (`:131`) ficam cobertos pela mesma fronteira. Decisão
registrada de **não** usar `Object.create(null)`: a fronteira fecha o
vetor de escrita; os reads vêm de `Object.keys(getAll())` (chaves
próprias) e o render já é `textContent` (S2). Evidência:
`test/n11-p12-n13.spec.js` (lido integralmente) — FASE 1 reconstrói a
validação pré-P12 em memória e reproduz a poluição (`poluiu=true`, com o
`TypeError` `Cannot read properties of undefined (reading 'unshift')`);
FASE 2 no caminho de produção: `isValidProjectName('__proto__'/
'constructor'/'prototype')` = `false`, `saveProject`/`importProject`
retornam `false` **sem** setar `Object.prototype.updated/current`, e
nomes legítimos passam no round-trip save/get/list. Execução pelo build
gate (suíte 39/39 + C1–C8).

### `Sanitize.color()` — tentativa de bypass (bateria executada por raciocínio estático)

`COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i` +
`COLOR_BLOCKED = /[;{}"'<>\\\n\r\f]/`. Fallback: `'#333'`.

| Vetor | Resultado | Por quê |
|---|---|---|
| `rgb(1,2,3);background:url(evil)` | Rejeitado | `;` bloqueado |
| `rgb(1,2,(3))` (paren interno) | Rejeitado | `[^)]*` não pode conter `)`; sobra `)` → âncora `$` falha |
| `rgb(1,2,3))` | Rejeitado | idem |
| `\65 xpression` / `\75 rl(...)` | Rejeitado | `\` bloqueado |
| `/* */` | Rejeitado (sem match) | não é `#hex` nem função |
| `rgba(/* x */)` | Aceito — **inerte** | comentário dentro da função; sem `)` extra/`;`/`{` o valor é cor inválida → declaração descartada |
| `#fff` / `#2d5a27` / `#ffffffff` | Aceito (válido) | 3-8 hex |
| `#12345` / `#1234567` (5/7) | Aceito — **inerte** | hex inválido no CSS → declaracao descartada |
| `#zzz` | Rejeitado | `[0-9a-f]` |
| `RGB(1,2,3)` / `HSL(...)` | Aceito (válido) | flag `/i` |
| `url(#x)` / `red` | Rejeitado | sem match → `#333` |
| `\n` / `\r` / `\f` dentro de `rgb()` | Rejeitado | bloqueados antes do regex |
| `rgb(1,2,3\u2028)` (U+2028/29) | **Aceito — inerte** | U+2028/29 não são newline no css-syntax (CR/LF/FF são); sem `;{}"'` não fecham declaração. **Hardening**: adicionar `\u2028\u2029` ao `COLOR_BLOCKED` |

**Conclusão**: sem bypass. O formato é anchorado (`^...$`), os delimitadores
de saída (`;{}"'<>\\`) e os newlines CSS (`\n\r\f`) saem, e dentro da
função de cor não há como escapar sem esses caracteres. Sinks do valor são
todos contexto CSS (style.background via CSSOM, CSS text de
`getPrintCSS`/`buildThemeCSS`/`ornamentDividerCSS`). Observação cosmética:
`Sanitize.color` rejeita cores nomeadas (`red`) e `rgb(...)` recebe sufixo
`40` (alpha) em `ornamentDividerCSS` — `rgb(10,20,30)40` é inválido → `hr`
sem gradiente; sem impacto de segurança.

### `Sanitize.attr()` — contexto de atributo vs. RCDATA (`<textarea>`)

- **Atributo duplo-quotado** (`value="${...}"` em theme-editor name/color e
  pdf-generator watermark): `"` → `&quot;` bloqueia breakout; `&` escapado
  **primeiro** impede double-decode (`&quot;` de entrada vira
  `&amp;quot;` → renderiza literal). `<`/`>`/`'` sobrescapados são
  inócuos (decodificam de volta).
- **`<textarea>` (RCDATA)**: `<` → `&lt;` mata o único breakout possível
  (`</textarea`); `&` → `&amp;` mata entidade. `>`/`"`/`'` escapados são
  decodificados pelo parser → o usuário vê o CSS original e `el.value`
  devolve a string original — **round-trip lossless**. Não há
  under-filtering (em RCDATA só o end tag importa) nem over-filtering
  funcional.
- **Conclusão**: correto nos 2 contextos. A observação "um filtro de
  atributo aplicado a `<textarea>` pode over/under-filtrar" não se
  confirma: o over-escaping é reversível e o under-escaping inexistente.

### ModalManager `content` HTML por contrato — auditoria dos 9 chamadores

| # | Chamador | Dado não-confiável em `content`? | Veredito |
|---|---|---|---|
| 1 | `editor.js:240` projetos | Não — content estático; lista via DOM (S2) | ✓ |
| 2 | `editor.js:432` versões | Não — só `Date.toLocaleString` e números | ✓ |
| 3 | `editor.js:491` atalhos | Não — estático | ✓ |
| 4 | `pdf-generator.js:75` settings | Não — números coagidos; strings por lookup de mapa (`pageNumberPositions`, `sizeMap`); watermark via `Sanitize.attr` (sempre `''`) | ✓ |
| 5 | `image-manager.js:30` inserir imagem | Não — estático + i18n (tem `onclick` inline **próprio** — ver P13) | ✓ |
| 6 | `stats.js:75` stats | Não — números `toLocaleString` (sem HTML) | ✓ |
| 7 | `theme-editor.js:18` editor de tema | Não — `Sanitize.attr` em name/color/css | ✓ |
| 8 | `templates.js:2881` seletor | Não — constantes do produto (name/desc/icon) | ✓ |
| 9 | `templates.js:2946` capa | Não — estático + `Date.toLocaleDateString` | ✓ |

**Segurança aparente ou real?** Real hoje: nenhum chamador interpola dado
não-confiável. Mas o slot `content` é o único `innerHTML` do produto que
aceita HTML **por contrato** — a classe foi fechada por auditoria dos
callers, não por defesa no sink. A justificativa do engineer para não
sanitizar ("quebraria value=/checked=/selected") é **parcialmente
incorreta**: esses atributos estão no allowlist default do DOMPurify; o que
de fato quebraria é o `onclick` inline de `image-manager.js:56` e os
`style=` inline. Registrado como **P13** (contrato frágil; revisitar na CSP
fase 2, quando os handlers inline saírem).

### S4 — coerção numérica e título no documento de impressão

- `num(v, d)` (`pdf-generator.js:207-212` e `:44-49` no `init`): `null`/
  `undefined`/`''`/não-finito → default; `Number(v)` de string hostil vira
  **número puro** (`"1e3"` → 1000; `"12px"` → NaN → default; `[5]` → 5).
  Unidades são anexadas pelo **template** (`${v}mm`/`${v}px`/`${v}deg`),
  não pelo valor — impossível injetar sintaxe CSS. Valores negativos/
  gigantes → só layout quebrado.
- `showPageNumbers: Boolean(loaded.showPageNumbers)` — `"false"` string →
  `true`: bug lógico (numeração ligada quando deveria estar desligada), sem
  injeção. Observação, não achado.
- `esc(v)` (`:220-224`): `&` → `<` → `>` → `"`, nessa ordem. `<title>` (raw
  text): mata `</title`; `&amp;` é decodificado de volta (correto). `<meta
  content="...">`: `&quot;` mata breakout; `&` primeiro impede entidade
  dupla. `'` não escapado — irrelevante nos 2 contextos (raw text e
  atributo duplo-quotado). **Correto** (fecha o follow-up L3/N4 da rodada 1).

### Inventário da classe (S1–S8) — varredura executada nesta rodada

Grep de `innerHTML=/insertAdjacentHTML/document.write/srcdoc/eval` em
`js/*.js`:

- `app.js:28` overlay do ModalManager — estático; única interpolação
  `sizeClass` validado por `SIZES_ALLOWED` ✓ · `:43` `content` — por
  contrato (P13) ✓ · `:132` clear ✓
- `preview.js:93,114` — `Sanitize.html(html)` ✓
- `stats.js:22,55` — números `toLocaleString` + i18n (S7) ✓
- `image-manager.js:110,113,117,145,206,234` — strings **estáticas** sem
  interpolação ✓
- `themes.js:3705` — clear; `renderList` via DOM (S5) ✓
- `pix.js:114,120` — estático (save/restore do próprio conteúdo) ✓
- `epub-generator.js:9,204` — estático (spinner, restore) ✓
- `pdf-generator.js:394` — `document.write(doc)` onde `doc` =
  `buildPrintDocument` com `Sanitize.html(body)` + settings validados (S4) ✓
- `editor.js` — **zero `innerHTML` restante** ✓

Todos os sinks restantes são constantes do produto ou dado interno
confiável; nenhum interpola dado não-constante não-sanitizado. A classe
está fechada (com o contrato P13 registrado para o futuro).

---

## Achados PRÉ-EXISTENTES — reavaliação de status (não desapareceram)

### P3 — CDN sem SRI — **ABERTO (superfície reduzida)**

- **Status novo**: o DOMPurify saiu do CDN (self-host, `js/vendor/`) — o script
  do caminho de segurança agora é first-party e pre-cacheado. `marked`,
  `jszip`, `FileSaver` e font-awesome **continuam** em CDN sem `integrity`
  (`index.html:71,342-344`), cacheados pelo SW (stale-while-revalidate). Sem
  agravamento; a mudança reduziu a superfície. **Self-host sem SRI é correto
  aqui** (julgamento honesto): SRI protege contra comprometimento de CDN
  terceiro; um atacante que escreva no nosso deploy já controla `index.html` e
  pode trocar o `integrity` junto — SRI same-origin não adiciona defesa contra
  deploy compromise. O residual real é a **integridade do vendor em si**
  (arquivo copiado de `dist/`): o hash do `dompurify.min.js` local **não foi
  comparado** com o upstream npm — **não verificado**; pinar o hash na release.
- **Status**: ABERTO — dono: devops/product.

### P4 — PIX a `api.qrserver.com` — **ABERTO (inalterado)**

- Payload PIX (valor + mensagem) continua indo como GET a
  `api.qrserver.com/v1/create-qr-code/` (`pix.js:102-104`), sem consentimento
  além do gesto de gerar. Chave `pedroluz@yahoo.com` = identificador público de
  destino (não é credencial). **Status**: ABERTO — dono: owner.
- **Nova observação (Baixa)**: `image-manager.js:10` expõe chave de API ImgBB
  hardcoded no cliente. Para o modelo ImgBB isso é esperado (chave de app
  público), mas qualquer visitante pode abusá-la → cota esgotada → uploads de
  imagem quebram para todos (DoS). Registrar como hardening: rotação/limite ou
  proxy. Dono: devops.

### P5 — `localStorage` em claro + cota silenciosa — **ABERTO (inalterado)**

- `storage.js:8-16` continua falhando silencioso em `QuotaExceededError`.
  Inalterado. Amplifica P1/P7 (XSS lê tudo em claro). Dono: engineer.

### P6 — SW cache-first + skipWaiting — **ABERTO (F1 resolvido)**

- `CACHE_VERSION` agora é **v4** com pre-cache completo
  (`markdown-normalize.js`, `dompurify.min.js`, `sanitize.js` presentes). O
  **F1 do gate anterior está RESOLVIDO** (verificado por leitura de `sw.js`).
  O padrão base (cache-first + `skipWaiting`/`claim`) permanece — follow-up de
  hardening (bump automático no deploy). Dono: devops.

### A1 — Cookies de sessão Google — **ACEITO no upstream; REABERTO na forma P9**

- O aceite de 2026-09-30 (apagar os arquivos do upstream, `.gitignore` do
  produto, rotação da sessão) permanece válido para o **upstream**. **O que
  mudou**: arquivos da mesma classe apareceram **na raiz do monorepo**
  (untracked, sem cobertura do `.gitignore` da raiz) — ver **P9**. A rotação
  da sessão Google (logout/revogação) continua sendo a mitigação real e segue
  pendente. **Status**: ACEITO (upstream) + P9 aberto.

---

## CSP — avaliação crítica da decisão D3 (follow-up com pré-requisito)

- **A decisão do ADR** (sem CSP nesta mudança; um CSP permissivo seria
  segurança aparente) **é aceitável para esta mudança** — concordo com o
  racional central: com 15 handlers `on*=` inline no `index.html` (verificado
  por leitura: 4 `onload` de stylesheet, 1 `oninput`, 9 `onclick`, 1 `onchange`
  — além de 2 handlers inline em templates dinâmicas, `image-manager.js:51,96`)
  e 1 `<script>` inline (registro do SW, `index.html:367-373`), um
  `script-src 'self'` estrito quebra o app, e `script-src 'self'
  'unsafe-inline'` **não bloqueia o vetor** (atributos `on*=` injetados seguem
  executando). A contagem "52" do ADR não foi reproduzida por mim (meu grep
  encontrou 17 no index.html + templates dinâmicos; a contagem do ADR
  provavelmente varre todas as ocorrências em todos os arquivos) — o **ponto**
  (muitos handlers inline) está confirmado.
- **O que está faltando e pode entrar AGORA sem quebrar nada** (follow-up
  rápido): `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`,
  `form-action 'self'`. O produto não usa `<object>`/`<embed>`/`<base>`
  (verificado por leitura) — essas diretivas não dependem da refatoração.
- **Caminho completo** (follow-up com pré-requisito explícito): (1) refatorar
  os handlers `on*=` → `addEventListener` (remove a dependência de
  `'unsafe-inline'`); (2) mover o registro do SW para arquivo externo; (3)
  adicionar `script-src 'self'` + hashes. Com isso, um bypass futuro do
  DOMPurify (que insira `<script>` ou `on*=`) fica bloqueado por CSP — a defesa
  em profundidade que hoje não existe.
- **Status**: DECISÃO ACEITA para esta mudança; follow-up com dono engineer +
  devops e pré-requisito registrado.

---

## O que foi testado de fato (evidência) e o que ficou não verificado

### Verificado por leitura de código (fato, sem execução)

**Rodada 3 (2026-10-02c):**
- `sanitize.js`: `COLOR_RE`/`COLOR_BLOCKED` (`:62-63`), `color()` com
  fallback `#333` (`:65-72`), `attr()` na ordem `& < > " '` (`:79-87`),
  `WATERMARK_BLOCKED` com `\f` (`:31`). Bateria de bypass de
  `Sanitize.color`/`Sanitize.attr` na seção "Rodada 3".
- `storage.js`: `PROTOTYPE_KEY_RE` (`:62`, P12), `sanitizeProjectName`/
  `isValidProjectName` (`:73-89`) com rejeição de chaves de protótipo
  (`:77,:87`), `saveProject` revalidando nome+dados (`:100-121`),
  `importProject` com validação estrutural (`:162-177`), `renameProject`
  (`:129-136`). **P12 fechado**: ver seção P12 da Rodada 3.
- `editor.js:259-319`: lista de projetos via `createElement`/`dataset`/
  `textContent`; sem `innerHTML` restante no arquivo.
- `pdf-generator.js`: `num()` em `init` e `buildPrintDocument` (`:44-49`,
  `:207-212`); `esc()` do título (`:220-225`); watermark sanitizada no sink
  (`:270`); `Sanitize.attr` no `value` do modal (`:135`).
- `themes.js`: `renderList` via DOM (`:3702-3742`), `Sanitize.color` em
  `getPrintCSS` (`:3447`) e `buildThemeCSS` (`:3608-3609`); `themes.js:3690,
  3694` atribuem `theme.color` cru via CSSOM (`style.color`/`borderLeftColor`
  — atribuição CSSOM não é sink de injeção: valor inválido é descartado).
- `app.js:24-72`: `ModalManager.create` — `textContent` para title/buttons,
  regex `^[A-Za-z0-9_-]+$` para class/action, `content` por contrato;
  auditoria dos 9 chamadores (tabela na seção Rodada 3).
- Spec `test/sanitize-p10p11-class.spec.js` **lido integralmente** (505
  linhas): 6 testes com FASE 1 (sink antigo em memória executa o payload)
  e FASE 2 (caminho corrigido) — P10/S3/S2, S1, S5/S6, S4/N7, S8/P11,
  regressão dos 9 modais.
- Spec `test/n11-p12-n13.spec.js` **lido integralmente** (301 linhas): 3
  testes (N11/P12/N13) com FASE 1 pré-correção em memória e FASE 2 no
  caminho de produção — P12 prova que `__proto__`/`constructor`/
  `prototype` não passam na validação e que `saveProject`/`importProject`
  retornam `false` **sem poluir** `Object.prototype` (nomes legítimos
  seguem no round-trip). **Execução (suíte final 39/39 + C1–C8) NÃO
  reproduzida por este gate** — evidência do build gate
  (`build-2026-10-02c` emitido com 36/36; suíte ampliada para 39 com o
  novo spec).
- `git status --porcelain --ignored` **executado**: os 4
  `browser-state-*.json` + `.playwright-mcp/` seguem `!!` (ignorados) —
  P9 cobertura confirmada; `git diff .gitignore` confirma as linhas 26–32.
- `git log --all -1 --format=%cI` **executado**: âncora
  `2026-09-15T09:56:55-03:00`.

**Rodada 2 (2026-10-02b):**
- `isValidImageUrl` novo (`image-manager.js:262-297`): string/trim, rejeita
  `"<>` cru, `new URL()`, `data:` só `data:image/`, protocolo http(s),
  hostname parseado (não `includes`), extensão no pathname. A12 cobre os 3
  bypasses do P7 por execução (diferencial contra a lógica antiga).
- Sinks P7 corrigidos: preview URL (`:106-115`, `createElement` +
  `addEventListener`), preview upload (`:145-151`), erro ImgBB (`:247-253`,
  `createTextNode`), toast (`app.js:272-291`, `textContent`; `type` só em
  `className`).
- `sanitize.js:13` `OPTIONS = {}` (P8 removido); `:26` denylist
  `[<>"\\&{}\r\n]` (N2).
- Varredura completa de sinks fora do `marked`: `templates.js` (constantes;
  sem `innerHTML`/`document.write`), `theme-editor.js` (CSS via
  `textContent`; fonts de lista fixa), `find-replace.js` (textarea),
  `stats.js` (números + i18n), `i18n.js` (constantes, `textContent`),
  `editor.js` (**P10**: `${name}` no modal de projetos ← import JSON),
  `themes.js:3714` (self-XSS, sem import de temas), `pix.js` (cssText
  estático), `epub-generator.js` (TOC via `innerText` de conteúdo
  sanitizado), `storage.js` (`importProject` sem validação de `data.name` —
  origem de P10).
- `.gitignore` da raiz (linhas 26–32): `browser-state-*.json` +
  `.playwright-mcp/` (P9). Suite A1–A15 **lida integralmente** (A6 ajustado
  para P8; A11–A15 novos cobrem preview, validador, toast, watermark,
  regressão).
- **Executado neste gate** (sandbox restrito): `git log --all -1
  --format=%cI` → `2026-09-15T09:56:55-03:00` (âncora de data, mesma do gate
  anterior); `git status --porcelain --ignored` → `browser-state-0.json`,
  `browser-state-0-fingerprint.json`, `browser-state-1.json`,
  `browser-state-1-fingerprint.json`, `.playwright-mcp/` listados como `!!`
  (ignorados) — P9 com evidência executada.

**Rodada 1 (preservado):**

- `Sanitize.html` fail-closed: não-string → `''`; sem `DOMPurify` → `''` +
  erro (D2). `sanitize.js:23-37`.
- Ordem do pipeline: `marked.parse` → `processSpecialBlocks` → `Sanitize.html`
  → `innerHTML` nos dois renders do preview e no EPUB; sanitize por último.
  `pdf-generator.js:246` sanitiza o corpo de novo no sink.
- Wiring `index.html:347-354` (vendor → sanitize → preview, `defer` preserva
  ordem) e `sw.js` (`CACHE_VERSION='v4'`, vendor/sanitize/markdown-normalize no
  `LOCAL_ASSETS`).
- `Sanitize.watermark` em 2 pontos (`pdf-generator.js:148` e `:221`); allowlist
  não permite `<`, `>`, `"`, `\`, `&`, `{`, `}`, newline → não fecha string
  CSS nem atributo.
- `getBookTitle()` continua denylist frágil (`[<>:"/\\|?*]`), porém sem `<` `>`
  `"` não há breakout de `<title>`/meta no estado atual; `buildPrintDocument`
  não sanitiza `title` internamente (L3 — follow-up).
- EPUB: `contentHTML` e `bookTitle` sanitizados; 2 round-trips DOMParser
  **após** sanitização (mXSS residual baixo — ver P1); TOC/nav montados com
  `innerText` de cabeçalhos sanitizados (texto apenas; sem injeção de elemento).
- Sinks adicionais encontrados (P7): `app.js:276`, `image-manager.js:96,136`.
- `ADD_DATA_URI_TAGS: ['a']` presente (`sanitize.js:12`) e codificado no teste
  A6 (P8).
- `browser-state-0/1*.json` na raiz do monorepo, untracked; `.gitignore` da
  raiz não cobre (P9). `.playwright-mcp/` untracked na raiz.
- Suite `test/sanitize-p1-p2.spec.js` (A1–A10) e `test/print-profile.spec.js`
  (M1/M2) **lidas integralmente**; as asserções cobrem os PoCs por execução
  (A2/A3/A4/A8/A9/A10) e a regra de ouro (preview/PDF concordam, A8).

### Não verificado (declarado com honestidade)

**Rodada 3 (2026-10-02c):**
- **Execução da suite (39/39: print-profile 8 + A1–A15 13 +
  qa-differentiality 6 + sanitize-p10p11-class 6 + qa-s1s8-regressoes 3 +
  n11-p12-n13 3) + C1–C8 NÃO reproduzida por este gate** — sandbox sem
  Playwright/Node (shell restrito a git/audit). Evidência: build gate
  `build-2026-10-02c` (emitido com 36/36; suíte final 39/39 com o spec
  `n11-p12-n13.spec.js`). Os specs `sanitize-p10p11-class.spec.js` e
  `n11-p12-n13.spec.js` foram **lidos integralmente**; os diferenciais
  FASE 1 (sink antigo em memória) provam que os testes falhariam no
  código pré-correção.
- **Comportamento do U+2028/U+2029 no tokenizer CSS** — não testado em
  browser; avaliado por conhecimento do css-syntax-3 (não são newline).
  Hardening proposto, não bypass.
- **Confirmar que `Sanitize.html(content)` quebraria os 9 modais** — não
  executado; a análise aponta o `onclick` inline (`image-manager.js:56`)
  como o breaker real, não value/checked/selected (P13).
- **Cadeia de XSS a partir da poluição do P12** — não encontrada por
  varredura de reads de `.current`/`.updated`; a afirmação "sem cadeia" é
  conclusão de busca, não prova de execução. **P12 fechado (2026-10-02)** —
  a rejeição na fronteira (evidência: `test/n11-p12-n13.spec.js`, lido
  integralmente) é verificada por leitura; a execução do spec é evidência
  do build gate (39/39 + C1–C8), não reproduzida por este gate.

**Rodada 2 (2026-10-02b):**
- **Execução da suite A1–A15 (21/21) + C1–C8 NÃO reproduzida por este gate** —
  sandbox sem permissão de Playwright/Node (shell restrito a git/audit). A
  execução é reportada pelo orchestrator/build gate; o spec A11–A15 foi **lido
  integralmente** e as asserções são executáveis (diferenciais contra os sinks
  antigos). Evidência de execução: build gate.
- **Comportamento do U+000C (form feed) nos tokenizers CSS** — não testado
  (sem browser). P11 depende desta verificação.
- **Comportamento do SVG em `<img>` com `data:image/svg+xml`** — assumido pela
  regra de browser (scripts desabilitados em contexto de imagem); não
  re-testado.
- **`data:` em leitores EPUB** (script habilitado) — fora do nosso controle.
- Bypass público atual do DOMPurify 3.4.16 e hash do vendor vs. upstream —
  continuam não verificados (sem rede; P3).

**Rodada 1 (preservado):**

- **PoCs A e B NÃO re-executados neste gate.** Ambiente sem permissão de
  execução (shell restrito a `git log/diff/status` e auditorias de
  dependência). O fecho de P1/P2 apoia-se em evidência estática + leitura da
  suite; a execução dos PoCs fica evidenciada pelo build gate (Playwright
  A1–A10 — execução alegada pelo engineer em IMPLEMENTATION-NOTES, 16/16,
  **não reproduzida por mim**).
- **`npm audit`/`pnpm audit`**: não aplicável — o produto não tem dependências
  de runtime npm (JS vanilla, CDN + vendor). Dependências CDN auditadas por
  leitura das versões pinadas (P3). A auditoria automatizada de `marked/jszip/
  FileSaver` (versões CDN) ficaria num follow-up de P3.
- **Hash do vendor vs. upstream npm** (`dompurify@3.4.16/dist/purify.min.js`)
  — não comparado (sem rede/execução). Pinar na release.
- **Bypass público atual do DOMPurify 3.4.16** — não verificado contra base de
  CVE/bugs (sem rede). 
- **`templates.js` (~95 KB) e o restante de `themes.js` (~108 KB) não lidos
  integralmente** (herdado do gate anterior). Varredura de sinks feita por
  grep não encontrou `innerHTML`/`document.write`/`eval` em `templates.js`;
  `themes.js` tem `item.innerHTML` (lista de temas, `:3714`) com `theme.name`
  — nomes de temas são constantes do produto ou criados pelo próprio usuário
  (theme-editor) → classe self-XSS, sem vetor cross-user hoje (sem
  import/export de temas).
- **Comportamento default do DOMPurify para `<form>`/`<base>`/`meta`** — por
  conhecimento da configuração (não verificado por execução): DOMPurify
  mantém tags de formulário por default e remove `<base>`/`<meta>`; se
  form-controles indesejados no preview forem preocupação, `FORBID_TAGS` é o
  ajuste. Registrado como nota, não achado.
- **Paridade do `deploy/` com a produção ao vivo** (`md2pdf-free-studio.pages.dev`)
  — ASSUMPTION herdada; a análise assume que o produto desta review é o que
  será publicado.

---

## Observações (fora do escopo de segurança, para a equipe)

1. **EPUB com `&` ou `<` no título/TOC**: `Sanitize.html` não escapa `&` em
   texto puro (alegação do engineer — condizente com o comportamento do
   DOMPurify; não verificado por execução). Título `Título & Teste` →
   `content.xhtml` inválido (XML); heading com `<` no texto → `nav.xhtml`
   inválido via `innerText` do TOC (o texto cru `<` vira erro de parse XML).
   Não executa script — bug de serialização pré-existente, mesma classe do
   self-closing dos void elements (já corrigido). Follow-up: escapar `&`/`<`
   antes do template XHTML. Dono: engineer.
2. **`showToast('PDF pronto!')` antes do PDF existir** — pré-existente,
   mensagem enganosa (registrado no gate anterior); não é segurança.
3. **`preview.js:95-96/111-112`**: `buildThemeCSS(theme)` é side-effect (não
   retorna CSS); `styleEl.innerHTML = undefined` → "undefined" inerte.
   Código latente pré-existente (alegação do engineer; `themes.js:3596-3689`
   confirma: a função cria o `<style id="theme-style">` e não retorna).
   Não é segurança; limpar quando passar por ali.
4. **`watermarkRotation`** não é validado numericamente (ver P2, hardening).
5. **`.playwright-mcp/`** na raiz (perfis de browser da ferramenta de teste):
   apagar ou gitignorar junto com P9.

---

## Follow-ups com dono (resumo)

| # | Item | Severidade | Dono | Pré-requisito |
|---|---|---|---|---|
| 1 | **P7** — ✅ **MITIGADO (rodada 2)** — sinks com DOM properties + validador novo; A11/A12/A13 executados (build gate). Residual: fronteira defensiva (chamador futuro não interpolar) | — | engineer | fechado |
| 2 | **P8** — ✅ **MITIGADO (rodada 2)** — `ADD_DATA_URI_TAGS` removido; A6 ajustado | — | engineer | fechado |
| 3 | **P9** — ✅ **MITIGADO (cobertura)** — `.gitignore` da raiz ok (evidência `git status --ignored`). **Resíduo**: **apagar os 4 arquivos do disco** + `.playwright-mcp/` | Média–Alta (residual) | devops/owner | exclusão + rotação de sessão (A1) |
| 3b | **P10** — ✅ **MITIGADO (rodada 3)** — fronteira em `storage.js` (S3: `isValidProjectName` + validação estrutural do import; `saveProject` revalida) + sink em `editor.js` (S2: `dataset`/`textContent`); nomes legados hostis renderizam inertes (teste semeia e prova). **Resíduo P12 — fechado (2026-10-02)** | — | engineer | fechado |
| 3c | **P11** — ✅ **MITIGADO (rodada 3)** — `\f` na denylist (`sanitize.js:31`); build gate `b` já provara inocuidade; teste S8 | — | engineer | fechado |
| 3d | **P12** — ✅ **MITIGADO (2026-10-02)** — `PROTOTYPE_KEY_RE` (`storage.js:62`) rejeita `__proto__`/`constructor`/`prototype` em `isValidProjectName` e `sanitizeProjectName`; cobre `saveProject`/`importProject`/`renameProject` (fronteira). Evidência: `test/n11-p12-n13.spec.js` (FASE 1 reproduz o `TypeError`; FASE 2: `false` sem poluir) | Baixa | engineer | fechado |
| 3e | **P13 (NOVO)** — contrato `content` do ModalManager: revisitar `Sanitize.html(content)` quando os handlers inline saírem (CSP fase 2); corrigir a justificativa no comentário de código (value/checked/selected são default do DOMPurify; o breaker real é o `onclick` inline) | Baixa (latente) | security + engineer | CSP fase 2 |
| 4 | **A1** — rotação da sessão Google (logout/revogação) | Alta (residual aceito) | owner | — |
| 5 | **CSP fase 1** — `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `form-action 'self'` | Baixa | devops | — (não quebra nada hoje) |
| 6 | **CSP fase 2** — refatorar 17+ handlers inline → `addEventListener`; SW em arquivo externo; `script-src 'self'` + hashes | Média (defesa em profundidade) | engineer + devops | fase 1 + refatoração |
| 7 | Pinar **hash do vendor** (`dompurify.min.js`) na release + procedimento de update no RUNBOOK | Baixa | devops | — |
| 8 | P3 — SRI/self-host de `marked`/`jszip`/`FileSaver`/font-awesome | Média | devops/product | — |
| 9 | P4 — QR local/consentimento; **chave ImgBB** hardcoded (rotação/limite/proxy) | Baixa–Média | owner + devops | — |
| 10 | P5 — toast em `QuotaExceededError` + compressão opcional | Baixa | engineer | — |
| 11 | P6 — bump automático de `CACHE_VERSION` no deploy | Baixa | devops | — |
| 12 | `buildPrintDocument` — escapar `title`/meta internamente (L3) | Baixa | engineer | — |
| 13 | EPUB — escapar `&`/`<` em título/TOC (XHTML válido) | Baixa | engineer | — |
| 14 | `getBookTitle()` — trocar denylist por allowlist quando o contexto mudar | Baixa (latente) | engineer | — |

---

*Documento do gate de segurança da mudança R3 "md2pdf-sanitize-p1" (P1/P2 +
M1/M2). **Rodada 3 (2026-10-02c)** sobre as rodadas 2 (2026-10-02b) e 1
(2026-10-02, históricos preservados acima): fecho da CLASSE "interpolar dado
não-constante em `innerHTML`" (S1–S8) — **P10 MITIGADO** (fronteira em
`storage.js` + sink em `editor.js`; nomes legados inertes), **P11 MITIGADO**
(`\f` na denylist), `Sanitize.color`/`Sanitize.attr` auditados sem bypass,
coerção numérica e escape de título em `buildPrintDocument` corretos, os 9
chamadores do ModalManager auditados um a um. **Achados novos da rodada: P12 (Baixa,
poluição de protótipo via nome `__proto__`/`constructor` que passava a
validação — sem cadeia de XSS) — **MITIGADO pelo engineer em 2026-10-02**
(`PROTOTYPE_KEY_RE` na fronteira do `storage.js`, rejeitado em
`isValidProjectName` e `sanitizeProjectName`; evidência
`test/n11-p12-n13.spec.js`) — e P13 (Baixa, contrato `content` HTML por
design)**, este último follow-up da release. Execução 39/39 + C1–C8
evidenciada pelo build gate (`build-2026-10-02c` emitido com 36/36; suíte
final 39/39 com o spec `n11-p12-n13.spec.js`); specs
`sanitize-p10p11-class.spec.js` e `n11-p12-n13.spec.js` lidos
integralmente neste gate. Próximos
passos: P13 (revisitar na CSP fase 2), apagar os
`browser-state-*.json` do disco (owner), rastrear A1 (rotação de sessão),
CSP fases 1–2, pinar hash do vendor.*