# MD2PDF Free Studio

> **Free Markdown to PDF & EPUB converter** — 50 themes, PWA offline, AI agent-ready.  
> Zero server, zero cost, zero auth. Runs 100% in your browser.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/AmarHouse/MD2PDF-Free-Studio?style=social)](https://github.com/AmarHouse/MD2PDF-Free-Studio)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white)](https://md2pdf-free-studio.pages.dev/)
[![Cloudflare Pages](https://img.shields.io/badge/Deployed-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://md2pdf-free-studio.pages.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 🚀 Try It Now

**No install, no signup, no cost.** Open in any browser:

### 👉 [md2pdf-free-studio.pages.dev](https://md2pdf-free-studio.pages.dev/)

> **Note:** All public files live in `/deploy`.  
> Internal documentation (strategy, next steps, etc.) stays in the root — not published.

---

## ✨ Features

| | Feature | Detail |
|---|---------|--------|
| 🎨 | **50 Typography Themes** | Classic, modern, elegant, technical, creative, dark |
| 📄 | **PDF Export** | Custom margins, page size, orientation, watermarks |
| 📚 | **EPUB3 Export** | Reflowable ebooks with external images |
| 🖼️ | **Visual Theme Editor** | Create & customize your own themes |
| 📝 | **Markdown Editor** | Live preview, toolbar, keyboard shortcuts |
| 🔍 | **Find & Replace** | Regex support |
| 💾 | **Auto-Save** | Projects persist in your browser |
| 🌐 | **Offline PWA** | Works without internet after first load |
| 🌍 | **Multi-language** | PT-BR, EN, ES |
| 🤖 | **AI Agent Ready** | AgenticPDF — agents discover & use it autonomously |

---

## 🤖 For AI Agents

MD2PDF Free Studio includes **AgenticPDF**, a self-discovering endpoint that any AI agent can use to generate PDFs autonomously.

**How agents discover it:**

```
1. Fetch https://md2pdf-free-studio.pages.dev/AgenticPDF/
2. Read the <script type="application/agent+json"> manifest
3. Call window.renderMarkdown(md, themeId)
4. Capture with page.pdf()
```

### Agent Workflow (Puppeteer/Playwright)

```javascript
const page = await browser.newPage()
await page.goto('https://md2pdf-free-studio.pages.dev/AgenticPDF/?theme=3')

// Inject any markdown — unlimited size
await page.evaluate(md => window.renderMarkdown(md, 3), markdownContent)

// Wait for fonts and rendering
await page.waitForFunction(() => document.body.dataset.ready === 'true')

// Capture PDF
await page.pdf({
  path: 'output.pdf',
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true
})
```

### Bilingual Support

```
?lang=en → English (default)
?lang=pt → Portuguese
```

### Agent Discovery Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /AgenticPDF/` | Auto-discovery manifest |
| `GET /AgenticPDF/config.json` | System config & terms |
| `GET /AgenticPDF/themes.json` | 50 themes list |
| `GET /AgenticPDF/?md=BASE64(...)&theme=N` | URL-param rendering |

---

## 🎨 Theme Gallery

| Group | Themes | Count |
|-------|--------|-------|
| **Classic** | Garamond, Bodoni, Playfair, Baskerville, Lora, Crimson, Spectral | 9 |
| **Modern** | Inter, Raleway, Poppins, Lato, Josefin, Montserrat | 8 |
| **Technical** | Tech Manual, Code Guide, University Thesis, Medical Journal | 8 |
| **Creative** | Vintage Poster, Pastel Dreams, Art Deco, Handwritten | 6 |
| **Elegant** | Gold & Black, Royal Purple, Platinum, Midnight Rose | 6 |
| **Educational** | Classroom, Science Lab, History Book, Creative Writing | 6 |
| **Tech** | Cyberpunk, Matrix, Hologram, Terminal, Quantum, AI Neural | 7 |
| | **Total** | **50** |

---

## 🚀 Deploy Your Own

Deploy to Cloudflare Pages in 1 click — it's free:

1. Fork this repo
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) → Workers & Pages → Pages
3. Connect your fork → **Save and Deploy**

No build command needed. Zero configuration.

---

## 🛠️ Tech Stack

- **HTML/CSS/JS** — No frameworks, no build step
- **[marked.js](https://marked.js.org/)** — Markdown parsing
- **Google Fonts** — 40+ font families
- **Cloudflare Pages** — Global CDN hosting
- **PWA** — Service worker for offline support

---

## 📜 License

MIT — Free for any use, including commercial and agentic.

---

## ⭐ Support

If you find this useful, **star the repo** — it helps others discover it.

[![GitHub stars](https://img.shields.io/github/stars/AmarHouse/MD2PDF-Free-Studio?style=social)](https://github.com/AmarHouse/MD2PDF-Free-Studio)
