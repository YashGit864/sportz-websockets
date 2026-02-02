import {WebSocket, WebSocketServer} from 'ws';

function sendJSON (socket, payload) {
  if(socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    wss.clients.forEach(client => {
      if(client.readyState !== WebSocket.OPEN) return;
      client.send(JSON.stringify(payload))
    });
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({server, path: '/ws', maxPayload: 1024 * 1024})

  wss.on('connection', (socket) => {
    sendJSON(socket, {type: 'welcome', message: 'Welcome to the server!'})
    socket.on('error', console.error)
  })

  function broadcastMatchCreated(match) {
    broadcast(wss, {type: 'matchCreated', data: match})
  }

  return {broadcastMatchCreated}
}