require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');

const app = express();
const server = http.createServer(app);

const MONGO_URI = process.env.MONGO_URI;
console.log('Loaded MONGO_URI:', MONGO_URI);
// MongoDB Connection
mongoose.connect(MONGO_URI).then(() => {
    console.log('MongoDB Connected');
    const db = mongoose.connection.db;
    const gfs = new GridFSBucket(db, { bucketName: 'fs' });
    app.set('gfs', gfs);
}).catch(err => console.error('MongoDB connection error:', err));

// Socket.io initialization
const io = new Server(server, {
    cors: {
        origin: "*", // allow all origins for dev
        methods: ["GET", "POST"]
    }
});

app.set('io', io); // Make io available in routes

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // User joins a room based on their username to receive targeted updates
    socket.on('join_room', (username) => {
        socket.join(username);
        console.log(`User ${username} joined room`);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});