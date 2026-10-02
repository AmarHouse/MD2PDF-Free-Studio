# Intake Report — md2pdf

- **Data**: 2026-09-30
- **Fases**: 1 (Materialize) + 4 (Reconcile conventions) — skill `codebase-intake`
- **Agente**: engineer
- **Origem**: `AmarHouse/MD2PDF-Free-Studio` (branch `main`, commit `01ce614` —
  verificado por leitura de `.git/HEAD` e `.git/refs/heads/main` do clone;
  comando git fora de escopo desta tarefa)
- **Quarentena**: `.factory/staging-source/` (read-only)
- **Produto**: `softwares/md2pdf/`

## Fase 1 — Materialização

Copiado de `.factory/staging-source/deploy/` → `softwares/md2pdf/`:

| Grupo | Arquivos |
|---|---|
| Raiz | `index.html`, `manifest.json`, `sw.js`, `_redirects` |
| `css/` | `main.css`, `modals.css`, `print.css`, `editor.css`, `preview.css`, `pix.css` (6) |
| `js/` | `app.js`, `editor.js`, `epub-generator.js`, `find-replace.js`, `i18n.js`, `image-manager.js`, `pdf-generator.js`, `pix.js`, `preview.js`, `stats.js`, `storage.js`, `templates.js`, `theme-editor.js`, `themes.js` (14) |
| Raiz (origem) | `LICENSE` → `softwares/md2pdf/LICENSE` |

**Total copiado: 25 arquivos** (24 de `deploy/` + LICENSE).

Integridade verificada por SHA-256: 0 divergências entre origem e destino
(comando de verificação abaixo). `deploy/AgenticPDF/` **não** foi copiado
(experimento lateral, fora de escopo — decisão documentada no plano
`md2pdf-print-profile`).

### Exclusões obrigatórias — evidência

Busca recursiva no produto (PowerShell):

```powershell
Get-ChildItem -Force -Recurse softwares/md2pdf | Where-Object {
  $_.Name -eq '.git' -or $_.Name -eq 'node_modules' -or $_.Name -eq 'dist' `
  -or $_.Name -eq 'build' -or $_.Name -eq 'coverage' -or $_.Name -eq 'AgenticPDF' `
  -or $_.Name -like '*.tsbuildinfo' -or $_.Name -like '.env*' `
  -or $_.Name -like 'browser-state-*' }
