# MD2PDF Free Studio — Especificação de Produto

| Campo | Valor |
|---|---|
| Produto | `softwares/md2pdf/` — editor Markdown → PDF/EPUB3, 100% client-side |
| Dono do documento | product-manager |
| Data | 2026-10-02 |
| Origem | `AmarHouse/MD2PDF-Free-Studio` (intake 2026-09-30) — ver `docs/INTAKE-REPORT.md` |
| Base de evidência | `README.md`, `AGENTS.md`, `docs/PRINT-PROFILE.md`, `docs/SECURITY-REVIEW.md`, `CHANGELOG.md`, `index.html`, `manifest.json`, `js/themes.js`, `js/templates.js`, `js/pdf-generator.js`, `js/pix.js`, `js/image-manager.js`, `js/storage.js`, `js/find-replace.js`, `test/*.spec.js`, `test/verify-pdf.py`, `.factory/plans/md2pdf-print-profile.md` |

Convenção: **FACT** = verificado por leitura de código ou documento nesta fase;
**ASSUMPTION** = crença não verificada. Nenhum requisito foi inventado — cada um
traça a uma capacidade observada no código ou a uma decisão registrada do owner.

---

## 1. Problema

O caso de uso central, documentado no `README.md` e no plano de perfil de
impressão: **colar um `.md` gerado por IA e exportar PDF com o mínimo de
trabalho** (decisão do owner, 2026-09-30). A dor concreta, diagnosticada por
leitura de código e não por suposição:

- Quebra de página fora do padrão: `h1, h2 { page-break-before: always }`
  existia em **4 cópias** de CSS e fazia todo `#` e todo `##` abrir página
  nova — um documento com 40 subtítulos virava 40 páginas de duas linhas
  (FACT — plano §Diagnóstico).
- Saída de IA vem com lixo estrutural: frontmatter YAML inicial, hierarquia de
  títulos que pula níveis (`#` → `###`), linhas em branco irregulares,
  espaços à direita (FACT — `js/markdown-normalize.js`).
- Saída de IA produz conteúdo que não cabe na página: tabela larga, linha de
  código de 200 caracteres, URL longa, imagem alta — sem regras de perfil,
  esse conteúdo some ou transborda no PDF (FACT — `docs/PRINT-PROFILE.md`).

O custo para quem sofre: trabalho manual de limpeza do documento antes de cada
exportação e PDFs ilegíveis (conteúdo cortado, páginas quase vazias).

## 2. Usuários e personas

Personas derivadas das capacidades documentadas do produto, não de pesquisa de
mercado (não há dados de uso — o produto não tem analytics, FACT).

1. **Autora de conteúdo com IA (primária)** — cola saída de ChatGPT/Claude no
   editor, ajusta quase nada e exporta PDF. Frustrações: frontmatter vazando,
   cada subtítulo abrindo página nova, tabela/código cortado. O produto existe
   para ela: normalização automática + perfil de impressão + quebra `\pagebreak`.
2. **Escritor independente** — escreve livro/ebook direto no navegador e usa o
   que o produto entrega para isso: capa (`cover-block`), sumário (`toc-block`),
   templates editoriais, 50 temas de tipografia, exportação EPUB3.
3. **Profissional de documento técnico** — relatórios, anotações, documentação
   com código e tabelas; não quer instalar nada; valoriza offline (PWA) e
   persistência local sem conta.

## 3. Proposta de valor

Editor Markdown gratuito, sem cadastro, sem instalação, sem build, 100% no
navegador, que converte saída de IA em documento imprimível correto:

- **Entrada hostil vira documento limpo**: frontmatter removido, títulos
  renivelados, quebras de página previsíveis (só H1; `\pagebreak` explícito).
- **Nada transborda a página**: perfil de impressão para tabela, código, URL e
  imagem — o defeito mais comum de PDF gerado de IA.
- **Regra de ouro**: preview WYSIWYG e PDF concordam (AGENTS.md) — uma
  divergência é bug.
- **Sem exfiltração por desenho**: os dados do documento ficam no navegador
  (`localStorage`); as únicas saídas são os fluxos PIX e upload de imagem
  (ver Riscos).
