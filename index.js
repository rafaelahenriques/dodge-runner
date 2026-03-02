require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

let options = {};
if (isDevelopment) {
  options = {
    key: fs.readFileSync('./localhost.key'),
    cert: fs.readFileSync('./localhost.crt')
  };
}

const server = require(isDevelopment ? 'https' : 'http').Server(options, app);
const io = new Server(server);
const clients = {};

app.use(express.static('public'));

const emitClientList = () => {
  io.emit('clients', clients);
};

io.on('connection', socket => {
  clients[socket.id] = { id: socket.id };
  console.log(`A user connected: ${socket.id}`);
  emitClientList();

  socket.on('peerOffer', (peerId, offer) => {
    if (!peerId || !offer) return;
    socket.to(peerId).emit('peerOffer', peerId, offer, socket.id);
  });
  
  socket.on('peerAnswer', (peerId, answer) => {
    if (!peerId || !answer) return;
    socket.to(peerId).emit('peerAnswer', peerId, answer, socket.id);
  });

  socket.on('peerIce', (peerId, candidate) => {
    if (!peerId || !candidate) return;
    socket.to(peerId).emit('peerIce', peerId, candidate, socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete clients[socket.id];
    emitClientList();
  });
});

server.listen(port, () => {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    for (const iface of networkInterfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`https://${iface.address}:${port}`);
      }
    }
  }
  console.log(`App listening on port ${port}`);
});