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

// Redis client setup
const redisClient = redis.createClient({
  socket: {
    host: 'localhost',
    port: 6379
  }
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
      // Check if queue is empty
      const queueLength = await redisClient.lLen(QUEUE_KEY);
      const blocked = await BlockedUser.findOne({ userId });

      if (blocked) {
        socket.emit('blocked_user', { message: 'You are temporarily blocked from starting a chat.' });
        logger.warn(`Blocked user ${userId} attempted to start chat`);
        return;
      }

      
      if (queueLength === 0) {
        // Add user to queue
        const userInfo = JSON.stringify({
          userId,
          username,
          socketId: socket.id
        });
        
        await redisClient.lPush(QUEUE_KEY, userInfo);
        logger.info('User added to queue', { userId, username, queueLength: queueLength + 1 });
        
        socket.emit('waiting_for_partner', {
          message: 'Looking for a chat partner...'
        });
      } else {
        // Get a user from queue
        const partnerInfo = await redisClient.rPop(QUEUE_KEY);
        
        if (partnerInfo) {
          const partner = JSON.parse(partnerInfo);
          
          // Create a room
          const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Join both users to the room
          socket.join(roomId);
          const partnerSocket = io.sockets.sockets.get(partner.socketId);
          if (partnerSocket) {
            partnerSocket.join(roomId);
          }
          
          // Store room info in memory
          const roomData = {
            user1: { userId, username, socketId: socket.id },
            user2: { userId: partner.userId, username: partner.username, socketId: partner.socketId }
          };
          activeRooms.set(roomId, roomData);
          
          // Create chat session in MongoDB
          try {
            const chatSession = new ChatSession({
              roomId: roomId,
              participants: [
                { userId: userId, socketId: socket.id },
                { userId: partner.userId, socketId: partner.socketId }
              ],
              startedAt: new Date(),
              metadata: {
                user1: { userId, username },
                user2: { userId: partner.userId, username: partner.username }
              }
            });
            
            await chatSession.save();
            logger.info('Chat session created', { 
              roomId, 
              user1: username, 
              user2: partner.username 
            });
          } catch (error) {
            logger.error('Error creating chat session', { error: error.message, roomId });
          }
          
          // Notify both users
          socket.emit('chat_started', {
            roomId,
            partner: partner.username,
            message: `You are now chatting with ${partner.username}`
          });
          
          if (partnerSocket) {
            partnerSocket.emit('chat_started', {
              roomId,
              partner: username,
              message: `You are now chatting with ${username}`
            });
          }
          
          logger.info('Chat room created', { 
            roomId, 
            user1: username, 
            user2: partner.username 
          });
        }
      }
    } catch (error) {
      console.log(error)
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
      if (blocked) {
        socket.emit('blocked_user', { message: 'You are temporarily blocked from sending messages.' });
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
      console.log(roomId, '---roomId---')
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