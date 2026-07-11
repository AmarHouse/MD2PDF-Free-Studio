/* ============================================
   APP.JS - Módulo Principal da Aplicação
   ============================================ */

const ModalManager = {
    create({ title, size = 'md', content, buttons = [] }) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal modal-${size}">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" data-action="close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">${content}</div>
                ${buttons.length ? `
                <div class="modal-footer">
                    ${buttons.map(b => `<button class="btn ${b.class || 'btn-secondary'}" data-action="${b.action}">${b.text}</button>`).join('')}
                </div>` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('.modal-close')?.addEventListener('click', () => this.close(overlay));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close(overlay);
        });

        overlay.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => this.close(overlay));
        });

        return overlay;
    },

    close(modal) {
        if (modal && modal.parentNode) {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
        }
    }
};

const App = {
    currentIndex: 0,
    dom: {},

    init() {
        this.cacheDOM();
        ThemeManager.init();
        AutoSave.init();
        this.populateThemes();
        this.loadAccentColor();
        this.bindEvents();
        this.setupResizeHandle();
        Preview.init();
        Editor.init();
        FindReplace.init();
        ImageManager.init();
        Stats.init?.();

        const restored = AutoSave.restore();
        if (!restored) {
            this.updateWelcome();
        }

        this.updatePreview();
        Stats.update();
        AutoSave.start();

        I18n.setLang(Storage.load('language') || 'pt-BR');
    },

    cacheDOM() {
        this.dom = {
            input: document.getElementById('markdown-input'),
            preview: document.getElementById('preview-content'),
            select: document.getElementById('theme-selector'),
            btnPrev: document.getElementById('prev-theme'),
            btnNext: document.getElementById('next-theme'),
            btnRandom: document.getElementById('random-theme'),
            tocCheck: document.getElementById('toc-check'),
            mdInput: document.getElementById('md-input'),
            btnUploadMd: document.getElementById('btn-upload-md'),
            exportBtn: document.getElementById('btn-export'),
            toastArea: document.getElementById('toast-area')
        };
    },

    populateThemes() {
        const select = this.dom.select;
        select.innerHTML = '';
        const groups = ThemeManager.getGroups();

        Object.keys(groups).forEach(groupName => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            groups[groupName].forEach(theme => {
                const opt = document.createElement('option');
                opt.value = theme.id;
                opt.textContent = theme.name;
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        });

        select.value = this.currentIndex;
    },

    bindEvents() {
        this.dom.input.addEventListener('input', () => {
            this.updatePreview();
            Stats.update();
        });

        this.dom.select.addEventListener('change', (e) => {
            this.currentIndex = parseInt(e.target.value);
            this.loadAccentColor();
            this.updatePreview();
        });

        const colorPicker = document.getElementById('accent-color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                const color = e.target.value;
                try {
                    const s = JSON.parse(localStorage.getItem('md2pdf_settings') || '{}');
                    s.accentColor = color;
                    localStorage.setItem('md2pdf_settings', JSON.stringify(s));
                } catch {}
                this.updatePreview();
            });
        }

        this.dom.btnPrev.addEventListener('click', () => this.cycleTheme(-1));
        this.dom.btnNext.addEventListener('click', () => this.cycleTheme(1));
        this.dom.btnRandom.addEventListener('click', () => {
            const allThemes = ThemeManager.getAll();
            const rand = Math.floor(Math.random() * allThemes.length);
            const theme = allThemes[rand];
            this.currentIndex = theme.id;
            this.dom.select.value = theme.id;
            this.updatePreview();
        });

        this.dom.btnUploadMd.addEventListener('click', () => this.dom.mdInput.click());
        this.dom.mdInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Botao Novo Documento
        document.getElementById('btn-new-doc').addEventListener('click', () => {
            if (this.dom.input.value.trim() && !confirm('Descartar documento atual e criar novo?')) return;
            this.dom.input.value = '';
            AutoSave.stop();
            Storage.remove('autosave');
            this.updatePreview();
            Stats.update();
            AutoSave.start();
            this.showToast('Novo documento criado', 'success');
        });

        // Toggle Auto-save
        const asToggle = document.getElementById('autosave-toggle');
        const asLabel = document.getElementById('autosave-label');
        const updateASToggle = () => {
            if (AutoSave.enabled) {
                asToggle.className = 'autosave-toggle on';
                asLabel.textContent = 'Auto-save: ON';
            } else {
                asToggle.className = 'autosave-toggle off';
                asLabel.textContent = 'Auto-save: OFF';
            }
        };
        updateASToggle();
        asToggle.addEventListener('click', () => {
            AutoSave.toggle();
            updateASToggle();
            this.showToast(AutoSave.enabled ? 'Auto-save ligado' : 'Auto-save desligado', 'info');
        });

        this.dom.exportBtn.addEventListener('click', async () => {
            await EPUBGenerator.generate();
        });

        // Drag & Drop unificado (arquivos .md + imagens)
        this.dom.input.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dom.input.style.background = '#f0f7ef';
        });
        this.dom.input.addEventListener('dragleave', () => {
            this.dom.input.style.background = '';
        });
        this.dom.input.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dom.input.style.background = '';
            const files = [...e.dataTransfer.files];
            // Primeiro: verificar imagens
            const imageFile = files.find(f => f.type.startsWith('image/'));
            if (imageFile) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.insertAtCursor(`\n![${imageFile.name}](${ev.target.result})\n`);
                    this.showToast('Imagem inserida via drag & drop', 'success');
                };
                reader.readAsDataURL(imageFile);
                return;
            }
            // Segundo: arquivos .md/.markdown/.txt
            const mdFile = files.find(f => /\.(md|markdown|txt)$/i.test(f.name));
            if (mdFile) {
                this.readFile(mdFile);
            }
        });

        // Save status indicator
        this.dom.input.addEventListener('input', () => {
            const statusEl = document.getElementById('save-status');
            if (statusEl) statusEl.textContent = I18n.t('saving');
        });

        // Ctrl+O para abrir arquivo
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                this.dom.mdInput.click();
            }
        });
    },

    cycleTheme(dir) {
        const allThemes = ThemeManager.getAll();
        const currentIndex = allThemes.findIndex(t => t.id === this.currentIndex);
        let newIndex = currentIndex + dir;
        if (newIndex < 0) newIndex = allThemes.length - 1;
        if (newIndex >= allThemes.length) newIndex = 0;
        this.currentIndex = allThemes[newIndex].id;
        this.dom.select.value = this.currentIndex;
        this.updatePreview();
    },

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.readFile(file);
        e.target.value = '';
    },

    readFile(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            this.dom.input.value = ev.target.result;
            this.updatePreview();
            Stats.update();
            this.showToast(`Arquivo "${file.name}" carregado.`, 'success');
        };
        reader.onerror = () => {
            this.showToast('Erro ao ler o arquivo.', 'error');
        };
        reader.readAsText(file);
    },

    insertAtCursor(text) {
        Editor.insertAtCursor(text);
    },

    insertMarkdown(prefix, suffix) {
        Editor.wrapSelection(prefix, suffix);
    },

    showToast(msg, type = 'info') {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        const icon = type === 'success' ? 'check' : type === 'error' ? 'exclamation-circle' : 'info-circle';
        el.innerHTML = `<i class="fas fa-${icon}"></i> ${msg}`;
        this.dom.toastArea.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 3500);
    },

    processSpecialBlocks(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const h1s = doc.querySelectorAll('h1');
        h1s.forEach((h1, index) => {
            if (index > 0 || h1.textContent.toLowerCase().includes('capitulo')) {
                h1.setAttribute('data-chapter', 'true');
            }
        });
        const blockquotes = doc.querySelectorAll('blockquote');
        blockquotes.forEach(bq => {
            const text = bq.textContent;
            if (text.includes('Neste capitulo') || text.includes('Neste capítulo') || text.includes('voce vai aprender') || text.includes('você vai aprender')) bq.classList.add('learning-block');
            else if (text.includes('INSIGHT') || text.includes('Insight')) bq.classList.add('insight-block');
            else if (text.includes('CUIDADO') || text.includes('Erro')) bq.classList.add('warning-block');
            else if (text.includes('PRO TIP') || text.includes('Dica')) bq.classList.add('protip-block');
            else if (text.includes('FACA AGORA') || text.includes('FAÇA AGORA') || text.includes('Exercicio') || text.includes('Exercício')) bq.classList.add('exercise-block');
        });
        return doc.body.innerHTML;
    },

    loadAccentColor() {
        const theme = ThemeManager.get(this.currentIndex);
        const colorPicker = document.getElementById('accent-color-picker');
        if (!colorPicker) return;
        try {
            const s = JSON.parse(localStorage.getItem('md2pdf_settings') || '{}');
            colorPicker.value = s.accentColor || theme.color || '#2d5a27';
        } catch {
            colorPicker.value = theme.color || '#2d5a27';
        }
    },

    updateWelcome() {
        this.dom.input.value = `# Bem-vindo ao MD2PDF Studio

> Seu editor Markdown profissional com 50 temas, exportação PDF e EPUB3.

---

## Como funciona este sistema

O MD2PDF é um editor Markdown completo que transforma seus textos em documentos PDF e EPUB3 profissionais. Tudo roda no navegador — sem instalação, sem servidor.

### Escreva em Markdown

Na barra lateral esquerda, digite seu texto usando a sintaxe Markdown. Na barra direita, você vê o resultado formatado em tempo real.

### Exporte como PDF ou EPUB

Clique no botao **PDF** para abrir as configurações de página (tamanho, margens, orientação, marca d'água) e gerar o PDF. Clique em **EPUB** para gerar um ebook formatado.

### Escolha entre 50 temas

Use o seletor de temas no topo para mudar a aparência do documento. Há temas clássicos, modernos, técnicos, criativos, elegantes, educacionais e tecnológicos.

---

## Formatação básica

Aqui estão os principais recursos de formatação do Markdown:

### Texto

Você pode usar **negrito**, *itálico*, ~~tachado~~ e \`código inline\`.

### Listas

- Primeiro item
- Segundo item
- Terceiro item

1. Primeiro passo
2. Segundo passo
3. Terceiro passo

### Tabelas

| Recurso | Descrição | Atalho |
|---------|-----------|--------|
| Negrito | Destaque forte | Ctrl+B |
| Itálico | Destaque suave | Ctrl+I |
| Link | Inserir hiperlink | Ctrl+K |
| Busca | Encontrar texto | Ctrl+F |

### Citações

> "A simplicidade é a sofisticação suprema." — Leonardo da Vinci

---

## Blocos especiais

O MD2PDF tem blocos visuais especiais que aparecem automaticamente quando você usa palavras-chave nas citações. Veja cada um:

### Bloco de Aprendizado

> Neste capítulo você vai aprender a usar todos os recursos do MD2PDF para criar documentos profissionais.

### Bloco de Insight

> INSIGHT: O Markdown é uma linguagem de formatação criada por John Gruber em 2004, projetada para ser legível tanto no formato original quanto formatado.

### Bloco de Atenção

> CUIDADO: Ao exportar PDF, verifique as margens e o tamanho da página antes de gerar. O navegador pode sobrescrever suas configurações no diálogo de impressão.

### Bloco de Dica Pro

> PRO TIP: Use Ctrl+Shift+S para gerenciar seus projetos. Você pode salvar, carregar e versionar seus documentos diretamente no navegador.

### Bloco de Exercício

> FAÇA AGORA: Tente criar um documento com todos os tipos de blocos especiais. Use a barra de ferramentas para inserir tabelas, listas e formatação.

---

## Atalhos de teclado

| Atalho | Ação |
|--------|------|
| Ctrl+B | Negrito |
| Ctrl+I | Itálico |
| Ctrl+K | Link |
| Ctrl+F | Buscar e substituir |
| Ctrl+S | Salvar automaticamente |
| Ctrl+Z | Desfazer |
| Ctrl+Y | Refazer |
| Ctrl+O | Abrir arquivo .md |
| Tab | Inserir espaços |

---

## Gerenciamento de projetos

Clique no ícone de pasta na barra de ferramentas ou pressione **Ctrl+Shift+S** para:

- Criar novos projetos
- Salvar o documento atual
- Carregar projetos salvos
- Ver histórico de versões
- Exportar projetos como JSON

---

> Dica: Experimente trocar os temas usando o seletor no topo. Cada tema tem uma personalidade visual diferente!

> PRO TIP: Para textos longos, ative o índice de capítulos no checkbox do topo. Ele gera automaticamente um sumário no EPUB.

> CUIDADO: O auto-save é ligado por padrão. Se não quiser salvar automaticamente, desligue nas configurações do navegador.
`;
    },

    updatePreview() {
        Preview.update();
    },

    setupResizeHandle() {
        const handle = document.querySelector('.resize-handle');
        if (!handle) return;

        let isResizing = false;
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const editorPane = document.querySelector('.editor-pane');
            const newWidth = (e.clientX / window.innerWidth) * 100;
            if (newWidth > 20 && newWidth < 80) {
                editorPane.style.width = newWidth + '%';
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
