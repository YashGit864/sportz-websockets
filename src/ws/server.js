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

  wss.on('connection', async (socket, req) => {
    if(wsArcjet){
      try {
        const decision = await wsArcjet.protect(socket)

        if(decision.isDenied()){
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          //1013: hostname mismatch or overload
          //1008: policy violation (access denied)
          const reason = decision.reason.isRateLimit() ? 'Rate Limit Exceeded' : 'Access Denied';
          socket.close(code, reason)
          return;
        }
      } catch (e) {
        console.error('Failed to protect websocket connection', e)
        socket.close(1011, 'Server Security Error')
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