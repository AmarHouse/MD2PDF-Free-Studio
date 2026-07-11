# Deploy no Cloudflare Pages

## Método 1 — Dashboard (Recomendado, sem instalar nada)

1. Acesse https://dash.cloudflare.com/
2. Vá em **Workers & Pages** → **Pages** → **Conectar ao Git**
3. Escolha o repositório `AmarHouse/MD2EPUB-Premium`
4. Configure:

| Campo | Valor |
|-------|-------|
| **Nome do projeto** | `md2pdf-premium` (ou o nome que quiser) |
| **Branch** | `main` |
| **Diretório raiz** | (deixe em branco — o projeto já está na raiz) |
| **Build command** | (deixe em branco — é site estático) |
| **Build output directory** | (deixe em branco) |

5. Clique em **Salvar e Implantar**

Após o deploy (leva ~1 minuto), seu site estará em:
```
https://md2pdf-premium.pages.dev
```

E o AgenticPDF em:
```
https://md2pdf-premium.pages.dev/AgenticPDF/
```

---

## Método 2 — Wrangler CLI (se preferir terminal)

```bash
# Instalar wrangler (se não tiver)
npm install -g wrangler

# Fazer login no Cloudflare
npx wrangler login

# Fazer deploy
npx wrangler pages deploy . --branch main --project-name md2pdf-premium
```

---

## Configurar Domínio Personalizado (opcional)

No dashboard do Cloudflare Pages:
1. Abra o projeto → **Custom domains**
2. Adicione seu domínio (ex: `md2pdf.seusite.com`)
3. Siga as instruções de DNS

---

## Após o Deploy — Testar

Abra no navegador:
```
https://md2pdf-premium.pages.dev
https://md2pdf-premium.pages.dev/AgenticPDF/?theme=3
https://md2pdf-premium.pages.dev/AgenticPDF/?theme=3&lang=pt
```

Para testar com um agente (Puppeteer/Playwright):
```javascript
const page = await browser.newPage()
await page.goto('https://md2pdf-premium.pages.dev/AgenticPDF/?theme=3')
await page.evaluate(md => window.renderMarkdown(md, 3), '# Meu Livro\n\nCapitulo 1...')
await page.waitForFunction(() => document.body.dataset.ready === 'true')
await page.pdf({ path: 'teste.pdf', format: 'A4', printBackground: true })
```
