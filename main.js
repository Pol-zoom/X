const socket = io("https://virginia-alex-decrease-exit.trycloudflare.com");

let localStream;
let peers = {};

async function initLocalMedia() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = localStream;
}

initLocalMedia();

socket.emit("join", { user_id: Math.random().toString(36).substr(2, 9) });

socket.on("signal", async data => {
    let peerId = data.user_id;
    let peer = peers[peerId];

    if (!peer) {
        peer = createPeer(peerId, false);
        peers[peerId] = peer;
    }
    await peer.signal(data.signal);
});

socket.on("user-joined", data => {
    const peerId = data.user_id;
    if (peerId === socket.id) return;
    const peer = createPeer(peerId, true);
    peers[peerId] = peer;
});

function createPeer(peerId, initiator) {
    const peer = new SimplePeer({ initiator, stream: localStream });

    peer.on("signal", signal => {
        socket.emit("signal", { target: peerId, signal, user_id: socket.id });
    });

    peer.on("stream", stream => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        document.getElementById("remoteVideos").appendChild(video);
    });

    return peer;
}
