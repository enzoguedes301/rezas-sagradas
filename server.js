const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const HOST = '127.0.0.1';

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
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
      return;
    }

    // Serve o arquivo
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

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n✅ Servidor rodando em http://${HOST}:${PORT}\n`);
  console.log('Rotas disponíveis:');
  console.log(`  http://localhost:8000/`);
  console.log(`  http://localhost:8000/pedido`);
  console.log(`  http://localhost:8000/cakto`);
  console.log(`  http://localhost:8000/privacidade`);
  console.log('\nPressione Ctrl+C para parar\n');
});
