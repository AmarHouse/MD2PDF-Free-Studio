# ADR-001: Manter `window.print()` como motor de PDF

- **Status**: Aceito
- **Data**: 2026-09-30

## Contexto

O motor de exportação PDF é `window.print()`: o app monta um HTML completo
numa janela nova e delega a impressão ao navegador.

- `js/pdf-generator.js:132` — `window.open('', '_blank')` abre a janela de
  impressão.
- `js/pdf-generator.js:232-234` — `printWindow.print()` é chamado 500 ms após
  `document.close()`; o `showToast('PDF pronto! …')` da linha 234 é emitido
  **antes** de qualquer PDF existir (mensagem enganosa — [FATO medido, ver
  plano `.factory/plans/md2pdf-print-profile.md`, §Diagnóstico item 4]).
- A numeração de página já funciona via CSS Paged Media:
  `js/pdf-generator.js:189-201` emite `@page { @bottom-center { content:
  counter(page) } }` com `@page :first { @bottom-center { content: none } }`
  suprimindo a primeira página.

Evidência empírica medida nesta investigação (Chromium 154, `page.pdf()` do
Playwright + extração de texto por `pypdf`; mesmo método que o gate usará —
plano §Verificação empírica) — [FATO medido, não estimativa]:

- `@top-center` e `@bottom-center` renderizam.
- `counter(page)` renderiza (marcador `MARGEM-OK-2` extraído do PDF).
- `@page :first { @bottom-center { content: none } }` suprime a primeira página.
- `thead { display: table-header-group }` repete o cabeçalho entre páginas.
- `page-break-after` legado e `break-after` moderno ambos funcionam.
- `pre { break-inside: avoid }` com bloco maior que a página → o Chromium
  quebra mesmo assim, sem transbordo. **Não é bug** — foi retirado do escopo
  do plano.

Argumento central: **Chromium implementa CSS Paged Media L3 nativamente desde
a v131 (nov/2024)**, portanto `window.print()` entrega `@page` completo —
tamanho, margens, margin boxes e contadores — sem nenhuma dependência. Paged.js
e polyfills de numeração não são necessários. É exatamente isso que enfraquece
`html2pdf` (que rasteriza o DOM e perde todo o CSS Paged Media). [FONTE: plano
§Diagnóstico item 3; verificação empírica executada em Chromium 154, acima.]

## Decisão

Manter `window.print()` como motor de PDF (opção A), decidido pelo dono do
produto em 2026-09-30. Rejeitadas as alternativas abaixo. Não trocar de motor
sem nova decisão registrada (regra já gravada no `softwares/md2pdf/AGENTS.md`,
seção "Dívida conhecida").

## Alternativas avaliadas

As quatro alternativas rejeitadas, com o custo de cada uma:

1. **`html2pdf.js` (`html2canvas` + `jsPDF`)** — custo: rasteriza o DOM via
   canvas, então o texto vira imagem (sem seleção, PDF maior, pior
   acessibilidade); ignora CSS Paged Media (`@page`, margin boxes e contadores
   não existem num canvas); adiciona duas dependências pesadas; e perde
   exatamente o que o Chromium já entrega nativamente desde a v131 — o
   argumento central acima. [CUSTO: alto, com perda funcional]

2. **`jsPDF` com layout próprio** — custo: reimplementar em código o fluxo de
   texto, a paginação e a tipografia dos 50 temas hoje expressos em CSS; abre
   mão do CSS dos temas; risco alto de divergência preview/PDF, que é a regra
   de ouro do produto (`AGENTS.md`). [CUSTO: muito alto, esforço de reescrita]

3. **`pdfmake`** — custo: define documentos por objeto declarativo (JSON);
   não consome o HTML/CSS dos temas existentes; exigiria reescrever o pipeline
   de preview e temas e manter duas definições de layout em sincronia.
   [CUSTO: alto, duplicação de representação]

4. **`Paged.js`** — custo: polyfill de CSS Paged Media que processa o DOM em
   runtime; adiciona dependência e etapa de processamento; redundante com o
   suporte nativo do Chromium (v131+) a margin boxes e contadores; risco de
   conflito de paginação com o `@page` nativo já emitido pelo app.
   [CUSTO: médio, com redundância em relação ao navegador]

## Consequências

- Nenhuma dependência nova de runtime; custo de manutenção do motor é zero.
- Fidelidade total ao CSS dos 50 temas — a regra de ouro preview/PDF se
  mantém por construção.
- O resultado final depende do driver de impressão do navegador do usuário
  (ver dívida 2).
- O diálogo de impressão permanece como último passo da exportação (ver
  dívida 1) — o atrito de UX não é resolvido por este ADR.
- Numeração de páginas continua limitada a string estática e `counter(page)`
  (ver dívida 4).

## Dívidas conhecidas

Registradas explicitamente, para não serem relitigadas sem evidência nova:

1. **Diálogo de impressão sobrescreve margens.** O diálogo do Chrome é o
   último passo e a opção "Default" do usuário pode sobrescrever as margens
   configuradas no modal do app. O próprio texto de boas-vindas admite isso:
   `js/app.js:389` — "O navegador pode sobrescrever suas configurações no
   diálogo de impressão". [FATO medido — leitura de código]

2. **Dependência do driver do navegador do usuário.** O resultado final não é
   produzido pelo código do produto, mas pelo driver de impressão do navegador
   do usuário. Firefox e Safari têm suporte **parcial** a margin boxes — **não
   verificado nesta investigação**. Registrado como limitação conhecida, não
   como fato. (Plano §Riscos: "A verificar".)

3. **Permissão de popup.** `window.print()` exige popup liberado; o app já
   detecta e reporta popup bloqueado em `js/pdf-generator.js:133` ("Popup
   bloqueado. Permita popups para gerar PDF."). [FATO medido — leitura de
   código]

4. **Cabeçalho/rodapé limitado.** Não há controle de conteúdo dinâmico além de
   string estática e `counter(page)`: `js/pdf-generator.js:192-197` fixa
   `content: counter(page)`, fonte, tamanho e cor no `@bottom-center`. Não há
   "Página X de Y" (`counter(pages)`), nem posições além de `bottom-center` —
   ambos diferidos no plano (Non-goals).