/* ============================================
   STATS.JS - Estatísticas e Contadores
   ============================================ */

const Stats = {
    update() {
        const text = App?.dom?.input?.value || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        const charsNoSpaces = text.replace(/\s/g, '').length;
        const lines = text.split('\n').length;
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
        const readingTime = Math.max(1, Math.ceil(words / 200));

        this.updateDisplay(words, chars, charsNoSpaces, lines, paragraphs, readingTime);
        this.updateStatusBar(words, chars, lines, readingTime);
    },

    updateDisplay(words, chars, charsNoSpaces, lines, paragraphs, readingTime) {
        const el = document.getElementById('stats-display');
        if (!el) return;
        el.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${words.toLocaleString()}</span>
                    <span class="stat-label">${I18n.t('wordCount')}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${chars.toLocaleString()}</span>
                    <span class="stat-label">${I18n.t('charCount')}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${charsNoSpaces.toLocaleString()}</span>
                    <span class="stat-label">${I18n.t('charCount')} (sem espaço)</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${lines.toLocaleString()}</span>
                    <span class="stat-label">${I18n.t('lineCount')}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${paragraphs.toLocaleString()}</span>
                    <span class="stat-label">${I18n.t('paragraphCount')}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">~${readingTime}</span>
                    <span class="stat-label">${I18n.t('readingTime')}</span>
                </div>
            </div>
        `;
    },

    updateStatusBar(words, chars, lines, readingTime) {
        const el = document.getElementById('status-stats');
        if (el) {
            el.innerHTML = `
                <span><i class="fas fa-font"></i> ${words} ${I18n.t('wordCount')}</span>
                <span><i class="fas fa-text-width"></i> ${chars} ${I18n.t('charCount')}</span>
                <span><i class="fas fa-align-left"></i> ${lines} ${I18n.t('lineCount')}</span>
                <span><i class="fas fa-clock"></i> ~${readingTime} min</span>
            `;
        }
    },

    showStatsModal() {
        const text = App?.dom?.input?.value || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        const charsNoSpaces = text.replace(/\s/g, '').length;
        const lines = text.split('\n').length;
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
        const readingTime = Math.max(1, Math.ceil(words / 200));
        const speakingTime = Math.max(1, Math.ceil(words / 130));

        ModalManager.create({
            title: I18n.t('stats'),
            size: 'sm',
            content: `
                <div class="stats-grid">
                    <div class="stat-item"><span class="stat-value">${words.toLocaleString()}</span><span class="stat-label">${I18n.t('wordCount')}</span></div>
                    <div class="stat-item"><span class="stat-value">${chars.toLocaleString()}</span><span class="stat-label">${I18n.t('charCount')}</span></div>
                    <div class="stat-item"><span class="stat-value">${charsNoSpaces.toLocaleString()}</span><span class="stat-label">Caracteres (sem espaço)</span></div>
                    <div class="stat-item"><span class="stat-value">${lines.toLocaleString()}</span><span class="stat-label">${I18n.t('lineCount')}</span></div>
                    <div class="stat-item"><span class="stat-value">${paragraphs.toLocaleString()}</span><span class="stat-label">${I18n.t('paragraphCount')}</span></div>
                    <div class="stat-item"><span class="stat-value">${sentences.toLocaleString()}</span><span class="stat-label">Frases</span></div>
                    <div class="stat-item"><span class="stat-value">~${readingTime} min</span><span class="stat-label">Tempo de Leitura</span></div>
                    <div class="stat-item"><span class="stat-value">~${speakingTime} min</span><span class="stat-label">Tempo de Fala</span></div>
                </div>
            `,
            buttons: [
                { text: I18n.t('close'), class: 'btn-secondary', action: 'close' }
            ]
        });
    }
};

// CSS para stats grid (injetado uma vez)
const statsStyle = document.createElement('style');
statsStyle.textContent = `
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .stat-item { text-align: center; padding: 12px; background: var(--bg-toolbar); border-radius: var(--radius-md); }
    .stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: var(--accent); }
    .stat-label { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }
`;
document.head.appendChild(statsStyle);
