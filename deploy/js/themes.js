/* ============================================
   THEMES.JS - 50 Temas Premium com Tipografia Elite
   
   Princípios Tipográficos Aplicados:
   - Escala tipográfica: Golden Ratio (1.618) ou Perfect Fourth (1.333)
   - Altura de linha: Títulos 1.1-1.3, Corpo 1.5-1.7, Pequeno 1.4-1.6
   - Medida ideal: 60-65 caracteres por linha (≈65ch)
   - Pareamento de fontes: No máximo 2 famílias por tema
   - Ritmo vertical consistente usando a escala tipográfica
   
   Design Philosophy:
   - Cada tema é um "personagem" visual distinto
   - Consistência interna: mesma personalidade em todos os elementos
   - PDF-first: otimizado para impressão e leitura em tela
   - Acessibilidade: contraste WCAG AA mínimo em todos os textos
   ============================================ */

/* ═══════════════════════════════════════════════════════
   CSS INFRASTRUCTURE - Funções Compartilhadas Premium
   ═══════════════════════════════════════════════════════ */

/**
 * CSS Base Compartilhado - Elementos de Bloco Premium
 * @param {string} accentColor - Cor de destaque do tema
 * @param {object} opts - Opções: { variant, dark, glass }
 */
const getPremiumBlockCSS = (accentColor, opts = {}) => {
    const { variant = 'classic', dark = false, glass = false } = opts;
    const textColor = dark ? '#d0d0d0' : '#444';
    const subtleBg = dark ? `${accentColor}15` : `${accentColor}06`;
    const borderColor = dark ? '#333' : '#e8e8e8';
    
    return `
    /* ═══ BLOCKQUOTE ═══ */
    blockquote {
        border-left: 4px solid ${accentColor};
        background: ${glass 
            ? `linear-gradient(135deg, ${accentColor}10, ${accentColor}05); backdrop-filter: blur(10px);` 
            : `linear-gradient(135deg, ${subtleBg}, ${accentColor}03)`};
        padding: 22px 28px;
        margin: 2em 0;
        font-style: italic;
        color: ${textColor};
        border-radius: ${variant === 'modern' ? '12px' : variant === 'minimal' ? '0' : '0 10px 10px 0'};
        position: relative;
        line-height: 1.7;
    }
    blockquote::before {
        content: "\\201C";
        position: absolute;
        left: 14px;
        top: -6px;
        font-size: 4.5em;
        color: ${accentColor}30;
        font-family: Georgia, serif;
        line-height: 1;
        pointer-events: none;
    }
    blockquote p {
        margin: 0.6em 0;
        padding-left: 60px;
    }
    blockquote p:first-child {
        margin-top: 0;
    }
    blockquote p:last-child {
        margin-bottom: 0;
    }
    blockquote cite,
    blockquote footer {
        display: block;
        margin-top: 0.8em;
        font-size: 0.85em;
        font-style: normal;
        color: ${accentColor};
        font-weight: 500;
    }
    
    /* ═══ LISTAS ═══ */
    ul, ol {
        margin: 1.4em 0;
        padding-left: 2.2em;
    }
    li {
        margin-bottom: 0.5em;
        line-height: 1.75;
    }
    ul li::marker {
        color: ${accentColor};
        font-size: 1.1em;
    }
    ol li::marker {
        color: ${accentColor};
        font-weight: 700;
    }
    
    /* ═══ CÓDIGO INLINE ═══ */
    code {
        background: ${dark ? `${accentColor}20` : `${accentColor}10`};
        color: ${accentColor};
        padding: 2px 7px;
        border-radius: 5px;
        font-size: 0.88em;
        font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
        letter-spacing: -0.02em;
    }
    pre {
        background: ${dark ? '#0d1117' : '#1e1e2e'};
        color: ${dark ? '#c9d1d9' : '#e0e0e0'};
        padding: 22px 26px;
        border-radius: 10px;
        overflow-x: auto;
        margin: 1.6em 0;
        line-height: 1.55;
        font-size: 0.88em;
        border-left: 4px solid ${accentColor};
        box-shadow: 0 2px 8px rgba(0,0,0,${dark ? '0.3' : '0.08'});
    }
    pre code {
        background: transparent;
        color: inherit;
        padding: 0;
        font-size: 1em;
        border-radius: 0;
    }
    
    /* ═══ TABELA ═══ */
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 2em 0;
        font-size: 0.92em;
        border-radius: 8px;
        overflow: hidden;
    }
    th {
        background: ${accentColor};
        color: #fff;
        padding: 13px 18px;
        text-align: left;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        font-size: 0.82em;
    }
    td {
        padding: 12px 18px;
        border-bottom: 1px solid ${borderColor};
        line-height: 1.6;
    }
    tr:nth-child(even) {
        background: ${subtleBg};
    }
    
    /* ═══ IMAGEM ═══ */
    img {
        max-width: 100%;
        height: auto;
        border-radius: 10px;
        margin: 1.8em 0;
        box-shadow: 0 4px 16px rgba(0,0,0,${dark ? '0.4' : '0.1'});
    }
    
    /* ═══ SELEÇÃO DE TEXTO ═══ */
    ::selection {
        background: ${accentColor}30;
        color: inherit;
    }
    
    /* ═══ LINKS ═══ */
    a {
        color: ${accentColor};
        text-decoration-color: ${accentColor}40;
        text-underline-offset: 3px;
        transition: all 0.2s;
    }
    a:hover {
        text-decoration-color: ${accentColor};
    }
    `;
};

/**
 * CSS de Drop Cap -首字 Decorativo
 */
const dropCapCSS = (accentColor) => `
    p:first-of-type::first-letter {
        float: left;
        font-size: 3.8em;
        line-height: 0.8;
        padding-right: 10px;
        padding-top: 4px;
        color: ${accentColor};
        font-weight: 700;
        font-family: inherit;
    }
`;

/**
 * CSS de ornamento entre seções
 */
const ornamentCSS = (accentColor) => `
    h1::after {
        content: "— ✦ —";
        display: block;
        text-align: center;
        font-size: 0.35em;
        color: ${accentColor};
        margin-top: 0.6em;
        letter-spacing: 0.5em;
        font-weight: 400;
    }
`;

/**
 * CSS de cover/capa profissional
 */
const coverCSS = (accentColor) => `
    .cover-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 80px 60px;
        text-align: center;
        page-break-after: always;
        position: relative;
    }
    .cover-block::before {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 6px;
        background: linear-gradient(90deg, transparent, ${accentColor}, transparent);
    }
    .cover-block h1 {
        font-size: 3.2em;
        margin-bottom: 0.3em;
        page-break-before: auto;
    }
    .cover-block h2 {
        font-size: 1.4em;
        color: #666;
        font-weight: 300;
        margin-bottom: 2em;
        page-break-before: auto;
    }
`;

/**
 * CSS de Sumário/TOC
 */
const tocCSS = (accentColor) => `
    .toc-block {
        page-break-after: always;
        padding: 40px 0;
    }
    .toc-block h2 {
        text-align: center;
        margin-bottom: 2em;
        page-break-before: auto;
    }
    .toc-block ol {
        list-style: none;
        padding: 0;
    }
    .toc-block li {
        padding: 10px 0;
        border-bottom: 1px dotted ${accentColor}30;
        font-size: 1.05em;
        display: flex;
        align-items: baseline;
    }
    .toc-block li::before {
        content: counter(toc-counter) ".";
        counter-increment: toc-counter;
        color: ${accentColor};
        font-weight: 700;
        margin-right: 12px;
        min-width: 28px;
    }
    .toc-block ol {
        counter-reset: toc-counter;
    }
`;

/**
 * CSS de Elementos de Destaque
 */
const highlightCSS = (accentColor) => `
    mark {
        background: ${accentColor}20;
        color: inherit;
        padding: 1px 5px;
        border-radius: 3px;
    }
    hr {
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, ${accentColor}40, transparent);
        margin: 2.5em 0;
    }
`;

/* ═══ Configuração de Pesos Padrão para Google Fonts ═══ */
const FONT_CONFIG = {
    'Inter': 'wght@300;400;500;600;700;800',
    'Source Serif 4': 'ital,wght@0,400;0,600;0,700;1,400',
    'EB Garamond': 'ital,wght@0,400;0,500;0,600;1,400;1,500',
    'Cormorant Garamond': 'ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700',
    'Cinzel': 'wght@400;500;600;700;800;900',
    'Playfair Display': 'ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900',
    'Merriweather': 'ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900',
    'Libre Baskerville': 'ital,wght@0,400;0,700;1,400',
    'Spectral': 'ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800',
    'Crimson Text': 'ital,wght@0,400;0,600;0,700;1,400',
    'Lora': 'ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700',
    'Bodoni Moda': 'ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900',
    'Raleway': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900',
    'Poppins': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900',
    'Bebas Neue': 'wght@400',
    'Josefin Sans': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700',
    'Lato': 'ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900',
    'Oswald': 'wght@200;300;400;500;600;700',
    'Quicksand': 'wght@300;400;500;600;700',
    'Orbitron': 'wght@400;500;600;700;800;900',
    'Poiret One': 'wght@400',
    'Arvo': 'ital,wght@0,400;0,700;1,400;1,700',
    'Caveat': 'wght@400;500;600;700',
    'Nunito': 'ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900',
    'Montserrat': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900',
    'Open Sans': 'ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800',
    'Roboto': 'ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900',
    'Source Sans 3': 'ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900',
    'IBM Plex Mono': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700',
    'IBM Plex Sans': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700',
    'Fira Code': 'wght@300;400;500;600;700',
    'Share Tech Mono': 'wght@400',
    'Exo 2': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900',
    'JetBrains Mono': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800',
    'Rajdhani': 'wght@300;400;500;600;700',
    'Space Grotesk': 'wght@300;400;500;600;700',
    'Sora': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800',
    'Neuton': 'ital,wght@0,200;0,300;0,400;0,700;0,800;1,200;1,300;1,400;1,700;1,800',
    'PT Serif': 'ital,wght@0,400;0,700;1,400;1,700',
    'Noto Serif': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900'
};

const GOOGLE_FONTS_SET = new Set(Object.keys(FONT_CONFIG));

/**
 * Extrai as famílias Google Fonts de uma string de font-family
 */
