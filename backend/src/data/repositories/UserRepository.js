const { runUsersAsync, getUsersAsync, allUsersAsync, runMessagesAsync, allMessagesAsync } = require('../db');

class UserRepository {
  async createUser({ username, passwordHash, first_name, last_name, bio, dob, email, mobile, country_code, profile_pic }) {
    try {
      const res = await runUsersAsync(
        `INSERT INTO users (username, password, first_name, last_name, bio, dob, email, mobile, country_code, profile_pic) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [username, passwordHash, first_name, last_name, bio, dob, email, mobile, country_code, profile_pic]
      );
      return { id: res.lastID, username };
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        throw new Error('Username already exists');
      }
      throw err;
    }
  }

  async findByUsername(username) {
    return await getUsersAsync('SELECT * FROM users WHERE username = ?', [username]);
  }

  async findById(id) {
    return await getUsersAsync('SELECT * FROM users WHERE id = ?', [id]);
  }

  async findByIdPublic(id) {
    return await getUsersAsync(`
      SELECT id, username, first_name, last_name, bio, dob, email, mobile, country_code, profile_pic, theme,
             bio_public, dob_public, email_public, mobile_public, profile_pic_public, first_name_public, last_name_public, status, last_seen
      FROM users WHERE id = ?
    `, [id]);
  }

  async findByEmail(email) {
    return await getUsersAsync('SELECT id, username, email, reset_token, reset_expires FROM users WHERE email = ?', [email]);
  }

  async getAllUsers() {
    return await allUsersAsync(`
      SELECT id, username, first_name, last_name, status, last_seen 
      FROM users ORDER BY username ASC
    `);
  }

  async getPublicUsers(query) {
    const users = await allUsersAsync(`
      SELECT id, username, first_name, last_name, bio, dob, email, mobile, country_code, profile_pic, theme,
             bio_public, dob_public, email_public, mobile_public, profile_pic_public, first_name_public, last_name_public, status, last_seen
      FROM users 
      WHERE username LIKE ? OR first_name LIKE ? OR last_name LIKE ?
      ORDER BY username ASC
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);
    
    return users.map(user => ({
      id: user.id,
      username: user.username,
      first_name: user.first_name_public ? user.first_name : null,
      last_name: user.last_name_public ? user.last_name : null,
      status: user.status,
      last_seen: user.last_seen,
      bio: user.bio_public ? user.bio : null,
      dob: user.dob_public ? user.dob : null,
      email: user.email_public ? user.email : null,
      mobile: user.mobile_public ? user.mobile : null,
      country_code: user.mobile_public ? user.country_code : null,
      profile_pic: user.profile_pic_public ? user.profile_pic : null,
    }));
  }

  async updateProfile(userId, fields) {
    const allowed = ['status', 'username', 'first_name', 'last_name', 'bio', 'dob', 'email', 'mobile', 
                     'country_code', 'profile_pic', 'theme', 'bio_public', 'dob_public', 'email_public', 
                     'mobile_public', 'profile_pic_public', 'first_name_public', 'last_name_public', 'reset_token', 'reset_expires'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) return;
    
    values.push(userId);
    await runUsersAsync(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
  }

  async deleteUser(userId) {
    const user = await getUsersAsync('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) throw new Error('User not found');
    
    // Get all direct conversations for this user from messagesDb
    const conversations = await allMessagesAsync(`
      SELECT c.id FROM conversations c
      JOIN memberships m ON c.id = m.conversation_id
      WHERE c.type = 'direct' AND m.user_id = ?
    `, [userId]);
    
    for (const conv of conversations) {
      await runMessagesAsync('DELETE FROM messages WHERE conversation_id = ?', [conv.id]);
      await runMessagesAsync('DELETE FROM memberships WHERE conversation_id = ?', [conv.id]);
      await runMessagesAsync('DELETE FROM conversations WHERE id = ?', [conv.id]);
    }
    
    await runUsersAsync('DELETE FROM users WHERE id = ?', [userId]);
    return true;
  }
}

module.exports = new UserRepository();
