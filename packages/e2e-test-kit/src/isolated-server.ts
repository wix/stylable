import { safeListeningHttpServer } from 'create-listening-server';
import fs from 'fs';
import path from 'path';

const [outputPath, port] = process.argv.slice(2);

const types: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    json: 'application/json',
    xml: 'application/xml',
};

safeListeningHttpServer(parseInt(port, 10), (req, res) => {
    const reqUrl = req.url || '';
    let filePath = path.join(outputPath, reqUrl);
    try {
        if (fs.statSync(filePath).isDirectory()) {
            if (!reqUrl.endsWith('/')) {
                const context = 'redirect';
                res.statusCode = 301;
                res.setHeader('Content-Type', 'text/html; charset=UTF-8');
                res.setHeader('Content-Length', Buffer.byteLength(context));
                res.setHeader('Content-Security-Policy', "default-src 'none'");
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('Location', req.url! + '/');
                res.end(context);
                return;
            }
            filePath += 'index.html';
        }
    } catch {
        // do nothing: will return 404
    }
    const extension = req.url ? path.extname(req.url).slice(1) : '';
    const mimeType = extension ? types[extension] : types.html;
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('404: File not found');
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
        }
    });
})
    .then(({ port }) => process.send!(port))
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    });
