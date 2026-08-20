const messageRepository = require('../data/repositories/MessageRepository');
const conversationRepository = require('../data/repositories/ConversationRepository');
const eventBus = require('../events/bus');

class MessageService {
  async processIncomingMessage(userId, targetUserId, payloadStr) {
    const conversationId = await conversationRepository.getDirectConversation(userId, targetUserId);

    const savedMessage = await messageRepository.saveMessage(conversationId, userId, payloadStr);
    
    // Publish to Event Bus (Decoupled dispatch)
    // We attach targetUserId so the socket gateway knows who to route it to
    eventBus.emit('MessageCreated', { message: savedMessage, targetUserId, senderId: userId });
    
    return savedMessage;
  }

  async getHistory(userId, targetUserId) {
    const conversationId = await conversationRepository.getDirectConversation(userId, targetUserId);
    return await messageRepository.getRecentMessages(conversationId);
  }
}

module.exports = new MessageService();
