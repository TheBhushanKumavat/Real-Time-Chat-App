const eventBus = require('../events/bus');

class PresenceService {
  constructor() {
    this.socketToUser = new Map(); // socketId -> username
  }

  userConnected(username, socketId) {
    this.socketToUser.set(socketId, username);
    eventBus.emit('PresenceUpdated', this.getOnlineUsers());
  }

  userDisconnected(socketId) {
    if (this.socketToUser.has(socketId)) {
      this.socketToUser.delete(socketId);
      eventBus.emit('PresenceUpdated', this.getOnlineUsers());
    }
  }

  getOnlineUsers() {
    // Unique users
    return Array.from(new Set(this.socketToUser.values()));
  }
}

module.exports = new PresenceService();
