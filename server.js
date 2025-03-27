const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// 更新 MIME 类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.h264': 'video/h264'
};

// 定义安全头部
const SECURITY_HEADERS = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': [
        "default-src 'self' blob: data: https://cdn.jsdelivr.net https://longyuqi.devcloud.woa.com",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net https://unpkg.com",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://longyuqi.devcloud.woa.com blob: data:",
        "worker-src 'self' blob:",
        "child-src 'self' blob:",
        "img-src 'self' blob: data:",
        "media-src 'self' blob: data:",
        "object-src 'none'",
        "frame-src 'self' blob:"
    ].join('; ')
};

// 文件存在检查中间件
const checkFileExists = (filePath) => async (req, res, next) => {
    try {
        await fs.promises.access(filePath);
        next();
    } catch (error) {
        res.status(404).send('File not found');
    }
};

// 添加安全头部中间件
app.use((req, res, next) => {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        res.setHeader(key, value);
    });
    next();
});

// CORS 中间件
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'Content-Length,Content-Range');

    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Max-Age', '86400');
        return res.sendStatus(204);
    }
    next();
});

// 静态文件服务
app.use('/', express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
        }
    }
}));

// 路由处理
app.get('/', checkFileExists(path.join(__dirname, './index.html')), (req, res) => {
    res.sendFile(path.join(__dirname, './index.html'));
});

// 样例文件路由保留
app.get('/sample', checkFileExists(path.join(__dirname, 'sample_720p30.h264')), (req, res) => {
    res.download(path.join(__dirname, 'sample_720p30.h264'), 'sample_720p30.h264', {
        headers: { 'Content-Type': 'video/h264' }
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).send('Internal Server Error');
});

const PORT = process.env.PORT || 80;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 优雅退出处理
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，准备关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    // 给服务器一些时间处理当前请求后再退出
    setTimeout(() => {
        process.exit(1);
    }, 1000);
}); 
