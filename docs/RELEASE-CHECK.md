# Release Check — md2pdf v2.1.0

Owner: devops-engineer. Gerado em 2026-10-02 (release 2.1.0 — primeira
publicação de produção). Cada item tem evidência; nada aqui é alegação de
handoff.

## Veredito

**NEEDS_HUMAN — release gate encerrado para decisão humana.**

Todos os gates exigidos para R3 estão PASS e frescos (2026-10-02, ≤ 7 dias).
A suíte (39 testes Playwright + C1–C8) foi **re-executada por mim** na data
da release. **O merge na `main` do upstream é deploy de produção**
(Cloudflare Pages, `deploy/`) — por isso nada é publicado sem aprovação
humana no control point 2. Registry/CHANGELOG são atualizados somente após
a aprovação.

## 1. Gates (lidos diretamente dos arquivos — não por relato)

| Gate | Arquivo | Status | Blockers | Data | Fresco (≤7 d)? |
|---|---|---|---|---|---|
| build | `.factory/gates/md2pdf/build-2026-10-02.md` | PASS | Nenhum | 2026-10-02 | SIM |
| build | `.factory/gates/md2pdf/build-2026-10-02b.md` | PASS | Nenhum | 2026-10-02 | SIM |
| build | `.factory/gates/md2pdf/build-2026-10-02c.md` | PASS | Nenhum | 2026-10-02 | SIM |
| review | `.factory/gates/md2pdf/review-2026-10-02.yaml` | PASS | `[]` | 2026-10-02 | SIM |
| review | `.factory/gates/md2pdf/review-2026-10-02b.yaml` | PASS | `[]` | 2026-10-02 | SIM |
| security | `.factory/gates/md2pdf/security-2026-10-02T000000Z.yaml` | PASS | — (veredito PASSA) | 2026-10-02 | SIM |
| security | `.factory/gates/md2pdf/security-2026-10-02b.yaml` | PASS | `[]` | 2026-10-02 | SIM |
| security | `.factory/gates/md2pdf/security-2026-10-02c.yaml` | PASS | `[]` | 2026-10-02 | SIM |

Nota: o arquivo da rodada 1 de segurança chama-se
`security-2026-10-02T000000Z.yaml` (não `security-2026-10-02.yaml`).

## 2. Suíte (executada por mim em 2026-10-02)

```
npx playwright test        → 39 passed (54.6s)
python -m pytest test/verify-pdf.py -s → C1–C8 8/8 PASS, "TODOS OS CRITERIOS PASSARAM"
```

- 39 testes = print-profile (8) + sanitize-p1-p2 (13) + sanitize-p10p11-class
  (6) + qa-differentiality-p7p8n2 (6) + qa-s1s8-regressoes (3) +
  **n11-p12-n13 (3 — round sem gate dedicado)**.
- A rodada N11/P12/N13 (fixes de achados não-bloqueantes do review/security)
  **não tem gate próprio**; a evidência é a execução da suíte completa acima
  + verificação dos fixes no código de produção: `PDFGenerator.init()` em
  `app.js:103` (N11), `PROTOTYPE_KEY_RE`/`isValidProjectName` em
  `storage.js:62,87` (P12), `Sanitize.color` nos setters CSSOM em
  `themes.js:3694-3702` (N13).

## 3. Segurança — mitigados vs. pendências

Mitigados (verificado no código + suíte): **P1** (XSS via `marked`, 3 sinks,
DOMPurify 3.4.16 self-host), **P2** (breakout de `</style>` via marca
d'água), **P7** (sinks fora do `marked`), **P8** (`ADD_DATA_URI_TAGS`),
**P9** (`.gitignore` da raiz cobre `browser-state-*.json`),
**P10** (nome de projeto importado), **P11** (`\f` na denylist),
**P12** (chaves de protótipo — fix verificado em código e teste; a tabela do
`SECURITY-REVIEW.md` ainda registra ABERTO, atualização do doc pendente =
N12).

Pendências registradas (ABERTO, não fechadas):

| ID | Item | Dono | Estado |
|---|---|---|---|
| A1 | **Rotação da sessão Google** (cookies `AEC`/`NID`/`__Secure-STRP` versionados no upstream) | **owner** | PENDENTE — pendência de release, não item fechado |
| P9 (resíduo) | `browser-state-*.json` ainda no disco (raiz) | owner | Exclusão = owner |
| P3 | SRI dos CDN (`marked`/`jszip`/`FileSaver`/font-awesome) | devops/product | ABERTO |
| — | PIN do hash do vendor (`dompurify.min.js` vs. upstream npm) | devops | NÃO VERIFICADO (sem rede no gate) |
| P4 | Payload PIX a `api.qrserver.com` sem consentimento explícito | owner | ABERTO |
| P5 | Cota de `localStorage` + falha silenciosa | engineer | ABERTO |
| P6 | SW cache-first + `skipWaiting`/`claim` sem disciplina de versão | devops | ABERTO (F1 resolvido: `v4` + pre-cache completo) |
| P13 | `ModalManager.content` como HTML por contrato (9 chamadores auditados, nenhum passa dado não-confiável hoje) | security + engineer | ABERTO (contrato) |
| CSP | Fases 1–2 (direitivas ortogonais agora; `script-src 'self'` após remover handlers inline) | security + engineer | ABERTO |

## 4. Produção (production-readiness)

- **Logs/metrics/alertas**: não há servidor — produto estático; a suíte E2E
  asserta 0 `pageerror`/console errors e é a rede de regressão. Sem alertas
  automatizados (não aplicável a site estático; health check manual no
  RUNBOOK).
- **Health check**: GET `https://md2pdf-free-studio.pages.dev/index.html` →
  200 + `sw.js`/`manifest.json` presentes (RUNBOOK.md §Health).
- **Deploy**: Cloudflare Pages, Git-connected, `deploy/` como output
  directory. **Layout `deploy/` deve ser preservado na publicação** — assets
  web do produto (raiz) entram em `deploy/` no upstream; a quebra desse
  layout é o risco nº 1 de produção (RUNBOOK §Ponto crítico).
- **Rollback**: documentado (dashboard "Rollback to this deployment" ou
  `git revert` na `main`) — **NÃO TESTADO** (nunca exercitado; evidência
  sobre narrativa).
- **Backups**: git = backup do código; dados de usuário em `localStorage`
  (não portável, sem backup da fábrica). Restore drill: nenhum.
- **Segredos**: nenhum `.env`/credencial no produto (só `.env.example`);
  `browser-state-*.json` fora do versionamento (P9). A1 é a exceção
  histórica **no upstream** — rotação pendente.

## 5. Aprovação humana (obrigatória)

- **Merge na `main` = deploy de produção** (`md2pdf-free-studio.pages.dev`).
  Nenhum agente publica sem aprovação explícita no release gate
  (control point 2).
- Após aprovação: deploy (bash cai em `ask`), atualização do
  `registry.yaml` (status/version/last_release) e CHANGELOG — executados
  pelo orquestrador, não por este agente.

## 6. Versão

**2.1.0** (única entrada; decisão registrada no CHANGELOG). Upstream só tem
a tag `v1.0.0`; `2.1.0` nunca foi publicada (o upstream segue no commit
`01ce614`, 2026-07-12) — o trabalho de segurança (rodadas 1–3) foi dobrado
dentro da 2.1.0 em vez de gerar uma 2.2.0 que incluiria um perfil de
impressão que o usuário nunca viu.