// =====================================================================
// Preview LOCAL do funil. NÃO é o servidor de produção.
//
// Em produção quem manda é o Apache da Hostinger com o .htaccess — que já
// faz Brotli e cache melhor do que isto aqui. Este arquivo existe só para
// abrir o funil na máquina antes de publicar.
//
// Por isso ele imita as duas regras do .htaccess que mudam comportamento:
// o SPA (endereço sem arquivo cai no index.html) e o 404 de verdade dentro
// de /assets/. Se o preview local for mais permissivo que a produção, ele
// esconde justamente o defeito que aparece depois de publicar.
//
//   node server.js   →   http://localhost:8000
// =====================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = 8000;
const HOST = '127.0.0.1';
const RAIZ = path.resolve(__dirname);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const comprimivel = (tipo) => /text|javascript|json|svg/.test(tipo);

const responder = (res, status, texto) => {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(texto);
};

const server = http.createServer((req, res) => {
  // req.url vem cru: pode trazer query string e %-encoding. Sem passar pelo
  // URL/decodeURIComponent, "/assets/a%2Ejs?v=1" viraria nome de arquivo.
  let caminhoUrl;
  try {
    caminhoUrl = decodeURIComponent(new URL(req.url, `http://${HOST}:${PORT}`).pathname);
  } catch {
    responder(res, 400, 'Endereço inválido');
    return;
  }

  const arquivo = path.resolve(RAIZ, '.' + caminhoUrl);

  // SEM ESTA CHECAGEM, um "/../" no endereço sai da pasta do projeto e serve
  // qualquer arquivo do disco. Só roda em localhost, mas o arquivo está no
  // repositório e alguém pode subir isto num servidor por engano.
  if (arquivo !== RAIZ && !arquivo.startsWith(RAIZ + path.sep)) {
    responder(res, 403, 'Proibido');
    return;
  }

  // A política de privacidade é página própria, e o .htaccess a resolve antes
  // da regra do SPA. Sem isto o preview mostraria o quiz em /privacidade.
  const ehPrivacidade = /^\/privacidade\/?$/.test(caminhoUrl);

  const alvo = caminhoUrl === '/'
    ? path.join(RAIZ, 'index.html')
    : ehPrivacidade
      ? path.join(RAIZ, 'privacidade.html')
      : arquivo;

  fs.stat(alvo, (err, stats) => {
    if (err || !stats.isFile()) {
      // Mesma regra do .htaccess: dentro de /assets/ o ausente é 404 de
      // verdade. Devolver o index.html aqui entrega HTML onde o navegador
      // espera um módulo JavaScript, e o import() rejeita sem dizer por quê.
      if (caminhoUrl.startsWith('/assets/')) {
        responder(res, 404, 'Não encontrado');
        return;
      }

      // O resto cai no funil: /pedido e /cakto não são arquivos no disco.
      fs.readFile(path.join(RAIZ, 'index.html'), (erroHtml, html) => {
        if (erroHtml) {
          responder(res, 500, 'Não consegui ler o index.html');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, must-revalidate',
        });
        res.end(html);
      });
      return;
    }

    const tipo = TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': tipo };

    // Os mesmos prazos do .htaccess, para o preview não mentir sobre cache.
    if (caminhoUrl.startsWith('/assets/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else if (/\.(webp|jpe?g|png|gif|svg|mp3|pdf)$/i.test(caminhoUrl)) {
      headers['Cache-Control'] = 'public, max-age=2592000';
    } else {
      headers['Cache-Control'] = 'no-cache, must-revalidate';
    }

    const aceita = req.headers['accept-encoding'] || '';
    if (comprimivel(tipo) && aceita.includes('gzip')) {
      // A produção usa Brotli; gzip aqui é só para o preview não parecer
      // mais pesado do que o site realmente é.
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
      res.writeHead(200, headers);
      fs.createReadStream(alvo).pipe(zlib.createGzip()).pipe(res);
    } else {
      headers['Content-Length'] = stats.size;
      res.writeHead(200, headers);
      fs.createReadStream(alvo).pipe(res);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\nPreview local em http://localhost:${PORT}\n`);
  console.log('  /              hero do funil');
  console.log('  /pedido        rota do SPA');
  console.log('  /cakto         rota do SPA');
  console.log('  /privacidade   página própria\n');
  console.log('Isto NÃO é a produção — lá quem serve é o Apache com o .htaccess.');
  console.log('Ctrl+C para parar.\n');
});