- **Sem custo**: software livre (MIT), monetização por doação PIX opcional.

## 4. Não-objetivos

Fonte: non-goals do plano `md2pdf-print-profile` + seção "NÃO faz" do
`AGENTS.md`.

- **Não tem backend, banco, autenticação nem contas** (FACT — AGENTS.md). Não
  persiste dados fora do navegador, exceto os fluxos PIX e ImgBB documentados
  em Riscos.
- **Não roda fora do navegador** (FACT — AGENTS.md).
- **Não trocar o motor de PDF** `window.print()` — decisão registrada (ADR-001);
  sem nova decisão, não se introduz `html2pdf`/`jsPDF`/`Paged.js`.
- **Não resolver o atrito do diálogo de impressão** (margens sobrescritas pelo
  diálogo do navegador) — dívida registrada no ADR-001.
- **"Página X de Y" não é implementado** — `counter(pages)` diferido
  (`PRINT-PROFILE.md`).
- **Posições de numeração além das 6 verificadas**: cada posição nova só entra
  após verificação no Chromium alvo (decisão do owner).
- **Não limpar `page-break-*` legado do `themes.js` inteiro** — só nos pontos
  tocados.
- **Não é editor de texto completo nem ferramenta de colaboração**: sem
  revisão em tempo real, sem sincronização em nuvem, sem publicação gerenciada.

## 5. Requisitos funcionais

Critérios de aceite em given/when/then. Cada um indica a verificação existente:
o gate que o cobre (FACT, spec lido integralmente) ou "sem gate nesta fase"
quando nenhum spec o exercita. A execução das suítes é alegada nos gates de
build (ver §6); esta fase não re-executou nenhum teste.

### RF-01 — Edição Markdown com preview WYSIWYG em tempo real

Editor com textarea, barra de ferramentas e preview ao vivo, renderizado com
`marked` e sanitizado (DOMPurify self-hosted). Atualiza com debounce de 150 ms
(FACT — `index.html`, `js/preview.js`, `js/markdown-normalize.js`).

- **AC-01.1**: DADO um documento digitado no editor, QUANDO o preview é
  renderizado, ENTÃO nenhum erro de página (`pageerror`) ocorre. — Coberto pelo
  teste 4 de `test/print-profile.spec.js` (asserts `pageerror` vazio).
- **AC-01.2 (regra de ouro)**: DADO o fixture de impressão renderizado no
  preview, QUANDO o documento de impressão é montado para exportação, ENTÃO a
  estrutura de quebras e elementos é idêntica no preview e no PDF (1 `.page-break`,
  1 `hr`, 0 frontmatter) e o PDF satisfaz os critérios C1–C8. — Coberto pelo
  teste 4 de `print-profile.spec.js` + `test/verify-pdf.py` (C1–C8).

### RF-02 — Normalização de Markdown gerado por IA

Remove frontmatter YAML inicial, reniveleia a hierarquia de títulos (sem nunca
aprofundar), colapsa 3+ linhas em branco e remove espaços à direita. Contrato:
idempotente, defensivo (input não-string/vazio → `""`), blocos de código
preservados verbatim (FACT — `js/markdown-normalize.js`).

- **AC-02.1**: DADO um documento CommonMark válido que começa com `---` e tem
  outro `---` adiante, QUANDO normalizado, ENTÃO nenhum conteúdo é perdido; um
  frontmatter legítimo é removido. — Coberto pelo teste 1 de
  `print-profile.spec.js`.
- **AC-02.2**: DADO um documento com CRLF, títulos rebaixados e blanks
  excessivos, QUANDO normalizado duas vezes, ENTÃO `normalize(normalize(x)) ===
  normalize(x)`, CRLF vira LF e entradas inválidas retornam `""`. — Coberto
  pelo teste 2.
- **AC-02.3**: DADO frontmatter inicial no corpo, QUANDO exportado, ENTÃO o
  frontmatter não aparece no PDF. — Coberto pelo critério C2 de `verify-pdf.py`
  e pelo teste 4.

