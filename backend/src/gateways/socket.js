const { Server } = require('socket.io');
const eventBus = require('../events/bus');
const presenceService = require('../business/PresenceService');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_secret_key_v2';

function setupSocketGateway(server) {
  const allowedOrigins = process.env.ALLOWED_FRONTENDS ? process.env.ALLOWED_FRONTENDS.split(',') : '*';
  const io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT'] }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    // Join a personal room to receive direct messages
    socket.join(`user:${socket.user.id}`);

    socket.on('userConnected', (username) => {
      presenceService.userConnected(username, socket.id);
    });

    socket.on('disconnect', () => {
      presenceService.userDisconnected(socket.id);
    });

    socket.on('typing', (data) => {
      eventBus.emit('UserTyping', data);
    });
  });

  // Subscriptions from Event Broker to push to Clients
  eventBus.on('PresenceUpdated', (users) => {
    io.emit('onlineUsers', users);
  });

  eventBus.on('MessageCreated', ({ message, targetUserId, senderId }) => {
    const clientPayload = {
      id: message.id,
      text: message.payload,
      sender: message.sender,
      timestamp: message.created_at,
      sequence: message.sequence_num,
      // Include who this is meant for so the client can route it
      targetUserId,
      senderId
    };
    io.to(`user:${targetUserId}`).to(`user:${senderId}`).emit('chatMessage', clientPayload);
  });

  eventBus.on('UserTyping', (data) => {
    if (data.targetUserId) {
      io.to(`user:${data.targetUserId}`).emit('typing', data);
    }
  });

  eventBus.on('MessageDeleted', ({ messageId }) => {
    // Broadcast to all connected clients since we don't have the target/sender in this event payload,
    // though in a massive system we'd look up the conversation members.
    io.emit('messageDeleted', { messageId });
  });

  eventBus.on('ConversationDeleted', ({ conversationId, targetUserId, senderId }) => {
    io.to(`user:${targetUserId}`).to(`user:${senderId}`).emit('conversationDeleted', { targetUserId, senderId });
  });

  return io;
}

module.exports = setupSocketGateway;
