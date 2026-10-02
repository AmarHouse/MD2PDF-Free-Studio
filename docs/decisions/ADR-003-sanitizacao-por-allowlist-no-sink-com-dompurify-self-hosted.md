# ADR-003: Sanitização por allowlist no sink com DOMPurify self-hosted

- **Status**: Aceito
- **Data**: 2026-10-02

## Contexto

O produto atribui a saída do `marked` 9.1.2 a sinks HTML **sem nenhum filtro**:

| Sink | Local |
|---|---|
| `innerHTML` do preview | `js/preview.js:93` (`render`) e `js/preview.js:109` (`renderSync`) |
| `document.write` da janela de impressão | `js/pdf-generator.js:240` → `<body>${previewContent.innerHTML}</body>` (linha 313) |
| XHTML do EPUB3 | `js/epub-generator.js:15` |

O `marked` 9.1.2 **não tem sanitização embutida desde a v5** (a opção
`sanitize` foi removida da API), e o input do produto é **Markdown arbitrário
colado** — fonte explicitamente não confiável (IA, terceiros). O deploy é
público (`md2pdf-free-studio.pages.dev`), o que eleva um XSS a
comprometimento da origem do visitante: leitura do `localStorage` (documentos
em claro, ver P5 no `SECURITY-REVIEW.md`), exfiltração, abuso do
`window.print()`. Este é o achado **P1, severidade alta**, com PoC executado
no gate de segurança anterior (PoC-B: o `onerror` do `<img>` disparou ao ser
inserido via `innerHTML` — ver `docs/SECURITY-REVIEW.md`, §P1). [FATO medido —
leitura de código + PoC executado no gate anterior]

**A restrição que determina o desenho — a razão central deste ADR:** **não é
possível escapar HTML bruto no `marked`.** O `MarkdownNormalize.normalize()`
converte `\pagebreak` em `<div class="page-break"></div>` **antes** do parse:

```text
marked.parse(MarkdownNormalize.normalize(text))   # preview.js:91, epub-generator.js:15
```

Escapar HTML bruto no renderer (ou no normalizador) destruiria a quebra de
página — uma feature do produto. Portanto a mitigação é **sanitização por
allowlist no sink, não escape**. [FATO — verificado por leitura; plano
`md2pdf-sanitize-p1.md`, §Restrição que define o desenho]

## Decisão

Adotar **sanitização por allowlist no sink** com **DOMPurify 3.4.16
self-hosted** em `js/vendor/dompurify.min.js`, aplicada a todos os sinks de
HTML (preview, janela de impressão, EPUB3), com comportamento **fail-closed**
(D2). A mudança **não** introduz CSP (D3) e absorve o P2 porque ele está no
mesmo sink que P1 obriga a reescrever (D4). Decisões D1–D4 tomadas pelo
orchestrator em 2026-10-02 e registradas aqui com a razão; este ADR não
reabre as alternativas.

### D1 — DOMPurify 3.4.16 self-hosted em `js/vendor/dompurify.min.js`

- **Por que DOMPurify**: allowlist mantida e battle-tested, modo defensivo,
  foco exclusivo em sanitização de HTML. Numa superfície de segurança,
  "boring technology" vence — ver seção abaixo.
- **Por que self-host e não CDN**: o produto é PWA com promessa de **offline**
  (`sw.js` cache-first, ADR-002). Um sanitizador vindo de CDN seria (a) uma
  dependência de rede no caminho crítico de segurança — exatamente onde ela
  não pode faltar — e (b) mais um CDN sem SRI, o achado **P3**. Self-host +
  pre-cache no service worker elimina os dois. O produto não tem build step
  (ADR-002): basta copiar o arquivo de `dist/` — zero pipeline novo.
- `marked`, `jszip` e `FileSaver` **permanecem no CDN** (P3 continua
  registrado como follow-up com dono). O critério que distingue os casos é:
  **caminho de segurança vs. conveniência**. DOMPurify está no caminho de
  segurança — precisa estar presente e íntegro; os demais são conveniência de
  carregamento.

### D2 — Fail-closed: sem DOMPurify, a saída é `''`

Se `window.DOMPurify` estiver ausente (primeiro load offline sem cache, cache
corrompido), `Sanitize.html()` retorna string vazia e registra erro — **não
deixa HTML não sanitizado passar**. Fail-open reintroduziria P1 exatamente no
caminho que esta mudança está fechando. Custo aceito: **preview em branco em
vez de vulnerável**. Mitigação de UX: `console.error` explícito + aviso ao
usuário; o vendor entra no pre-cache do service worker para tornar a ausência
um caso raro. Comportamento coberto pelo critério de aceite A10.

### D3 — Sem CSP nesta mudança

`index.html:363` tem `<script>` inline e há **52 handlers `on*=` inline**. Um
CSP restrito quebraria o app sem uma auditoria completa das 52 ocorrências;
um CSP permissivo não bloqueia o vetor (HTML bruto continua executando
atributos de evento). Adicionar CSP parcial aqui seria **segurança aparente,
não segurança real**. Registrado como follow-up com pré-requisito explícito:
remover os handlers inline **primeiro**, depois avaliar CSP como defesa em
profundidade.