### RF-03 — Exportação PDF com configuração de página e marca d'água

Modal de exportação (`js/pdf-generator.js`) com: tamanho (A4, A5, Carta,
Ofício, Kindle), orientação (retrato/paisagem), margens em mm (superior,
inferior, esquerda, direita), marca d'água (texto + opacidade + tamanho +
rotação) e numeração (RF-06). Valores numéricos são coagidos e posição inválida
cai no padrão (FACT — `pdf-generator.js` `defaultSettings`/`init`).

- **AC-03.1**: DADO o modal de exportação aberto, QUANDO inspecionado, ENTÃO
  expõe os cinco tamanhos, as duas orientações, as quatro margens e a marca
  d'água com seus controles. — Verificado por leitura do modal; **sem gate
  nesta fase** (nenhum spec afirma essas opções na UI).
- **AC-03.2**: DADO `localStorage` adulterado com valores não-numéricos ou
  posição inexistente, QUANDO o gerador é inicializado, ENTÃO os valores caem
  nos padrões e nenhum CSS é injetado. — Coberto pelo teste "settings numéricos
  coagidos e título escapado" de `test/sanitize-p10p11-class.spec.js`.
- **AC-03.3**: DADO uma marca d'água contendo `</style><script>`, QUANDO o
  documento de impressão é montado, ENTÃO o CSS permanece íntegro, nada
  executa e a pontuação tipográfica pt-BR é preservada. — Coberto por A8 e A14
  de `test/sanitize-p1-p2.spec.js`.

### RF-04 — Quebra de página

Sintaxe (FACT — `PRINT-PROFILE.md`, CHANGELOG 2.1.0): `\pagebreak`/`\newpage`
em linha isolada = quebra forçada; `#` H1 = quebra automática (exceto o
primeiro); `##`/`###` não quebram; `---` é linha horizontal, nunca quebra;
`.cover-block`/`.toc-block` fecham a página ao final.

- **AC-04.1**: DADO `\pagebreak` no corpo, QUANDO exportado, ENTÃO a seção
  posterior cai em página posterior à seção anterior (quebra diferencial). —
  Coberto pelo critério C1 de `verify-pdf.py`.
- **AC-04.2**: DADO `\pagebreak` no meio de uma frase ou dentro de bloco de
  código, QUANDO normalizado, ENTÃO é texto literal/verbatim e não gera quebra;
  `---` nunca gera quebra. — Coberto pelo teste 3 de `print-profile.spec.js`.
- **AC-04.3**: DADO um documento com H1, H2 e H3 seguidos, QUANDO exportado,
  ENTÃO só o H1 inicia página nova e o fixture rende 5 páginas (7 com o código
  antigo). — Coberto pelo critério C4 de `verify-pdf.py`.

### RF-05 — Perfil de impressão: nada transborda a página

Regras em `css/print.css`, `pageBreakCSS`/`getPrintCSS` de `js/themes.js` e
`<style>` inline de `js/pdf-generator.js` (3 lugares — mudar em um sem os
outros produz preview/PDF divergentes): cabeçalho de tabela repetido entre
páginas, linha de tabela não cortada, tabela a 100% com `word-break`, `pre`
com `pre-wrap`, URLs com `overflow-wrap`, imagem limitada a 200 mm, blocos
com `break-inside: avoid`, órfãs/viúvas 3/3 (FACT — `PRINT-PROFILE.md`).

- **AC-05.1**: DADO uma tabela de 2 páginas, QUANDO exportado, ENTÃO o
  cabeçalho repete nas duas. — Coberto pelo critério C8 de `verify-pdf.py`.
- **AC-05.2**: DADO `pre` com linha de 200 caracteres e tabela larga, QUANDO
  exportado, ENTÃO nenhuma página sai vazia por transbordo horizontal. —
  Coberto pelo critério C3.
- **AC-05.3**: DADO imagem alta e blocos longos, QUANDO exportado, ENTÃO a
  imagem é contida em 200 mm e blocos não são cortados ao meio. — Regra
  verificada por leitura; **sem teste dedicado nesta fase**.

### RF-06 — Numeração de páginas opcional

