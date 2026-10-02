# Perfil de impressão — `md2pdf`

Documento normativo de como o produto converte Markdown em PDF. Escreva aqui
qualquer mudança de comportamento de impressão; o código deve corresponder.

## Motor

`window.print()` sobre um documento HTML montado em `window.open()`. Decisão
registrada em `docs/decisions/ADR-001-*.md`. O gate de verificação reproduz o
mesmo documento e usa `page.pdf()` do Playwright, que é o mesmo pipeline de
impressão do Chromium.

## Sintaxe de quebra de página

| Entrada | Efeito | Fonte |
|---|---|---|
| linha com apenas `\pagebreak` | quebra forçada | Pandoc / Quarto |
| linha com apenas `\newpage` | quebra forçada (alias) | Pandoc / Quarto |
| `# Título` | quebra automática (exceto o primeiro) | Tipora — auto page break em heading de nível superior |
| `##` / `###` | **não** quebra | decisão do owner 2026-09-30 |
| `---` | thematic break (linha horizontal). **Não** é quebra de página | CommonMark |
| bloco `cover-block` | fecha a página ao final | decisão original do produto |
| bloco `toc-block` | fecha a página ao final | decisão original do produto |

O `\pagebreak` só é reconhecido como linha inteira. No meio de uma frase é
texto literal. Dentro de bloco de código é verbatim.

O marcador é emitido em um único lugar (`js/markdown-normalize.js`) e o efeito é
decidido por CSS: o CSS de impressão aplica `break-after: page`, o CSS do EPUB
trata `.page-break` como inócuo, e `css/preview.css` mostra um indicador visual
tracejado. Um placeholder + CSS, em vez de dois caminhos de parsing.

## Numeração de páginas

Opcional. Configurada no modal de exportação (`PDFGenerator.defaultSettings`):

- `showPageNumbers` — boolean, padrão `true`
- `pageNumberPosition` — padrão `bottom-center`

Implementação: margin box do CSS Paged Media L3 com `counter(page)`. Chromium
implementa nativamente desde a v131 (nov/2024) — verificado nesta investigação
em Chromium 154. A primeira página é suprimida por `@page :first`, que é
convenção editorial, não limitação do browser.

Posições expostas, mapeadas em `PDFGenerator.pageNumberPositions`:

| Chave | Margin box |
|---|---|
| `top-left` | `@top-left` |
| `top-center` | `@top-center` |
| `top-right` | `@top-right` |
| `bottom-left` | `@bottom-left` |
| `bottom-center` | `@bottom-center` |
| `bottom-right` | `@bottom-right` |

Cada posição nova só entra na tabela depois de verificada no Chromium alvo.

## Sanitização de entrada

`js/markdown-normalize.js` roda antes de todo `marked.parse`. Entrada típica é
Markdown gerado por IA. Regras, nesta ordem:

1. Remove frontmatter YAML inicial (bloco `---` no topo fechado por `---`)
2. Normaliza hierarquia de títulos — se o primeiro heading não é `#`, rebaixa
   para a hierarquia começar em `#` e não pular níveis. Nunca aprofunda
3. Colapsa 3+ linhas em branco consecutivas
4. Remove espaços à direita

Contrato: **idempotente** (`normalize(normalize(x)) === normalize(x)`) e
**defensivo** (input não-string, vazio ou só-whitespace retorna `""`, sem
lançar). Roda a cada tecla digitada, com debounce de 150 ms, e tem cache de uma
entrada. Blocos de código (fenced e indented) são conteúdo: as regras de
whitespace e a normalização de títulos não os atravessam.

## Perfil de impressão

Alvo: **nada transborda a página.** Saída de IA produz tabela larga, bloco de
código com linha de 200 caracteres e URL longa; sem estas regras, somem.

| Regra | Problema que resolve |
|---|---|
| `thead { display: table-header-group }` | cabeçalho de tabela some a partir da 2ª página |
| `tr { break-inside: avoid }` | linha de tabela cortada ao meio |
| `table { width: 100%; font-size: 0.85em }` | tabela larga do ChatGPT não cabe |
| `td, th { word-break: break-word; overflow-wrap: anywhere }` | célula sem espaço estoura |
| `pre { white-space: pre-wrap; break-inside: auto }` | linha de código longa **some** |
| `code, a { overflow-wrap: anywhere }` | URL/identificador longo estoura |
| `img { max-height: 200mm; object-fit: contain }` | imagem alta estoura |
| `blockquote, ul, ol, li, table, figure { break-inside: avoid }` | bloco cortado ao meio |
| `p { orphans: 3; widows: 3 }` | órfãs no topo e no rodapé |

`pre` e `code` ficam **fora** de `break-inside: avoid` de propósito. Bloco de
código maior que a página é comum, e `avoid` empurraria o bloco inteiro para a
página seguinte, deixando uma quase vazia atrás. O Chromium quebra o bloco
nesse caso (verificado).

Onde as regras vivem, e por quê estão em três lugares: `css/print.css` (impressão
do app), `pageBreakCSS` e `getPrintCSS` em `js/themes.js` (tema, para o preview
e para o CSS injetado na janela de impressão) e o `<style>` inline em
`js/pdf-generator.js` (o documento exportado). Mudar em um e esquecer os outros
produz preview e PDF divergentes — que é o defeito mais provável deste produto.

## Verificação

```
npm install
npx playwright install chromium   # primeira vez
npx playwright test               # gera test/.out-numbered.pdf e .out-nonumber.pdf
python -m pip install pypdf
python test/verify-pdf.py         # afirma os 8 critérios de aceite
```

O fixture é `test/fixtures/print-profile.md`, versionado, cobrindo as 8
situações: frontmatter, heading rebaixado, tabela de 2 páginas, linha de código
de 200 caracteres, URL longa, `---` como thematic break, `\pagebreak`, e H1/H2/H3
seguidos.

## Limitações conhecidas

- **O diálogo de impressão do Chrome é o último passo** e pode sobrescrever as
  margens configuradas no modal. O próprio texto de boas-vindas do produto
  admite isso. Não resolvido.
- **Firefox e Safari têm suporte parcial a margin boxes.** Não verificado nesta
  investigação. Numeração de página pode não funcionar neles. Ver ADR-001.
- **"Página X de Y" não é implementado** — `counter(pages)` é menos confiável
  no Chromium que `counter(page)`. Diferido.
- **`js/templates.js` (~95 KB) e o restante de `js/themes.js` (~108 KB) não
  foram integralmente lidos.** Se um defeito de paginação aparecer apesar do
  perfil acima, é aí que investigar primeiro.
