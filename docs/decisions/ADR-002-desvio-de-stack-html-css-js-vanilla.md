# ADR-002: Desvio de stack — HTML/CSS/JS vanilla sem build

- **Status**: Aceito
- **Data**: 2026-09-30

## Contexto

O `softwares/_template/` da fábrica é Node.js/TypeScript (pnpm, tsc, vitest,
Playwright). Este produto é **HTML/CSS/JS vanilla, sem build step, sem
framework, sem TypeScript**, com dependências de terceiros carregadas via CDN:
`marked` 9.1.2, `jszip` 3.10.1 e `FileSaver` 2.0.5 em
`softwares/md2pdf/index.html:342-344`. [FATO medido — leitura de código]

A Technology-Policy da fábrica exige que desvios de stack sejam **registrados,
nunca silenciosos** (regra do template: "Products never fork the template
silently; deviations are recorded in the product AGENTS.md"). O
`softwares/md2pdf/AGENTS.md` já declara o desvio e aponta para este ADR — este
documento é o registro formal da decisão.

O produto está **em produção no Cloudflare Pages**
(`md2pdf-free-studio.pages.dev` — canonical em `index.html:14`; repositório de
origem ligado ao Pages conforme plano `.factory/plans/md2pdf-print-profile.md`,
§Riscos), é 100% client-side, sem backend, sem servidor e sem autenticação
(`AGENTS.md`, seção "Product"). [FATO medido — leitura de código + plano]

## Decisão

Manter o desvio: **HTML/CSS/JS vanilla, sem build step, sem framework, sem
TypeScript, com dependências via CDN**. O sistema importado é o produto; o
template é apenas o conjunto de convenções.

Justificativas:

- **(a) Produção e modelo de custo.** O produto já roda no Cloudflare Pages,
  100% client-side, sem backend e sem custo de servidor. Um build step não
  muda o deploy nem agrega valor a um app que não compila nada hoje.
- **(b) Artefato de saída vs. fonte.** Introduzir um build criaria um artefato
  de saída que não é a fonte — divergindo do modelo "estático sem build" que o
  dono escolheu. Manter a fonte como o que é servido elimina a classe de bugs
  de "esqueceu de rebuildar" e de divergência entre fonte e deploy.
- **(c) Reversibilidade total.** Não há build para desfazer: reverter é servir
  os arquivos estáticos de novo. O desvio não cria acoplamento irreversível.

## Consequências

Registradas honestamente — o que o desvio custa:

- **Sem type checking**: não há `tsc`; erros de tipo só aparecem em runtime.
- **Sem bundler**: sem minificação, tree-shaking ou divisão automática de
  código; arquivos grandes permanecem inteiros — `templates.js` (~95 KB) e
  `themes.js` (~108 KB), tamanhos medidos no intake (plano §Diagnóstico, item
  6; leitura de código confirma 3011 e 3759 linhas respectivamente).
- **Dependências de terceiros via CDN sem SRI**: `index.html:342-344` não tem
  atributo `integrity` nos três scripts. Risco de supply chain registrado no
  plano (§Riscos) e a ser tratado no `SECURITY-REVIEW.md`, não neste ADR.
- **Ausência de testes no upstream**: o script `test` aponta para
  `playwright test` (`package.json:9`) sem `playwright.config.*` versionado no
  repositório (verificado: nenhum arquivo correspondente em
  `softwares/md2pdf/`). Zero specs hoje; o gate de build é o primeiro
  entregável do qa-engineer (plano §Riscos).
- **Mitigação do custo do desvio**: apesar da stack divergente, o **motor de
  teste é o do template** (Playwright — `@playwright/test` em
  `package.json:12`), e o método de verificação do gate (`page.pdf()` + `pypdf`)
  é o mesmo da investigação que validou o perfil de impressão (plano §Critérios
  de aceite). Isso reduz o custo do desvio: a fábrica não precisa aprender uma
  stack nova para testar este produto.

## Condições de revisibilidade

Este ADR é reavaliado se o produto crescer para exigir **TypeScript,
bundler ou backend**. Critérios objetivos que disparam a reavaliação:

- surgir requisito de backend, autenticação ou persistência fora do navegador;
- a ausência de type checking passar a custar incidentes ou retrabalho
  recorrente;
- exigência de performance (bundle/minificação) que o servidor estático não
  atende.

Enquanto servir arquivos estáticos sem build atender ao produto, o desvio se
mantém — registrado, nunca silencioso.