Toggle + seletor de posição no modal. Padrão: ligada em `bottom-center`.
Primeira página não numerada. 6 posições mapeadas para margin boxes do CSS
Paged Media L3 (top/bottom × left/center/right), cada uma só exposta após
verificação no Chromium (FACT — `PRINT-PROFILE.md`, `pdf-generator.js`).

- **AC-06.1**: DADO numeração desligada, QUANDO exportado, ENTÃO nenhuma página
  começa com um número de página. — Coberto pelo critério C6 de
  `verify-pdf.py`.
- **AC-06.2**: DADO numeração ligada, QUANDO exportado, ENTÃO as páginas 2..N
  são numeradas e a primeira não. — Coberto pelo critério C7.
- **AC-06.3**: DADO o modal, QUANDO o toggle é desligado, ENTÃO o seletor de
  posição é ocultado; a posição escolhida persiste no `localStorage` e uma
  posição inválida volta ao padrão `bottom-center`. — Coberto pelos testes
  "modal expõe toggle…" e "toggle controla…" de `print-profile.spec.js` +
  `test/n11-p12-n13.spec.js` (restauração ao recarregar).
- **AC-06.4**: DADO o app em pt-BR, en e es, QUANDO o modal é aberto, ENTÃO os
  rótulos de numeração e posição estão traduzidos nos 3 idiomas. — Coberto
  pelo teste do modal.

### RF-07 — Exportação EPUB3

Gera EPUB3 (XHTML, TOC, imagens) no navegador via `jszip`/`FileSaver`
(FACT — `js/epub-generator.js`, `index.html`).

- **AC-07.1**: DADO Markdown arbitrário, QUANDO exportado EPUB3, ENTÃO o XHTML
  gerado é válido e não contém `on*=` nem `<script>`. — Coberto por A9 de
  `test/sanitize-p1-p2.spec.js`.
- Fidelidade visual: EPUB é reflowable por padrão; **sem gate nesta fase**.

### RF-08 — 50 temas de tipografia

`js/themes.js` define a lista `THEMES` com **50 temas** (FACT — contagem
confirmada por leitura: array nas linhas 563–3381, ids 0–49, fechado em `];`
na linha 3381; comentário do arquivo "50 Temas"). Seletor com anterior,
próximo, aleatório e cor de destaque (`index.html`).

- **AC-08.1**: DADO cada tema do produto aplicado no preview, QUANDO
  renderizado, ENTÃO todos renderizam sem erro e com CSS de tema gerado. —
  Coberto por A7 de `sanitize-p1-p2.spec.js` (itera os grupos, afirma
  `total >= 50` e todos OK) e pelo teste REGRESSOES de
  `test/qa-s1s8-regressoes.spec.js`.

### RF-09 — Editor de temas

Criar tema personalizado no modal de editor (`js/theme-editor.js`), com nome,
cor e CSS; valores passam por `Sanitize.attr`/`Sanitize.color` (FACT —
`SECURITY-REVIEW.md`, rodada 3).

- **AC-09.1**: DADO uma cor de tema editada, QUANDO aplicada, ENTÃO o CSS
  gerado contém apenas a cor sanitizada e nenhum valor escapa para HTML/CSS. —
  Coberto pelos testes "Sanitize.color valida…" (`sanitize-p10p11-class.spec.js`)
  e "buildThemeCSS aplica cor sanitizada…" (`n11-p12-n13.spec.js`).
- Fluxo completo de criar/salvar tema: **sem gate nesta fase**.

### RF-10 — Templates editoriais e capa

`js/templates.js` define a lista `Templates.templates` com **16 modelos
distintos** (FACT — contagem confirmada por leitura: 17 entradas no array,
com `blank` duplicado no final; ids: blank, book, novel, ebook, technical,
academic, thesis, cookbook, poetry, journal, feature-magazine, brand-guide,
case-study, product-launch, manifesto, personal-letter). Inclui editor de capa
(`showCoverEditor`) e a inserção de `cover-block`.

- **AC-10.1**: DADO o seletor de templates, QUANDO aberto, ENTÃO lista os
  modelos; aplicar substitui o conteúdo atual somente após confirmação quando
  já há texto. — Observável na UI; **sem gate nesta fase**.
