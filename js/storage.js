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

const ProjectManager = {
    KEY: 'projects',
    MAX_VERSIONS: 20,

    getAll() {
        return Storage.load(this.KEY) || {};
    },

    get(name) {
        const projects = this.getAll();
        return projects[name] || null;
    },

    saveProject(name, data) {
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
    },

    deleteProject(name) {
        const projects = this.getAll();
        delete projects[name];
        Storage.save(this.KEY, projects);
    },

    renameProject(oldName, newName) {
        const projects = this.getAll();
        if (projects[oldName]) {
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

    importProject(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.name && data.current) {
                this.saveProject(data.name, data.current);
                return true;
            }
            return false;
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
