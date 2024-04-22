const http = require('http');
const url = require('url');

// Object to store ban data { username: { time: timestamp, duration: durationInMinutes } }
let bannedPlayers = {};

// Function to update ban status
function updateBanStatus() {
  setInterval(() => {
    Object.keys(bannedPlayers).forEach((username) => {
      const banInfo = bannedPlayers[username];
      const currentTime = Date.now();
      const elapsedTime = currentTime - banInfo.time;
      const remainingTime = banInfo.duration * 60000 - elapsedTime; // Convert duration to milliseconds
      if (remainingTime <= 0) {
        // Remove player from banned list if ban duration is over
        delete bannedPlayers[username];
      }
    });
  }, 60000); // Check ban status every minute
}

// Create a server
const server = http.createServer((req, res) => {
  const { pathname, query } = url.parse(req.url, true);

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
        bannedPlayers[username] = { time: Date.now(), duration };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Player banned successfully' }));
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
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Start ban status update process
updateBanStatus();