- **Discrepância registrada (FACT)**: o JSON-LD de `index.html` anuncia
  "8 templates prontos" — metadata de SEO desatualizada frente às 16 entradas
  do código.

### RF-11 — Localizar e substituir

Barra de busca com localizar (anterior/próximo), diferenciar maiúsculas,
substituir, substituir todos e **modo regex** (FACT — `js/find-replace.js`:
checkbox `find-regex`, `new RegExp(pattern, matchCase ? 'g' : 'gi')`).

- **AC-11.1**: DADO um termo no documento, QUANDO a busca é ativada e uma
  substituição é executada, ENTÃO as ocorrências são substituídas (individual
  ou todas) e o preview atualiza. — Observável; **sem gate nesta fase**.

### RF-12 — Estatísticas do documento

Barra de status e modal com palavras, caracteres, linhas e tempo de leitura
(`js/stats.js` — tempo = `ceil(palavras / 200)` min, FACT).

- **AC-12.1**: DADO um documento, QUANDO o texto é editado, ENTÃO a barra de
  status mostra as quatro métricas atualizadas. — Observável; **sem gate nesta
  fase** (interpolação auditada como segura pelo security-engineer).

### RF-13 — PWA offline

Service worker `sw.js` com pre-cache completo dos assets locais e
`CACHE_VERSION = 'v4'` (FACT — SECURITY-REVIEW, achado F1 resolvido);
`manifest.json` com nome, ícones e atalhos "Novo Documento"/"Abrir Arquivo".

- **AC-13.1**: DADO a primeira visita com rede, QUANDO o app é recarregado sem
  rede, ENTÃO carrega do cache do service worker. — Verificado por leitura do
  `sw.js`; **sem gate nesta fase**.
- **Limite (FACT)**: fontes e CDNs (`marked`, `jszip`, `FileSaver`,
  font-awesome) são runtime CDN sem SRI — offline pleno depende do cache de
  rede dos assets CDN (P3, ver Riscos).

### RF-14 — Projetos com versões

Gerenciador de projetos persistido em `localStorage`: salvar, renomear,
excluir, importar/exportar JSON e histórico de versões — até **20 versões** por
projeto, nome até **100 caracteres** sem `[<>"'&]` (FACT — `js/storage.js`).
Fronteira defensiva valida nome, `current.markdown` como string e
`themeId` como número antes de gravar; a lista renderiza por `textContent`/DOM
properties (FACT — SECURITY-REVIEW, P10 fechado na rodada 3).

- **AC-14.1**: DADO um JSON de import com nome hostil (`<img onerror=…>`),
  QUANDO importado, ENTÃO o nome renderiza como texto literal, sem elementos
  nem execução. — Coberto pelo teste "importProject rejeita JSON hostil…" de
  `test/sanitize-p10p11-class.spec.js`.
- **AC-14.2**: DADO um JSON com `name: "__proto__"`, QUANDO importado, ENTÃO a
  validação o rejeita e `Object.prototype` não é poluído. — Coberto pelo teste
  "__proto__/constructor/prototype não passam…" de `test/n11-p12-n13.spec.js`.
- **AC-14.3**: DADO um projeto salvo, QUANDO o gerenciador é aberto, ENTÃO o
  projeto aparece com contagem de versões e o histórico permite restaurar uma
  versão. — Observável; **sem gate nesta fase** (o fluxo de versões em si não
  é exercitado por spec).

### RF-15 — Persistência local e auto-save

Tudo em `localStorage` (chaves com prefixo `md2pdf_`, ex.: `projects`,
`pdfSettings`). Auto-save com toggle na barra de status (FACT — `index.html`,
`js/storage.js`).

- **AC-15.1**: DADO preferências de PDF salvas, QUANDO o app recarrega e o
  modal é aberto, ENTÃO as preferências são restauradas. — Coberto pelo teste
  "preferências de página salvas são restauradas…" de `n11-p12-n13.spec.js`.
