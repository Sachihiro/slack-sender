// server.js
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bodyParser from 'body-parser';

// Get current file path & directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the sendMessageHandler - using dynamic import for ESM compatibility
const sendMessageHandlerPath = join(__dirname, './api/send-message.js');
const sendMessageModule = await import(sendMessageHandlerPath);
const sendMessageHandler = sendMessageModule.default;

const app = express();
const PORT = process.env.PORT || 3000;

// Debug middleware to log request details
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  
  // Only log body for content types we expect
  const contentType = req.headers['content-type'];
  if (contentType && (contentType.includes('json') || contentType.includes('urlencoded'))) {
    console.log('Body:', req.body);
  } else {
    console.log('Content-Type not logged:', contentType || 'not specified');
  }
  
  // Track response for logging
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`Response status: ${res.statusCode}`);
    console.log('Response body:', body);
    return originalSend.call(this, body);
  };
  
  next();
});

// Enable CORS for the Vue.js frontend
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:3000', '*'], // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));

// Parse JSON request body - increasing limit and ensuring strict is false
app.use(bodyParser.json({ 
  limit: '1mb',
  strict: false
}));

// Also support URL-encoded bodies
app.use(bodyParser.urlencoded({ 
  extended: true,
  limit: '1mb'
}));

// Mock Vercel serverless function handler adapter
const mockVercelHandler = (handler) => async (req, res) => {
  try {
    // Create Vercel-like response methods if they don't exist
    if (!res.status) {
      res.status = function(code) {
        this.statusCode = code;
        return this;
      };
    }
    
    await handler(req, res);
  } catch (error) {
    console.error('Error in handler:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

// Use the same API endpoint handler from the api directory
app.post('/api/send-message', mockVercelHandler(sendMessageHandler));

// Options route for CORS preflight
app.options('/api/send-message', (req, res) => {
  res.status(200).json({});
});

// Fallback route
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  console.log(`Send message endpoint: http://localhost:${PORT}/api/send-message`);
});