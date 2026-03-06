import {WebSocket, WebSocketServer} from 'ws';
import {wsArcjet} from "../arcjet.js";

const matchSubscribers = new Map();

function subscribe(socket, matchId) {
  if(!matchSubscribers.has(matchId))
    matchSubscribers.set(matchId, new Set());

  const subscribers = matchSubscribers.get(matchId);
  subscribers.add(socket);
}

function unsubscribe(socket, matchId) {
  const subscribers = matchSubscribers.get(matchId);
  if(!subscribers) return;

  subscribers.delete(socket);

  if(subscribers.size === 0)
    matchSubscribers.delete(matchId);
}

function cleanupSubscriptions(socket){
  for (const matchId of socket.subscriptions) {
    unsubscribe(socket, matchId);
  }
}

function sendJSON (socket, payload) {
  if(socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss, payload) {
    wss.clients.forEach(client => {
      if(client.readyState !== WebSocket.OPEN) return;
      client.send(JSON.stringify(payload))
    });
}

function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if(!subscribers) return;

  const message = JSON.stringify(payload);
  for (const client of subscribers) {
    if(client.readyState === WebSocket.OPEN)
      client.send(message);
  }
}

function handleMessage(socket, data) {
  let message;
  try {
     message = JSON.parse(data.toString());
  } catch (e) {
    sendJSON(socket, {type: 'error', message: 'Invalid JSON'})
  }

  if(message?.type === "subscribe" && Number.isInteger(message.matchId)){
    subscribe(socket, message.matchId);
    socket.subscriptions.add(message.matchId);
    sendJSON(socket, {type: 'subscribed', matchId: message.matchId})
  }

  if(message?.type === "unsubscribe" && Number.isInteger(message.matchId)){
    unsubscribe(socket, message.matchId);
    socket.subscriptions.delete(message.matchId);
    sendJSON(socket, {type: 'unsubscribed', matchId: message.matchId})
  }
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

  wss.on('connection', async (socket, req) => {
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });

    socket.subscriptions = new Set();

    sendJSON(socket, { type: 'welcome' });

    socket.on('message', (data) => {
      handleMessage(socket, data);
    });

    socket.on('error', () => {
      socket.terminate();
    });

    socket.on('close', () => {
      cleanupSubscriptions(socket);
    })

    socket.on('error', console.error);
  });

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
    broadcastToAll(wss, {type: 'matchCreated', data: event})
  }

  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, comment)
  }

  return {broadcastMatchCreated,  broadcastCommentary}
}