/* ============================================
   STORAGE.JS - Persistência LocalStorage
   ============================================ */

const Storage = {
    PREFIX: 'md2pdf_',

    save(key, value) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Storage save failed:', e);
            return false;
        }
    },

    load(key) {
        try {
            const data = localStorage.getItem(this.PREFIX + key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('Storage load failed:', e);
            return null;
        }
    },

    remove(key) {
        localStorage.removeItem(this.PREFIX + key);
    },

    clear() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.PREFIX));
        keys.forEach(k => localStorage.removeItem(k));
    },

    getUsage() {
        let total = 0;
        Object.keys(localStorage)
            .filter(k => k.startsWith(this.PREFIX))
            .forEach(k => {
                total += localStorage.getItem(k).length * 2;
            });
        return total;
    },

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
};

// P12 (security-2026-10-02c): o nome de projeto vira chave do objeto
// `projects` e é gravado no localStorage. Chaves do protótipo
// ('__proto__', 'constructor', 'prototype') resolvem para
// Object.prototype em projects['nome'] — um importProject com
// name:"__proto__" passava a validação e o saveProject setava
// Object.prototype.updated/current antes do TypeError em .versions
// abortar (poluição de protótipo). Rejeitadas na fronteira, junto do
// charset/tamanho.
const PROTOTYPE_KEY_RE = /^(?:__proto__|constructor|prototype)$/;

const ProjectManager = {
    KEY: 'projects',
    MAX_VERSIONS: 20,
    MAX_NAME_LENGTH: 100,

    // Fronteira defensiva (P10/S3, princípio 14): nome de projeto entra por
    // prompt() e por JSON importado (terceiros). O nome vira chave do
    // localStorage e é renderizado no modal de projetos — não pode carregar
    // delimitadores de HTML/atributo (< > " ' &) nem tamanho arbitrário.
    sanitizeProjectName(name) {
        if (typeof name !== 'string') return null;
        const clean = name.replace(/[<>"'&]/g, '').trim();
        if (!clean) return null;
        if (PROTOTYPE_KEY_RE.test(clean)) return null; // P12 — round-trip do export
        return clean.slice(0, this.MAX_NAME_LENGTH);
    },

    // O nome tem de já estar na forma que o produto aceita (round-trip do
    // export). Sem "corrigir silenciosamente" o que veio de terceiros.
    isValidProjectName(name) {
        if (typeof name !== 'string') return false;
        const trimmed = name.trim();
        if (!trimmed || trimmed.length > this.MAX_NAME_LENGTH) return false;
        if (PROTOTYPE_KEY_RE.test(trimmed)) return false; // P12
        return !/[<>"'&]/.test(trimmed);
    },

    getAll() {
        return Storage.load(this.KEY) || {};
    },

    get(name) {
        const projects = this.getAll();
        return projects[name] || null;
    },

    saveProject(name, data) {
        if (!this.isValidProjectName(name)) return false;
        if (!data || typeof data !== 'object' || typeof data.markdown !== 'string') return false;
        const projects = this.getAll();
        const now = new Date().toISOString();
        if (!projects[name]) {
            projects[name] = { created: now, versions: [] };
        }
        projects[name].updated = now;
        projects[name].current = data;
        projects[name].versions.unshift({
            timestamp: now,
            content: data.markdown,
            theme: data.themeId,
            size: data.markdown.length
        });
        if (projects[name].versions.length > this.MAX_VERSIONS) {
            projects[name].versions = projects[name].versions.slice(0, this.MAX_VERSIONS);
        }
        Storage.save(this.KEY, projects);
        return true;
    },

    deleteProject(name) {
        const projects = this.getAll();
        delete projects[name];
        Storage.save(this.KEY, projects);
    },

    renameProject(oldName, newName) {
        const projects = this.getAll();
        if (projects[oldName] && this.isValidProjectName(newName)) {
            projects[newName] = projects[oldName];
            delete projects[oldName];
            Storage.save(this.KEY, projects);
        }
    },

    getVersions(name) {
        const project = this.get(name);
        return project ? project.versions : [];
    },

    restoreVersion(name, index) {
        const project = this.get(name);
        if (project && project.versions[index]) {
            return project.versions[index];
        }
        return null;
    },

    exportProject(name) {
        const project = this.get(name);
        if (!project) return null;
        return JSON.stringify({ name, ...project }, null, 2);
    },

    // P10/S3: JSON arbitrário (arquivo de terceiro) — valida estrutura antes
    // de gravar. O formato real do produto é data.current = { markdown,
    // themeId } (objeto, não string); o nome tem de ser a forma que o
    // produto aceitaria (round-trip do export) — payload hostil é REJEITADO,
    // não silenciosamente alterado.
    importProject(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data || typeof data !== 'object') return false;
            if (typeof data.name !== 'string' || !this.isValidProjectName(data.name)) return false;
            if (!data.current || typeof data.current !== 'object') return false;
            if (typeof data.current.markdown !== 'string') return false;
            if (data.current.themeId !== undefined && typeof data.current.themeId !== 'number') return false;
            return this.saveProject(data.name, {
                markdown: data.current.markdown,
                themeId: data.current.themeId
            });
        } catch (e) {
            return false;
        }
    },

    listNames() {
        return Object.keys(this.getAll()).sort((a, b) => {
            const projA = this.getAll()[a];
            const projB = this.getAll()[b];
            return new Date(projB.updated) - new Date(projA.updated);
        });
    }
};

const AutoSave = {
    timer: null,
    INTERVAL: 30000,
    enabled: true,

    init() {
        this.enabled = Storage.load('autoSaveEnabled') !== false;
    },

    start() {
        this.stop();
        if (!this.enabled) return;
        this.timer = setInterval(() => {
            this.save();
        }, this.INTERVAL);
    },

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    save() {
        const state = {
            markdown: App?.dom?.input?.value || '',
            themeId: App?.currentIndex || 0,
            tocEnabled: App?.dom?.tocCheck?.checked ?? true,
            timestamp: new Date().toISOString()
        };
        Storage.save('autosave', state);
    },

    restore() {
        const state = Storage.load('autosave');
        if (state) {
            if (state.markdown && App?.dom?.input) {
                App.dom.input.value = state.markdown;
            }
            if (state.themeId !== undefined) {
                App.currentIndex = state.themeId;
                if (App.dom?.select) App.dom.select.value = state.themeId;
            }
            if (state.tocEnabled !== undefined && App?.dom?.tocCheck) {
                App.dom.tocCheck.checked = state.tocEnabled;
            }
            return true;
        }
        return false;
    },

    toggle() {
        this.enabled = !this.enabled;
        Storage.save('autoSaveEnabled', this.enabled);
        if (this.enabled) this.start();
        else this.stop();
    }
};