- **AC-15.2**: DADO o auto-save ligado e edição no documento, QUANDO a página
  é recarregada, ENTÃO o conteúdo é restaurado. — Observável; **sem gate nesta
  fase**.

### RF-16 — Inserção de imagens

Por URL (validada: string crua sem `"<>`, protocolo http/https ou
`data:image/`, hostname na allowlist) ou upload (prévia local, envio a ImgBB,
limite 32 MB) (FACT — `js/image-manager.js`).

- **AC-16.1**: DADO uma URL de imagem com payload (`?x=" onerror="…`), QUANDO
  inserida, ENTÃO é rejeitada pelo validador e nenhum atributo/script é
  injetado no preview. — Coberto por A11/A12 de `sanitize-p1-p2.spec.js`.
- **AC-16.2**: DADO um arquivo de imagem, QUANDO enviado, ENTÃO é publicado em
  ImgBB e a URL inserida no Markdown; arquivos acima de 32 MB são rejeitados.
  — Observável; **sem gate nesta fase**. Nota de produto: o upload envia a
  imagem a um terceiro (ImgBB) usando chave de API embutida no cliente (FACT —
  ver Riscos).

### RF-17 — Doação PIX

Modal de doação que gera o payload PIX localmente (chave do desenvolvedor,
valores 10/20/50/100, mensagem opcional até 72 caracteres) e carrega o QR de
`api.qrserver.com` (FACT — `js/pix.js`).

- **AC-17.1**: DADO o modal PIX aberto e um valor escolhido, QUANDO o QR é
  gerado, ENTÃO o payload PIX é montado localmente e o QR é carregado do
  serviço externo; "Copia e Cola" copia o payload para a área de transferência.
  — Observável; **sem gate nesta fase**. Único fluxo (com o upload de imagem)
  que envia dado do usuário a terceiro (ver Riscos).

### RF-18 — Idiomas

Três idiomas (pt-BR, en, es) via `i18n.js`, trocáveis na UI e por `?lang=`
(FACT — `index.html`, `i18n.js`).

- **AC-18.1**: DADO o app em qualquer dos 3 idiomas, QUANDO o modal de
  exportação é aberto, ENTÃO os rótulos estão traduzidos (nenhuma chave crua).
  — Coberto para numeração/posição; as demais telas **sem gate nesta fase**.

### RF-19 — Atalhos de teclado

Atalhos documentados na UI (Ctrl+F busca, Ctrl+Z/Ctrl+Y desfazer/refazer,
Ctrl+Shift+S projetos, etc.).

- **AC-19.1**: DADO o app aberto, QUANDO Ctrl+F é pressionado, ENTÃO a barra de
  localizar é exibida. — Observável; **sem gate nesta fase**.

## 6. Qualidade e limites conhecidos

- **Motor de PDF é `window.print()`** (ADR-001): o diálogo de impressão do
  navegador é o último passo e **pode sobrescrever as margens** configuradas no
  modal; exige popup liberado (o app detecta popup bloqueado); o toast "PDF
  pronto!" é emitido antes de o PDF existir (mensagem enganosa — FACT).
- **Firefox e Safari têm suporte parcial a margin boxes**: numeração pode não
  funcionar neles. **Não verificado** (ASSUMPTION) — registrado no ADR-001 e no
  `PRINT-PROFILE.md`.
- **`templates.js` (95 KB) e `themes.js` (108 KB) não foram lidos
  integralmente** pelo intake. Esta fase confirmou por leitura a estrutura e a
  contagem dos dois arquivos (50 temas; 16 templates distintos + 1 duplicado),
  mas o conteúdo integral continua não lido — se um defeito de paginação
  aparecer apesar do perfil, é onde investigar (FACT — `PRINT-PROFILE.md`).
- **Ausência de CSP**: decisão registrada de não adicionar CSP nesta mudança;
  diretivas ortogonais (`object-src 'none'`, `base-uri 'self'`,
  `frame-ancestors 'self'`) são follow-up aceito (FACT — SECURITY-REVIEW D3).
- **Dependências de CDN sem SRI** (`marked` 9.1.2, `jszip` 3.10.1,
  `FileSaver` 2.0.5, font-awesome) — achado P3 ABERTO (FACT).
