const express = require('express');
const http = require('http');
const fs = require('fs');
const url = require('url');
const WebSocket = require('ws');

const BAN_LIST_FILE = './bannedlist.json';
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Function to read banned players from file
function readBannedPlayersFromFile() {
  try {
    const data = fs.readFileSync(BAN_LIST_FILE);
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading banned players:', error);
    return [];
  }
}

// Function to write banned players to file
function writeBannedPlayersToFile(bannedPlayers) {
  try {
    fs.writeFileSync(BAN_LIST_FILE, JSON.stringify(bannedPlayers, null, 2));
    console.log('Banned players list updated successfully.');
  } catch (error) {
    console.error('Error writing banned players:', error);
  }
}

// Array to store ban data { username: username, time: timestamp, duration: durationInMinutes }
let bannedPlayers = readBannedPlayersFromFile();

// Function to update ban status
export function updateBanStatus() {
  setInterval(() => {
    bannedPlayers = bannedPlayers.filter((player) => {
      const elapsedTime = Date.now() - player.time;
      return elapsedTime < player.duration * 60000; // Convert duration to milliseconds
    });
    // Save the updated ban list to file
    writeBannedPlayersToFile(bannedPlayers);
  }, 60000); // Check ban status every minute
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  // Send initial banned players data to the client
  ws.send(JSON.stringify(bannedPlayers));
});

// Middleware to parse JSON request bodies
app.use(express.json());

// Enable CORS for all origins
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// POST request to ban a player
app.post('/api/ban', (req, res) => {
  const { username, duration } = req.body;
  const banTime = new Date(); // Get current time
  const newBan = { username, time: banTime.toLocaleString('en-US', { timeZone: 'EDT' }), duration };
  bannedPlayers.push(newBan);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Player banned successfully', newBan }));

  // Broadcast the new banned player data to all WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(newBan));
    }
  });

  // Save the updated ban list to file
  writeBannedPlayersToFile(bannedPlayers);
});

// GET request to retrieve ban status
app.get('/api/ban', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(bannedPlayers));
});

// Handle other requests
app.all('*', (req, res) => {
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start the server
const PORT = 19132; // Default HTTP port
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
