const { runMessagesAsync, getMessagesAsync, allMessagesAsync, allUsersAsync, getUsersAsync } = require('../db');

class MessageRepository {
  async saveMessage(conversationId, senderId, payload) {
    const seqRow = await getMessagesAsync('SELECT MAX(sequence_num) as maxSeq FROM messages WHERE conversation_id = ?', [conversationId]);
    const nextSeq = (seqRow && seqRow.maxSeq) ? seqRow.maxSeq + 1 : 1;

    const res = await runMessagesAsync(
      'INSERT INTO messages (conversation_id, sender_id, payload, sequence_num) VALUES (?, ?, ?, ?)',
      [conversationId, senderId, payload, nextSeq]
    );

    return await this.getMessageById(res.lastID);
  }

  async getMessageById(id) {
    const msg = await getMessagesAsync(`
      SELECT id, conversation_id, payload, sequence_num, created_at, sender_id 
      FROM messages WHERE id = ?
    `, [id]);

    if (!msg) return null;

    const user = await getUsersAsync('SELECT username as sender FROM users WHERE id = ?', [msg.sender_id]);
    
    return {
      ...msg,
      sender: user ? user.sender : 'Unknown'
    };
  }

  async getRecentMessages(conversationId, limit = 100) {
    const msgs = await allMessagesAsync(`
      SELECT id, conversation_id, payload, sequence_num, created_at, sender_id
      FROM messages
      WHERE conversation_id = ?
      ORDER BY sequence_num ASC
      LIMIT ?
    `, [conversationId, limit]);

    if (msgs.length === 0) return [];

    const senderIds = [...new Set(msgs.map(m => m.sender_id))];
    const users = await allUsersAsync(`SELECT id, username as sender FROM users WHERE id IN (${senderIds.join(',')})`);
    
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u.sender; });

    return msgs.map(m => ({
      ...m,
      sender: userMap[m.sender_id] || 'Unknown'
    }));
  }

  async deleteMessage(messageId, senderId) {
    const res = await runMessagesAsync('DELETE FROM messages WHERE id = ? AND sender_id = ?', [messageId, senderId]);
    return res.changes > 0;
  }
}

module.exports = new MessageRepository();