- **Achados de segurança abertos** (FACT — SECURITY-REVIEW): P12 (poluição de
  protótipo via nome de projeto, Baixa, sem cadeia de XSS, dono engineer),
  P13 (slot `content` do ModalManager é HTML por contrato), P4 (PIX a
  terceiro), P5 (`localStorage` em claro + falha silenciosa de cota), P6
  (cache-first do SW).
- **Discrepâncias de metadata**: JSON-LD anuncia "8 templates" e versão 2.0
  enquanto o código tem 16 templates e CHANGELOG em 2.1.0 (FACT).
- **Cobertura de testes**: as suítes existentes cobrem o núcleo (impressão,
  normalização, sanitização, temas); edição visual de temas, templates,
  localizar/substituir, estatísticas, PWA, PIX, atalhos e o fluxo de versões
  **não têm gate automatizado nesta fase**. A execução das suítes (incluindo
  33/33 + C1–C8 e 21/21 citados no SECURITY-REVIEW) é alegada pelos gates de
  build; **não foi reproduzida nesta fase**.

## 7. Riscos de produto

O produto é público (deploy em Cloudflare Pages ligado ao repositório de
origem — push em `main` dispara produção, FACT) e 100% client-side. O modelo é:
**nada do documento sai do navegador, exceto dois fluxos a terceiros**.

| # | Risco | Tipo | Mitigação / status |
|---|---|---|---|
| R1 | **Payload PIX (valor + mensagem) enviado a `api.qrserver.com`** ao abrir o modal, sem consentimento explícito por fluxo (o modal gera o QR imediatamente). Dado financeiro do usuário para terceiro. | FACT (pix.js:102) | Registrado como P4 (ABERTO, dono owner). Produto deve documentar o fluxo; avaliar gerar o QR localmente ou exigir ação explícita antes da chamada. |
| R2 | **Upload de imagem envia o arquivo a ImgBB** (`api.imgbb.com/1/upload`) com **chave de API embutida e pública** no JS. Risco duplo: conteúdo do usuário para terceiro + a chave pode ser extraída e abusada (cota) por qualquer um. | FACT (image-manager.js:10, 214) | Registrar no SECURITY-REVIEW (chave ImgBB já listada no modelo de ameaça). Se o upload falhar por cota abusada, o produto degrada para todos. |
| R3 | **Comprometimento de origem por XSS** = leitura de todo o `localStorage` (documentos, temas, chave ImgBB) e uso do PIX. Superfície mitigada (DOMPurify 3.4.16 self-hosted, 3 sinks sanitizados, fronteiras defensivas), mas: bypass público do DOMPurify não verificado contra CVEs atuais (ASSUMPTION) e reparse pós-sanitização existe no caminho EPUB (residual baixo). | FACT + ASSUMPTION | P1/P2/P7/P8/P10/P11 mitigados com evidência estática + suítes; acompanhar P12/P13. |
| R4 | **Perda silenciosa de documentos** por cota de `localStorage` (falha silenciosa) e dados em claro no storage (sem criptografia). | FACT (P5) | Documentar para o usuário; tratar falha de gravação como erro visível (follow-up). |
| R5 | **Margens e numeração dependem do navegador do usuário**: diálogo do Chrome sobrescreve margens; Firefox/Safari podem não renderizar numeração. Resultado final não é produzido pelo código do produto. | FACT + ASSUMPTION (FF/Safari não verificado) | ADR-001 registra a dívida; aviso no texto de boas-vindas. |
| R6 | **Supply-chain via CDN sem SRI** (`marked`, `jszip`, `FileSaver`, font-awesome): script de terceiro adulterado executa na origem. | FACT (P3) | Follow-up: SRI ou self-host. |
| R7 | **CSP ausente**: política permissiva atrasada; diretivas ortogonais seguras adiáveis. | FACT (D3) | Fase 2 da CSP quando os handlers inline saírem. |
| R8 | **Deploy é produção**: repositório de origem ligado ao Cloudflare Pages; erro de release afeta usuários reais imediatamente. | FACT (plano R5) | Gates locais → review → aprovação humana antes de qualquer push. |
| R9 | **Paridade com produção**: não verificado se `deploy/` é exatamente o que roda em `md2pdf-free-studio.pages.dev`. | ASSUMPTION (intake, pergunta a) | Confirmar com o owner antes de mudanças de release. |

