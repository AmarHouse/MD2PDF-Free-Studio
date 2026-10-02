# Runbook — md2pdf

Owner: devops-engineer (criado em 2026-10-02, release 2.1.0).

## Resumo de arquitetura

md2pdf é um editor Markdown → PDF/EPUB3, 100% client-side: HTML/CSS/JS
vanilla, sem build step, sem servidor, sem autenticação (desvio de stack
registrado em ADR-002). PWA com service worker cache-first (CACHE_VERSION
`v4`), 50 temas, persistência em `localStorage` e exportação PDF via
`window.print()` (ADR-001). O runtime de produção depende de 4 CDNs sem SRI
(`marked`, `jszip`, `FileSaver`, font-awesome — P3) e de terceiros
(`api.qrserver.com` para PIX — P4; Google Fonts). Não há estado no servidor:
todo dado do usuário vive no `localStorage` do navegador.

## Health checks

Não há endpoint de servidor — o produto é um site estático. Health é provado
por (1) disponibilidade do site, (2) a suíte de gates local.

| Check | Comando | Verifica |
|---|---|---|
| Site no ar | `curl -s -o NUL -w "%{http_code}" https://md2pdf-free-studio.pages.dev/index.html` | 200 = publicado; 404 = layout de deploy quebrado (ver Incidentes) |
| PWA presente | GET `https://md2pdf-free-studio.pages.dev/sw.js` e `manifest.json` | 200 nos dois |
| Suíte de regressão | `cd softwares/md2pdf && npx playwright test` | 39/39 (perfil de impressão, sanitização A1–A21, diferenciais N11/P12/N13, QA) |
| Verificador de PDF | `python -m pytest test/verify-pdf.py -s` | C1–C8 8/8 ("TODOS OS CRITERIOS PASSARAM") |

A suíte roda localmente (Playwright sobe o próprio servidor em
`127.0.0.1:8099` via `playwright.config.js`); não depende do deploy.

## Deployment

Produto publicado no **Cloudflare Pages**, projeto `md2pdf-free-studio`:

| Campo | Valor |
|---|---|
| Repositório | `AmarHouse/MD2PDF-Free-Studio` (o nome antigo `AmarHouse/MD2EPUB-Premium` no doc de intake redireciona para ele — confirmado via API do GitHub) |
| Branch | `main` |
| Build command | (vazio — produto estático) |
| Build output directory | `deploy` — **obrigatório** |
| URL | `https://md2pdf-free-studio.pages.dev` |

### Ponto crítico — o layout `deploy/`

O upstream versiona os assets web **dentro de `deploy/`**
(`deploy/index.html`, `deploy/css/`, `deploy/js/`, `deploy/sw.js`,
`deploy/manifest.json`, `deploy/_redirects`); o Cloudflare publica **só** o
conteúdo de `deploy/`. O produto local materializa esses mesmos arquivos na
raiz (`softwares/md2pdf/index.html`, `css/`, `js/`, `sw.js`,
`manifest.json`, `_redirects`).

**Ao publicar, os assets web do produto precisam ser sincronizados para
dentro de `deploy/` do repositório, preservando a árvore relativa** — nunca
na raiz do repositório. Se os arquivos entrarem na raiz, o site fica vazio
(404) e o pre-cache do `sw.js` (paths `./js/...`) quebra. `AgenticPDF/` (no
`deploy/` upstream) está fora de escopo do produto (intake 2.0.0) e não é
publicado. `docs/`, `test/`, `node_modules/`, `package*.json`,
`playwright.config.js` e `.env*` **não** entram no `deploy/`.

### Fluxo (método canônico — Git-connected)

1. Preparar o payload: copiar de `softwares/md2pdf/` → `deploy/` do
   repositório: `index.html`, `css/`, `js/` (incl. `js/vendor/`), `sw.js`,
   `manifest.json`, `_redirects`.
2. **Merge na `main` do upstream = deploy de produção.** Este é o ponto de
   controle humano: nenhum agente faz merge sem aprovação explícita no
   release gate (control point 2). O Cloudflare detecta o push e publica em
   ~1 minuto.
3. Rodar o health check acima e um smoke manual (abrir a URL, editar
   Markdown, exportar PDF).

### Método alternativo — `wrangler` CLI

```bash
npx wrangler pages deploy deploy --branch main --project-name md2pdf-free-studio
```

