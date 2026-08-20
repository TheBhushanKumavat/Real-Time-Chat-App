const { runMessagesAsync, getMessagesAsync, allMessagesAsync, allUsersAsync } = require('../db');

class ConversationRepository {
  async createConversation(type) {
    const res = await runMessagesAsync('INSERT INTO conversations (type) VALUES (?)', [type]);
    return res.lastID;
  }

  async addMember(conversationId, userId, role = 'member') {
    await runMessagesAsync(
      'INSERT OR IGNORE INTO memberships (conversation_id, user_id, role) VALUES (?, ?, ?)',
      [conversationId, userId, role]
    );
  }

  async getGlobalChannel() {
    let row = await getMessagesAsync("SELECT id FROM conversations WHERE type = 'channel'");
    if (!row) {
      const res = await runMessagesAsync("INSERT INTO conversations (type) VALUES ('channel')");
      row = { id: res.lastID };
    }
    return row.id;
  }

  async getDirectConversation(userId1, userId2) {
    // Find a direct conversation where exactly these two users are members
    const row = await getMessagesAsync(`
      SELECT c.id FROM conversations c
      JOIN memberships m1 ON c.id = m1.conversation_id
      JOIN memberships m2 ON c.id = m2.conversation_id
      WHERE c.type = 'direct' AND m1.user_id = ? AND m2.user_id = ?
    `, [userId1, userId2]);

    if (row) return row.id;

    // Create if doesn't exist
    const res = await runMessagesAsync("INSERT INTO conversations (type) VALUES ('direct')");
    const conversationId = res.lastID;
    
    await this.addMember(conversationId, userId1);
    // If it's the same user messaging themselves, don't add twice
    if (userId1 !== userId2) {
      await this.addMember(conversationId, userId2);
    }
    
    return conversationId;
  }

  async getRecentConversations(userId) {
    // First, find all direct conversations this user is in
    const myConversations = await allMessagesAsync(`
      SELECT conversation_id FROM memberships WHERE user_id = ?
    `, [userId]);

    if (myConversations.length === 0) return [];
    
    const convIds = myConversations.map(c => c.conversation_id).join(',');
    
    // Find other members in these direct conversations
    const otherMembers = await allMessagesAsync(`
      SELECT m.user_id FROM memberships m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.type = 'direct' AND m.conversation_id IN (${convIds}) AND m.user_id != ?
    `, [userId]);

    const otherUserIds = [...new Set(otherMembers.map(m => m.user_id))];
    if (otherUserIds.length === 0) return [];
    
    // Fetch user details from users database
    return await allUsersAsync(`
      SELECT id, username, first_name, last_name, status, last_seen, profile_pic, profile_pic_public 
      FROM users WHERE id IN (${otherUserIds.join(',')})
    `);
  }

  async deleteConversation(conversationId) {
    await runMessagesAsync('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
    await runMessagesAsync('DELETE FROM memberships WHERE conversation_id = ?', [conversationId]);
    await runMessagesAsync('DELETE FROM conversations WHERE id = ?', [conversationId]);
  }
}

module.exports = new ConversationRepository();