## 8. Como medir sucesso

O produto **não tem analytics nem backend** (FACT) — não há métrica de uso,
retenção ou conversão mensurável hoje. O que é mensurável com o que existe:

1. **Gate de impressão** — `npm test` + `python test/verify-pdf.py`: os 8
   critérios C1–C8 (quebra `\pagebreak`, frontmatter removido, sem transbordo,
   só H1 abre página com fixture em 5 páginas, sem página em branco inicial,
   numeração off/on, cabeçalho de tabela repetido) e as suítes Playwright
   verdes. Este é o único instrumento objetivo e repetível do produto.
2. **Regra de ouro preview↔PDF**: mantida enquanto o gate renderiza o fixture
   no preview e valida o PDF pelo mesmo documento (teste 4 + C1–C8).
3. **50/50 temas renderizam** sem erro (A7).
4. **Teste de aceite humano no deploy**, após o gate automatizado (decisão do
   owner no plano) — o checkpoint real de "o PDF saiu certo para o usuário".
5. **Fechamento de achados de produto/segurança** (P3, P4, P5, P6, P12, P13)
   como indicador de maturidade da release.
6. **Nenhuma regressão na contagem de páginas do fixture** (5 páginas; o
   código antigo produzia 7) — sinal de que a causa raiz do defeito central
   não voltou.

## 9. Prioridades

| Prioridade | Escopo | Justificativa |
|---|---|---|
| P0 | RF-01 a RF-06 (edição, normalização, PDF, quebras, perfil, numeração) + sanitização | O caso de uso central: colar IA → PDF correto. É o que o 2.1.0 entregou e o que os gates cobrem. |
| P1 | RF-07 a RF-09 (EPUB3, temas, editor de temas) + fechamento dos achados de segurança (P3, P4, P5, P6, P12, P13) | Exportações alternativas e redução do risco do produto público. |
| P2 | RF-10 a RF-19 (templates, localizar/substituir, estatísticas, PWA, projetos, persistência, imagens, PIX, idiomas, atalhos) | Completam o editor; sem gate automatizado nesta fase. |

## 10. Casos de borda

Comportamento verificado no código ou nos testes (FACT), salvo indicação:

- **Entrada vazia / só whitespace / não-string**: normalizador retorna `""`
  sem lançar (testado).
- **CRLF**: colapsado para LF (testado).
- **Frontmatter sem fechamento ou com `---` CommonMark**: não remove conteúdo
  (testado; 4 guardas + teto de 200 linhas).
- **`\pagebreak` no meio da frase** → texto literal; **dentro de fence** →
  verbatim (testado).
- **Posição de numeração inválida** (storage adulterado) → volta a
  `bottom-center` (testado).
- **Marca d'água com caracteres de breakout** (`<`, `>`, `"`, `\`, `&`, `{`,
  `}`, `\n`, `\r`, `\f`) → removidos; pontuação tipográfica pt-BR preservada
  (testado).
- **Nome de projeto hostil / `__proto__`** → rejeitado ou renderizado como
  texto (testado); resíduo P12 registrado.
- **Upload acima de 32 MB** → rejeitado com mensagem.
- **URL de imagem inválida** → rejeitada; `data:image/` aceita em `img[src]`,
  `data:` removida de `a[href]` (testado).
- **Popup bloqueado na exportação** → mensagem "Popup bloqueado…" (FACT,
  ADR-001).
- **Cota de `localStorage` estourada** → falha silenciosa registrada (P5,
  ABERTO) — tratar como follow-up.
- **Offline sem cache prévio / CDN indisponível** → depende do service worker e
  da rede (P6/P3; sem teste).

---

*Fim da especificação. Mudanças de escopo exigem revisão deste documento com
registro de changelog (regra do skill `prd`).*