Usado quando não há acesso ao dashboard ou em fallback de recuperação.
Exige login (`npx wrangler login`). O nome do projeto é case-insensitive
na URL.

## Rollback

- **Via dashboard (recomendado)**: Cloudflare Pages → projeto
  `md2pdf-free-studio` → **Deployments** → selecionar o deployment anterior →
  **Rollback to this deployment**. Instantâneo (~1 min para propagar).
- **Via git**: `git revert` do commit do release na `main` (ou push de um
  commit revertendo `deploy/` ao estado anterior) — dispara rebuild
  automático. O baseline de rollback é o último estado de `deploy/` na
  `main`.
- Rollback de dados do usuário: **não existe** — dados vivem no
  `localStorage` de cada navegador; rollback de versão não restaura nem
  apaga documentos do usuário (a chave `md2pdf_projects` sobrevive ao
  downgrade).
- **Status: NÃO TESTADO** — o procedimento está documentado, mas nunca foi
  exercitado como rollback real de release (evidência sobre narrativa;
  marcar como testado somente após um drill).

## Backup / restore

- Código-fonte: o git (monorepo da fábrica + repositório upstream) é o
  backup. O intake preservou `_legacy`/histórico conforme a política.
- Dados do usuário: `localStorage` do navegador (por origin) — **não** é
  backup da fábrica; não portável entre browsers/origins. A exportação
  EPUB/PDF é o único artefato durável que o produto gera.
- Último teste de restore: **nenhum executado** (primeiro release).

## Incidentes

| Sintoma | Comportamento / correção |
|---|---|
| **"Exportar PDF não funciona" / "abre uma janela estranha"** | **Por design (ADR-001):** o motor de PDF é `window.print()`. A exportação **termina no diálogo de impressão do navegador** — o usuário precisa escolher o destino **"Salvar como PDF"** (e, se quiser margens exatas, desmarcar "Cabeçalhos e rodapés" que o diálogo pode adicionar). Não é bug; é o comportamento documentado. |
| Site no ar mas página em branco / 404 de assets | Layout de deploy quebrado (assets na raiz em vez de `deploy/`). Rollback via dashboard ou corrigir o payload e republicar. |
| Site não atualiza após release | SW cache-first (`sw.js`, P6): usuário com cache antigo. Hard refresh (Ctrl+Shift+R) ou novo `CACHE_VERSION` no release. O `skipWaiting`/`claim` ativo mitiga, mas não garante. |
| Offline sem cache prévio | CDNs (`marked`, `jszip`, `FileSaver`, font-awesome) usam stale-while-revalidate: no primeiro acesso offline sem cache, quebra (P3/P6 — follow-ups abertos). |
| QR PIX não gera | O payload PIX é enviado a `api.qrserver.com` (terceiro, P4 — aberto). Sem rede ou se o serviço cair, o QR não é gerado. |
| `localStorage` cheio | Falha silenciosa de cota (P5 — aberto); o produto não avisa ao atingir a cota. |
| Erro no console do navegador | Site estático sem logs de servidor; reproduzir e reportar ao devops-engineer com a suíte local. |
| Cookies de sessão Google versionados (upstream) | A1 — o upstream versionou `AEC`/`NID`/`__Secure-STRP` em `browser-state-*.json`. **A rotação da sessão é pendência do owner.** Na fábrica: `.gitignore` da raiz cobre `browser-state-*.json` (P9) — nunca versionar; os arquivos ainda existem no disco e a exclusão é do owner. |

## Contatos / escalonamento

- Deploy, rollback, health, release: **devops-engineer** (RUNBOOK.md,
  RELEASE-CHECK.md).
- Segurança (achados, riscos residuais): **security-engineer**
  (SECURITY-REVIEW.md) — P3 (SRI), P6 (SW), P13 (contrato `content`),
  CSP fases 1–2.
- Pendências de owner: **A1** (rotação da sessão Google), **P4** (PIX a
  `api.qrserver.com`), exclusão dos `browser-state-*.json` do disco (P9).
- Produto/requisitos: product-manager (PRODUCT.md); arquitetura: architect
  (ARCHITECTURE.md, ADRs).
- Operador humano: qualquer mudança em produção exige aprovação no release
  gate (control point 2) — merge na `main` **é** deploy.