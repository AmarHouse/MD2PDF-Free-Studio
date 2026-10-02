/* ============================================
   MARKDOWN-NORMALIZE.JS - Sanitização de Markdown gerado por IA
   ============================================
   Roda antes de cada marked.parse (preview e exportação EPUB). Regras,
   nesta ordem:
     1. Remove frontmatter YAML inicial (bloco `---` no topo fechado por
        outro `---`). `---` no corpo do documento NÃO é frontmatter: é
        thematic break (CommonMark) e não é tocado.
     2. Normaliza a hierarquia de títulos ATX: se o primeiro heading não é
        `#`, rebaixa todos os headings para a hierarquia começar em `#` e
        não pular níveis. Nunca aprofunda; headings já corretos não mudam.
     3. Colapsa 3+ linhas em branco consecutivas em uma só.
     4. Remove espaços à direita de cada linha.
   Quebra de página (Fase C): linha cujo conteúdo, ignorando espaços ao
   redor, é exatamente `\pagebreak` ou `\newpage` vira
   `<div class="page-break"></div>`. Um placeholder + CSS decide o efeito:
   break-after: page na impressão (PDF), inócuo no EPUB reflowable,
   indicador visual no preview. `---` NUNCA vira quebra.
   Blocos de código (fenced ```/~~~ e indented 4+) são conteúdo: as regras
   de whitespace e a normalização de headings NÃO atravessam blocos de
   código.
   Idempotente: normalize(normalize(x)) === normalize(x) — crítico porque
   roda a cada render do preview (debounce 150ms).
   Contrato defensivo (constituição, princípio 14): input não-string,
   vazio ou só-whitespace => retorna "" em vez de lançar.
   Notas de desenho:
   - Títulos setext (linha de texto + ===/---) não são reescritos
     (--- fora do topo é protegido) e não participam do cálculo do
     rebaixamento — se participassem, nunca convergiriam (o setext ficaria
     no mesmo nível e o shift nunca zeraria), quebrando a idempotência.
   - Um `###` logo após linha de parágrafo não é heading no CommonMark
     (heading não interrompe parágrafo); a guarda isParagraphLine mantém o
     transform consistente com o marked. `\pagebreak` e HTML bruto (linha
     começando com `<`) contam como não-parágrafo, preservando a
     idempotência quando a quebra precede um heading.
   ============================================ */

