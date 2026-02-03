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
    socket.isAlive = true;
    socket.on('pong', () => (socket.isAlive = true));

    sendJSON(socket, {type: 'connected'})
    socket.on('error', (err) => console.error(err))
  })

    const interval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      })}, 30000)

    wss.on('close', () => clearInterval(interval))

  function broadcastMatchCreated(event) {
    broadcast(wss, {type: 'matchCreated', data: event})
  }
  return {broadcastMatchCreated}
}