function extractGoogleFonts(fontFamilyStr) {
    const matches = fontFamilyStr.match(/'([^']+)'/g) || [];
    return matches
        .map(m => m.replace(/'/g, ''))
        .filter(f => GOOGLE_FONTS_SET.has(f));
}

/**
 * Gera o link Google Fonts para o(s) family string(s) de um tema
 * Suporta: family=Inter:wght@300;400;500;600;700;800
 * e: family=Playfair+Display:ital,wght@0,400;0,700;1,400
 */
function getGoogleFontsLink(headFont, bodyFont) {
    if (!headFont && !bodyFont) return '';
    const families = new Set([
        ...extractGoogleFonts(headFont || ''),
        ...extractGoogleFonts(bodyFont || '')
    ]);
    if (families.size === 0) return '';

    const parts = Array.from(families).map(family => {
        const encoded = family.replace(/ /g, '+');
        const config = FONT_CONFIG[family];
        if (!config) return `family=${encoded}`;
        return `family=${encoded}:${config}`;
    });

    return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap">`;
}

/**
 * CSS Base Tipográfico Premium - aplicado a todos os temas no PDF
 */
const typographicBaseCSS = `
    body {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
        font-kerning: normal;
        orphans: 3;
        widows: 3;
    }
    h1, h2, h3, h4, h5, h6 {
        text-rendering: optimizeLegibility;
        font-kerning: normal;
    }
    p {
        orphans: 3;
        widows: 3;
    }
`;

/**
 * CSS de ornamentos decorativos (para uso no PDF/preview global)
 */
const ornamentDividerCSS = (accentColor) => `
    hr {
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, ${accentColor}40, transparent);
        margin: 2.5em 0;
    }
    hr.ornament {
        height: auto;
        background: none;
        text-align: center;
        font-size: 0.9em;
        color: ${accentColor}60;
        letter-spacing: 0.5em;
        border: none;
    }
    hr.ornament::before {
        content: "✦ ✦ ✦";
    }
`;

/**
 * CSS decorativo para drop cap refinado (primeira letra do capítulo)
 */
const dropCapEliteCSS = (accentColor) => `
    #preview-content > p:first-of-type::first-letter,
    section > p:first-of-type::first-letter,
    .chapter-content > p:first-of-type::first-letter {
        float: left;
        font-size: 4.2em;
        line-height: 0.75;
        padding-right: 10px;
        padding-top: 5px;
        padding-bottom: 2px;
        color: ${accentColor};
        font-weight: 700;
        font-family: inherit;
        margin-right: 6px;
        margin-top: 2px;
    }
`;

/* ═══ CSS de Quebra de Página Premium ═══ */
const pageBreakCSS = `
    h1, h2 {
        page-break-before: always;
    }
    body > *:first-child,
    body > *:first-child h1,
    body > *:first-child h2 {
        page-break-before: auto !important;
    }
    h1, h2, h3, h4 {
        page-break-after: avoid;
    }
    p, ul, ol, blockquote, table, img, figure, pre, code {
        page-break-inside: avoid;
    }
    p {
        orphans: 3;
        widows: 3;
    }
`;

/* ═══ Bloco Educacional Premium ═══ */
const educationalBlocksCSS = `
    blockquote:has(> p:first-child strong:first-child) {
        background: linear-gradient(135deg, #f0f7ff, #e6f3ff);
        border-left: 5px solid #3b82f6;
        border-radius: 0 12px 12px 0;
        padding: 24px 28px;
        margin: 2em 0;
        font-style: normal;
    }
    blockquote:has(> p:first-child strong:first-child)::before {
        content: "\\1F4A1";
        position: absolute;
        left: 16px;
        top: 16px;
        font-size: 1.4em;
    }
    blockquote:has(> p:first-child strong:first-child) p {
        padding-left: 30px;
    }
    .learning-block {
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        border-left: 5px solid #22c55e;
        border-radius: 0 12px 12px 0;
        padding: 24px 28px;
        margin: 2em 0;
        font-style: normal;
    }
    .insight-block {
        background: linear-gradient(135deg, #fffbeb, #fef3c7);
        border-left: 5px solid #f59e0b;
        border-radius: 0 12px 12px 0;
        padding: 24px 28px;
        margin: 2em 0;
        font-style: normal;
    }
    .warning-block {
        background: linear-gradient(135deg, #fef2f2, #fee2e2);
        border-left: 5px solid #ef4444;
        border-radius: 0 12px 12px 0;
        padding: 24px 28px;
        margin: 2em 0;
        font-style: normal;
    }
    .protip-block {
        background: linear-gradient(135deg, #eff6ff, #dbeafe);
        border-left: 5px solid #3b82f6;
        border-radius: 0 12px 12px 0;
        padding: 24px 28px;
        margin: 2em 0;
        font-style: normal;
    }
    .exercise-block {
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        border: 2px dashed #22c55e;
        border-radius: 12px;
        padding: 24px 28px;
        margin: 2em 0;
        font-style: normal;
    }
`;

/* ============================================
   50 TEMAS COM TIPOGRAFIA ELITE
   ============================================ */
const THEMES = [
    // ═══════════════════════════════════════════════
    // CLÁSSICOS - Tradição e Elegância
    // ═══════════════════════════════════════════════
    
    // 0. Fartura no Quintal — Editorial Brasileiro
    {
        id: 0,
        name: "Fartura no Quintal",
        group: "Clássicos",
        fonts: {
            head: "'Source Serif 4', Georgia, serif",
            body: "'Source Serif 4', Georgia, serif"
        },
        color: "#2d5a27",
        css: `body {
            padding: 65px 75px;
            font-size: 1.125rem;
            line-height: 1.75;
            text-align: justify;
            color: #1a1a1a;
            max-width: 700px;
            margin: 0 auto;
            hyphens: auto;
        }
        h1, h2, h3, h4 {
            font-family: 'Source Serif 4', Georgia, serif;
            color: #2d5a27;
            font-weight: 700;
            line-height: 1.2;
            margin-top: 0;
        }
        h1 {
            font-size: 2.8rem;
            text-align: center;
            margin-bottom: 0.4em;
            letter-spacing: -0.01em;
        }
        h1::after {
            content: "\\2727";
            display: block;
            font-size: 0.4em;
            color: #2d5a2760;
            margin-top: 0.5em;
            letter-spacing: 0.3em;
        }
        h2 {
            font-size: 1.85rem;
            margin-top: 2.5em;
            margin-bottom: 0.8em;
            padding-bottom: 0.4em;
            border-bottom: 2px solid #2d5a2730;
        }
        h3 {
            font-size: 1.4rem;
            margin-top: 2em;
            color: #3d7a37;
        }
        h4 {
            font-size: 1.15rem;
            color: #4d8a47;
        }
        p {
            margin-bottom: 1.1em;
            text-indent: 1.5em;
        }
        p:first-of-type {
            text-indent: 0;
        }
        ${dropCapCSS('#2d5a27')}
        ${ornamentCSS('#2d5a27')}
        ${highlightCSS('#2d5a27')}
        ${getPremiumBlockCSS('#2d5a27')}
    `
    },
    
    // 1. Classic Garamond
    // 1. Classic Garamond — Livro Acadêmico
    {
        id: 1,
        name: "Classic Garamond",
        group: "Clássicos",
        fonts: {
            head: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
            body: "'EB Garamond', Georgia, serif"
        },
        color: "#2c1810",
        css: `body {
            padding: 70px 85px;
            font-size: 1.2rem;
            line-height: 1.78;
            text-align: justify;
            color: #2c1810;
            max-width: 720px;
            margin: 0 auto;
            font-feature-settings: "liga" 1, "kern" 1;
            hyphens: auto;
        }
        h1, h2, h3, h4 {
            font-family: 'EB Garamond', Georgia, serif;
            color: #2c1810;
            font-weight: 400;
            line-height: 1.15;
            letter-spacing: 0.02em;
        }
        h1 {
            font-size: 3.2rem;
            text-align: center;
            margin-bottom: 0.5em;
            font-style: italic;
        }
        h1::after {
            content: "";
            display: block;
            width: 60px;
            height: 1px;
            background: #2c1810;
            margin: 0.8em auto 0;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2.5em;
            margin-bottom: 1em;
            color: #800000;
            font-style: italic;
            text-align: center;
        }
        h3 {
            font-size: 1.5rem;
            margin-top: 2em;
            color: #444;
            border-bottom: 1px solid #eee;
            padding-bottom: 0.4em;
            display: inline-block;
        }
        h4 {
            font-size: 1.2rem;
            color: #555;
        }
        p {
            margin-bottom: 1.1em;
            text-indent: 1.8em;
        }
        p:first-of-type {
            text-indent: 0;
        }
        ${dropCapCSS('#800000')}
        ${highlightCSS('#800000')}
        ${getPremiumBlockCSS('#800000')}
    `
    },
    
    // 2. Royal Manuscript
    {
        id: 2,
        name: "Royal Manuscript",
        group: "Clássicos",
        fonts: {
            head: "'Cinzel', 'Palatino Linotype', serif",
            body: "'Cormorant Garamond', 'Palatino', serif"
        },
        color: "#1a252f",
        css: `body {
            padding: 80px 95px;
            font-size: 1.15rem;
            line-height: 1.8;
            text-align: justify;
            color: #1a252f;
            max-width: 750px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Cinzel', 'Palatino Linotype', serif;
            color: #1a252f;
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: 0.15em;
        }
        h1 {
            font-size: 3.2rem;
            text-align: center;
            margin-bottom: 2em;
            line-height: 1.1;
        }
        h1::after {
            content: "👑";
            display: block;
            font-size: 0.5em;
            margin-top: 0.6em;
            letter-spacing: 0;
            text-transform: none;
        }
        h2 {
            font-size: 2rem;
            margin-top: 3em;
            margin-bottom: 1.2em;
            color: #d4af37;
            text-align: center;
        }
        h3 {
            font-size: 1.5rem;
            margin-top: 2.5em;
            color: #555;
            font-style: italic;
            text-transform: none;
            letter-spacing: 0;
        }
        blockquote {
            border: 1px solid #d4af3740;
            background: #d4af3708;
            padding: 30px 40px;
            text-align: center;
            font-style: italic;
            color: #555;
            border-radius: 4px;
        }
        ${getPremiumBlockCSS('#d4af37')}
    `
    },
    
    // 3. Elegant Novel
    {
        id: 3,
        name: "Elegant Novel",
        group: "Clássicos",
        fonts: {
            head: "'Playfair Display', Georgia, serif",
            body: "'Merriweather', 'Georgia', serif"
        },
        color: "#2b2b2b",
        css: `body {
            padding: 60px 75px;
            font-size: 1.1rem;
            line-height: 1.8;
            text-align: justify;
            color: #2b2b2b;
            max-width: 680px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Playfair Display', Georgia, serif;
            color: #1a1a1a;
            font-weight: 700;
            line-height: 1.15;
        }
        h1 {
            font-size: 3.8rem;
            text-align: center;
            margin-bottom: 1.5em;
            font-style: italic;
            color: #000;
        }
        h2 {
            font-size: 2.4rem;
            margin-top: 2.5em;
            margin-bottom: 1em;
            color: #555;
            border-bottom: 1px solid #eee;
            padding-bottom: 0.5em;
        }
        h3 {
            font-size: 1.7rem;
            margin-top: 2em;
            color: #777;
            font-style: italic;
        }
        blockquote {
            background: #fdfdfd;
            border-left: 4px solid #333;
            padding: 20px 25px;
            color: #555;
        }
        ${getPremiumBlockCSS('#333')}
    `
    },
    
    // 4. Old Library
    {
        id: 4,
        name: "Old Library",
        group: "Clássicos",
        fonts: {
            head: "'Libre Baskerville', 'Baskerville', serif",
            body: "'Libre Baskerville', 'Georgia', serif"
        },
        color: "#3e2723",
        css: `body {
            padding: 60px 70px;
            font-size: 1.1rem;
            line-height: 1.9; /* Altura generosa para leitura longa */
            color: #3e2723;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Libre Baskerville', serif;
            color: #5d4037;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 1.5em;
            padding-bottom: 0.5em;
            border-bottom: 2px solid #d7ccc8;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2.5em;
            color: #4e342e;
            border-bottom: 1px solid #efebe9;
            padding-bottom: 0.4em;
        }
        h3 {
            font-size: 1.5rem;
            margin-top: 2em;
            color: #6d4c41;
        }
        blockquote {
            background: #efebe9;
            border-left: 5px solid #8d6e63;
            padding: 20px 30px;
            color: #4e342e;
        }
        ${getPremiumBlockCSS('#5d4037')}
    `
    },
    
    // 5. Spectral Scholar
    {
        id: 5,
        name: "Spectral Scholar",
        group: "Clássicos",
        fonts: {
            head: "'Spectral', 'Georgia', serif",
            body: "'Spectral', 'Georgia', serif"
        },
        color: "#1a1a1a",
        css: `body {
            padding: 70px 85px;
            font-size: 1.15rem;
            line-height: 1.8;
            text-align: justify;
            color: #1a1a1a;
            max-width: 720px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Spectral', Georgia, serif;
            color: #000;
            font-weight: 600;
            line-height: 1.2;
        }
        h1 {
            font-size: 3.5rem;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2.5em;
            margin-bottom: 0.8em;
        }
        h3 {
            font-size: 1.6rem;
            color: #333;
            margin-top: 2em;
        }
        p {
            margin-bottom: 1.2em;
            text-indent: 1.5em;
        }
        p:first-of-type {
            text-indent: 0;
        }
        ${getPremiumBlockCSS('#1a1a1a')}
    `
    },
    
    // 6. Crimson Romance
    {
        id: 6,
        name: "Crimson Romance",
        group: "Clássicos",
        fonts: {
            head: "'Crimson Text', 'Georgia', serif",
            body: "'Crimson Text', 'Georgia', serif"
        },
        color: "#8a1c1c",
        css: `body {
            padding: 65px 80px;
            font-size: 1.15rem;
            line-height: 1.85;
            text-align: justify;
            color: #2d2d2d;
            max-width: 720px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Crimson Text', Georgia, serif;
            color: #8a1c1c;
            font-weight: 400;
            line-height: 1.15;
        }
        h1 {
            font-size: 3.8rem;
            text-align: center;
            margin-bottom: 1.5em;
            font-style: italic;
        }
        h2 {
            font-size: 2.4rem;
            margin-top: 2.5em;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 0.5em;
        }
        h3 {
            font-size: 1.7rem;
            margin-top: 2em;
            color: #b71c1c;
        }
        blockquote {
            border-left: 3px solid #8a1c1c;
            color: #666;
            font-style: italic;
            background: #8a1c1c08;
        }
        ${getPremiumBlockCSS('#8a1c1c')}
    `
    },
    
    // 7. Lora Grace
    {
        id: 7,
        name: "Lora Grace",
        group: "Clássicos",
        fonts: {
            head: "'Lora', 'Georgia', serif",
            body: "'Lora', 'Georgia', serif"
        },
        color: "#005bbb",
        css: `body {
            padding: 60px 75px;
            font-size: 1.1rem;
            line-height: 1.75;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Lora', Georgia, serif;
            color: #005bbb;
            font-weight: 600;
            line-height: 1.2;
        }
        h1 {
            font-size: 3.2rem;
            text-align: center;
            margin-bottom: 1.5em;
            padding-bottom: 0.5em;
            border-bottom: 2px solid #eee;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2em;
        }
        h3 {
            font-size: 1.6rem;
            color: #0066cc;
        }
        blockquote {
            background: #f0f7ff;
            border-left: 4px solid #005bbb;
            padding: 20px 25px;
        }
        ${getPremiumBlockCSS('#005bbb')}
    `
    },
    
    // 8. Bodoni Fashion
    {
        id: 8,
        name: "Bodoni Fashion",
        group: "Clássicos",
        fonts: {
            head: "'Bodoni Moda', 'Didot', serif",
            body: "'Bodoni Moda', 'Georgia', serif"
        },
        color: "#000",
        css: `body {
            padding: 70px 85px;
            font-size: 1.15rem;
            line-height: 1.8;
            color: #111;
            text-align: justify;
            max-width: 750px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Bodoni Moda', 'Didot', serif;
            color: #000;
            font-weight: 700;
            line-height: 1.1;
            letter-spacing: -0.02em;
        }
        h1 {
            font-size: 4.5rem;
            text-align: center;
            margin-bottom: 1.5em;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
        h2 {
            font-size: 2.8rem;
            margin-top: 2.5em;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        h3 {
            font-size: 1.8rem;
            font-style: italic;
            text-transform: none;
            letter-spacing: 0;
        }
        blockquote {
            border-left: 3px solid #000;
            font-style: italic;
        }
        ${getPremiumBlockCSS('#000')}
    `
    },
    
    // ═══════════════════════════════════════════════
    // MODERNOS - Limpeza e Contemporaneidade
    // ═══════════════════════════════════════════════
    
    // 9. Modern Sans
    {
        id: 9,
        name: "Modern Sans",
        group: "Modernos",
        fonts: {
            head: "'Inter', 'Helvetica Neue', sans-serif",
            body: "'Inter', 'Helvetica Neue', sans-serif"
        },
        color: "#2c3e50",
        css: `body {
            padding: 60px 70px;
            font-size: 1.05rem; /* Sans-serif precisa de tamanho menor */
            line-height: 1.65;
            color: #333;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
            font-weight: 700;
            color: #2c3e50;
            line-height: 1.15;
            letter-spacing: -0.02em;
        }
        h1 {
            font-size: 2.8rem;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2em;
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 0.4em;
        }
        h3 {
            font-size: 1.4rem;
            color: #34495e;
        }
        blockquote {
            border-left: 4px solid #3498db;
            background: #f8f9fa;
            padding: 20px 25px;
        }
        ${getPremiumBlockCSS('#2c3e50')}
    `
    },
    
    // 10. Swiss Design
    {
        id: 10,
        name: "Swiss Design",
        group: "Modernos",
        fonts: {
            head: "'Inter', 'Helvetica', sans-serif",
            body: "'Inter', 'Helvetica', sans-serif"
        },
        color: "#e63946",
        css: `body {
            padding: 70px 80px;
            font-size: 1.05rem;
            line-height: 1.6;
            color: #1d3557;
            max-width: 720px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Inter', 'Helvetica', sans-serif;
            font-weight: 800;
            color: #1d3557;
            line-height: 1;
            letter-spacing: -0.03em;
        }
        h1 {
            font-size: 4rem;
            margin-bottom: 0.8em;
        }
        h1::after {
            content: "";
            display: block;
            width: 80px;
            height: 8px;
            background: #e63946;
            margin-top: 0.5em;
        }
        h2 {
            font-size: 2.4rem;
            margin-top: 2.5em;
            color: #457b9d;
        }
        h3 {
            font-size: 1.5rem;
        }
        p {
            font-size: 1.1em;
        }
        blockquote {
            background: #f1faee;
            padding: 25px 30px;
            border-radius: 4px;
            border-left: 5px solid #e63946;
            color: #1d3557;
        }
        ${getPremiumBlockCSS('#e63946')}
    `
    },
    
    // 11. Raleway Air
    {
        id: 11,
        name: "Raleway Air",
        group: "Modernos",
        fonts: {
            head: "'Raleway', 'Helvetica Neue', sans-serif",
            body: "'Raleway', 'Helvetica Neue', sans-serif"
        },
        color: "#333",
        css: `body {
            padding: 80px 95px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #555;
            max-width: 750px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Raleway', 'Helvetica Neue', sans-serif;
            color: #000;
            font-weight: 300;
            line-height: 1.1;
            letter-spacing: -0.02em;
        }
        h1 {
            font-size: 4rem;
            letter-spacing: -0.03em;
            margin-bottom: 1em;
        }
        h2 {
            font-size: 2.5rem;
            font-weight: 600;
            margin-top: 2em;
        }
        h3 {
            font-size: 1.8rem;
            font-weight: 600;
        }
        blockquote {
            font-weight: 300;
            font-size: 1.3em;
            color: #000;
            border-left: 2px solid #ccc;
            padding-left: 25px;
        }
        ${getPremiumBlockCSS('#333')}
    `
    },
    
    // 12. Poppins Pop
    {
        id: 12,
        name: "Poppins Pop",
        group: "Modernos",
        fonts: {
            head: "'Poppins', 'Helvetica Neue', sans-serif",
            body: "'Poppins', 'Helvetica Neue', sans-serif"
        },
        color: "#6c5ce7",
        css: `body {
            padding: 60px 70px;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #2d3436;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Poppins', 'Helvetica Neue', sans-serif;
            color: #6c5ce7;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.8rem;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2em;
            color: #2d3436;
        }
        h2::before {
            content: "// ";
            color: #6c5ce7;
        }
        h3 {
            font-size: 1.5rem;
            color: #636e72;
        }
        blockquote {
            background: linear-gradient(135deg, #f0f0f0, #e8e8e8);
            padding: 25px 30px;
            border-radius: 16px;
            font-weight: 500;
            color: #2d3436;
            border: none;
        }
        ${getPremiumBlockCSS('#6c5ce7')}
    `
    },
    
    // 13. Geometric Bold
    {
        id: 13,
        name: "Geometric Bold",
        group: "Modernos",
        fonts: {
            head: "'Bebas Neue', 'Impact', sans-serif",
            body: "'Inter', 'Helvetica Neue', sans-serif"
        },
        color: "#111",
        css: `body {
            padding: 50px 65px;
            font-size: 1.05rem;
            line-height: 1.6;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Bebas Neue', 'Impact', sans-serif;
            color: #111;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            line-height: 0.95;
        }
        h1 {
            font-size: 5rem;
            margin-bottom: 0.5em;
        }
        h2 {
            font-size: 3.2rem;
            margin-top: 1.5em;
            border-bottom: 4px solid #111;
            padding-bottom: 0.3em;
        }
        h3 {
            font-size: 2rem;
            font-family: 'Inter', sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 700;
            line-height: 1.2;
        }
        ${getPremiumBlockCSS('#111')}
    `
    },
    
    // 14. Josefin Minimal
    {
        id: 14,
        name: "Josefin Minimal",
        group: "Modernos",
        fonts: {
            head: "'Josefin Sans', 'Helvetica Neue', sans-serif",
            body: "'Josefin Sans', 'Helvetica Neue', sans-serif"
        },
        color: "#d62839",
        css: `body {
            padding: 90px 110px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #444;
            background: #fefefe;
            max-width: 780px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Josefin Sans', 'Helvetica Neue', sans-serif;
            color: #000;
            font-weight: 300;
            line-height: 1.1;
        }
        h1 {
            font-size: 4rem;
            text-align: center;
            margin-bottom: 1.5em;
            border: 1px solid #000;
            padding: 0.5em;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2.5em;
            color: #d62839;
        }
        h3 {
            font-size: 1.6rem;
        }
        blockquote {
            text-align: center;
            font-size: 1.3em;
            font-weight: 300;
            color: #000;
            border: none;
            background: transparent;
        }
        ${getPremiumBlockCSS('#d62839')}
    `
    },
    
    // 15. Lato Corporate
    {
        id: 15,
        name: "Lato Corporate",
        group: "Modernos",
        fonts: {
            head: "'Lato', 'Helvetica Neue', sans-serif",
            body: "'Lato', 'Helvetica Neue', sans-serif"
        },
        color: "#0288d1",
        css: `body {
            padding: 60px 75px;
            font-size: 1.05rem;
            line-height: 1.75;
            color: #424242;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Lato', 'Helvetica Neue', sans-serif;
            color: #0288d1;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.8rem;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2em;
            color: #01579b;
        }
        h3 {
            font-size: 1.4rem;
        }
        blockquote {
            border-left: 4px solid #0288d1;
            background: #e1f5fe;
            padding: 20px 25px;
            color: #01579b;
        }
        ${getPremiumBlockCSS('#0288d1')}
    `
    },
    
    // 16. Clean Cut
    {
        id: 16,
        name: "Clean Cut",
        group: "Modernos",
        fonts: {
            head: "'Inter', 'Helvetica Neue', sans-serif",
            body: "'Inter', 'Helvetica Neue', sans-serif"
        },
        color: "#000",
        css: `body {
            padding: 50px 60px;
            font-size: 1rem;
            line-height: 1.5;
            color: #111;
            max-width: 680px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
            color: #000;
            font-weight: 800;
            line-height: 1;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.8em;
        }
        h2 {
            font-size: 1.8rem;
            margin-top: 1.8em;
        }
        h3 {
            font-size: 1.2rem;
            letter-spacing: 0.08em;
        }
        p {
            margin-bottom: 0.8em;
        }
        ${getPremiumBlockCSS('#000')}
    `
    },
    
    // ═══════════════════════════════════════════════
    // TÉCNICOS - Clareza e Profissionalismo
    // ═══════════════════════════════════════════════
    
    // 17. Tech Manual
    {
        id: 17,
        name: "Tech Manual",
        group: "Técnicos",
        fonts: {
            head: "'Inter', 'Consolas', sans-serif",
            body: "'Inter', 'Helvetica Neue', sans-serif"
        },
        color: "#00796b",
        css: `body {
            padding: 50px 65px;
            font-size: 1rem;
            line-height: 1.6;
            color: #37474f;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Inter', 'Consolas', sans-serif;
            color: #00796b;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.5rem;
            border-bottom: 2px dashed #00796b;
            padding-bottom: 0.5em;
            margin-bottom: 1em;
        }
        h2 {
            font-size: 1.8rem;
            margin-top: 2em;
        }
        h3 {
            font-size: 1.4rem;
        }
        code {
            background: #00796b15;
            color: #00796b;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Fira Code', 'Consolas', monospace;
            font-size: 0.9em;
        }
        pre {
            background: #263238;
            color: #eceff1;
            border-left: 4px solid #00796b;
        }
        pre code {
            background: transparent;
            color: inherit;
            padding: 0;
        }
        blockquote {
            background: #e0f2f1;
            border-left: 4px solid #00796b;
            padding: 15px 20px;
        }
        ${getPremiumBlockCSS('#00796b')}
    `
    },
    
    // 18. Code Guide
    {
        id: 18,
        name: "Code Guide",
        group: "Técnicos",
        fonts: {
            head: "'Inter', 'Helvetica Neue', sans-serif",
            body: "'Inter', 'Helvetica Neue', sans-serif"
        },
        color: "#d32f2f",
        css: `body {
            padding: 50px 60px;
            font-size: 1rem;
            line-height: 1.7;
            color: #212121;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
            color: #212121;
            font-weight: 800;
            line-height: 1.15;
        }
        h1 {
            font-size: 2.8rem;
            margin-bottom: 1.2em;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2em;
            border-left: 5px solid #d32f2f;
            padding-left: 15px;
        }
        h3 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        pre {
            background: #263238;
            color: #eceff1;
            padding: 24px;
            border-radius: 8px;
            border-left: 4px solid #d32f2f;
        }
        ${getPremiumBlockCSS('#d32f2f')}
    `
    },
    
    // 19. University Thesis
    {
        id: 19,
        name: "University Thesis",
        group: "Técnicos",
        fonts: {
            head: "'Merriweather', 'Georgia', serif",
            body: "'Merriweather', 'Georgia', serif"
        },
        color: "#1a237e",
        css: `body {
            padding: 80px 95px;
            font-size: 1.15rem;
            line-height: 1.9;
            text-align: justify;
            color: #111;
            max-width: 750px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Merriweather', Georgia, serif;
            color: #1a237e;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.8rem;
            text-align: center;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 1.9rem;
            margin-top: 2.5em;
        }
        h3 {
            font-size: 1.4rem;
            color: #283593;
            margin-top: 2em;
        }
        p {
            margin-bottom: 1em;
            text-indent: 2em;
        }
        p:first-of-type {
            text-indent: 0;
        }
        blockquote {
            border-left: 3px solid #1a237e;
            padding: 10px 20px;
            font-size: 0.95em;
            color: #333;
        }
        ${getPremiumBlockCSS('#1a237e')}
    `
    },
    
    // 20. Reference Guide
    {
        id: 20,
        name: "Reference Guide",
        group: "Técnicos",
        fonts: {
            head: "'Oswald', 'Impact', sans-serif",
            body: "'Lato', 'Helvetica Neue', sans-serif"
        },
        color: "#ef6c00",
        css: `body {
            padding: 50px 60px;
            font-size: 1.05rem;
            line-height: 1.6;
            color: #424242;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Oswald', 'Impact', sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            line-height: 1.1;
        }
        h1 {
            font-size: 3rem;
            background: #ef6c00;
            color: white;
            padding: 0.5em;
            text-align: center;
            margin-bottom: 1em;
        }
        h2 {
            font-size: 2.2rem;
            color: #ef6c00;
            border-bottom: 3px solid #ef6c00;
            margin-top: 2em;
            padding-bottom: 0.3em;
        }
        h3 {
            font-size: 1.5rem;
            color: #e65100;
            font-weight: 700;
        }
        table {
            border: 2px solid #ef6c00;
        }
        th {
            background: #fff3e0;
            color: #ef6c00;
        }
        ${getPremiumBlockCSS('#ef6c00')}
    `
    },
    
    // 21. Medical Journal
    {
        id: 21,
        name: "Medical Journal",
        group: "Técnicos",
        fonts: {
            head: "'Inter', 'Helvetica Neue', sans-serif",
            body: "'Inter', 'Helvetica Neue', sans-serif"
        },
        color: "#0277bd",
        css: `body {
            padding: 60px 75px;
            font-size: 1rem;
            line-height: 1.65;
            color: #263238;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
            color: #0277bd;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.5rem;
            border-bottom: 1px solid #b0bec5;
            padding-bottom: 0.5em;
            margin-bottom: 1.2em;
        }
        h2 {
            font-size: 1.7rem;
            margin-top: 2em;
            color: #01579b;
        }
        h3 {
            font-size: 1.3rem;
        }
        blockquote {
            background: #e1f5fe;
            border-left: 4px solid #0277bd;
            padding: 18px 22px;
            font-size: 0.95em;
        }
        ${getPremiumBlockCSS('#0277bd')}
    `
    },
    
    // 22. Legal Brief
    {
        id: 22,
        name: "Legal Brief",
        group: "Técnicos",
        fonts: {
            head: "'Playfair Display', Georgia, serif",
            body: "'Inter', 'Helvetica Neue', sans-serif"
        },
        color: "#111",
        css: `body {
            padding: 70px 85px;
            font-size: 1rem;
            line-height: 1.6;
            text-align: justify;
            color: #111;
            max-width: 750px;
            margin: 0 auto;
            border: 1px solid #ddd;
        }
        h1, h2, h3 {
            font-family: 'Playfair Display', Georgia, serif;
            color: #111;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.2rem;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 1.5em;
            border-bottom: 2px solid #111;
            padding-bottom: 0.5em;
        }
        h2 {
            font-size: 1.6rem;
            margin-top: 2em;
            text-transform: uppercase;
            font-family: 'Inter', sans-serif;
            font-weight: 700;
        }
        p {
            margin-bottom: 1em;
            text-indent: 2em;
        }
        p:first-of-type {
            text-indent: 0;
        }
        ${getPremiumBlockCSS('#111')}
    `
    },
    
    // 23. Academic Paper
    {
        id: 23,
        name: "Academic Paper",
        group: "Técnicos",
        fonts: {
            head: "'Source Serif 4', 'Georgia', serif",
            body: "'Source Serif 4', 'Georgia', serif"
        },
        color: "#333",
        css: `body {
            padding: 80px 95px;
            font-size: 1.15rem;
            line-height: 1.8;
            text-align: justify;
            color: #000;
            max-width: 750px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Source Serif 4', Georgia, serif;
            color: #000;
            font-weight: 600;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.5rem;
            text-align: center;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 1.8rem;
            margin-top: 2.5em;
        }
        h3 {
            font-size: 1.4rem;
            font-style: italic;
            font-weight: 400;
            margin-top: 1.8em;
        }
        p {
            margin-bottom: 1em;
            text-indent: 2em;
        }
        p:first-of-type {
            text-indent: 0;
        }
        blockquote {
            font-size: 0.95em;
            padding: 10px 20px;
            border-left: 2px solid #ccc;
            margin: 2em 0;
        }
        ${getPremiumBlockCSS('#333')}
    `
    },
    
    // 24. Documentation
    {
        id: 24,
        name: "Documentation",
        group: "Técnicos",
        fonts: {
            head: "'Inter', 'Helvetica Neue', sans-serif",
            body: "'Inter', 'Helvetica Neue', sans-serif"
        },
        color: "#7c3aed",
        css: `body {
            padding: 40px 55px;
            font-size: 1rem;
            line-height: 1.6;
            color: #374151;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
            color: #111827;
            font-weight: 800;
            line-height: 1.15;
        }
        h1 {
            font-size: 2.8rem;
            margin-bottom: 0.5em;
        }
        h1::after {
            content: "";
            display: block;
            width: 50px;
            height: 4px;
            background: #7c3aed;
            margin-top: 0.5em;
        }
        h2 {
            font-size: 1.8rem;
            margin-top: 2em;
            border-top: 1px solid #e5e7eb;
            padding-top: 0.8em;
        }
        code {
            background: #f3f4f6;
            color: #7c3aed;
            font-weight: 500;
        }
        pre {
            background: #1e1e2e;
            color: #cdd6f4;
            border-left: 4px solid #7c3aed;
        }
        pre code {
            background: transparent;
            color: inherit;
        }
        ${getPremiumBlockCSS('#7c3aed')}
    `
    },
    
    // ═══════════════════════════════════════════════
    // CRIATIVOS - Originalidade e Expressão
    // ═══════════════════════════════════════════════
    
    // 25. Vintage Poster
    {
        id: 25,
        name: "Vintage Poster",
        group: "Criativos",
        fonts: {
            head: "'Bebas Neue', 'Impact', sans-serif",
            body: "'Source Serif 4', 'Georgia', serif"
        },
        color: "#bf360c",
        css: `body {
            padding: 50px 60px;
            font-size: 1.1rem;
            line-height: 1.5;
            color: #3e2723;
            background: #fff8e1;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Bebas Neue', 'Impact', sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            line-height: 0.95;
        }
        h1 {
            font-size: 5.5rem;
            color: #bf360c;
            margin-bottom: 0.3em;
        }
        h2 {
            font-size: 3rem;
            color: #5d4037;
            margin-top: 1.5em;
            border-bottom: 4px solid #bf360c;
            display: inline-block;
            padding-bottom: 0.2em;
        }
        h3 {
            font-size: 2rem;
        }
        p {
            font-size: 1.15em;
        }
        blockquote {
            background: #bf360c15;
            border: 2px solid #bf360c;
            padding: 25px 30px;
            text-align: center;
            font-weight: bold;
            color: #bf360c;
            border-radius: 8px;
        }
        ${getPremiumBlockCSS('#bf360c')}
    `
    },
    
    // 26. Pastel Dreams
    {
        id: 26,
        name: "Pastel Dreams",
        group: "Criativos",
        fonts: {
            head: "'Quicksand', 'Helvetica Neue', sans-serif",
            body: "'Quicksand', 'Helvetica Neue', sans-serif"
        },
        color: "#9c27b0",
        css: `body {
            padding: 60px 75px;
            font-size: 1.05rem;
            line-height: 1.75;
            color: #4a4a4a;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Quicksand', 'Helvetica Neue', sans-serif;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 1.5em;
            color: #9c27b0;
        }
        h1::after {
            content: "✨";
            display: block;
            font-size: 0.5em;
            margin-top: 0.3em;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2em;
            color: #7b1fa2;
        }
        h3 {
            font-size: 1.6rem;
            color: #ab47bc;
        }
        blockquote {
            background: linear-gradient(135deg, #f3e5f5, #fce4ec);
            border-left: 5px solid #9c27b0;
            padding: 25px 30px;
            border-radius: 0 16px 16px 0;
        }
        ${getPremiumBlockCSS('#9c27b0')}
    `
    },
    
    // 27. Neon Nights
    {
        id: 27,
        name: "Neon Nights",
        group: "Criativos",
        fonts: {
            head: "'Orbitron', 'Courier New', monospace",
            body: "'Inter', 'Helvetica Neue', sans-serif"
        },
        color: "#00e5ff",
        css: `body {
            padding: 60px 75px;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #e0e0e0;
            background: #0d0d0d;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Orbitron', 'Courier New', monospace;
            color: #00e5ff;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            line-height: 1.1;
            text-shadow: 0 0 10px #00e5ff40;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2em;
            border-bottom: 2px solid #00e5ff;
            padding-bottom: 0.4em;
        }
        h3 {
            font-size: 1.5rem;
            color: #18ffff;
        }
        code {
            background: #1a1a2e;
            color: #00e5ff;
            padding: 2px 6px;
            border: 1px solid #00e5ff40;
        }
        pre {
            background: #0a0a1a;
            border-left: 4px solid #00e5ff;
            color: #b0bec5;
        }
        pre code {
            background: transparent;
            border: none;
        }
        blockquote {
            border-left: 4px solid #00e5ff;
            background: #00e5ff10;
            color: #b0bec5;
        }
        ${getPremiumBlockCSS('#00e5ff')}
    `
    },
    
    // 28. Art Deco
    {
        id: 28,
        name: "Art Deco",
        group: "Criativos",
        fonts: {
            head: "'Poiret One', 'Optima', sans-serif",
            body: "'Raleway', 'Helvetica Neue', sans-serif"
        },
        color: "#c9a227",
        css: `body {
            padding: 80px 95px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #2c2c2c;
            max-width: 750px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Poiret One', 'Optima', sans-serif;
            color: #c9a227;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            line-height: 1.1;
        }
        h1 {
            font-size: 3.5rem;
            text-align: center;
            margin-bottom: 1em;
        }
        h1::after {
            content: "";
            display: block;
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #c9a227, transparent);
            margin: 0.8em auto 0;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2.5em;
            text-align: center;
        }
        h3 {
            font-size: 1.6rem;
            color: #8b6914;
        }
        blockquote {
            border: 1px solid #c9a227;
            background: #c9a22710;
            padding: 30px 40px;
            text-align: center;
            font-style: italic;
        }
        ${getPremiumBlockCSS('#c9a227')}
    `
    },
    
    // 29. Paperback
    {
        id: 29,
        name: "Paperback",
        group: "Criativos",
        fonts: {
            head: "'Arvo', 'Georgia', serif",
            body: "'Arvo', 'Georgia', serif"
        },
        color: "#5d4037",
        css: `body {
            padding: 50px 65px;
            font-size: 1.05rem;
            line-height: 1.75;
            color: #3e2723;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Arvo', Georgia, serif;
            color: #5d4037;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.8rem;
            text-align: center;
            margin-bottom: 1.5em;
            padding-bottom: 0.5em;
            border-bottom: 3px double #5d4037;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2em;
            color: #795548;
        }
        h3 {
            font-size: 1.5rem;
            color: #8d6e63;
        }
        blockquote {
            border-left: 4px solid #5d4037;
            background: #5d403708;
            font-style: italic;
        }
        ${getPremiumBlockCSS('#5d4037')}
    `
    },
    
    // 30. Handwritten
    {
        id: 30,
        name: "Handwritten",
        group: "Criativos",
        fonts: {
            head: "'Caveat', 'Comic Sans MS', cursive",
            body: "'Nunito', 'Trebuchet MS', sans-serif"
        },
        color: "#4a4a4a",
        css: `body {
            padding: 60px 75px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #4a4a4a;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Caveat', 'Comic Sans MS', cursive;
            color: #333;
            font-weight: 700;
            line-height: 1.3;
        }
        h1 {
            font-size: 3.5rem;
            text-align: center;
            margin-bottom: 1em;
        }
        h1::after {
            content: "~";
            display: block;
            font-size: 0.8em;
            margin-top: 0.3em;
        }
        h2 {
            font-size: 2.5rem;
            margin-top: 2em;
            color: #555;
        }
        h3 {
            font-size: 2rem;
            color: #666;
        }
        blockquote {
            border-left: 3px dashed #999;
            font-style: italic;
            color: #666;
            background: #f9f9f9;
            padding: 20px 25px;
        }
        ${getPremiumBlockCSS('#4a4a4a')}
    `
    },
    
    // ═══════════════════════════════════════════════
    // ELEGANTES - Sofisticação e Graça
    // ═══════════════════════════════════════════════
    
    // 31. Minimalist Luxe
    {
        id: 31,
        name: "Minimalist Luxe",
        group: "Elegantes",
        fonts: {
            head: "'Montserrat', 'Helvetica Neue', sans-serif",
            body: "'Nunito', 'Helvetica Neue', sans-serif"
        },
        color: "#1a1a1a",
        css: `body {
            padding: 80px 100px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #333;
            max-width: 780px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Montserrat', 'Helvetica Neue', sans-serif;
            color: #1a1a1a;
            font-weight: 300;
            line-height: 1.1;
            letter-spacing: -0.02em;
        }
        h1 {
            font-size: 4rem;
            text-align: center;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2.5rem;
            margin-top: 2.5em;
            font-weight: 600;
        }
        h3 {
            font-size: 1.8rem;
        }
        blockquote {
            border-left: 1px solid #ccc;
            font-weight: 300;
            font-size: 1.2em;
            color: #666;
            padding-left: 25px;
        }
        ${getPremiumBlockCSS('#1a1a1a')}
    `
    },
    
    // 32. Gold & Black
    {
        id: 32,
        name: "Gold & Black",
        group: "Elegantes",
        fonts: {
            head: "'Cormorant Garamond', Georgia, serif",
            body: "'Lato', 'Helvetica Neue', sans-serif"
        },
        color: "#c9a227",
        css: `body {
            padding: 70px 85px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #333;
            max-width: 750px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Cormorant Garamond', Georgia, serif;
            color: #c9a227;
            font-weight: 600;
            line-height: 1.15;
        }
        h1 {
            font-size: 3.5rem;
            text-align: center;
            margin-bottom: 1.5em;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
        h2 {
            font-size: 2.4rem;
            margin-top: 2.5em;
        }
        h3 {
            font-size: 1.8rem;
            color: #8b6914;
        }
        blockquote {
            border-left: 3px solid #c9a227;
            background: #c9a22708;
            padding: 25px 30px;
        }
        ${getPremiumBlockCSS('#c9a227')}
    `
    },
    
    // 33. Silk Thread
    {
        id: 33,
        name: "Silk Thread",
        group: "Elegantes",
        fonts: {
            head: "'Lora', Georgia, serif",
            body: "'Nunito', 'Helvetica Neue', sans-serif"
        },
        color: "#8d6e63",
        css: `body {
            padding: 60px 75px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #4e342e;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Lora', Georgia, serif;
            color: #8d6e63;
            font-weight: 600;
            line-height: 1.2;
        }
        h1 {
            font-size: 3.2rem;
            text-align: center;
            margin-bottom: 1.5em;
        }
        h1::after {
            content: "";
            display: block;
            width: 60px;
            height: 1px;
            background: #8d6e63;
            margin: 0.8em auto 0;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2em;
        }
        h3 {
            font-size: 1.6rem;
            color: #a1887f;
        }
        blockquote {
            border-left: 3px solid #8d6e63;
            background: #8d6e6308;
            font-style: italic;
        }
        ${getPremiumBlockCSS('#8d6e63')}
    `
    },
    
    // 34. Platinum
    {
        id: 34,
        name: "Platinum",
        group: "Elegantes",
        fonts: {
            head: "'Playfair Display', Georgia, serif",
            body: "'Source Sans 3', 'Helvetica Neue', sans-serif"
        },
        color: "#546e7a",
        css: `body {
            padding: 70px 85px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #37474f;
            max-width: 750px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Playfair Display', Georgia, serif;
            color: #546e7a;
            font-weight: 700;
            line-height: 1.15;
        }
        h1 {
            font-size: 3.8rem;
            text-align: center;
            margin-bottom: 1.5em;
            font-style: italic;
        }
        h2 {
            font-size: 2.5rem;
            margin-top: 2.5em;
            color: #78909c;
        }
        h3 {
            font-size: 1.8rem;
            color: #90a4ae;
        }
        blockquote {
            border-left: 3px solid #546e7a;
            font-style: italic;
            color: #607d8b;
        }
        ${getPremiumBlockCSS('#546e7a')}
    `
    },
    
    // 35. Royal Purple
    {
        id: 35,
        name: "Royal Purple",
        group: "Elegantes",
        fonts: {
            head: "'Cinzel', Georgia, serif",
            body: "'Nunito', 'Helvetica Neue', sans-serif"
        },
        color: "#4a148c",
        css: `body {
            padding: 70px 85px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #333;
            max-width: 750px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Cinzel', Georgia, serif;
            color: #4a148c;
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            line-height: 1.15;
        }
        h1 {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2.5em;
        }
        h3 {
            font-size: 1.5rem;
            color: #6a1b9a;
        }
        blockquote {
            border-left: 4px solid #4a148c;
            background: #4a148c08;
            padding: 25px 30px;
        }
        ${getPremiumBlockCSS('#4a148c')}
    `
    },
    
    // 36. Midnight Rose
    {
        id: 36,
        name: "Midnight Rose",
        group: "Elegantes",
        fonts: {
            head: "'Cormorant Garamond', Georgia, serif",
            body: "'Raleway', 'Helvetica Neue', sans-serif"
        },
        color: "#880e4f",
        css: `body {
            padding: 70px 85px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #333;
            max-width: 750px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Cormorant Garamond', Georgia, serif;
            color: #880e4f;
            font-weight: 600;
            line-height: 1.15;
        }
        h1 {
            font-size: 3.5rem;
            text-align: center;
            margin-bottom: 1.5em;
            font-style: italic;
        }
        h2 {
            font-size: 2.4rem;
            margin-top: 2.5em;
        }
        h3 {
            font-size: 1.8rem;
            color: #ad1457;
        }
        blockquote {
            border-left: 3px solid #880e4f;
            background: #880e4f08;
            font-style: italic;
        }
        ${getPremiumBlockCSS('#880e4f')}
    `
    },
    
    // ═══════════════════════════════════════════════
    // EDUCACIONAIS - Clareza e Aprendizado
    // ═══════════════════════════════════════════════
    
    // 37. Classroom
    {
        id: 37,
        name: "Classroom",
        group: "Educacionais",
        fonts: {
            head: "'Open Sans', 'Helvetica Neue', sans-serif",
            body: "'Open Sans', 'Helvetica Neue', sans-serif"
        },
        color: "#1565c0",
        css: `body {
            padding: 50px 65px;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Open Sans', 'Helvetica Neue', sans-serif;
            color: #1565c0;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.8rem;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2em;
            border-bottom: 2px solid #1565c0;
            padding-bottom: 0.4em;
        }
        h3 {
            font-size: 1.5rem;
            color: #1976d2;
        }
        .learning-block {
            background: linear-gradient(135deg, #e3f2fd, #bbdefb);
            border-left: 5px solid #1565c0;
            border-radius: 0 12px 12px 0;
            padding: 25px 30px;
            margin: 2em 0;
        }
        .exercise-block {
            background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
            border: 2px dashed #4caf50;
            border-radius: 12px;
            padding: 25px 30px;
            margin: 2em 0;
        }
        ${educationalBlocksCSS}
        ${getPremiumBlockCSS('#1565c0')}
    `
    },
    
    // 38. Science Lab
    {
        id: 38,
        name: "Science Lab",
        group: "Educacionais",
        fonts: {
            head: "'Roboto', 'Helvetica Neue', sans-serif",
            body: "'Roboto', 'Helvetica Neue', sans-serif"
        },
        color: "#00695c",
        css: `body {
            padding: 50px 65px;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Roboto', 'Helvetica Neue', sans-serif;
            color: #00695c;
            font-weight: 500;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.8rem;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2em;
        }
        h3 {
            font-size: 1.5rem;
            color: #00897b;
        }
        code {
            background: #e0f2f1;
            color: #00695c;
        }
        pre {
            background: #263238;
            color: #b0bec5;
            border-left: 4px solid #00695c;
        }
        pre code {
            background: transparent;
            color: inherit;
        }
        .learning-block {
            background: linear-gradient(135deg, #e0f2f1, #b2dfdb);
            border-left: 5px solid #00695c;
        }
        ${educationalBlocksCSS}
        ${getPremiumBlockCSS('#00695c')}
    `
    },
    
    // 39. History Book
    {
        id: 39,
        name: "History Book",
        group: "Educacionais",
        fonts: {
            head: "'Merriweather', Georgia, serif",
            body: "'Source Serif 4', Georgia, serif"
        },
        color: "#4e342e",
        css: `body {
            padding: 60px 75px;
            font-size: 1.1rem;
            line-height: 1.8;
            text-align: justify;
            color: #3e2723;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Merriweather', Georgia, serif;
            color: #4e342e;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.8rem;
            text-align: center;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2em;
            border-bottom: 2px solid #4e342e;
            padding-bottom: 0.4em;
        }
        h3 {
            font-size: 1.5rem;
            color: #5d4037;
        }
        blockquote {
            border-left: 4px solid #4e342e;
            background: #4e342e08;
            font-style: italic;
        }
        .insight-block {
            background: linear-gradient(135deg, #efebe9, #d7ccc8);
            border-left: 5px solid #4e342e;
        }
        ${educationalBlocksCSS}
        ${getPremiumBlockCSS('#4e342e')}
    `
    },
    
    // 40. Language Arts
    {
        id: 40,
        name: "Language Arts",
        group: "Educacionais",
        fonts: {
            head: "'Nunito', 'Helvetica Neue', sans-serif",
            body: "'Nunito', 'Helvetica Neue', sans-serif"
        },
        color: "#7b1fa2",
        css: `body {
            padding: 50px 65px;
            font-size: 1.05rem;
            line-height: 1.75;
            color: #424242;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Nunito', 'Helvetica Neue', sans-serif;
            color: #7b1fa2;
            font-weight: 700;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.8rem;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 2rem;
            margin-top: 2em;
        }
        h3 {
            font-size: 1.5rem;
            color: #9c27b0;
        }
        blockquote {
            border-left: 4px solid #7b1fa2;
            background: #f3e5f5;
            padding: 20px 25px;
            font-style: italic;
        }
        .protip-block {
            background: linear-gradient(135deg, #f3e5f5, #e1bee7);
            border-left: 5px solid #7b1fa2;
        }
        ${educationalBlocksCSS}
        ${getPremiumBlockCSS('#7b1fa2')}
    `
    },
    
    // 41. Math Class
    {
        id: 41,
        name: "Math Class",
        group: "Educacionais",
        fonts: {
            head: "'IBM Plex Mono', 'Consolas', monospace",
            body: "'IBM Plex Sans', 'Helvetica Neue', sans-serif"
        },
        color: "#1565c0",
        css: `body {
            padding: 50px 65px;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'IBM Plex Mono', 'Consolas', monospace;
            color: #1565c0;
            font-weight: 600;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 1.8rem;
            margin-top: 2em;
        }
        h3 {
            font-size: 1.4rem;
            color: #1976d2;
        }
        code {
            background: #e3f2fd;
            color: #1565c0;
            padding: 2px 8px;
            border-radius: 4px;
        }
        pre {
            background: #263238;
            color: #b0bec5;
            border-left: 4px solid #1565c0;
        }
        pre code {
            background: transparent;
            color: inherit;
        }
        .learning-block {
            background: linear-gradient(135deg, #e3f2fd, #bbdefb);
            border-left: 5px solid #1565c0;
        }
        ${educationalBlocksCSS}
        ${getPremiumBlockCSS('#1565c0')}
    `
    },
    
    // 42. Creative Writing
    {
        id: 42,
        name: "Creative Writing",
        group: "Educacionais",
        fonts: {
            head: "'Lora', Georgia, serif",
            body: "'Lora', Georgia, serif"
        },
        color: "#37474f",
        css: `body {
            padding: 60px 75px;
            font-size: 1.1rem;
            line-height: 1.85;
            text-align: justify;
            color: #37474f;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Lora', Georgia, serif;
            color: #37474f;
            font-weight: 600;
            line-height: 1.2;
        }
        h1 {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 1.5em;
            font-style: italic;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2em;
            font-style: italic;
        }
        h3 {
            font-size: 1.6rem;
            color: #546e7a;
        }
        blockquote {
            border-left: 3px solid #37474f;
            background: #37474f08;
            font-style: italic;
        }
        .protip-block {
            background: linear-gradient(135deg, #eceff1, #cfd8dc);
            border-left: 5px solid #37474f;
        }
        ${educationalBlocksCSS}
        ${getPremiumBlockCSS('#37474f')}
    `
    },
    
    // ═══════════════════════════════════════════════
    // TECNOLÓGICOS - Inovação e Futuro
    // ═══════════════════════════════════════════════
    
    // 43. Cyberpunk
    {
        id: 43,
        name: "Cyberpunk",
        group: "Tecnológicos",
        fonts: {
            head: "'Orbitron', 'Courier New', monospace",
            body: "'Share Tech Mono', 'Consolas', monospace"
        },
        color: "#00e676",
        css: `body {
            padding: 50px 65px;
            font-size: 1rem;
            line-height: 1.6;
            color: #b0bec5;
            background: #0a0a0a;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Orbitron', 'Courier New', monospace;
            color: #00e676;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            line-height: 1.1;
            text-shadow: 0 0 10px #00e67640;
        }
        h1 {
            font-size: 2.8rem;
            margin-bottom: 1em;
        }
        h1::after {
            content: "_";
            animation: blink 1s infinite;
        }
        @keyframes blink {
            50% { opacity: 0; }
        }
        h2 {
            font-size: 2rem;
            margin-top: 2em;
            border-bottom: 1px solid #00e676;
            padding-bottom: 0.4em;
        }
        h3 {
            font-size: 1.5rem;
            color: #69f0ae;
        }
        code {
            background: #1a1a2e;
            color: #00e676;
            border: 1px solid #00e67640;
        }
        pre {
            background: #0d0d1a;
            border-left: 4px solid #00e676;
            color: #b0bec5;
        }
        pre code {
            background: transparent;
            border: none;
        }
        blockquote {
            border-left: 4px solid #00e676;
            background: #00e67610;
        }
        ${getPremiumBlockCSS('#00e676')}
    `
    },
    
    // 44. Matrix
    {
        id: 44,
        name: "Matrix",
        group: "Tecnológicos",
        fonts: {
            head: "'Fira Code', 'Consolas', monospace",
            body: "'Fira Code', 'Consolas', monospace"
        },
        color: "#00c853",
        css: `body {
            padding: 50px 65px;
            font-size: 0.95rem;
            line-height: 1.6;
            color: #a5d6a7;
            background: #000000;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Fira Code', 'Consolas', monospace;
            color: #00c853;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1em;
        }
        h2 {
            font-size: 1.8rem;
            margin-top: 2em;
            border-bottom: 1px solid #00c853;
        }
        h3 {
            font-size: 1.4rem;
            color: #69f0ae;
        }
        code {
            background: #1b2e1b;
            color: #00c853;
        }
        pre {
            background: #0a1a0a;
            border-left: 4px solid #00c853;
            color: #a5d6a7;
        }
        pre code {
            background: transparent;
        }
        blockquote {
            border-left: 4px solid #00c853;
            background: #00c85310;
        }
        ${getPremiumBlockCSS('#00c853')}
    `
    },
    
    // 45. Hologram
    {
        id: 45,
        name: "Hologram",
        group: "Tecnológicos",
        fonts: {
            head: "'Exo 2', 'Helvetica Neue', sans-serif",
            body: "'Exo 2', 'Helvetica Neue', sans-serif"
        },
        color: "#00bcd4",
        css: `body {
            padding: 50px 65px;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #eceff1;
            background: linear-gradient(135deg, #0d0d1a, #1a0d1a);
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Exo 2', 'Helvetica Neue', sans-serif;
            color: #00bcd4;
            font-weight: 600;
            line-height: 1.15;
            text-shadow: 0 0 15px #00bcd430;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1em;
            text-align: center;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2em;
            border-bottom: 2px solid #00bcd4;
            padding-bottom: 0.4em;
        }
        h3 {
            font-size: 1.6rem;
            color: #4dd0e1;
        }
        code {
            background: #1a2a2a;
            color: #00bcd4;
            border: 1px solid #00bcd440;
        }
        pre {
            background: #0a1515;
            border-left: 4px solid #00bcd4;
        }
        pre code {
            background: transparent;
            border: none;
        }
        blockquote {
            border-left: 4px solid #00bcd4;
            background: #00bcd410;
        }
        ${getPremiumBlockCSS('#00bcd4')}
    `
    },
    
    // 46. Terminal
    {
        id: 46,
        name: "Terminal",
        group: "Tecnológicos",
        fonts: {
            head: "'JetBrains Mono', 'Consolas', monospace",
            body: "'JetBrains Mono', 'Consolas', monospace"
        },
        color: "#ff9100",
        css: `body {
            padding: 50px 65px;
            font-size: 0.95rem;
            line-height: 1.6;
            color: #ffcc80;
            background: #1a1a1a;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'JetBrains Mono', 'Consolas', monospace;
            color: #ff9100;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            line-height: 1.2;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1em;
        }
        h1::before {
            content: "$ ";
            color: #ff6d00;
        }
        h2 {
            font-size: 1.8rem;
            margin-top: 2em;
        }
        h2::before {
            content: "> ";
            color: #ff6d00;
        }
        h3 {
            font-size: 1.4rem;
            color: #ffab40;
        }
        code {
            background: #2a2a2a;
            color: #ff9100;
        }
        pre {
            background: #0d0d0d;
            border-left: 4px solid #ff9100;
            color: #ffcc80;
        }
        pre code {
            background: transparent;
        }
        blockquote {
            border-left: 4px solid #ff9100;
            background: #ff910010;
        }
        ${getPremiumBlockCSS('#ff9100')}
    `
    },
    
    // 47. Futuristic
    {
        id: 47,
        name: "Futuristic",
        group: "Tecnológicos",
        fonts: {
            head: "'Rajdhani', 'Helvetica Neue', sans-serif",
            body: "'Rajdhani', 'Helvetica Neue', sans-serif"
        },
        color: "#7c4dff",
        css: `body {
            padding: 50px 65px;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #e0e0e0;
            background: #121212;
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Rajdhani', 'Helvetica Neue', sans-serif;
            color: #7c4dff;
            font-weight: 600;
            line-height: 1.1;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        h1 {
            font-size: 3.2rem;
            margin-bottom: 1em;
        }
        h2 {
            font-size: 2.4rem;
            margin-top: 2em;
            border-bottom: 2px solid #7c4dff;
            padding-bottom: 0.4em;
        }
        h3 {
            font-size: 1.8rem;
            color: #b388ff;
        }
        code {
            background: #1e1e2e;
            color: #7c4dff;
            border: 1px solid #7c4dff40;
        }
        pre {
            background: #0a0a15;
            border-left: 4px solid #7c4dff;
        }
        pre code {
            background: transparent;
            border: none;
        }
        blockquote {
            border-left: 4px solid #7c4dff;
            background: #7c4dff10;
        }
        ${getPremiumBlockCSS('#7c4dff')}
    `
    },
    
    // 48. Quantum
    {
        id: 48,
        name: "Quantum",
        group: "Tecnológicos",
        fonts: {
            head: "'Space Grotesk', 'Helvetica Neue', sans-serif",
            body: "'Space Grotesk', 'Helvetica Neue', sans-serif"
        },
        color: "#00bfa5",
        css: `body {
            padding: 50px 65px;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #eceff1;
            background: linear-gradient(180deg, #0a0a15, #0d1515);
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Space Grotesk', 'Helvetica Neue', sans-serif;
            color: #00bfa5;
            font-weight: 500;
            line-height: 1.15;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1em;
        }
        h1::after {
            content: "";
            display: block;
            width: 80px;
            height: 3px;
            background: linear-gradient(90deg, #00bfa5, transparent);
            margin-top: 0.5em;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2em;
        }
        h3 {
            font-size: 1.6rem;
            color: #64ffda;
        }
        code {
            background: #1a2a2a;
            color: #00bfa5;
            border: 1px solid #00bfa540;
        }
        pre {
            background: #0a1515;
            border-left: 4px solid #00bfa5;
        }
        pre code {
            background: transparent;
            border: none;
        }
        blockquote {
            border-left: 4px solid #00bfa5;
            background: #00bfa510;
        }
        ${getPremiumBlockCSS('#00bfa5')}
    `
    },
    
    // 49. AI Neural
    {
        id: 49,
        name: "AI Neural",
        group: "Tecnológicos",
        fonts: {
            head: "'Sora', 'Helvetica Neue', sans-serif",
            body: "'Sora', 'Helvetica Neue', sans-serif"
        },
        color: "#e040fb",
        css: `body {
            padding: 50px 65px;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #e0e0e0;
            background: linear-gradient(135deg, #0a0a15, #150a15);
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            font-family: 'Sora', 'Helvetica Neue', sans-serif;
            color: #e040fb;
            font-weight: 600;
            line-height: 1.15;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1em;
            text-align: center;
        }
        h1::before {
            content: "[ ";
            color: #ea80fc;
        }
        h1::after {
            content: " ]";
            color: #ea80fc;
        }
        h2 {
            font-size: 2.2rem;
            margin-top: 2em;
            border-bottom: 2px solid #e040fb;
            padding-bottom: 0.4em;
        }
        h3 {
            font-size: 1.6rem;
            color: #ea80fc;
        }
        code {
            background: #1a1a2e;
            color: #e040fb;
            border: 1px solid #e040fb40;
        }
        pre {
            background: #0a0a15;
            border-left: 4px solid #e040fb;
        }
        pre code {
            background: transparent;
            border: none;
        }
        blockquote {
            border-left: 4px solid #e040fb;
            background: #e040fb10;
        }
        ${getPremiumBlockCSS('#e040fb')}
    `
    }
];

/* ============================================
   GERENCIADOR DE TEMAS
   ============================================ */

// StorageManager compat (usado por renderList/selectTheme)
if (typeof StorageManager === 'undefined') {
    var StorageManager = {
        getSettings() { return JSON.parse(localStorage.getItem('md2pdf_settings') || '{}'); },
        updateSettings(partial) {
            const s = this.getSettings();
            Object.assign(s, partial);
            localStorage.setItem('md2pdf_settings', JSON.stringify(s));
        }
    };
}

const ThemeManager = {
    init() {
        try { this.renderList(); } catch(e) {}
        try { this.updatePreview(); } catch(e) {}
        try { this.initThemeEditor(); } catch(e) {}
    },

    getAll() {
        return THEMES;
    },

    getGroups() {
        const groups = {};
        THEMES.forEach(theme => {
            if (!groups[theme.group]) groups[theme.group] = [];
            groups[theme.group].push(theme);
        });
        return groups;
    },

    getThemeById(id) {
        return THEMES.find(t => t.id === id) || THEMES[0];
    },

    get(id) {
        return this.getThemeById(parseInt(id));
    },

    getThemeCSS(theme) {
        return `
            body {
                font-family: ${theme.fonts.body};
                ${theme.css}
            }
            h1, h2, h3, h4, h5, h6 {
                font-family: ${theme.fonts.head};
            }
        `;
    },

    getPrintCSS(theme) {
        const accentColor = theme.color || '#333';
        const themeBodyCSS = theme.css
            .replace(/padding:\s*[^;]+;?/gi, '')
            .replace(/margin:\s*[^;]+;?/gi, '')
            .replace(/max-width:\s*[^;]+;?/gi, '')
            .replace(/text-align:\s*justify;?/gi, '');

        const fontLinkHTML = getGoogleFontsLink(theme.fonts.head, theme.fonts.body);

        return `
            body {
                font-family: ${theme.fonts.body};
                padding: 0 !important;
                margin: 0 !important;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                text-rendering: optimizeLegibility;
                font-kerning: normal;
                font-feature-settings: "liga" 1, "kern" 1;
                hyphens: auto;
                -webkit-hyphens: auto;
                orphans: 3;
                widows: 3;
                ${themeBodyCSS}
            }
            h1, h2, h3, h4, h5, h6 {
                font-family: ${theme.fonts.head};
                text-rendering: optimizeLegibility;
                font-kerning: normal;
                font-feature-settings: "liga" 1, "kern" 1, "dlig" 1;
            }
            /* Refinamento tipográfico para elementos de texto */
            p {
                orphans: 3;
                widows: 3;
                font-kerning: normal;
            }
            blockquote {
                font-kerning: normal;
                font-feature-settings: "liga" 1, "kern" 1;
            }
            li {
                orphans: 2;
                widows: 2;
            }
            /* Elementos decorativos */
            ${ornamentDividerCSS(accentColor)}
            /* Esconde UI */
            #app, header, .editor-pane, .status-bar,
            .toolbar, .find-replace-bar, .pix-modal-overlay,
            .pix-cta, .toast-container, .app-footer {
                display: none !important;
            }
            .preview-pane {
                width: 100% !important;
                height: auto !important;
                border: none !important;
                position: static !important;
                overflow: visible !important;
                background: white !important;
                padding: 0 !important;
            }
            #preview-content {
                padding: 0 !important;
                max-width: none !important;
                height: auto !important;
                overflow: visible !important;
            }
            .book-paper {
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                max-width: none !important;
                margin: 0 !important;
                width: 100% !important;
                background: white !important;
            }
            h1, h2 {
                page-break-before: always;
            }
            h1:first-of-type, h2:first-of-type {
                page-break-before: auto;
            }
            h1, h2, h3, h4 {
                page-break-after: avoid;
            }
            p, ul, ol, blockquote, table, img, figure, pre, code {
                page-break-inside: avoid;
            }
            img {
                max-width: 100% !important;
                height: auto !important;
            }
            .cover-block {
                page-break-after: always;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                padding: 80px 60px;
            }
            .toc-block {
                page-break-after: always;
            }
            a {
                color: #333 !important;
                text-decoration: none !important;
            }
            a::after {
                content: " (" attr(href) ")";
                font-size: 0.8em;
                color: #666;
            }
            nav a::after, .toc a::after, a[href^="#"]::after, .toc-block a::after {
                content: none !important;
            }
            pre {
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
            }
            table {
                border-collapse: collapse !important;
            }
        `;
    },

    buildThemeCSS(theme) {
        const accentColor = theme.color || '#333';
        const themeBodyCSS = theme.css
            .replace(/padding:\s*[^;]+;?/gi, '')
            .replace(/margin:\s*[^;]+;?/gi, '')
            .replace(/max-width:\s*[^;]+;??/gi, '');

        let fullCSS = `
            #preview-content {
                font-family: ${theme.fonts.body};
                color: #333;
                line-height: 1.7;
                padding: 50px 65px;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                text-rendering: optimizeLegibility;
                font-kerning: normal;
                font-feature-settings: "liga" 1, "kern" 1;
                hyphens: auto;
                -webkit-hyphens: auto;
                orphans: 3;
                widows: 3;
                ${themeBodyCSS}
            }
            #preview-content h1, #preview-content h2, #preview-content h3,
            #preview-content h4, #preview-content h5, #preview-content h6 {
                font-family: ${theme.fonts.head};
                color: ${theme.color || '#1a1a1a'};
                text-rendering: optimizeLegibility;
                font-kerning: normal;
                font-feature-settings: "liga" 1, "kern" 1, "dlig" 1;
            }
            #preview-content blockquote,
            #preview-content li {
                font-kerning: normal;
            }
            #preview-content p {
                orphans: 3;
                widows: 3;
                font-kerning: normal;
            }
            #preview-content li {
                orphans: 2;
                widows: 2;
            }
            ${ornamentDividerCSS(accentColor)}
        `;
        if (document.body.classList.contains('educational-mode')) {
            fullCSS += educationalBlocksCSS;
        }
        fullCSS += pageBreakCSS;

        const existingStyle = document.getElementById('theme-style');
        if (existingStyle) existingStyle.remove();
        const style = document.createElement('style');
        style.id = 'theme-style';
        style.textContent = fullCSS;
        document.head.appendChild(style);

        const preview = document.getElementById('preview-content');
        if (preview) {
            preview.style.cssText = `
                font-family: ${theme.fonts.body};
                color: #333;
            `;
        }
        const paper = document.querySelector('.book-paper');
        if (paper) {
            paper.style.cssText = `
                background: white;
                width: 100%;
                max-width: 800px;
            `;
        }
        const themePreviewEl = document.getElementById('theme-preview-current');
        if (themePreviewEl) {
            themePreviewEl.style.fontFamily = theme.fonts.body;
            themePreviewEl.style.color = '#333';
        }
        const headingPreview = document.getElementById('theme-preview-heading');
        if (headingPreview) {
            headingPreview.style.fontFamily = theme.fonts.head;
            headingPreview.style.color = theme.color;
        }
        const blockPreview = document.getElementById('theme-preview-blockquote');
        if (blockPreview) {
            blockPreview.style.borderLeftColor = theme.color;
        }
        const codePreview = document.getElementById('theme-preview-code');
        if (codePreview) {
            codePreview.style.color = theme.color;
        }
    },

    renderList() {
        const container = document.getElementById('theme-list');
        if (!container) return;
        container.innerHTML = '';
        const groups = {};
        THEMES.forEach(theme => {
            if (!groups[theme.group]) groups[theme.group] = [];
            groups[theme.group].push(theme);
        });
        Object.keys(groups).forEach(groupName => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'theme-group';
            const groupTitle = document.createElement('div');
            groupTitle.className = 'theme-group-title';
            groupTitle.textContent = groupName;
            groupDiv.appendChild(groupTitle);
            groups[groupName].forEach(theme => {
                const item = document.createElement('div');
                item.className = 'theme-item';
                item.dataset.themeId = theme.id;
                if (StorageManager.getSettings().themeId === theme.id) {
                    item.classList.add('active');
                }
                item.innerHTML = `
                    <div class="theme-item-color" style="background: ${theme.color}"></div>
                    <span class="theme-item-name">${theme.name}</span>
                `;
                item.addEventListener('click', () => this.selectTheme(theme.id));
                groupDiv.appendChild(item);
            });
            container.appendChild(groupDiv);
        });
    },

    selectTheme(themeId) {
        StorageManager.updateSettings({ themeId });
        this.renderList();
        this.updatePreview();
        App.closeModal('themes');
    },

    updatePreview() {
        const settings = StorageManager.getSettings();
        const theme = this.getThemeById(settings.themeId);
        this.buildThemeCSS(theme);
    },

    initThemeEditor() {
        const saved = localStorage.getItem('customTheme');
        if (saved) {
            try {
                const customTheme = JSON.parse(saved);
                this.applyCustomTheme(customTheme);
            } catch (e) {
                console.warn('Custom theme load error:', e);
            }
        }
    },

    applyCustomTheme(theme) {
        const customCSS = `
            body {
                font-family: ${theme.bodyFont} !important;
                font-size: ${theme.fontSize}px !important;
                line-height: ${theme.lineHeight} !important;
                text-align: ${theme.textAlign} !important;
                background: ${theme.backgroundColor} !important;
                color: ${theme.textColor} !important;
            }
            h1, h2, h3, h4, h5, h6 {
                font-family: ${theme.headingFont} !important;
                color: ${theme.headingColor} !important;
            }
            h1 { font-size: ${theme.h1Size}px !important; }
            h2 { font-size: ${theme.h2Size}px !important; }
            h3 { font-size: ${theme.h3Size}px !important; }
            h4 { font-size: ${theme.h4Size}px !important; }
            p { margin-bottom: 1.5em !important; }
            a { color: ${theme.linkColor} !important; }
            a:hover { color: ${theme.linkHoverColor} !important; }
        `;
        const existingCustom = document.getElementById('custom-theme-style');
        if (existingCustom) existingCustom.remove();
        const style = document.createElement('style');
        style.id = 'custom-theme-style';
        style.textContent = customCSS;
        document.head.appendChild(style);
    },

    resetToDefault() {
        localStorage.removeItem('customTheme');
        const customStyle = document.getElementById('custom-theme-style');
        if (customStyle) customStyle.remove();
        this.updatePreview();
    },

    saveUserTheme(theme) {
        const saved = JSON.parse(localStorage.getItem('userThemes') || '[]');
        const idx = saved.findIndex(t => t.id === theme.id);
        if (idx >= 0) {
            saved[idx] = theme;
        } else {
            saved.push(theme);
        }
        localStorage.setItem('userThemes', JSON.stringify(saved));
        // Adicionar ao array THEMES se nao existir
        const existing = THEMES.findIndex(t => t.id === theme.id);
        if (existing >= 0) {
            THEMES[existing] = theme;
        } else {
            THEMES.push(theme);
        }
    }
};
