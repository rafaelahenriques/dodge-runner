const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;
const clients = {};

app.use(express.static('public'));

const emitClientList = () => {
  io.emit('clients', clients);
};

io.on('connection', socket => {
  clients[socket.id] = { id: socket.id };
  console.log(`A user connected: ${socket.id}`);
  emitClientList();

  // Relay SDP offer to target peer
  socket.on('peerOffer', (peerId, offer) => {
    if (!peerId || !offer) return;
    console.log(`Forwarding offer from ${socket.id} to ${peerId}`);
    socket.to(peerId).emit('peerOffer', peerId, offer, socket.id);
  });

  // Relay SDP answer back to caller
  socket.on('peerAnswer', (peerId, answer) => {
    if (!peerId || !answer) return;
    console.log(`Forwarding answer from ${socket.id} to ${peerId}`);
    socket.to(peerId).emit('peerAnswer', peerId, answer, socket.id);
  });

  // Relay ICE candidates both ways
  socket.on('peerIce', (peerId, candidate) => {
    if (!peerId || !candidate) return;
    console.log(`Forwarding ICE from ${socket.id} to ${peerId}`);
    socket.to(peerId).emit('peerIce', peerId, candidate, socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete clients[socket.id];
    emitClientList();
  });
});

server.listen(port, () => {
  // Print all local IPs so you can scan the QR on your phone
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    for (const iface of networkInterfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`http://${iface.address}:${port}`);
      }
    }
  }
  console.log(`App listening on port ${port}`);
});