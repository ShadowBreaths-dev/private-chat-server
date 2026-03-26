/**
 * Simple HTTP Server for Oreo Web App
 * Run this to serve the web application
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const WEBAPP_DIR = path.join(__dirname, 'webapp');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Parse URL
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(WEBAPP_DIR, filePath);
    
    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Read and serve file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log('\n🍪 Oreo Web App Server');
    console.log('=' .repeat(40));
    console.log(`\nServer running at: http://localhost:${PORT}`);
    console.log(`\nOpen your browser and visit the URL above`);
    console.log('\nPress Ctrl+C to stop the server\n');
});
