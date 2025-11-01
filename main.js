 const { program } = require('commander');
 const fs = require('fs');
 const path = require('path');
 const http = require('http');


program
	.requiredOption('-h, --host <host>', 'адреса сервера')
	.requiredOption('-p, --port <port>', 'порт сервера')
	.requiredOption('-c, --cache <path>', 'шлях до директорії з кешом');

program.parse(process.argv);

const options = program.opts();
const host = options.host;
const port = options.port;
const cacheDir = path.resolve(options.cache);

if (!fs.existsSync(cacheDir)) {
  console.log(`Директорія кешу не існує. Створюємо: ${cacheDir}`);
  fs.mkdirSync(cacheDir, { recursive: true });
} else {
  console.log(`Директорія кешу існує: ${cacheDir}`);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`Сервер працює на ${host}:${port}\n`);
});

server.listen(port, host, () => {
  console.log(`Сервер запущено на http://${host}:${port}`);
});
