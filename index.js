const http = require('http');
const url = require('url');
const WebSocket = require('ws');

// Array to store ban data { username: username, time: timestamp, duration: durationInMinutes }
let bannedPlayers = [];

// Function to update ban status
function updateBanStatus() {
  setInterval(() => {
    bannedPlayers = bannedPlayers.filter((player) => {
      const elapsedTime = Date.now() - player.time;
      return elapsedTime < player.duration * 60000; // Convert duration to milliseconds
    });
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
        bannedPlayers.push({ username, time: banTime.toLocaleString('en-US', { timeZone: 'EDT' }), duration });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Player banned successfully' }));

        // Broadcast updated banned players data to all WebSocket clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(bannedPlayers));
          }
        });
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
const PORT = 19132; // Default HTTP port
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Start ban status update process
updateBanStatus();
