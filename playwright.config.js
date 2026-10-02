const { defineConfig } = require('@playwright/test');

// O produto é estático e servido por qualquer servidor HTTP. O gate sobe o
// próprio servidor, de forma headless, para não depender de processo manual.
//
// Neste repositório o runtime vive em `deploy/`, porque é esse o diretório de
// saída configurado no Cloudflare Pages (ver CLOUDFLARE_DEPLOY.md). Servir
// `./deploy` como raiz faz o gate exercitar exatamente o que a produção
// serve — servir a raiz do repositório testaria um site que não existe.
module.exports = defineConfig({
  testDir: __dirname,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8099',
    launchOptions: { args: ['--allow-file-access-from-files'] }
  },
  webServer: {
    command: 'npx --yes serve deploy -l 8099',
    url: 'http://127.0.0.1:8099/index.html',
    reuseExistingServer: true,
    timeout: 120_000
  }
});