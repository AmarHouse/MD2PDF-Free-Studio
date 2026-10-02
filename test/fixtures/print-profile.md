---
title: Relatório de Teste do Perfil de Impressão
author: Fixture do gate
date: 2026-09-30
---

# Relatório Trimestral

Texto introdutório do capítulo. Este parágrafo existe para dar corpo à
primeira página e validar que o primeiro H1 não gera uma página em branco
antes dele.

## Seção 1.1 — Detalhamento

Texto corrido com **negrito**, *itálico*, ~~tachado~~ e `código inline`.
Abaixo, um link deliberadamente longo que não cabe em uma linha e é o caso
comum de saída de IA: [documentação](https://exemplo.com/uma/url/extremamente/longa/que/estoura/a/margem/e/nao/quebra/aqui/mais).

| Métrica | Q1 | Q2 | Q3 | Variação | Responsável | Observação |
|---------|----|----|----|----------|-------------|------------|
| Receita | 10 | 20 | 30 | +200% | Fulano | observação longa o bastante para forçar quebra dentro da célula da tabela |
| Custo | 5 | 6 | 7 | +40% | Beltrano | outra observação |
| Margem | 8 | 9 | 11 | +37% | Sicrano | terceira linha para garantir volume |

```js
const resultado = await algumaFuncaoComNomeMuitoLongoDeProposito(argumento1, argumento2, argumento3, argumento4444444444444444444444444444444);
```

> Citação de exemplo para validar que o blockquote não é cortado ao meio.

### Subseção que não deve iniciar página nova

Este H3 deve continuar na mesma página do texto anterior. É o critério que
demonstra que a quebra automática em H2 e H3 foi removida.

## Seção 1.2 — Tabela longa

Linha 1 | Linha 2 | Linha 3
--- | --- | ---
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
A | B | C
FIM DA TABELA | ok | ok

---

## Seção 1.3 — Depois de um thematic break

O `---` acima é thematic break no CommonMark e NÃO é quebra de página. Esta
seção deve estar na mesma página, sem nova página entre ela e a 1.2.

# Segundo Capítulo

Este H1 DEVE iniciar uma nova página. Todo o parágrafo anterior está na
página do capítulo 1, e este texto começa outra.

\pagebreak

## Seção após quebra forçada

O `\pagebreak` acima é quebra forçada: esta seção tem de estar no topo de
uma página nova, independentemente de onde o texto caia.

### Fim do fixture
