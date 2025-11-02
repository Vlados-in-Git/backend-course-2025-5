const { program } = require('commander');
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const http = require('http');
const superagent = require ('superagent');

program
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до директорії з кешом');

program.parse(process.argv);
const options = program.opts();
const host = options.host;
const port = options.port;
const cacheDir = path.resolve(options.cache);

if (!fss.existsSync(cacheDir)) {
  console.log(`Директорія кешу не існує. Створюємо: ${cacheDir}`);  
  fss.mkdirSync(cacheDir, { recursive: true });
} else {
  console.log(`Директорія кешу існує: ${cacheDir}`);  
}

async function fetchAndCacheImage(httpCode, filePath) {
    const url = `https://http.cat/${httpCode}`;
    console.log(`Кеш не знайдено. Завантажуємо з: ${url}`);
    

    const response = await superagent
        .get(url)
        .responseType('blob'); 

    const imageData = response.body;


    await fs.writeFile(filePath, imageData);
    console.log(`Успішно кешовано: ${filePath}`);
    
    return imageData;
}

const server = http.createServer(async (req, res) => {

  const httpCode = req.url.slice(1);
  const filePath = path.join(cacheDir, `${httpCode}.jpeg`);

if (req.method === 'GET') {
    try {
      const imageData = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(imageData);
    } catch (error) {
      
      if (error.code === 'ENOENT') {

        try {
            
            const imageData = await fetchAndCacheImage(httpCode, filePath);

            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(imageData);

        } catch (fetchError) { 

            console.error('Помилка проксі-запиту/кешування:', fetchError.message);

            
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');  
        }

      } else { 
        res.writeHead(500, { 'Content-Type': 'text/plain' }); 
        res.end('Internal Server Error');
      }
    }
    return; 
  }

if (req.method === 'PUT') {
   
    const fileStream = fss.createWriteStream(filePath);

   
    fileStream.on('error', (err) => {
        console.error(`PUT Error writing file ${filePath}:`, err);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error during file write.');
        }
    });

    req.pipe(fileStream);

    req.on('end', () => {
     
      if (!res.headersSent) {
          res.writeHead(201, { 'Content-Type': 'text/plain' });
          res.end('File created/replaced (201 Created)');
      }
    });

    req.on('error', (err) => {
        console.error('PUT Request error:', err);
        fileStream.end(); // Закриваємо потік запису
    });

    return;
  }

if (req.method === 'DELETE') {
    try {
      await fs.unlink(filePath); // Використання fs.promises.unlink
      // Вимога: 200 OK
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('File deleted (200 OK)');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Вимога: 404 Not Found
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found (404 Not Found)');
      } else {
        console.error('DELETE Error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    }
    return;
  }


  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

server.listen(port, host, () => {
  console.log(`Сервер запущено на http://${host}:${port}`); 

});

