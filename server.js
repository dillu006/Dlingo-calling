// D Lingo — Minimal Signaling / Relay Server (zero external dependencies)
// -------------------------------------------------------------------------
// What this does:
//   Two phones open the same web page and join the same room code.
//   This server just relays JSON messages between everyone in that room —
//   it does NOT do any translation or speech work itself. All of that still
//   happens on each phone (Web Speech API + Claude API), exactly like before.
//   Think of this as a "post office" that forwards mail between two phones
//   that otherwise have no way of finding each other on the internet.
//
// This file uses ONLY Node's built-in modules (http, crypto, net) — no
// "npm install" step, no node_modules, nothing that can fail to download.
//
// Run locally:
//   node server.js
//   -> Server listens on PORT (default 3000)
//   -> On your phone (same WiFi as your laptop), open http://<laptop-LAN-ip>:3000
//      Find your laptop's LAN IP with `ipconfig` (Windows) or `ifconfig`/`ip a` (Mac/Linux).
//
//   IMPORTANT: plain http:// will let the page load, but mobile browsers block
//   microphone access on non-HTTPS, non-localhost pages. For real mic access
//   on two separate phones you should deploy this somewhere with free HTTPS:
//
// Deploy free (recommended — gives you HTTPS automatically):
//   1. Push this folder to a GitHub repo (server.js, package.json, public/index.html)
//   2. Go to https://render.com -> New -> Web Service -> connect the repo
//   3. Build command: (leave blank or "npm install")   Start command: node server.js
//   4. Render gives you a URL like https://dlingo-xxxx.onrender.com
//   5. Open that URL on both phones (any WiFi/mobile data, not just same WiFi)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// ---- Tiny static file server (serves public/index.html and friends) ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, reqPath);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// ---- rooms: Map<roomCode, Set<socket>> ----
const rooms = new Map();
function roomOf(code) {
  if (!rooms.has(code)) rooms.set(code, new Set());
  return rooms.get(code);
}
function broadcast(code, data, exceptSocket) {
  const peers = rooms.get(code);
  if (!peers) return;
  const frame = encodeFrame(JSON.stringify(data));
  for (const peer of peers) {
    if (peer !== exceptSocket && !peer.destroyed) {
      try { peer.write(frame); } catch (e) {}
    }
  }
}

// ---- Minimal WebSocket frame encode/decode (RFC 6455, server-side, text frames only) ----
function encodeFrame(str) {
  const payload = Buffer.from(str, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

// Incremental frame decoder bound to one socket's buffered bytes.
// Returns { messages: [string,...], rest: Buffer } — handles fragmented TCP reads
// and (for client->server frames) masked payloads as required by the spec.
function decodeFrames(buf) {
  const messages = [];
  let offset = 0;
  while (true) {
    if (buf.length - offset < 2) break;
    const byte1 = buf[offset];
    const byte2 = buf[offset + 1];
    const opcode = byte1 & 0x0f;
    const masked = !!(byte2 & 0x80);
    let payloadLen = byte2 & 0x7f;
    let pos = offset + 2;

    if (payloadLen === 126) {
      if (buf.length - pos < 2) break;
      payloadLen = buf.readUInt16BE(pos); pos += 2;
    } else if (payloadLen === 127) {
      if (buf.length - pos < 8) break;
      payloadLen = Number(buf.readBigUInt64BE(pos)); pos += 8;
    }

    let maskKey;
    if (masked) {
      if (buf.length - pos < 4) break;
      maskKey = buf.slice(pos, pos + 4); pos += 4;
    }

    if (buf.length - pos < payloadLen) break; // wait for more data

    let payload = buf.slice(pos, pos + payloadLen);
    if (masked) {
      const unmasked = Buffer.alloc(payloadLen);
      for (let i = 0; i < payloadLen; i++) unmasked[i] = payload[i] ^ maskKey[i % 4];
      payload = unmasked;
    }

    if (opcode === 0x8) { // close frame
      messages.push(null); // sentinel: connection should close
    } else if (opcode === 0x1) { // text frame
      messages.push(payload.toString('utf8'));
    }
    // ping(0x9)/pong(0xA)/binary(0x2) frames are ignored — app only sends text

    offset = pos + payloadLen;
  }
  return { messages, rest: buf.slice(offset) };
}

// ---- WebSocket upgrade handling ----
server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const acceptKey = crypto.createHash('sha1').update(key + WS_MAGIC).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + acceptKey + '\r\n\r\n'
  );

  socket.roomCode = null;
  socket.clientId = null;
  let recvBuffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    recvBuffer = Buffer.concat([recvBuffer, chunk]);
    const { messages, rest } = decodeFrames(recvBuffer);
    recvBuffer = rest;
    for (const raw of messages) {
      if (raw === null) { socket.destroy(); return; }
      let msg;
      try { msg = JSON.parse(raw); } catch (e) { continue; }

      if (msg.type === 'join') {
        socket.roomCode = msg.code;
        socket.clientId = msg.id;
        roomOf(msg.code).add(socket);
        continue; // membership only — app sends its own 'join-request' next
      }
      if (!socket.roomCode) continue; // ignore anything before join
      broadcast(socket.roomCode, msg, socket);
    }
  });

  function cleanup() {
    if (socket.roomCode && rooms.has(socket.roomCode)) {
      rooms.get(socket.roomCode).delete(socket);
      broadcast(socket.roomCode, { type: 'leave', id: socket.clientId }, socket);
      if (rooms.get(socket.roomCode).size === 0) rooms.delete(socket.roomCode);
    }
  }
  socket.on('close', cleanup);
  socket.on('error', cleanup);
});

server.listen(PORT, () => {
  console.log(`D Lingo relay server running on http://localhost:${PORT}`);
});
