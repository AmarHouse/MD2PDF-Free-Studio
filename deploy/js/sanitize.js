/* ============================================
   SANITIZE.JS - Sanitização por allowlist no sink
   ============================================ */

const Sanitize = (function () {
    'use strict';

    // Default do DOMPurify, sem acréscimos (P8): img[src] com data: já é
    // aceito por padrão (img está em DATA_URI_TAGS do DOMPurify) — o
    // gerenciador de imagens (image-manager.js, readAsDataURL) gera
    // data:image/. data: em a[href] não tem requisito de produto e foi
    // removido (ADD_DATA_URI_TAGS: ['a'] saiu).
    const OPTIONS = {};

    // Marca d'água é interpolada em content: "..." dentro de <style> (raw
    // text) e em value="..." do modal. Removemos apenas o que fecha string
    // CSS ou atributo — o conjunto do vetor P2: < > " \ & { } e quebras de
    // linha/CR. Todo o resto é preservado, incluindo pontuação tipográfica
    // legítima em pt/en/es (º ª « » — × ÷ aspas "…" '…', ©®™ etc.) — regressão
    // registrada no CODE-REVIEW (achado 2) e corrigida aqui.
    // Remover em vez de escapar: o escape dependeria do contexto (\" no CSS
    // vs &quot;/&#34; no atributo HTML) e uma única função compartilhada
    // pelos dois sinks não pode produzir uma string segura nos dois; a
    // remoção destes caracteres é independente de contexto e
    // provadamente segura (decisão registrada em IMPLEMENTATION-NOTES).
    // P11: \f (U+000C, form feed) é newline legado do CSS2.1 — se o
    // tokenizer encerrar a string CSS em FF, o restante viraria CSS dentro
    // do <style>. Sem <>/" o pior caso era @import (beacon); a consistência
    // com css-syntax-3 pede removê-lo junto de CR/LF (verificado empírico
    // pelo gate QA-N2: 15 payloads, 1 <style>, 0 <script> antes e depois).
    const WATERMARK_BLOCKED = /[<>"\\&{}\r\n\f]/g;

    let warned = false;

    function html(dirty, opts) {
        if (typeof dirty !== 'string') return '';
        if (typeof window.DOMPurify === 'undefined') {
            // Fail-closed (D2): sem o sanitizador, nenhum HTML não
            // sanitizado passa — preview em branco em vez de vulnerável.
            console.error('Sanitize.html: window.DOMPurify ausente — saída bloqueada (fail-closed). Verifique js/vendor/dompurify.min.js.');
            if (!warned && typeof App !== 'undefined' && typeof App.showToast === 'function') {
                warned = true;
                App.showToast('Sanitizador indisponível — preview bloqueado por segurança. Recarregue a página.', 'error');
            }
            return '';
        }
        const config = opts ? Object.assign({}, OPTIONS, opts) : OPTIONS;
        return window.DOMPurify.sanitize(dirty, config);
    }

    function watermark(value) {
        if (typeof value !== 'string') return '';
        return value.replace(WATERMARK_BLOCKED, '').trim();
    }

    // Cor de tema/accent (S5/S6): interpolada em CSS (color:, background:,
    // linear-gradient) e em style="background: ..." da lista de temas. Um
    // valor hostil ("red; } body { ...") sairia do valor da propriedade e
    // injetaria declarações. Validação por allowlist das formas que o
    // produto usa (#rgb/#rrggbb/#rrggbbaa, rgb()/rgba(), hsl()/hsla()) +
    // negação de delimitadores; inválido/não-string cai no neutro '#333'.
    const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i;
    const COLOR_BLOCKED = /[;{}"'<>\\\n\r\f]/;

    function color(value) {
        if (typeof value !== 'string') return '#333';
        const trimmed = value.trim();
        if (!trimmed || COLOR_BLOCKED.test(trimmed) || !COLOR_RE.test(trimmed)) {
            return '#333';
        }
        return trimmed;
    }

    // Valor de atributo/raw-text em templates HTML confiáveis (modal do
    // editor de temas: value="..." e <textarea>): escapa & < > " ' para o
    // texto voltar literal quando o browser decodifica. Não é sanitizador
    // de HTML — é para slots de TEXTO dentro de markup de confiança do
    // produto. Não-string → ''.
    function attr(value) {
        if (typeof value !== 'string') return '';
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    return { html: html, watermark: watermark, color: color, attr: attr };
})();