import { safeListeningHttpServer } from 'create-listening-server';
import express from 'express';

const [outputPath, port] = process.argv.slice(2);

const app = express();
app.use(express.static(outputPath, { cacheControl: false, etag: false }));
safeListeningHttpServer(parseInt(port, 10), app).then(({ port }) => process.send!(port));
