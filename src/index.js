import express from 'express';
import {matchRouter} from "./routes/matches.js";
import http from "http";
import {attachWebSocketServer} from "./ws/server.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());
const server = http.createServer(app);

const {broadcastMatchCreated} = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

app.get('/', (req, res) => res.send('Hello World!'));
app.use('/matches', matchRouter)

server.listen(PORT, HOST, () => {
  const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `https://${HOST}:${PORT}`
  console.log(`Server listening at ${baseUrl}`);
  console.log(`WebSocket Server listening at ${baseUrl.replace('http','ws')}/ws`)
});
