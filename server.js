const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mediasoup = require("mediasoup");

require("dotenv").config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// --- Text chat ---
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("send-message", (data) => {
    io.emit("receive-message", data); // Рассылаем всем
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- Mediasoup setup ---
let worker;
let router;
(async () => {
  worker = await mediasoup.createWorker({
    logLevel: "warn",
    rtcMinPort: 10000,
    rtcMaxPort: 10100
  });

  router = await worker.createRouter({ mediaCodecs: [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000
    }
  ]});

  console.log("Mediasoup worker and router ready");
})();

// --- Signaling for WebRTC (voice/screen) ---
io.on("connection", socket => {
  socket.on("createTransport", async (callback) => {
    const transport = await router.createWebRtcTransport({ listenIps: [{ ip: "0.0.0.0", announcedIp: null }], enableUdp: true, enableTcp: true });
    callback({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    });
  });

  socket.on("connectTransport", async ({ transportId, dtlsParameters }, callback) => {
    const transport = router.transports.find(t => t.id === transportId);
    await transport.connect({ dtlsParameters });
    callback();
  });

  socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {
    const transport = router.transports.find(t => t.id === transportId);
    const producer = await transport.produce({ kind, rtpParameters });
    callback({ id: producer.id });
  });

  socket.on("consume", async ({ producerId }, callback) => {
    // Здесь можно подключать потребителя (для всех участников)
    callback();
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
