/* ============================================
   PREVIEW.JS - Renderização do Preview
   ============================================ */

const Preview = {
    debounceTimer: null,
    DEBOUNCE_DELAY: 150,
    fontLinkEl: null,

    init() {
        this.styleEl = document.createElement('style');
        this.styleEl.id = 'dynamic-book-theme';
        document.head.appendChild(this.styleEl);

        this.fontLinkEl = document.createElement('link');
        this.fontLinkEl.rel = 'stylesheet';
        this.fontLinkEl.id = 'dynamic-font-link';
        document.head.appendChild(this.fontLinkEl);
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