const MarkdownNormalize = (function () {
    'use strict';

    const PAGE_BREAK_HTML = '<div class="page-break"></div>';
    const PAGE_BREAK_RE = /^\s*\\(?:pagebreak|newpage)\s*$/;
    const FENCE_OPEN_RE = /^\s*(`{3,}|~{3,})/;
    const ATX_HEADING_RE = /^ {0,3}(#{1,6})(?:[ \t]+|$)([\s\S]*)$/;
    const INDENT_RE = /^(?: {4,}|\t)/;
    const BLANK_RE = /^[ \t\r]*$/;
    const TRAILING_WS_RE = /[ \t]+(?=\r?$)/;
    const LIST_ITEM_RE = /^ {0,3}(?:[-*+]|\d+[.)])\s/;
    const THEMATIC_BREAK_RE = /^ {0,3}(?:[-*_][ \t]*){3,}\r?$/;
    const QUOTE_RE = /^ {0,3}>/;

    // Cache de uma entrada: normalize roda a cada tecla (debounce 150ms) e é
    // idempotente — mesmo texto de entrada produz a mesma saída, então
    // reutilizar o último resultado evita reparsear quando nada mudou.
    let lastInput = null;
    let lastOutput = null;

    function isBlank(line) { return BLANK_RE.test(line); }
    function isIndented(line) { return INDENT_RE.test(line); }

    // Linha que não é parágrafo (bloco ou elemento de bloco): heading,
    // heading ATX ou linha que pareça tal não interrompe parágrafo.
    function isParagraphLine(line) {
        if (isBlank(line)) return false;
        if (ATX_HEADING_RE.test(line)) return false;
        if (LIST_ITEM_RE.test(line)) return false;
        if (THEMATIC_BREAK_RE.test(line)) return false;
        if (QUOTE_RE.test(line)) return false;
        if (FENCE_OPEN_RE.test(line)) return false;
        if (isIndented(line)) return false;
        if (PAGE_BREAK_RE.test(line)) return false;
        if (/^\s*</.test(line)) return false; // HTML bruto: bloco
        return true;
    }

    function fenceCloseRe(ch, len) {
        return new RegExp('^\\s*' + ch + '{' + len + ',}\\s*$');
    }

    // Marca as linhas que estão dentro de bloco de código (fenced ou
    // indented). Usada pela detecção de heading e pelo transform. Blanks
    // dentro de bloco indented podem sair como "código" aqui e como
    // "separador" no transform — sem efeito prático: blank nunca é heading.
    function computeCodeFlags(lines) {
        const flags = new Array(lines.length).fill(false);
        let state = 'normal';
        let fenceClose = null;

        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];
            if (state === 'fence') {
                flags[i] = true;
                if (fenceClose.test(raw)) { state = 'normal'; fenceClose = null; }
                continue;
            }
            if (state === 'indent') {
                if (!isBlank(raw) && !isIndented(raw)) { state = 'normal'; continue; }
                flags[i] = true;
                continue;
            }
            if (isBlank(raw)) continue;
            if (isIndented(raw)) { state = 'indent'; flags[i] = true; continue; }
            const fence = FENCE_OPEN_RE.exec(raw);
            if (fence) {
                state = 'fence';
                fenceClose = fenceCloseRe(fence[1][0], fence[1].length);
                flags[i] = true;
            }
        }
        return flags;
    }

    // Heading ATX válido na linha i: fora de código e não em continuação de
    // parágrafo (CommonMark: ATX não interrompe parágrafo). Retorna o match
    // ou null.
    function headingAt(lines, flags, i) {
        const h = ATX_HEADING_RE.exec(lines[i]);
        if (!h) return null;
        const prevInCode = i > 0 && flags[i - 1];
        if (prevInCode) return h;
        if (i > 0 && isParagraphLine(lines[i - 1])) return null;
        return h;
    }

    // Nível do primeiro heading ATX do documento (fora de código), ou 0.
    function findFirstHeadingLevel(lines, flags) {
        for (let i = 0; i < lines.length; i++) {
            if (flags[i]) continue;
            const h = headingAt(lines, flags, i);
            if (h) return h[1].length;
        }
        return 0;
    }

    // Transform linha a linha com máquina de estados normal/fence/indent.
    function transform(lines, shift, flags) {
        const out = [];
        let state = 'normal';
        let fenceClose = null;
        let blankRun = 0; // blanks consecutivos fora de código
        let pending = []; // blanks dentro de bloco indented, aguardando decisão

        const flushBlanks = () => {
            if (blankRun === 2) out.push('', '');
            else if (blankRun >= 1) out.push('');
            blankRun = 0;
        };

        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];

            if (state === 'fence') {
                out.push(raw); // conteúdo de código: verbatim
                if (fenceClose.test(raw)) { state = 'normal'; fenceClose = null; }
                continue;
            }

            if (state === 'indent') {
                if (isBlank(raw)) { pending.push(raw); continue; }
                if (isIndented(raw)) {
                    for (let k = 0; k < pending.length; k++) out.push(pending[k]);
                    pending = [];
                    out.push(raw); // conteúdo de código: verbatim
                    continue;
                }
                // Bloco terminou: os blanks pendentes eram separadores.
                state = 'normal';
                blankRun += pending.length;
                pending = [];
                // cai no processamento normal de `raw`
            }

            // --- estado normal ---
            if (isBlank(raw)) { blankRun++; continue; }

            if (isIndented(raw)) {
                flushBlanks();
                state = 'indent';
                out.push(raw); // abre bloco de código indented: verbatim
                continue;
            }

            const fence = FENCE_OPEN_RE.exec(raw);
            if (fence) {
                flushBlanks();
                state = 'fence';
                fenceClose = fenceCloseRe(fence[1][0], fence[1].length);
                out.push(raw); // abre bloco de código fenced: verbatim
                continue;
            }

            flushBlanks();

            if (PAGE_BREAK_RE.test(raw)) {
                out.push(PAGE_BREAK_HTML);
                continue;
            }

            const h = headingAt(lines, flags, i);
            if (h) {
                if (shift === 0) {
                    out.push(raw.replace(TRAILING_WS_RE, ''));
                } else {
                    const newLevel = Math.max(1, h[1].length - shift);
                    const content = h[2].replace(TRAILING_WS_RE, '');
                    out.push('#'.repeat(newLevel) + (content ? ' ' + content : ''));
                }
                continue;
            }

            out.push(raw.replace(TRAILING_WS_RE, ''));
        }

        if (state === 'indent') blankRun += pending.length;
        flushBlanks();
        return out;
    }

    // Uma linha de YAML de mapeamento: `chave: valor`, com chave sem espaços
    // e, opcionalmente, indentada. Lista, conjunto e escalar simples não
    // bastam para provar frontmatter.
    const YAML_KEY_RE = /^[ \t]*[A-Za-z_][A-Za-z0-9_.-]*[ \t]*:(?:[ \t].*)?$/;
    // Item de lista YAML, possivelmente indentado sob uma chave.
    const YAML_ITEM_RE = /^[ \t]*(?:-\s*.+|-\s*)$/;
    const MAX_FRONTMATTER_LINES = 200;

    // Regra 1: frontmatter YAML inicial.
    //
    // Quatro guardas, todas necessárias — sem elas um documento CommonMark
    // válido que comece com `---` (thematic break) e tenha outro `---`
    // adiante perde todo o conteúdo entre eles, em silêncio:
    //   1. a 2ª linha tem de ser chave YAML ou comentário YAML; thematic
    //      break seguido de parágrafo, lista ou heading não é frontmatter;
    //   2. toda linha até o fechamento tem de ser YAML, vazia ou comentário;
    //      conteúdo de documento interrompe o bloco;
    //   3. é preciso ver pelo menos uma chave YAML antes do fechamento —
    //      `---` inicial, comentário e `---` final sozinho é documento;
    //   4. o fechamento tem de ser seguido de linha em branco ou fim de
    //      arquivo; e há teto de linhas para não varrer o documento inteiro.
    // Sem fechamento, nada é removido: o `---` inicial é thematic break.
    function stripFrontmatter(text) {
        const nl = text.indexOf('\n');
        if (nl === -1) return text;
        if (text.slice(0, nl).trim() !== '---') return text;

        const lines = text.slice(nl + 1).split('\n');
        const limit = Math.min(lines.length, MAX_FRONTMATTER_LINES);
        if (limit === 0) return text;
        // A abertura pode ser uma chave YAML ou um comentário YAML. Um
        // parágrafo comum, lista ou heading não é frontmatter.
        if (!YAML_KEY_RE.test(lines[0]) && !/^[ \t]*#/.test(lines[0])) return text;

        let sawKey = false;
        for (let i = 0; i < limit; i++) {
            const line = lines[i];
            if (line.trim() === '---' || line.trim() === '...') {
                // Sem nenhuma chave, não há o que provar: `---` inicial mais
                // `---` adiante com comentário no meio é documento, não YAML.
                if (!sawKey) return text;
                // Fechamento no fim do arquivo é válido; no meio, exige
                // separador em branco, como manda o YAML de mapeamento.
                const after = lines[i + 1];
                if (after !== undefined && !isBlank(after)) return text;
                return lines.slice(i + 1).join('\n');
            }
            if (isBlank(line)) continue;
            if (/^[ \t]*#/.test(line)) continue;
            if (YAML_KEY_RE.test(line)) { sawKey = true; continue; }
            // Item de lista só vale depois de uma chave, e somente se a
            // próxima linha não voltar ao nível zero — o que denotaria que
            // saímos do bloco YAML para o corpo do documento.
            if (sawKey && YAML_ITEM_RE.test(line)) continue;
            return text;
        }
        return text;
    }

    function run(text) {
        // Normaliza fim de linha ANTES de qualquer regra. Sem isto, um
        // documento CRLF colapsaria blanks para "\r\n\n" — mistura de CR e LF
        // que é idempotente mas inconsistente, e que o `marked` teria de
        // normalizar de novo. A entrada real vem de um textarea no Windows,
        // então CRLF é o caso comum, não o raro.
        const t = stripFrontmatter(text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'));
        const lines = t.split('\n');
        const flags = computeCodeFlags(lines);
        const firstLevel = findFirstHeadingLevel(lines, flags);
        const shift = firstLevel > 1 ? firstLevel - 1 : 0;
        return transform(lines, shift, flags).join('\n');
    }

    function normalize(text) {
        if (typeof text !== 'string') return '';
        if (text === lastInput) return lastOutput;
        if (text.length === 0) return '';
        if (!/\S/.test(text)) return '';
        const result = run(text);
        lastInput = text;
        lastOutput = result;
        return result;
    }

    return { normalize: normalize };
})();