```

Resultado: **nenhum artefato excluído presente (0 ocorrências)**. O scan
prévio do staging-source também não encontrou `.env*`, `node_modules/`,
`dist/`, `build/`, `coverage/` nem `*.tsbuildinfo`.

## Fase 4 — Reconcile conventions

Arquivos criados: `package.json`, `.gitignore`, `AGENTS.md`,
`CHANGELOG.md`, `.env.example`, `README.md`, `docs/INTAKE-REPORT.md`.

- **`package.json`** — reescrito (ver Achado 1). `name: "md2pdf"`,
  `version: "2.0.0"`, `license: "MIT"`, `private: true`, sem `main`.
  `dev` = `npx serve .` (Node, cross-platform; sem `python -m http.server`).
  `test` = `playwright test` (specs chegam na fase do QA).
- **`.gitignore`** — cobre `node_modules/`, `browser-state-*.json` (+
  `-fingerprint.json`), `.env`/`.env.*` (com `!.env.example`),
  `test-results/`, `playwright-report/`, `coverage/`, `*.tsbuildinfo`,
  `dist/`, `build/`, além dos itens do `.gitignore` upstream
  (`.vscode/`, `*.log`, `.DS_Store`, `Thumbs.db`, `_node_modules_temp/`).
- **`AGENTS.md`** — produto, comandos reais, desvio de stack registrado
  (referência `docs/decisions/ADR-002-*.md`), regra de ouro
  preview↔PDF, dívida do `window.print()`.
- **`CHANGELOG.md`** — estado importado 2.0.0 / 2026-09-30 + entrada do
  plano de perfil de impressão como **em andamento** (nada implementado).
- **`.env.example`** — só comentário: produto sem dependência de
  ambiente; arquivo existe por convenção da fábrica. Nenhuma variável
  inventada.
- **`README.md`** — identificação + comandos + nota de que os specs de
  teste chegam na fase do QA.

## Stack detectada (FACT — por leitura de código e manifestos)

- **Frontend**: HTML/CSS/JS vanilla, sem framework, sem bundler, sem
  build step. PWA (service worker `sw.js`, cache `v2`).
- **Backend**: nenhum — 100% client-side; persistência em
  `localStorage`; dados do usuário nunca saem do navegador, exceto o
  payload PIX enviado a `api.qrserver.com` (terceiro — registrar em
  SECURITY-REVIEW.md).
- **Database**: nenhum.
- **Runtime CDN** (declarado em `sw.js`): `marked` 9.1.2, `jszip`
  3.10.1, `FileSaver.js` 2.0.5 (cdnjs, sem SRI — registrar).
- **Manifesto**: `package.json` upstream na raiz do repositório (não em
  `deploy/`), `name: "md2pdf-studio"`, devDependencies reais
  `@playwright/test ^1.45.0` e `serve ^14.2.0`.
- **Licença**: MIT, `Copyright (c) 2026 Pedro Luz` (`LICENSE`).

## Achados

1. **`package.json` upstream inválido para o produto** — o script `test`
   chama `npx playwright test`, mas não existe `playwright.config` nem
   nenhum spec no repositório (verificado por leitura). O produto
   recebeu um `package.json` coerente (Tarefa 2); o gate é entregável do
   qa-engineer. Zero testes no upstream.
2. **`browser-state-0.json` e `browser-state-0-fingerprint.json`**
   versionados no upstream com cookies de sessão do Google. Não
   copiados. Risco aceito pelo owner em 2026-09-30; correção aplicada é
   o `.gitignore` do produto (não a reescrita de histórico).
3. **`deploy/AgenticPDF/` excluído** — experimento lateral, fora de
   escopo (decisão do plano `md2pdf-print-profile`).
4. **`404.html` listado no plano/ordem de tarefa mas inexistente no
   staging-source** — `deploy/` contém apenas `index.html`,
   `manifest.json`, `sw.js`, `_redirects`, `css/`, `js/`, `AgenticPDF/`;
   busca recursiva por `404*` no repositório inteiro não achou nada.
   **Não copiado e não inventado** (regra: não inventar arquivos).
   Divergência reportada ao orchestrator.
5. **`package-lock.json` do upstream não copiado** — fora da lista
   explícita de cópia da tarefa; além disso o nome do pacote muda para
   `md2pdf` e o `npm install` do qa-engineer regenera o lockfile.
   Registrado aqui para não ser uma adaptação silenciosa.

## Perguntas em aberto (ASSUMPTION — confirmar com o humano)

- **(a)** O `deploy/` do upstream está em pé com o que roda em produção
  hoje em `md2pdf-free-studio.pages.dev`? (FACT parcial: o README
  upstream declara "All public files live in /deploy" e o commit
  `77c7621` declara "deploy ready with root=/deploy"; a paridade com a
  produção ao vivo não foi verificada.)
- **(b)** Os 50 temas têm nome e identidade própria? A contagem e os
  nomes não foram verificáveis por leitura de código nesta fase
  (`themes.js` tem 108 KB e não foi lido integralmente — risco
  registrado no plano).
- **(c)** O commit de referência `01ce614` foi confirmado por leitura de
  `.git/refs/heads/main` do clone; a correspondência exata com o HEAD do
  upstream remoto não foi verificada (git fora de escopo).

## Não verificado nesta fase

- Nenhum teste foi executado (não existem specs; `npm install` foi
  deliberadamente adiado para o qa-engineer — sem rede pode falhar).
- Nenhuma varredura de segurança (fase 2, security-engineer).
- Nenhuma leitura integral de `templates.js` (95 KB) nem do restante de
  `themes.js` (108 KB) — registro do plano como risco do gate.