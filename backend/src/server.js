require('dotenv').config();
const express = require('express');
const http = require('http');
const apiGateway = require('./gateways/api');
const setupSocketGateway = require('./gateways/socket');

// Initialize database
require('./data/db');

const app = express();
const server = http.createServer(app);

// Mount Edge Tier REST Gateway
app.use('/api', apiGateway);

// Mount Edge Tier Real-Time Gateway
setupSocketGateway(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`[Architecture: Decoupled] Enterprise Chat Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error(`Close the process using port ${PORT} and try again.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
