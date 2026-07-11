# MD2PDF Premium

**Editor Markdown profissional com 50 temas premium, exportação PDF e EPUB3 — 100% no navegador.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat&logo=pwa&logoColor=white)

---

## Visão Geral

O MD2PDF Premium é um editor Markdown completo que roda inteiramente no navegador. Transforme seus textos em documentos PDF profissionais ou ebooks EPUB3 com 50 temas tipográficos cuidadosamente projetados.

**Sem servidor. Sem instalação. Sem cadastro.**

---

## Funcionalidades

### Editor
- Editor Markdown com preview em tempo real
- Barra de ferramentas completa (títulos, negrito, itálico, listas, tabelas, código)
- Busca e substituição com expressão regular
- Inserção de imagens por URL e upload (ImgBB)
- Suporte a drag & drop de arquivos `.md` e imagens
- Auto-save com gerenciamento de projetos e versionamento
- Contagem de palavras, caracteres, linhas e tempo de leitura

### 50 Temas Premium
Temas organizados em 7 categorias, cada um com identidade visual única:

| Categoria | Quantidade | Estilo |
|-----------|:----------:|--------|
| Clássicos | 9 | Tipografia tradicional, serifadas |
| Modernos | 8 | Limpeza, sans-serif, contemporâneo |
| Técnicos | 8 | Clareza para documentação e manuais |
| Criativos | 6 | Originalidade e expressão visual |
| Elegantes | 6 | Sofisticação e graça |
| Educacionais | 6 | Clareza para aprendizado |
| Tecnológicos | 7 | Futurismo, neon, terminal |

### Exportação
- **PDF** — Configurações de página (A4, A5, Carta, Ofício, Kindle), margens orientação, e marca d'água personalizada
- **EPUB3** — Geração de ebook completo com navegação, imagens externas incorporadas e sumário automático

### Editor Visual de Temas
- Crie temas personalizados com editor de CSS em tempo real
- Selecione fontes, cores e estilos
- Preview instantâneo

### PWA (Progressive Web App)
- Funciona 100% offline após primeiro acesso
- Service Worker com cache inteligente
- Instalável em desktop e mobile

### Internacionalização
- Português (PT-BR)
- English (EN)
- Español (ES)

### Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+B` | Negrito |
| `Ctrl+I` | Itálico |
| `Ctrl+K` | Link |
| `Ctrl+Shift+K` | Tachado |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` | Refazer |
| `Ctrl+S` | Salvar |
| `Ctrl+F` | Buscar |
| `Ctrl+H` | Buscar e Substituir |
| `Ctrl+Shift+S` | Gerenciar Projetos |
| `Ctrl+O` | Abrir arquivo |
| `Tab` | Indentar |

---

## Estrutura do Projeto

```
MD2EPUB-Premium/
├── index.html          # Página principal
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── css/
│   ├── main.css        # Estilos gerais e layout
│   ├── editor.css      # Estilos do editor
│   ├── preview.css     # Estilos do preview
│   ├── modals.css      # Estilos dos modais
│   ├── print.css       # Estilos de impressão
│   └── pix.css         # Estilos do modal PIX
├── js/
│   ├── app.js          # Módulo principal
│   ├── editor.js       # Lógica do editor
│   ├── preview.js      # Renderização do preview
│   ├── themes.js       # 50 temas premium
│   ├── theme-editor.js # Editor visual de temas
│   ├── storage.js      # Persistência localStorage
│   ├── i18n.js         # Internacionalização
│   ├── stats.js        # Estatísticas e contadores
│   ├── find-replace.js # Busca e substituição
│   ├── image-manager.js# Gerenciamento de imagens
│   ├── templates.js    # Templates editoriais
│   ├── pdf-generator.js# Exportação PDF
│   ├── epub-generator.js# Exportação EPUB3
│   └── pix.js          # Modal de doação PIX
└── .gitignore
```

---

## Deploy no CloudFlare Pages

### Via GitHub (Recomendado)

1. Crie um repositório no GitHub
2. Faça push do código:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/SEU-USER/MD2EPUB-Premium.git
   git push -u origin main
   ```
3. No [CloudFlare Pages](https://dash.cloudflare.com/), crie um novo projeto
4. Conecte ao repositório GitHub
5. **Build settings:**
   - Build command: *(vazio)*
   - Build output directory: `/` (raiz)
6. Clique em "Save and Deploy"

> **Nota:** O projeto é 100% estático — não há build step necessário. O `.gitignore` exclui automaticamente `node_modules/` e arquivos de teste.

### Via Direct Upload

Se preferir upload direto sem GitHub, copie apenas estes arquivos para uma pasta e faça upload:
```
index.html
manifest.json
sw.js
css/
js/
```

---

## Tecnologias Utilizadas

| Biblioteca | Uso |
|------------|-----|
| [Marked.js](https://marked.js.org/) | Parser Markdown → HTML |
| [JSZip](https://stuk.github.io/jszip/) | Geração de arquivos EPUB |
| [FileSaver.js](https://github.com/nicnl31/FileSaver.js) | Download de arquivos |
| [Font Awesome](https://fontawesome.com/) | Ícones da interface |
| [Google Fonts](https://fonts.google.com/) | Tipografia dos temas |

Todas as dependências são carregadas via CDN — sem `npm install` necessário para produção.

---

## SEO e Metadados

O `index.html` inclui:
- OpenGraph e Twitter Card para compartilhamento em redes sociais
- JSON-LD (Schema.org) para rich snippets
- Hreflang para SEO multilíngue
- Meta tags PWA para instalação em mobile

---

## Permissões

| Recurso | Necessário |
|---------|-----------|
| Clipboard | Copiar payload PIX |
| Service Worker | Cache offline |
| Pop-up | Geração de PDF (via impressão) |

---

## Créditos

Desenvolvido por **Pedro Luz** — [resende.com.br/lp/pedroluz](https://resende.com.br/lp/pedroluz)

---

## Licença

Uso livre. Se este projeto te ajudou, considere oferecer um cafezinho via PIX dentro do app.
