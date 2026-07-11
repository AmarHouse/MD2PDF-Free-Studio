/* ============================================
   PREVIEW.JS - Renderização do Preview
   ============================================ */

const Preview = {
    debounceTimer: null,
    DEBOUNCE_DELAY: 150,
    fontLinkEl: null,
    syncing: false,

    init() {
        this.styleEl = document.createElement('style');
        this.styleEl.id = 'dynamic-book-theme';
        document.head.appendChild(this.styleEl);

        this.fontLinkEl = document.createElement('link');
        this.fontLinkEl.rel = 'stylesheet';
        this.fontLinkEl.id = 'dynamic-font-link';
        document.head.appendChild(this.fontLinkEl);

        this.initScrollSync();
    },

    initScrollSync() {
        const editorInput = document.getElementById('markdown-input');
        const previewPane = document.querySelector('.preview-pane');
        if (!editorInput || !previewPane) return;
        if (window.innerWidth <= 480) return; // desliga sync em modo tab mobile

        let ticking = false;

        editorInput.addEventListener('scroll', () => {
            if (this.syncing) return;
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.syncing = true;
                    const maxE = editorInput.scrollHeight - editorInput.clientHeight;
                    const maxP = previewPane.scrollHeight - previewPane.clientHeight;
                    if (maxE > 0) {
                        previewPane.scrollTop = (editorInput.scrollTop / maxE) * maxP;
                    }
                    this.syncing = false;
                    ticking = false;
                });
                ticking = true;
            }
        });

        previewPane.addEventListener('scroll', () => {
            if (this.syncing) return;
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.syncing = true;
                    const maxP = previewPane.scrollHeight - previewPane.clientHeight;
                    const maxE = editorInput.scrollHeight - editorInput.clientHeight;
                    if (maxP > 0) {
                        editorInput.scrollTop = (previewPane.scrollTop / maxP) * maxE;
                    }
                    this.syncing = false;
                    ticking = false;
                });
                ticking = true;
            }
        });
    },

    loadThemeFonts(theme) {
        const href = getGoogleFontsLink(theme.fonts.head, theme.fonts.body);
        if (href) {
            const link = href.match(/href="([^"]+)"/);
            if (link && link[1]) {
                this.fontLinkEl.href = link[1];
            }
        }
    },

    update() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.render();
        }, this.DEBOUNCE_DELAY);
    },

    render() {
        const text = App.dom.input.value;
        const theme = ThemeManager.get(App.currentIndex);

        this.loadThemeFonts(theme);

        marked.setOptions({ breaks: true, gfm: true });
        let html = marked.parse(text);
        html = App.processSpecialBlocks(html);
        App.dom.preview.innerHTML = html;

        const fullCSS = ThemeManager.buildThemeCSS(theme);
        this.styleEl.innerHTML = fullCSS;
    },

    renderSync() {
        clearTimeout(this.debounceTimer);
        const text = App.dom.input.value;
        const theme = ThemeManager.get(App.currentIndex);

        this.loadThemeFonts(theme);

        marked.setOptions({ breaks: true, gfm: true });
        let html = marked.parse(text);
        html = App.processSpecialBlocks(html);
        App.dom.preview.innerHTML = html;

        const fullCSS = ThemeManager.buildThemeCSS(theme);
        this.styleEl.innerHTML = fullCSS;
    }
};
