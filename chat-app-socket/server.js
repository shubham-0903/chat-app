require("dotenv").config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require("morgan");
const logger = require("./src/config/logger");
const { initRabbitMQ, sendToQueue } = require('./src/config/rabbitmq');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Import models
const ChatMessage = require('./models/ChatMessage');
const ChatSession = require('./models/ChatSession');
const BlockedUser = require('./models/BlockedUser');

const url = new URL(process.env.REDIS_URL);

// Redis client setup
const redisClient = redis.createClient({
 socket: {
    host: url.hostname,
    port: url.port,
  },
});

const QUEUE_KEY = 'chat:queue';
const ROOMS_KEY_PREFIX = 'chat:room:';

// Connect to Redis
redisClient.connect().catch(console.error);

// Connect to MongoDB
const MONGODB_URI = process.env.MONGO_URL;
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
});

// Store active rooms and user mappings
const activeRooms = new Map(); // roomId -> { user1, user2 }
const userSocketMap = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  logger.info('User connected', { socketId: socket.id });

  // Handle user login
  socket.on('user_login', (userData) => {
    const { userId, username } = userData;

    // If this user already has a socket, disconnect it
    const existingSocketId = userSocketMap.get(userId);
    if (existingSocketId && io.sockets.sockets.get(existingSocketId)) {
      const oldSocket = io.sockets.sockets.get(existingSocketId);
      oldSocket.emit('session_ended', { message: 'You logged in from another device or tab.' });
      oldSocket.disconnect(true);
      logger.info('Previous socket disconnected for duplicate login', { userId, existingSocketId });
    }

    // Register new socket
    userSocketMap.set(userId, socket.id);
    socket.userId = userId;
    socket.username = username;
    logger.info('User logged in', { userId, username, socketId: socket.id });
  });

  // Handle finding a chat partner
  socket.on('find_chat', async (userData) => {
  const { userId, username } = userData;

  logger.info('User looking for chat partner', { userId, username });

  try {
    const blocked = await BlockedUser.findOne({ userId });
    if (blocked) {
      socket.emit('blocked_user', { message: 'You are temporarily blocked from starting a chat.' });
      return;
    }

    let queue = await redisClient.lRange(QUEUE_KEY, 0, -1);
    let partnerInfo = null;

    // Remove self entries (if user was already waiting)
    for (let i = 0; i < queue.length; i++) {
      const queuedUser = JSON.parse(queue[i]);
      if (queuedUser.userId === userId) {
        await redisClient.lRem(QUEUE_KEY, 1, queue[i]);
        logger.info('Removed duplicate self-entry from queue', { userId });
      }
    }

    // Refresh queue after removal
    queue = await redisClient.lRange(QUEUE_KEY, 0, -1);

    if (queue.length === 0) {
      // Add user to queue
      await redisClient.lPush(
        QUEUE_KEY,
        JSON.stringify({ userId, username, socketId: socket.id })
      );
      socket.emit('waiting_for_partner', { message: 'Looking for a chat partner...' });
      return;
    }

    // Pop until we find a different user
    while (queue.length > 0) {
      const popped = await redisClient.rPop(QUEUE_KEY);
      if (!popped) break;

      const potentialPartner = JSON.parse(popped);
      if (potentialPartner.userId !== userId) {
        partnerInfo = potentialPartner;
        break;
      }
    }

    // If no partner found (only self in queue)
    if (!partnerInfo) {
      await redisClient.lPush(
        QUEUE_KEY,
        JSON.stringify({ userId, username, socketId: socket.id })
      );
      socket.emit('waiting_for_partner', { message: 'Looking for a chat partner...' });
      return;
    }

    // Proceed to create room
    const partnerSocket = io.sockets.sockets.get(partnerInfo.socketId);
    if (!partnerSocket) {
      logger.warn('Partner socket not found, requeue user', { partnerInfo });
      await redisClient.lPush(
        QUEUE_KEY,
        JSON.stringify({ userId, username, socketId: socket.id })
      );
      return;
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    socket.join(roomId);
    partnerSocket.join(roomId);

    const roomData = {
      user1: { userId, username, socketId: socket.id },
      user2: { userId: partnerInfo.userId, username: partnerInfo.username, socketId: partnerInfo.socketId }
    };
    activeRooms.set(roomId, roomData);

    // Notify both users
    socket.emit('chat_started', { roomId, partner: partnerInfo.username });
    partnerSocket.emit('chat_started', { roomId, partner: username });

    logger.info('Chat started', { roomId, user1: username, user2: partnerInfo.username });
  } catch (error) {
    logger.error('Error in find_chat', { error: error.message, userId, username });
    socket.emit('error', { message: 'Failed to find chat partner' });
  }
});


  // Handle sending messages
  socket.on('send_message', async (data) => {
    const { roomId, message, username } = data;
    
    try {
      // Save message to MongoDB
      const blocked = await BlockedUser.findOne({ userId: socket.userId });
      console.log(blocked, await BlockedUser.find(), '------sdfd-----')
      if (blocked) {
        socket.emit('blocked_user', { message: 'You are temporarily blocked from sending messages.' });
        socket.to(roomId).emit('partner_blocked', { 
          message: `${username} has been blocked and cannot send messages.` 
        });
        logger.warn(`Blocked user ${socket.userId} attempted to send message`);
        return;
      }

      const chatMessage = new ChatMessage({
        roomId: roomId,
        fromUserId: socket.userId,
        text: message,
        meta: {
          username: username,
          socketId: socket.id
        },
        ts: new Date()
      });
      
      await chatMessage.save();
      logger.info('Message saved to database', { 
        roomId, 
        userId: socket.userId, 
        username, 
        messageLength: message.length 
      });
      
      // Broadcast message to room
      socket.to(roomId).emit('receive_message', {
        username,
        message,
        timestamp: new Date().toISOString()
      });
      await sendToQueue({ userId: socket.userId, message, sentAt: new Date().toISOString() });
      
      console.log('Message sent', { roomId, username, message });
    } catch (error) {
      console.log(error)
      logger.error('Error saving message', { error: error.message, roomId, username });
    }
  });

  // Handle ending chat
  socket.on('end_chat', async (data) => {
    const { roomId, userId } = data;
    
    const room = activeRooms.get(roomId);
    if (room) {
      // Update chat session in MongoDB
      try {
        await ChatSession.findOneAndUpdate(
          { roomId: roomId },
          { endedAt: new Date() },
          { new: true }
        );
        logger.info('Chat session ended', { roomId, userId });
      } catch (error) {
        logger.error('Error updating chat session', { error: error.message, roomId });
      }
      
      // Notify the other user
      const otherUserSocketId = room.user1.userId === userId ? room.user2.socketId : room.user1.socketId;
      const otherUserSocket = io.sockets.sockets.get(otherUserSocketId);
      
      if (otherUserSocket) {
        otherUserSocket.emit('partner_left', {
          message: 'Your chat partner has left the conversation'
        });
        otherUserSocket.leave(roomId);
      }
      
      // Clean up
      socket.leave(roomId);
      activeRooms.delete(roomId);
      
      logger.info('Chat room cleaned up', { roomId });
    }
  });

  // Handle get chat history
  socket.on('get_chat_history', async (data) => {
    const { roomId, limit = 50 } = data;
    
    try {
      const messages = await ChatMessage.find({ roomId })
        .sort({ ts: -1 })
        .limit(limit)
        .lean();
      
      // Reverse to get chronological order
      messages.reverse();
      
      socket.emit('chat_history', {
        roomId,
        messages: messages.map(msg => ({
          username: msg.meta.username,
          message: msg.text,
          timestamp: msg.ts,
          isOwn: msg.fromUserId === socket.userId
        }))
      });
      
      logger.info('Chat history retrieved', { roomId, messageCount: messages.length });
    } catch (error) {
      logger.error('Error retrieving chat history', { error: error.message, roomId });
      socket.emit('error', { message: 'Failed to load chat history' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    logger.info('User disconnected', { 
      socketId: socket.id, 
      userId: socket.userId, 
      username: socket.username 
    });
    
    // Remove user from queue if they were waiting
    try {
      const queue = await redisClient.lRange(QUEUE_KEY, 0, -1);
      for (let i = 0; i < queue.length; i++) {
        const userInfo = JSON.parse(queue[i]);
        if (userInfo.socketId === socket.id) {
          await redisClient.lRem(QUEUE_KEY, 1, queue[i]);
          logger.info('User removed from queue due to disconnect', { 
            userId: userInfo.userId, 
            username: userInfo.username 
          });
          break;
        }
      }
    } catch (error) {
      logger.error('Error cleaning up queue', { error: error.message, socketId: socket.id });
    }
    
    // End any active chat sessions for this user
    for (const [roomId, room] of activeRooms.entries()) {
      if (room.user1.socketId === socket.id || room.user2.socketId === socket.id) {
        const userId = room.user1.socketId === socket.id ? room.user1.userId : room.user2.userId;
        
        // Update chat session
        try {
          await ChatSession.findOneAndUpdate(
            { roomId: roomId },
            { endedAt: new Date() },
            { new: true }
          );
          logger.info('Chat session ended due to disconnect', { roomId, userId });
        } catch (error) {
          logger.error('Error updating chat session on disconnect', { error: error.message, roomId });
        }
        
        // Notify partner
        const otherUserSocketId = room.user1.socketId === socket.id ? room.user2.socketId : room.user1.socketId;
        const otherUserSocket = io.sockets.sockets.get(otherUserSocketId);
        
        if (otherUserSocket) {
          otherUserSocket.emit('partner_left', {
            message: 'Your chat partner has disconnected'
          });
          otherUserSocket.leave(roomId);
        }
        
        activeRooms.delete(roomId);
        break;
      }
    }
    
    // Clean up user mapping
    if (socket.userId) {
      userSocketMap.delete(socket.userId);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  try {
    await initRabbitMQ();
    logger.info(`Server running on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to initialize RabbitMQ', { error: error.message });
  }
});