### D4 — Escopo adicional declarado: P2 (marca d'água), porque é o mesmo sink

P2 é um breakout de `</style>` via marca d'água (`pdf-generator.js:222`,
interpolação sem escape em string CSS), comprovado por PoC executado no gate
anterior (PoC-A: o script rodou na janela montada). Entra no mesmo escopo
porque está **na mesma função e no mesmo `document.write` que o P1 obriga a
reescrever**, e o custo é uma allowlist de caracteres no valor antes de
interpolar. Escopo adicional **declarado aqui, não silencioso** (regra
"never silently expand scope" da constituição).

## Por que não escrever um sanitizador próprio

Não escrevemos um sanitizador próprio porque a superfície é de segurança, e
nela "boring technology" vence: um allowlist caseiro é exatamente onde
sanitizadores caseiros morrem — a história de XSS é cheia de parsers
improvisados que esquecem um contexto de serialização, um atributo
`srcdoc`, uma codificação dupla. DOMPurify é uma allowlist mantida há anos,
testada contra a bateria de vetores do mXSS e com modo defensivo; o custo de
manter a nossa própria é assumir permanentemente a manutenção de uma
superfície de ataque que não é o negócio do produto.

## Consequências positivas

- **P1 fechado nos três sinks** — preview (`render` + `renderSync`), janela de
  impressão e XHTML do EPUB3; o gate de segurança passa a provar as duas
  direções (vetor bloqueado **e** feature preservada) via critérios A1–A10.
- **P2 corrigido no mesmo movimento**, sem custo adicional de desenho (mesma
  reescrita do `document.write`).
- **Fail-closed garante a invariante de segurança** mesmo em estado degradado:
  HTML não sanitizado nunca chega ao DOM.
- **Self-host fortalece a promessa offline do PWA** no caminho crítico e reduz
  a superfície do achado P3 para os scripts de segurança.
- **EPUB3 sai XHTML válido** sem `on*=` nem `<script>` (A9) — efeito colateral
  positivo de P1 registrado no `SECURITY-REVIEW.md` (observação 2).

## Consequências negativas e riscos aceitos

Registrados honestamente — o que esta decisão custa:

- **Fail-closed degrada o preview** em ambientes sem o vendor (primeiro load
  offline sem cache, cache corrompido): tela em branco em vez de conteúdo.
  Aceito: vulnerável é pior que em branco; aviso ao usuário + pre-cache
  reduzem a frequência (A10 cobre o comportamento).
- **Vendor aumenta o bundle** em ~20 KB gzip. Sem build step e sem pipeline de
  bundle, não há custo de manutenção; aceito.
- **A allowlist pode quebrar feature legítima**: o produto usa `data:image/...`
  gerado por `js/image-manager.js:138` (`readAsDataURL`), classes próprias
  (`page-break`, `cover-block`, `toc-block`, `learning-block`, `insight-block`,
  `warning-block`, `protip-block`, `exercise-block`) e o atributo `data-chapter`
  (produzidos por `App.processSpecialBlocks`, `app.js:284-302`). Se a allowlist
  não os preservar, a feature quebra — por isso A5 (`\pagebreak` continua
  virando `.page-break`), A6 (imagens `data:` sobrevivem) e A7 (tabelas, blocos
  de código, listas e os 50 temas) são critérios de aceite **diferenciais** do
  gate: é o critério que falha se o desenho estiver errado.
- **CSP continua ausente** (D3): a defesa em profundidade fica para o
  follow-up, com pré-requisito de remover os 52 handlers inline.
- **P3 permanece parcialmente aberto** para `marked`/`jszip`/`FileSaver`
  (CDN sem SRI) — follow-up com dono; esta mudança só move o script do caminho
  de segurança para self-host.
- **Risco residual de bypass do próprio DOMPurify** (classe de risco de
  qualquer sanitizador): mitigado por allowlist mantida e versionada; se um
  bypass público aparecer, a troca de versão é um copiar-colar (sem build).

## Referências cruzadas

- **Plano**: `.factory/plans/md2pdf-sanitize-p1.md` — decisões D1–D4 e
  critérios de aceite A1–A10 (inclusive M1/M2, a reforma do gate para chamar o
  código de produção, que é parte da mesma mudança mas não é decisão deste
  ADR).
- **`docs/SECURITY-REVIEW.md`**: P1 (alta, PoC-B executado — vetor deste ADR),
  P2 (PoC-A executado — D4), P3 (CDN sem SRI — D1/D3, follow-up), P4–P6 e A1
  permanecem registrados com dono, fora do escopo.
- **ADR-001** (motor `window.print()`): a janela de impressão é montada por
  `document.write` (`pdf-generator.js:240`) — um dos sinks que este ADR passa
  a sanitizar; o desenho de P1 não muda o motor, apenas fecha o vetor antes
  dele.
- **ADR-002** (desvio de stack): este ADR é a primeira dependência que sai do
  CDN por critério de segurança, sem contrariar o desvio — sem build step,
  self-host é "copiar o arquivo". O desvio permanece e este ADR registra o
  precedente para o futuro tratamento de P3.