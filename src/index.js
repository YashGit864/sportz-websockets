import AgentAPI from "apminsight";
AgentAPI.config()

import express from 'express';
import {matchRouter} from "./routes/matches.js";
import http from "http";
import {attachWebSocketServer} from "./ws/server.js";
import {securityMiddleware} from "./arcjet.js";
import {commentaryRouter} from "./routes/commentary.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// const HOST = process.env.HOST || '0.0.0.0';

console.log("DATABASE_URL:", process.env.DATABASE_URL);

app.use(express.json());
const server = http.createServer(app);

const {broadcastMatchCreated, broadcastCommentary} = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

// app.use(securityMiddleware())
app.get('/', (req, res) => res.send('Hello from Express Server!'));
app.use('/matches', matchRouter)
app.use('/matches/:id/commentary', commentaryRouter)

server.listen(PORT, () => {
  console.log(`Server listening at ${PORT}`);
  console.log(`WebSocket Server listening at /ws`)
});
