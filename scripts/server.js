import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '../dist')));

// Fallback to 404.html if needed, but for static site index.html is usually served automatically
app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../dist/404/index.html'), (err) => {
        if (err) res.status(404).send('Not Found');
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Marketing site preview running at http://localhost:${PORT}`);
});
