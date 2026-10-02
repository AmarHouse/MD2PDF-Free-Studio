/* ============================================
   PDF-GENERATOR.JS - Exportação PDF Profissional
   ============================================ */

const PDFGenerator = {
    defaultSettings: {
        pageSize: 'a4',
        orientation: 'portrait',
        marginTop: 25,
        marginBottom: 25,
        marginLeft: 30,
        marginRight: 25,
        watermark: '',
        watermarkOpacity: 0.1,
        watermarkSize: 48,
        watermarkRotation: -45,
        showPageNumbers: true,
        pageNumberPosition: 'bottom-center'
    },

    // Regioes de margin box do CSS Paged Media L3. Cada posicao so e
    // exposta na UI depois de verificada no Chromium: o suporte a margin
    // boxes e nativo desde a v131, mas Firefox e Safari tem suporte
    // parcial (limitacao registrada em ADR-001 e docs/PRINT-PROFILE.md).
    pageNumberPositions: {
        'top-left': '@top-left',
        'top-center': '@top-center',
        'top-right': '@top-right',
        'bottom-left': '@bottom-left',
        'bottom-center': '@bottom-center',
        'bottom-right': '@bottom-right'
    },

    settings: {},

    // Fronteira defensiva (S4/classe P7, princípio 14): os settings vêm de
    // JSON (localStorage) e são interpolados no CSS do documento de
    // impressão (margens, rotação/tamanho/opacidade da marca d'água) e em
    // value="..." do modal. Coage numéricos (string hostil de um JSON
    // adulterado cairia no default), sanitiza a marca d'água e valida a
    // posição do número de página.
    init() {
        const loaded = Storage.load('pdfSettings') || {};
        const num = (v, d) => {
            if (v === null || v === undefined) return d;
            if (typeof v === 'string' && v.trim() === '') return d;
            const n = Number(v);
            return Number.isFinite(n) ? n : d;
        };
        this.settings = { ...this.defaultSettings };
        this.settings.marginTop = num(loaded.marginTop, this.defaultSettings.marginTop);
        this.settings.marginBottom = num(loaded.marginBottom, this.defaultSettings.marginBottom);
        this.settings.marginLeft = num(loaded.marginLeft, this.defaultSettings.marginLeft);
        this.settings.marginRight = num(loaded.marginRight, this.defaultSettings.marginRight);
        this.settings.watermarkOpacity = num(loaded.watermarkOpacity, this.defaultSettings.watermarkOpacity);
        this.settings.watermarkSize = num(loaded.watermarkSize, this.defaultSettings.watermarkSize);
        this.settings.watermarkRotation = num(loaded.watermarkRotation, this.defaultSettings.watermarkRotation);
        this.settings.pageSize = typeof loaded.pageSize === 'string' ? loaded.pageSize : this.defaultSettings.pageSize;
        this.settings.orientation = typeof loaded.orientation === 'string' ? loaded.orientation : this.defaultSettings.orientation;
        this.settings.pageNumberPosition = typeof loaded.pageNumberPosition === 'string'
            ? loaded.pageNumberPosition
            : this.defaultSettings.pageNumberPosition;
        this.settings.showPageNumbers = loaded.showPageNumbers === undefined
            ? this.defaultSettings.showPageNumbers
            : Boolean(loaded.showPageNumbers);
        // Posição desconhecida (settings salvos por versão futura) cai no padrão
        if (!this.pageNumberPositions[this.settings.pageNumberPosition]) {
            this.settings.pageNumberPosition = this.defaultSettings.pageNumberPosition;
        }
        // Marca dagua sempre comeca vazia
        this.settings.watermark = '';
    },

    showSettings() {
        const modal = ModalManager.create({
            title: I18n.t('pageSettings'),
            size: 'md',
            content: `
                <div class="form-row">
                    <div class="form-group">
                        <label>${I18n.t('pageSize')}</label>
                        <select id="pdf-page-size">
                            <option value="a4" ${this.settings.pageSize === 'a4' ? 'selected' : ''}>A4 (210×297mm)</option>
                            <option value="a5" ${this.settings.pageSize === 'a5' ? 'selected' : ''}>A5 (148×210mm)</option>
                            <option value="letter" ${this.settings.pageSize === 'letter' ? 'selected' : ''}>Carta (216×279mm)</option>
                            <option value="legal" ${this.settings.pageSize === 'legal' ? 'selected' : ''}>Ofício (216×356mm)</option>
                            <option value="kindle" ${this.settings.pageSize === 'kindle' ? 'selected' : ''}>Kindle (120×190mm)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${I18n.t('orientation')}</label>
                        <select id="pdf-orientation">
                            <option value="portrait" ${this.settings.orientation === 'portrait' ? 'selected' : ''}>Retrato</option>
                            <option value="landscape" ${this.settings.orientation === 'landscape' ? 'selected' : ''}>Paisagem</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Margem Superior (mm)</label>
                        <input type="number" id="pdf-margin-top" value="${this.settings.marginTop}" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label>Margem Inferior (mm)</label>
                        <input type="number" id="pdf-margin-bottom" value="${this.settings.marginBottom}" min="0" max="100">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Margem Esquerda (mm)</label>
                        <input type="number" id="pdf-margin-left" value="${this.settings.marginLeft}" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label>Margem Direita (mm)</label>
                        <input type="number" id="pdf-margin-right" value="${this.settings.marginRight}" min="0" max="100">
                    </div>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="pdf-show-page-numbers" ${this.settings.showPageNumbers ? 'checked' : ''}>
                        ${I18n.t('pageNumbering')}
                    </label>
                </div>
                <div class="form-group" id="pdf-page-number-position-group" ${this.settings.showPageNumbers ? '' : 'hidden'}>
                    <label>${I18n.t('pageNumberPosition')}</label>
                    <select id="pdf-page-number-position">
                        ${Object.keys(this.pageNumberPositions).map(key => `
                            <option value="${key}" ${this.settings.pageNumberPosition === key ? 'selected' : ''}>${I18n.t('position' + key.charAt(0).toUpperCase() + key.slice(1).replace('-', ''))}</option>
                        `).join('')}
                    </select>
                </div>
                <hr style="margin: 16px 0; border-color: var(--border);">
                <div class="form-group">
                    <label>${I18n.t('watermark')} (opcional)</label>
                    <input type="text" id="pdf-watermark" value="${Sanitize.attr(this.settings.watermark)}" placeholder="Ex: RASCUNHO, CONFIDENCIAL">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Opacidade</label>
                        <input type="range" id="pdf-watermark-opacity" min="0.05" max="0.5" step="0.05" value="${this.settings.watermarkOpacity}">
                    </div>
                    <div class="form-group">
                        <label>Tamanho</label>
                        <input type="number" id="pdf-watermark-size" value="${this.settings.watermarkSize}" min="20" max="120">
                    </div>
                </div>
            `,
            buttons: [
                { text: I18n.t('cancel'), class: 'btn-secondary', action: 'close' },
                { text: 'Restaurar Padrões', class: 'btn-secondary', action: 'reset' },
                { text: `${I18n.t('exportPDF')} Agora`, class: 'btn-primary', action: 'export' }
            ]
        });

        const numbersToggle = modal.querySelector('#pdf-show-page-numbers');
        const positionGroup = modal.querySelector('#pdf-page-number-position-group');
        numbersToggle.addEventListener('change', () => {
            positionGroup.hidden = !numbersToggle.checked;
        });

        modal.querySelector('[data-action="reset"]').addEventListener('click', () => {
            this.settings = { ...this.defaultSettings };
            ModalManager.close(modal);
            this.showSettings();
        });

        modal.querySelector('[data-action="export"]').addEventListener('click', () => {
            this.settings = {
                pageSize: modal.querySelector('#pdf-page-size').value,
                orientation: modal.querySelector('#pdf-orientation').value,
                marginTop: parseInt(modal.querySelector('#pdf-margin-top').value) || 20,
                marginBottom: parseInt(modal.querySelector('#pdf-margin-bottom').value) || 20,
                marginLeft: parseInt(modal.querySelector('#pdf-margin-left').value) || 20,
                marginRight: parseInt(modal.querySelector('#pdf-margin-right').value) || 20,
                watermark: Sanitize.watermark(modal.querySelector('#pdf-watermark').value),
                watermarkOpacity: parseFloat(modal.querySelector('#pdf-watermark-opacity').value) || 0.1,
                watermarkSize: parseInt(modal.querySelector('#pdf-watermark-size').value) || 48,
                showPageNumbers: modal.querySelector('#pdf-show-page-numbers').checked,
                pageNumberPosition: modal.querySelector('#pdf-page-number-position').value
            };
            Storage.save('pdfSettings', this.settings);
            ModalManager.close(modal);
            this.generate();
        });
    },

    getBookTitle() {
        const text = App?.dom?.input?.value || '';
        const match = text.match(/^#\s+(.+)$/m);
        return match ? match[1].replace(/[<>:"/\\|?*]/g, '').trim() : 'Documento';
    },

    // Monta o documento de impressão como string — função pura usada pelo
    // generate() e pelo gate de testes (M1/M2): o código testado é o código
    // de produção, literalmente o mesmo. Sem window.open, sem document.write,
    // sem timers, sem toast. O corpo e a marca d'água continuam passando pela
    // sanitização aqui dentro — fronteira defensiva no sink, como no
    // generate() original.
    buildPrintDocument({ html, theme, settings, title }) {
        // Contrato defensivo: estado parcial ou ausente cai nos defaults.
        const s = Object.assign({}, this.defaultSettings, settings && typeof settings === 'object' ? settings : {});
        const t = theme || ThemeManager.get(0);
        // L3/N4 + S4: valores interpolados no CSS (margens, rotação/tamanho/
        // opacidade da marca d'água) e no <title>/meta — valida os próprios
        // precondicionais, independentemente de quem chama (settings podem
        // vir crus de localStorage ou de um caller futuro).
        const num = (v, d) => {
            if (v === null || v === undefined) return d;
            if (typeof v === 'string' && v.trim() === '') return d;
            const n = Number(v);
            return Number.isFinite(n) ? n : d;
        };
        s.marginTop = num(s.marginTop, this.defaultSettings.marginTop);
        s.marginBottom = num(s.marginBottom, this.defaultSettings.marginBottom);
        s.marginLeft = num(s.marginLeft, this.defaultSettings.marginLeft);
        s.marginRight = num(s.marginRight, this.defaultSettings.marginRight);
        s.watermarkOpacity = num(s.watermarkOpacity, this.defaultSettings.watermarkOpacity);
        s.watermarkSize = num(s.watermarkSize, this.defaultSettings.watermarkSize);
        s.watermarkRotation = num(s.watermarkRotation, this.defaultSettings.watermarkRotation);
        const esc = (v) => v
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        const docTitle = typeof title === 'string' && title.trim() !== '' ? esc(title) : 'Documento';

        const themeCSS = ThemeManager.getPrintCSS(t);
        const fontLink = getGoogleFontsLink(t.fonts.head, t.fonts.body);

        const sizeMap = {
            'a4': '210mm', 'a5': '148mm',
            'letter': '216mm', 'legal': '216mm',
            'kindle': '120mm'
        };
        const heightMap = {
            'a4': '297mm', 'a5': '210mm',
            'letter': '279mm', 'legal': '356mm',
            'kindle': '190mm'
        };

        const widthFor = sizeMap[s.pageSize] || sizeMap['a4'];
        const heightFor = heightMap[s.pageSize] || heightMap['a4'];
        const pageWidth = s.orientation === 'landscape' ? heightFor : widthFor;
        const pageHeight = s.orientation === 'landscape' ? widthFor : heightFor;

        // Numeracao opcional. Chromium implementa margin boxes do CSS
        // Paged Media L3 nativamente (v131+), entao a regiao escolhida
        // recebe counter(page) direto. A primeira pagina e suprimida por
        // @page :first — convencao editorial, nao limitacao do browser.
        let pageNumberCSS = '';
        if (s.showPageNumbers) {
            const box = this.pageNumberPositions[s.pageNumberPosition]
                || this.pageNumberPositions[this.defaultSettings.pageNumberPosition];
            pageNumberCSS = `
                @page {
                    ${box} {
                        content: counter(page);
                        font-size: 9pt;
                        font-family: ${t.fonts.body};
                        color: #999;
                    }
                }
                @page :first {
                    ${box} { content: none; }
                }
            `;
        }

        let watermarkCSS = '';
        const watermark = Sanitize.watermark(s.watermark);
        if (watermark) {
            watermarkCSS = `
                body::before {
                    content: "${watermark}";
                    position: fixed;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%) rotate(${s.watermarkRotation}deg);
                    font-size: ${s.watermarkSize}px;
                    color: rgba(0,0,0,${s.watermarkOpacity});
                    font-family: ${t.fonts.head};
                    font-weight: 200;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    pointer-events: none;
                    z-index: 9999;
                    white-space: nowrap;
                    opacity: 0.6;
                }
            `;
        }

        // Fronteira defensiva: o preview já é sanitizado, mas o body da
        // janela de impressão é um sink próprio — sanitiza de novo antes
        // do document.write.
        const bodyHtml = Sanitize.html(html);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${docTitle}</title>
                <meta name="author" content="MD2PDF Studio">
                <meta name="subject" content="${docTitle}">
                <meta name="creator" content="MD2PDF Studio">
                <meta name="producer" content="MD2PDF Studio">
                ${fontLink}
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <style>
                    @page {
                        size: ${pageWidth} ${pageHeight};
                        margin: ${s.marginTop}mm ${s.marginRight}mm ${s.marginBottom}mm ${s.marginLeft}mm;
                    }
                    ${pageNumberCSS}
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        margin: 0;
                        padding: 0;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                        text-rendering: optimizeLegibility;
                        font-kerning: normal;
                    }
                    ${themeCSS}
                    body { padding: 0 !important; margin: 0 !important; }
                    ${watermarkCSS}
                    img { max-width: 100%; height: auto; }
                    h1 { break-before: page; }
                    body > *:first-child,
                    body > *:first-child h1 {
                        break-before: auto !important;
                    }
                    .page-break { break-after: page; }
                    h1, h2, h3 { break-after: avoid; }
                    blockquote, ul, ol, li, table, figure { break-inside: avoid; }
                    p { orphans: 3; widows: 3; }

                    /* Perfil de impressao para Markdown gerado por IA.
                       O objetivo e que nada transborde a pagina: blocos de
                       codigo e URLs longas de saida de IA sao o caso comum. */
                    thead { display: table-header-group; }
                    tr { break-inside: avoid; }
                    table {
                        width: 100%;
                        font-size: 0.85em;
                        border-collapse: collapse;
                    }
                    td, th {
                        word-break: break-word;
                        overflow-wrap: anywhere;
                    }
                    pre {
                        white-space: pre-wrap;
                        word-break: break-word;
                        overflow-wrap: anywhere;
                        break-inside: auto;
                    }
                    code { overflow-wrap: anywhere; }
                    img {
                        max-width: 100%;
                        max-height: 200mm;
                        object-fit: contain;
                        break-inside: avoid;
                    }
                    a { overflow-wrap: anywhere; }
                </style>
            </head>
            <body>${bodyHtml}</body>
            </html>
        `;
    },

    async generate() {
        App.showToast('Gerando PDF...', 'info');

        try {
            const previewContent = document.getElementById('preview-content');
            if (!previewContent) throw new Error('Preview não encontrado');

            const bookTitle = this.getBookTitle();
            const printWindow = window.open('', '_blank');
            if (!printWindow) throw new Error('Popup bloqueado. Permita popups para gerar PDF.');

            const theme = ThemeManager.get(App.currentIndex);
            const doc = this.buildPrintDocument({
                html: previewContent.innerHTML,
                theme,
                settings: this.settings,
                title: bookTitle
            });

            printWindow.document.write(doc);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                App.showToast('PDF pronto! Use "Salvar como PDF" no diálogo de impressão.', 'success');
            }, 500);

        } catch (e) {
            console.error('PDF generation error:', e);
            App.showToast('Erro ao gerar PDF: ' + e.message, 'error');
        }
    }
};
