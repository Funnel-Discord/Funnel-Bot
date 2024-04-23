const http = require('http');
const fs = require('fs');
const url = require('url');
const WebSocket = require('ws');

const BAN_LIST_FILE = 'bannedlist.json';

// Function to read banned players from file
function readBannedPlayersFromFile() {
  try {
    const data = fs.readFileSync(BAN_LIST_FILE, 'utf8');
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
function updateBanStatus() {
  setInterval(() => {
    bannedPlayers = bannedPlayers.filter((player) => {
      const elapsedTime = Date.now() - player.time;
      return elapsedTime < player.duration * 60000; // Convert duration to milliseconds
    });
    // Save the updated ban list to file
    writeBannedPlayersToFile(bannedPlayers);
  }, 60000); // Check ban status every minute
}

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// WebSocket connection handler
wss.on('connection', (ws) => {
  // Send initial banned players data to the client
  ws.send(JSON.stringify(bannedPlayers));
});

// HTTP request handler
server.on('request', (req, res) => {
  const { pathname, query } = url.parse(req.url, true);

  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Handle POST request to ban a player
  if (req.method === 'POST' && pathname === '/api/ban') {
    let body = '';
    
    // Read data from the request
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    // Parse and store ban data
    req.on('end', () => {
      try {
        const { username, duration } = JSON.parse(body);
        const banTime = new Date(); // Get current time
        const newBan = { username, time: banTime.toLocaleString('en-US', { timeZone: 'UTC' }), duration };
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
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid data format' }));
      }
    });
  }

  // Handle GET request to retrieve ban status
  else if (req.method === 'GET' && pathname === '/api/ban') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(bannedPlayers));
  }

  // Handle other requests
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start the server
const PORT = 3000; // Default HTTP port
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Start ban status update process
updateBanStatus();
