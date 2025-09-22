require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const path = require('path');

const stockRoutes = require('./routes/stock');
const monitoringRoutes = require('./routes/monitoring');
const StockService = require('./services/StockService');
const MonitoringService = require('./services/MonitoringService');
const Database = require('./database/Database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: false
  }
});

const PORT = process.env.PORT || 5000;

// Initialize database
const db = new Database();
db.init().catch(err => {
  console.error('Database initialization failed:', err);
});

// Initialize services
const stockService = new StockService();
const monitoringService = new MonitoringService(io);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
  credentials: false
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Routes
app.use('/api/stock', stockRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-monitoring', (data) => {
    socket.join(`monitoring-${data.sessionId}`);
    console.log(`Client ${socket.id} joined monitoring session ${data.sessionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Cron job for monitoring checks (every minute)
cron.schedule('* * * * *', async () => {
  try {
    await monitoringService.checkAllMonitoringSessions();
  } catch (error) {
    console.error('Error in monitoring check:', error);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Serve React app for production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Make services available globally
app.locals.stockService = stockService;
app.locals.monitoringService = monitoringService;
app.locals.db = db;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
  console.log(`🚀 UniFi Stock Tracker server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API available at: http://localhost:${PORT}/api`);
});
