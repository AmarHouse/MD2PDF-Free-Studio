# md2pdf

Editor Markdown → PDF/EPUB3, 100% client-side (HTML/CSS/JS vanilla, sem
build step), PWA offline, 50 temas. Origem:
`AmarHouse/MD2PDF-Free-Studio` — ver `CHANGELOG.md` e
`docs/INTAKE-REPORT.md` para o estado importado.

Feito para o caso de uso principal: **colar um `.md` gerado por IA e exportar
PDF com o mínimo de trabalho**. O perfil de impressão e as fontes que o
justificam estão em [`docs/PRINT-PROFILE.md`](docs/PRINT-PROFILE.md).

## Comandos

- `npm run dev` — serve estático local (`npx serve .`)
- `npm test` — gate de impressão: `npx playwright test`

## Quebra de página

| Entrada | Efeito |
|---|---|
| linha com apenas `\pagebreak` ou `\newpage` | quebra forçada |
| `# Título` | quebra automática (o primeiro não) |
| `##`, `###` | não quebram |
| `---` | linha horizontal (thematic break). **Não** é quebra de página |

## Verificação

```
npm install
npx playwright install chromium   # primeira vez
npx playwright test               # gera test/.out-*.pdf
python -m pip install pypdf
python test/verify-pdf.py         # 8 critérios de aceite sobre o PDF
```

## Limitações conhecidas

- O motor de PDF é `window.print()`, então o diálogo de impressão do navegador
  é o último passo e pode sobrescrever as margens do modal
  ([ADR-001](docs/decisions/ADR-001-manter-window-print-como-motor-de-pdf.md)).
- Firefox e Safari têm suporte parcial a margin boxes: a numeração de página
  pode não funcionar neles. Não verificado.
- Achados de segurança pré-existentes em
  [`docs/SECURITY-REVIEW.md`](docs/SECURITY-REVIEW.md).
