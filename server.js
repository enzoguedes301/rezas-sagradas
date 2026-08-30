const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = 8000;
const HOST = '127.0.0.1';

const shouldCompress = (contentType) => {
  return /text|javascript|json|svg/.test(contentType);
};

const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Se não for arquivo, redireciona para index.html (SPA)
      fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Erro ao ler index.html');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, must-revalidate'
        });
        res.end(data);
      });
      return;
    }

    // Serve o arquivo com cache otimizado
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    }[ext] || 'application/octet-stream';

    const headers = { 'Content-Type': contentType };

    // Cache para assets com hash
    if (req.url.includes('/assets/') && req.url.match(/-[a-zA-Z0-9]+\.(js|css|woff2?)$/)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else if (req.url.match(/\.(webp|jpg|jpeg|png|gif|svg|mp3|pdf)$/)) {
      headers['Cache-Control'] = 'public, max-age=2592000'; // 30 dias
    } else {
      headers['Cache-Control'] = 'no-cache, must-revalidate';
    }

    // Compressão gzip
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (shouldCompress(contentType) && acceptEncoding.includes('gzip')) {
      headers['Content-Encoding'] = 'gzip';
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
    } else {
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n✅ Servidor otimizado em http://${HOST}:${PORT}\n`);
  console.log('✨ Otimizações ativas:');
  console.log('   • Compressão gzip');
  console.log('   • Cache inteligente para assets');
  console.log('   • Lazy loading recomendado\n');
  console.log('Rotas disponíveis:');
  console.log(`  http://localhost:8000/`);
  console.log(`  http://localhost:8000/pedido`);
  console.log(`  http://localhost:8000/cakto`);
  console.log(`  http://localhost:8000/privacidade`);
  console.log('\nPressione Ctrl+C para parar\n');
});
