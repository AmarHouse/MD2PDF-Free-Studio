const path = require('path');
const fs = require('fs');

// Localiza a raiz do runtime do produto.
//
// O mesmo código é executado em dois layouts: no monorepo da fabrica o
// produto esta na raiz (softwares/md2pdf/), e no repositorio publico o runtime
// fica em deploy/ porque e esse o diretorio de saida do Cloudflare Pages.
// Hardcodar `path.join(__dirname, '..')` faz o gate ler os arquivos errados —
// e falha em vez de passar, o que e o modo de falha correto, mas trava o gate
// no layout de producao.
//
// O marcador e um diretorio que contenha `index.html` e um subdiretorio `js/`:
// so o runtime satisfaz os dois, nos dois layouts. Alem de subir a arvore,
// cada nivel tambem e testado com `deploy/` — no repositorio publico o runtime
// e irmao de `test/`, nao ancestral, entao subir sozinho nunca o encontraria.
function isRuntime(dir) {
    return fs.existsSync(path.join(dir, 'index.html')) && fs.existsSync(path.join(dir, 'js'));
}

function runtimeRoot(fromDir) {
    let dir = path.resolve(fromDir);
    for (let i = 0; i < 6; i++) {
        if (isRuntime(dir)) return dir;
        const viaDeploy = path.join(dir, 'deploy');
        if (isRuntime(viaDeploy)) return viaDeploy;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    throw new Error(
        'runtimeRoot: nao encontrei a raiz do runtime (diretorio com index.html e js/) a partir de ' +
        path.resolve(fromDir)
    );
}

module.exports = { runtimeRoot };