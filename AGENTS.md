# md2pdf — AGENTS.md

You are working inside a product of the AI Software House.

## Product

md2pdf é um editor Markdown → PDF/EPUB3, 100% client-side (HTML/CSS/JS
vanilla, sem build step, sem servidor, sem autenticação), PWA com cache
offline, 50 temas de tipografia e exportação PDF com margens, tamanho,
orientação e marca d'água configuráveis.

- **Faz**: editar Markdown com preview WYSIWYG; exportar PDF (via
  `window.print()`); exportar EPUB3; localizar/substituir; estatísticas
  do documento; temas e editor de temas; persistência local
  (`localStorage`); PIX.
- **NÃO faz**: não tem backend, não persiste dados fora do navegador,
  não tem autenticação, não tem build step, não roda fora do navegador.

## Regra de ouro

**O preview WYSIWYG e o PDF devem concordar.** Qualquer mudança de
renderização (temas, quebra de página, perfil de impressão) vale para
os dois; uma divergência preview/PDF é bug.

## Dívida conhecida

O motor de PDF é `window.print()` (`js/pdf-generator.js`): o diálogo de
impressão do navegador é o último passo e pode sobrescrever as margens
configuradas no modal. Documentado em `docs/decisions/ADR-001-*.md`
(arquiteto). Não trocar de motor sem decisão registrada.

## Desvio de stack (registrado, nunca silencioso)

Este produto é HTML/CSS/JS vanilla **sem build step**, contra o
`_template` Next.js/Node/TypeScript. O desvio é intencional e está
documentado em `docs/decisions/ADR-002-*.md` (o arquiteto escreve o ADR
em paralelo; o arquivo pode ainda não existir no momento da leitura).
O sistema importado é o produto; o template é apenas o conjunto de
convenções.

## Commands

- Dev: `npm run dev` (serve estático via `npx serve .`; não usa
  `python -m http.server`)
- Test: `npm test` (`playwright test`) — os specs chegam na fase do QA
  (qa-engineer); hoje não há specs versionados no repositório
- Instalar dependências: `npm install` (executado pelo qa-engineer no
  gate; sem rede pode falhar)

## Factory contract

- O engineer escreve código aqui; nunca escreve gate reports.
- O qa-engineer roda os gates de build e teste em
  `.factory/gates/<product>/` (raiz da fábrica, fora deste produto).
- docs/ têm donos: PRODUCT.md (product-manager), ARCHITECTURE.md +
  API.md (arquiteto), SECURITY-REVIEW.md (security-engineer),
  RUNBOOK.md + RELEASE-CHECK.md (devops-engineer), CHANGELOG.md
  (devops-engineer na release).