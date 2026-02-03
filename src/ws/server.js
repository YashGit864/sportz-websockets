import {WebSocket, WebSocketServer} from 'ws';
import {wsArcjet} from "../arcjet.js";

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

  server.on('upgrade', async (socket, req) => {
    if(wsArcjet){
      try {
        const decision = await wsArcjet.protect(socket)

        if(decision.isDenied()){
         if(decision.reason.isRateLimit())
           socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
         else
           socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
         socket.destroy();
         return;
        }
      } catch (e) {
        console.error('Failed to protect websocket connection', e)
        socket.write('HTTP/1.1 503 Internal Server Error\r\n\r\n');
        socket.destroy()
        return;
      }
    }
    socket.isAlive = true;
    socket.on('pong', () => (socket.isAlive = true));

    sendJSON(socket, {type: 'connected'})
    socket.on('error', (err) => console.error(err))
  })

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        ws.terminate()
        return
      }
      ws.isAlive = false;
      ws.ping();
    })}, 30000)

  wss.on('close', () => clearInterval(interval))

  function broadcastMatchCreated(event) {
    broadcast(wss, {type: 'matchCreated', data: event})
  }
  return {broadcastMatchCreated}
}