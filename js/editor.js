/* ============================================
   EDITOR.JS - Lógica do Editor Avançado
   ============================================ */

const Editor = {
    undoStack: [],
    redoStack: [],
    maxUndo: 50,

    init() {
        this.setupToolbar();
        this.setupKeyboardShortcuts();
        this.setupTabSupport();
        this.setupAutoSaveShortcut();
    },

    setupToolbar() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                this.executeAction(action);
            });
        });
    },

    executeAction(action) {
        switch (action) {
            case 'heading': this.insertHeading(); break;
            case 'bold': this.wrapSelection('**', '**'); break;
            case 'italic': this.wrapSelection('*', '*'); break;
            case 'strikethrough': this.wrapSelection('~~', '~~'); break;
            case 'code': this.wrapSelection('`', '`'); break;
            case 'codeblock': this.insertCodeBlock(); break;
            case 'quote': this.insertLinePrefix('> '); break;
            case 'ul': this.insertLinePrefix('- '); break;
            case 'ol': this.insertLinePrefix('1. '); break;
            case 'link': this.insertLink(); break;
            case 'table': this.insertTable(); break;
            case 'hr': this.insertAtCursor('\n---\n'); break;
            case 'pagebreak': this.insertAtCursor('\n\n---\n\n'); break;
            case 'footnote': this.insertFootnote(); break;
            case 'undo': this.undo(); break;
            case 'redo': this.redo(); break;
            case 'stats': Stats.showStatsModal(); break;
            case 'find': FindReplace.toggle(); break;
            case 'template': Templates.showSelector(); break;
            case 'cover': Templates.showCoverEditor(); break;
            case 'theme-editor': ThemeEditor.showEditor(); break;
            case 'theme-editor-create': ThemeEditor.showEditor(); break;
            case 'pdf-settings': PDFGenerator.showSettings(); break;
            case 'projects': this.showProjectManager(); break;
            case 'shortcuts': this.showShortcutsModal(); break;
            case 'fullscreen': this.toggleFullscreenPreview(); break;
            case 'versions': this.showVersionHistory(); break;
            case 'language': this.cycleLanguage(); break;
        }
    },

    insertHeading() {
        const input = App.dom.input;
        const start = input.selectionStart;
        const lineStart = input.value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = input.value.indexOf('\n', start);
        const line = input.value.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);

        let prefix = '## ';
        if (line.startsWith('### ')) { prefix = ''; }
        else if (line.startsWith('## ')) { prefix = '### '; }
        else if (line.startsWith('# ')) { prefix = '## '; }

        input.setSelectionRange(lineStart, lineEnd === -1 ? input.value.length : lineEnd);
        this.wrapSelection(prefix, '');
    },

    wrapSelection(prefix, suffix) {
        const input = App.dom.input;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const selected = input.value.substring(start, end);

        this.saveState();

        if (selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length > prefix.length + suffix.length) {
            input.value = input.value.substring(0, start) + selected.slice(prefix.length, -suffix.length) + input.value.substring(end);
            input.setSelectionRange(start, end - prefix.length - suffix.length);
        } else {
            input.value = input.value.substring(0, start) + prefix + selected + suffix + input.value.substring(end);
            input.setSelectionRange(start + prefix.length, end + prefix.length);
        }

        input.focus();
        App.updatePreview();
        Stats.update();
    },

    insertLinePrefix(prefix) {
        const input = App.dom.input;
        const start = input.selectionStart;
        const lineStart = input.value.lastIndexOf('\n', start - 1) + 1;

        this.saveState();
        input.value = input.value.substring(0, lineStart) + prefix + input.value.substring(lineStart);
        input.setSelectionRange(start + prefix.length, start + prefix.length);
        input.focus();
        App.updatePreview();
        Stats.update();
    },

    insertCodeBlock() {
        const input = App.dom.input;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const selected = input.value.substring(start, end);

        this.saveState();
        const block = selected ? `\n\`\`\`\n${selected}\n\`\`\`\n` : '\n```\n\n```\n';
        input.value = input.value.substring(0, start) + block + input.value.substring(end);

        if (!selected) {
            input.setSelectionRange(start + 5, start + 5);
        }
        input.focus();
        App.updatePreview();
    },

    insertLink() {
        const input = App.dom.input;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const selected = input.value.substring(start, end);

        this.saveState();
        const link = selected ? `[${selected}](url)` : `[texto do link](url)`;
        input.value = input.value.substring(0, start) + link + input.value.substring(end);

        if (!selected) {
            input.setSelectionRange(start + 1, start + 13);
        } else {
            input.setSelectionRange(end + 3, end + 3 + 3);
        }
        input.focus();
        App.updatePreview();
    },

    insertTable() {
        const table = `\n| Coluna 1 | Coluna 2 | Coluna 3 |\n|----------|----------|----------|\n| Item 1   | Item 2   | Item 3   |\n| Item 4   | Item 5   | Item 6   |\n`;
        this.insertAtCursor(table);
    },

    insertFootnote() {
        const input = App.dom.input;
        const text = input.value;
        const footnoteCount = (text.match(/^\[\d+\]/gm) || []).length + 1;
        this.insertAtCursor(`[^${footnoteCount}]`);
        const footerText = `\n[^${footnoteCount}]: Nota de rodapé aqui.`;
        input.value += footerText;
        App.updatePreview();
    },

    insertAtCursor(text) {
        this.saveState();
        const input = App.dom.input;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.substring(0, start) + text + input.value.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + text.length;
        App.updatePreview();
        Stats.update();
    },

    setupKeyboardShortcuts() {
        App.dom.input.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                switch (e.key) {
                    case 'b': e.preventDefault(); this.executeAction('bold'); break;
                    case 'i': e.preventDefault(); this.executeAction('italic'); break;
                    case 'k': e.preventDefault(); this.executeAction('link'); break;
                    case 'z': e.preventDefault(); this.undo(); break;
                    case 'y': e.preventDefault(); this.redo(); break;
                    case 's': e.preventDefault(); AutoSave.save(); App.showToast(I18n.t('saved'), 'success'); break;
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                switch (e.key) {
                    case 'Z': e.preventDefault(); this.redo(); break;
                    case 'K': e.preventDefault(); this.executeAction('strikethrough'); break;
                }
            }
        });
    },

    setupTabSupport() {
        App.dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = App.dom.input.selectionStart;
                const end = App.dom.input.selectionEnd;
                App.dom.input.value = App.dom.input.value.substring(0, start) + '    ' + App.dom.input.value.substring(end);
                App.dom.input.selectionStart = App.dom.input.selectionEnd = start + 4;
                App.updatePreview();
            }
        });
    },

    setupAutoSaveShortcut() {
        // Ctrl+Shift+S for explicit save
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.showProjectManager();
            }
        });
    },

    saveState() {
        this.undoStack.push(App.dom.input.value);
        if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
        this.redoStack = [];
    },

    undo() {
        if (this.undoStack.length === 0) return;
        this.redoStack.push(App.dom.input.value);
        App.dom.input.value = this.undoStack.pop();
        App.updatePreview();
        Stats.update();
    },

    redo() {
        if (this.redoStack.length === 0) return;
        this.undoStack.push(App.dom.input.value);
        App.dom.input.value = this.redoStack.pop();
        App.updatePreview();
        Stats.update();
    },

    showProjectManager() {
        const projects = ProjectManager.listNames();
        const modal = ModalManager.create({
            title: I18n.t('projects'),
            size: 'md',
            content: `
                <div style="margin-bottom: 12px;">
                    <button class="btn btn-primary btn-sm" id="pm-new"><i class="fas fa-plus"></i> ${I18n.t('newProject')}</button>
                    <button class="btn btn-secondary btn-sm" id="pm-import"><i class="fas fa-upload"></i> ${I18n.t('importProject')}</button>
                    <button class="btn btn-secondary btn-sm" id="pm-export-current"><i class="fas fa-download"></i> ${I18n.t('exportProject')}</button>
                </div>
                <div class="form-group">
                    <input type="text" id="pm-search" placeholder="Buscar projetos...">
                </div>
                <ul class="project-list" id="pm-list">
                    ${projects.length === 0 ? '<li style="text-align:center; color:#999; padding:20px;">Nenhum projeto salvo</li>' :
                    projects.map(name => {
                        const proj = ProjectManager.get(name);
                        const date = proj.updated ? new Date(proj.updated).toLocaleDateString('pt-BR') : '';
                        return `
                        <li class="project-item" data-project="${name}">
                            <div class="project-info">
                                <div class="project-name">${name}</div>
                                <div class="project-meta">${date} — ${proj.versions?.length || 0} versões</div>
                            </div>
                            <div class="project-actions">
                                <button class="btn btn-sm btn-secondary pm-load" data-name="${name}" title="Carregar"><i class="fas fa-folder-open"></i></button>
                                <button class="btn btn-sm btn-secondary pm-versions" data-name="${name}" title="Versões"><i class="fas fa-history"></i></button>
                                <button class="btn btn-sm btn-danger pm-delete" data-name="${name}" title="Excluir"><i class="fas fa-trash"></i></button>
                            </div>
                        </li>`;
                    }).join('')}
                </ul>
            `,
            buttons: [
                { text: I18n.t('close'), class: 'btn-secondary', action: 'close' }
            ]
        });

        // New project
        modal.querySelector('#pm-new')?.addEventListener('click', () => {
            const name = prompt('Nome do novo projeto:');
            if (name) {
                ProjectManager.saveProject(name, {
                    markdown: App.dom.input.value,
                    themeId: App.currentIndex
                });
                ModalManager.close(modal);
                App.showToast(`Projeto "${name}" salvo`, 'success');
            }
        });

        // Import
        modal.querySelector('#pm-import')?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (ProjectManager.importProject(ev.target.result)) {
                        ModalManager.close(modal);
                        App.showToast('Projeto importado', 'success');
                        this.showProjectManager();
                    } else {
                        App.showToast('Erro ao importar', 'error');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });

        // Export current
        modal.querySelector('#pm-export-current')?.addEventListener('click', () => {
            const name = prompt('Nome para exportação:', 'Meu Projeto');
            if (name) {
                const data = ProjectManager.exportProject(name) || JSON.stringify({
                    name,
                    current: { markdown: App.dom.input.value, themeId: App.currentIndex }
                }, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                saveAs(blob, `${name}.json`);
                App.showToast('Projeto exportado', 'success');
            }
        });

        // Load project
        modal.querySelectorAll('.pm-load').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = btn.dataset.name;
                const proj = ProjectManager.get(name);
                if (proj && proj.current) {
                    App.dom.input.value = proj.current.markdown || '';
                    App.currentIndex = proj.current.themeId || 0;
                    App.dom.select.value = App.currentIndex;
                    App.updatePreview();
                    Stats.update();
                    ModalManager.close(modal);
                    App.showToast(`Projeto "${name}" carregado`, 'success');
                }
            });
        });

        // Versions
        modal.querySelectorAll('.pm-versions').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                ModalManager.close(modal);
                this.showVersionHistory(btn.dataset.name);
            });
        });

        // Delete
        modal.querySelectorAll('.pm-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Excluir projeto "${btn.dataset.name}"?`)) {
                    ProjectManager.deleteProject(btn.dataset.name);
                    ModalManager.close(modal);
                    App.showToast('Projeto excluído', 'success');
                    this.showProjectManager();
                }
            });
        });

        // Search
        modal.querySelector('#pm-search')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            modal.querySelectorAll('.project-item').forEach(item => {
                const name = item.dataset.project.toLowerCase();
                item.style.display = name.includes(query) ? '' : 'none';
            });
        });
    },

    showVersionHistory(projectName) {
        const versions = projectName ? ProjectManager.getVersions(projectName) : [];
        const autoSaveVersion = Storage.load('autosave');

        const modal = ModalManager.create({
            title: I18n.t('versionHistory'),
            size: 'md',
            content: `
                ${autoSaveVersion ? `
                    <div class="version-item current">
                        <div>
                            <strong>Auto-save</strong>
                            <div class="version-time">${new Date(autoSaveVersion.timestamp).toLocaleString('pt-BR')}</div>
                        </div>
                        <button class="btn btn-sm btn-primary vs-restore-auto">Restaurar</button>
                    </div>
                ` : ''}
                <ul class="version-list">
                    ${versions.length === 0 ? '<li style="text-align:center; color:#999; padding:20px;">Nenhuma versão salva</li>' :
                    versions.map((v, i) => `
                        <li class="version-item">
                            <div>
                                <strong>Versão ${versions.length - i}</strong>
                                <div class="version-time">${new Date(v.timestamp).toLocaleString('pt-BR')}</div>
                                <div class="version-size">${(v.size || 0).toLocaleString()} caracteres</div>
                            </div>
                            <button class="btn btn-sm btn-secondary vs-restore" data-index="${i}">${I18n.t('restoreVersion')}</button>
                        </li>
                    `).join('')}
                </ul>
            `,
            buttons: [
                { text: I18n.t('close'), class: 'btn-secondary', action: 'close' }
            ]
        });

        modal.querySelector('.vs-restore-auto')?.addEventListener('click', () => {
            AutoSave.restore();
            App.updatePreview();
            Stats.update();
            ModalManager.close(modal);
            App.showToast('Auto-save restaurado', 'success');
        });

        modal.querySelectorAll('.vs-restore').forEach(btn => {
            btn.addEventListener('click', () => {
                const version = ProjectManager.restoreVersion(projectName, parseInt(btn.dataset.index));
                if (version) {
                    App.dom.input.value = version.content;
                    if (version.theme !== undefined) {
                        App.currentIndex = version.theme;
                        App.dom.select.value = version.theme;
                    }
                    App.updatePreview();
                    Stats.update();
                    ModalManager.close(modal);
                    App.showToast('Versão restaurada', 'success');
                }
            });
        });
    },

    showShortcutsModal() {
        ModalManager.create({
            title: I18n.t('keyboardShortcuts'),
            size: 'lg',
            content: `
                <div class="shortcuts-grid">
                    <div class="shortcut-item"><span class="shortcut-desc">Negrito</span><kbd>Ctrl+B</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Itálico</span><kbd>Ctrl+I</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Link</span><kbd>Ctrl+K</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Tachado</span><kbd>Ctrl+Shift+K</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Desfazer</span><kbd>Ctrl+Z</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Refazer</span><kbd>Ctrl+Y</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Salvar</span><kbd>Ctrl+S</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Buscar</span><kbd>Ctrl+F</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Buscar e Substituir</span><kbd>Ctrl+H</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Projetos</span><kbd>Ctrl+Shift+S</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Tab (indentar)</span><kbd>Tab</kbd></div>
                    <div class="shortcut-item"><span class="shortcut-desc">Fechar modal/barra</span><kbd>Esc</kbd></div>
                </div>
            `,
            buttons: [
                { text: I18n.t('close'), class: 'btn-secondary', action: 'close' }
            ]
        });
    },

    toggleFullscreenPreview() {
        const preview = document.querySelector('.preview-pane');
        preview.classList.toggle('fullscreen');
        const btn = document.querySelector('[data-action="fullscreen"]');
        if (btn) {
            btn.classList.toggle('active');
            btn.title = preview.classList.contains('fullscreen') ? I18n.t('exitFullscreen') : I18n.t('fullscreen');
        }
    },

    cycleLanguage() {
        const langs = ['pt-BR', 'en', 'es'];
        const current = langs.indexOf(I18n.currentLang);
        const next = (current + 1) % langs.length;
        I18n.setLang(langs[next]);
        App.showToast(`Idioma: ${langs[next]}`, 'info');
    }
};
