// Vercel serverless function
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes from server
const routes = require('../server/dist/routes.js');

// Use routes
app.use('/api', routes);

// Serve static files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch all handler
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

module.exports = app;
