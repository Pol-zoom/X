const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mediasoup = require('mediasoup');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Текстовый чат
io.on('connection', socket => {
    console.log('User connected:', socket.id);

    socket.on('send-message', data => {
        io.emit('receive-message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Mediasoup setup (упрощённо для 3-4 человек)
let worker, router;
(async () => {
    worker = await mediasoup.createWorker();
    router = await worker.createRouter({ mediaCodecs: [
        { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
        { kind: "video", mimeType: "video/VP8", clockRate: 90000 }
    ]});
    console.log("Mediasoup worker created");
})();

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
