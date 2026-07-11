/* ============================================
   THEME-EDITOR.JS - Editor Visual de Temas
   ============================================ */

const ThemeEditor = {
    editingTheme: null,

    showEditor(existingTheme = null) {
        this.editingTheme = existingTheme ? { ...existingTheme } : {
            id: 1000 + Date.now(),
            name: 'Novo Tema',
            group: 'Meus Temas',
            fonts: { head: "'Inter', sans-serif", body: "'Inter', sans-serif" },
            color: '#2d5a27',
            css: 'body { padding: 50px 70px; line-height: 1.8; color: #333; }\nh1 { font-size: 2.5em; margin-bottom: 30px; }\nh2 { font-size: 1.8em; margin-top: 2em; }\nblockquote { border-left: 4px solid #ccc; padding: 15px; }'
        };

        const modal = ModalManager.create({
            title: existingTheme ? I18n.t('editTheme') : I18n.t('createTheme'),
            size: 'xl',
            content: `
                <div class="theme-editor-layout">
                    <div class="theme-editor-controls">
                        <div class="form-group">
                            <label>Nome do Tema</label>
                            <input type="text" id="te-name" value="${this.editingTheme.name}">
                        </div>
                        <div class="form-group">
                            <label>Grupo</label>
                            <select id="te-group">
                                <option value="Classicos" ${this.editingTheme.group === 'Classicos' ? 'selected' : ''}>Clássicos</option>
                                <option value="Modernos" ${this.editingTheme.group === 'Modernos' ? 'selected' : ''}>Modernos</option>
                                <option value="Tecnicos" ${this.editingTheme.group === 'Tecnicos' ? 'selected' : ''}>Técnicos</option>
                                <option value="Criativos" ${this.editingTheme.group === 'Criativos' ? 'selected' : ''}>Criativos</option>
                                <option value="Dark" ${this.editingTheme.group === 'Dark' ? 'selected' : ''}>Dark</option>
                                <option value="Especiais" ${this.editingTheme.group === 'Especiais' ? 'selected' : ''}>Especiais</option>
                                <option value="Meus Temas" ${this.editingTheme.group === 'Meus Temas' ? 'selected' : ''}>Meus Temas</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Cor de Destaque</label>
                            <div class="color-input-group">
                                <input type="color" id="te-color-picker" value="${this.editingTheme.color}">
                                <input type="text" id="te-color" value="${this.editingTheme.color}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Fonte dos Títulos</label>
                            <select id="te-font-head">
                                ${this.getFontOptions(this.editingTheme.fonts.head)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Fonte do Corpo</label>
                            <select id="te-font-body">
                                ${this.getFontOptions(this.editingTheme.fonts.body)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>CSS do Tema</label>
                            <textarea id="te-css" rows="10" style="font-family: monospace; font-size: 0.85rem;">${this.editingTheme.css}</textarea>
                        </div>
                    </div>
                    <div class="theme-preview-live" id="te-preview">
                        <h1>Titulo Principal</h1>
                        <p>Este é um parágrafo de exemplo para visualizar o tema em tempo real. O texto precisa ser longo o suficiente para demonstrar a legibilidade.</p>
                        <h2>Subtitulo</h2>
                        <p>Outro parágrafo com <strong>texto em negrito</strong> e <em>itálico</em> para verificar a formatação.</p>
                        <blockquote>Uma citação de exemplo para visualizar o estilo de blockquote.</blockquote>
                        <h3>Titulo Menor</h3>
                        <p>Mais conteúdo para visualização completa do tema.</p>
                    </div>
                </div>
            `,
            buttons: [
                { text: I18n.t('cancel'), class: 'btn-secondary', action: 'close' },
                { text: I18n.t('save'), class: 'btn-primary', action: 'save' }
            ]
        });

        this.bindEditorEvents(modal);
        this.updateLivePreview(modal);
    },

    bindEditorEvents(modal) {
        const inputs = ['te-name', 'te-group', 'te-color', 'te-color-picker', 'te-font-head', 'te-font-body', 'te-css'];
        inputs.forEach(id => {
            const el = modal.querySelector(`#${id}`);
            if (el) {
                el.addEventListener('input', () => {
                    if (id === 'te-color-picker') {
                        modal.querySelector('#te-color').value = el.value;
                    } else if (id === 'te-color') {
                        modal.querySelector('#te-color-picker').value = el.value;
                    }
                    this.updateLivePreview(modal);
                });
            }
        });

        modal.querySelector('[data-action="save"]').addEventListener('click', () => {
            this.saveTheme(modal);
        });
    },

    updateLivePreview(modal) {
        const name = modal.querySelector('#te-name')?.value || 'Tema';
        const color = modal.querySelector('#te-color')?.value || '#333';
        const fontHead = modal.querySelector('#te-font-head')?.value || "'Inter', sans-serif";
        const fontBody = modal.querySelector('#te-font-body')?.value || "'Inter', sans-serif";
        const css = modal.querySelector('#te-css')?.value || '';

        const preview = modal.querySelector('#te-preview');
        if (!preview) return;

        const mappedCSS = css
            .replace(/body([\s,{:])/g, '#te-preview$1')
            .replace(/html([\s,{:])/g, '#te-preview$1');

        const fullCSS = `
            #te-preview { font-family: ${fontBody}; padding: 30px; border-radius: 8px; border: 1px solid #eee; }
            #te-preview h1, #te-preview h2, #te-preview h3 { font-family: ${fontHead}; color: ${color}; }
            ${mappedCSS}
        `;

        let styleEl = modal.querySelector('#te-preview-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'te-preview-style';
            modal.appendChild(styleEl);
        }
        styleEl.textContent = fullCSS;
    },

    saveTheme(modal) {
        const theme = {
            id: this.editingTheme.id,
            name: modal.querySelector('#te-name').value || 'Tema Sem Nome',
            group: modal.querySelector('#te-group').value || 'Meus Temas',
            color: modal.querySelector('#te-color').value || '#333',
            fonts: {
                head: modal.querySelector('#te-font-head').value,
                body: modal.querySelector('#te-font-body').value
            },
            css: modal.querySelector('#te-css').value
        };

        ThemeManager.saveUserTheme(theme);
        ModalManager.close(modal);
        App.populateThemes();
        App.showToast(`Tema "${theme.name}" salvo`, 'success');
    },

    getFontOptions(selected) {
        const fonts = [
            "'Inter', sans-serif", "'Lato', sans-serif", "'Montserrat', sans-serif",
            "'Poppins', sans-serif", "'Raleway', sans-serif", "'Oswald', sans-serif",
            "'Josefin Sans', sans-serif", "'Bebas Neue', sans-serif",
            "'Roboto Mono', monospace",
            "'EB Garamond', serif", "'Cinzel', serif", "'Cormorant Garamond', serif",
            "'Crimson Text', serif", "'Lora', serif", "'Merriweather', serif",
            "'Playfair Display', serif", "'Source Serif 4', serif", "'Spectral', serif",
            "'Libre Baskerville', serif", "'Noto Serif', serif", "'PT Serif', serif",
            "'Bodoni Moda', serif", "'Neuton', serif"
        ];
        return fonts.map(f => `<option value="${f}" ${f === selected ? 'selected' : ''}>${f.split("'")[1] || f}</option>`).join('');
    }
};
