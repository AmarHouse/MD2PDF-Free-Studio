/* ============================================
   FIND-REPLACE.JS - Busca e Substituição
   ============================================ */

const FindReplace = {
    active: false,
    matches: [],
    currentIndex: -1,

    init() {
        this.bindShortcuts();
    },

    bindShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.toggle();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                this.toggle(true);
            }
            if (e.key === 'Escape' && this.active) {
                this.close();
            }
        });
    },

    toggle(showReplace = false) {
        if (this.active) {
            this.close();
            return;
        }
        this.active = true;
        const bar = document.getElementById('find-replace-bar');
        if (bar) {
            bar.classList.remove('hidden');
            bar.querySelector('#find-input').focus();
            if (showReplace) {
                bar.querySelector('.replace-row')?.classList.remove('hidden');
            }
        }
    },

    close() {
        this.active = false;
        this.matches = [];
        this.currentIndex = -1;
        const bar = document.getElementById('find-replace-bar');
        if (bar) {
            bar.classList.add('hidden');
            this.clearHighlights();
        }
    },

    find() {
        const input = document.getElementById('find-input');
        const textarea = App.dom.input;
        const query = input?.value;
        if (!query || !textarea) return;

        const matchCase = document.getElementById('find-match-case')?.checked;
        const wholeWord = document.getElementById('find-whole-word')?.checked;
        const useRegex = document.getElementById('find-regex')?.checked;

        this.clearHighlights();
        this.matches = [];
        this.currentIndex = -1;

        let text = textarea.value;
        let regex;

        try {
            let pattern = query;
            if (!useRegex) pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (wholeWord) pattern = `\\b${pattern}\\b`;
            regex = new RegExp(pattern, matchCase ? 'g' : 'gi');
        } catch {
            return;
        }

        let match;
        while ((match = regex.exec(text)) !== null) {
            this.matches.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
        }

        this.updateInfo();
        if (this.matches.length > 0) {
            this.goToMatch(0);
        }
    },

    goToMatch(index) {
        if (index < 0 || index >= this.matches.length) return;
        this.currentIndex = index;
        const match = this.matches[index];
        const textarea = App.dom.input;
        textarea.focus();
        textarea.setSelectionRange(match.start, match.end);
        this.updateInfo();
    },

    findNext() {
        if (this.matches.length === 0) return;
        const next = (this.currentIndex + 1) % this.matches.length;
        this.goToMatch(next);
    },

    findPrev() {
        if (this.matches.length === 0) return;
        const prev = (this.currentIndex - 1 + this.matches.length) % this.matches.length;
        this.goToMatch(prev);
    },

    replace() {
        if (this.currentIndex < 0 || this.currentIndex >= this.matches.length) return;
        const replaceInput = document.getElementById('replace-input');
        const replacement = replaceInput?.value || '';
        const match = this.matches[this.currentIndex];
        const textarea = App.dom.input;

        textarea.value = textarea.value.substring(0, match.start) + replacement + textarea.value.substring(match.end);
        App.updatePreview();
        this.find();
        if (this.currentIndex >= this.matches.length) this.currentIndex = 0;
        if (this.matches.length > 0) this.goToMatch(this.currentIndex);
    },

    replaceAll() {
        const findInput = document.getElementById('find-input');
        const replaceInput = document.getElementById('replace-input');
        const query = findInput?.value;
        const replacement = replaceInput?.value || '';
        if (!query) return;

        const matchCase = document.getElementById('find-match-case')?.checked;
        const wholeWord = document.getElementById('find-whole-word')?.checked;
        const useRegex = document.getElementById('find-regex')?.checked;

        let pattern = query;
        if (!useRegex) pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (wholeWord) pattern = `\\b${pattern}\\b`;

        try {
            const regex = new RegExp(pattern, matchCase ? 'g' : 'gi');
            App.dom.input.value = App.dom.input.value.replace(regex, replacement);
            App.updatePreview();
            this.find();
            App.showToast(`${this.matches.length} ${I18n.t('matchesFound')}`, 'success');
        } catch {
            return;
        }
    },

    updateInfo() {
        const info = document.getElementById('find-info');
        if (info) {
            if (this.matches.length === 0) {
                info.textContent = document.getElementById('find-input')?.value ? '0 / 0' : '';
            } else {
                info.textContent = `${this.currentIndex + 1} / ${this.matches.length}`;
            }
        }
    },

    clearHighlights() {
        // No textarea highlights needed - we use selectionRange
    }
};
