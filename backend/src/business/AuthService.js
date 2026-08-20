const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getUsersAsync, allUsersAsync } = require('../data/db');
const userRepository = require('../data/repositories/UserRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_secret_key_v3';

class AuthService {
  async register({ username, password, first_name, last_name, bio, dob, email, mobile, country_code, profile_pic }) {
    if (!username || !password) throw new Error('Missing credentials');
    if (username.length < 3) throw new Error('Username must be at least 3 characters');
    if (username.length > 30) throw new Error('Username must be 30 characters or less');
    if (/\s/.test(username)) throw new Error('Username cannot contain spaces');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new Error('Username can only contain letters, numbers, and underscores');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');
    
    const hash = await argon2.hash(password);
    const user = await userRepository.createUser({
      username, 
      passwordHash: hash,
      first_name,
      last_name,
      bio,
      dob,
      email,
      mobile,
      country_code,
      profile_pic
    });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    return { user: { id: user.id, username: user.username, theme: 'light' }, token };
  }

  async login(username, password) {
    if (!username || !password) throw new Error('Missing credentials');
    const user = await userRepository.findByUsername(username);
    if (!user) throw new Error('Invalid credentials');
    
    const isValid = await argon2.verify(user.password, password);
    if (!isValid) throw new Error('Invalid credentials');

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    return { user: { id: user.id, username: user.username, theme: user.theme || 'light' }, token };
  }

  async forgotPassword(email) {
    if (!email) throw new Error('Email is required');
    const user = await getUsersAsync('SELECT id, email FROM users WHERE email = ?', [email]);
    if (!user) throw new Error('No account found with that email');
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 3600000;
    
    await userRepository.updateProfile(user.id, {
      reset_token: resetToken,
      reset_expires: resetExpires
    });
    
    return { message: 'Password reset link sent to your email' };
  }

  async resetPassword(token, newPassword) {
    const user = await getUsersAsync('SELECT id, username, reset_token, reset_expires FROM users WHERE reset_token = ?', [token]);
    if (!user || user.reset_expires < Date.now()) {
      throw new Error('Invalid or expired reset token');
    }
    
    const hash = await argon2.hash(newPassword);
    await userRepository.updateProfile(user.id, {
      password: hash,
      reset_token: null,
      reset_expires: null
    });
    
    return { message: 'Password reset successfully' };
  }
}

module.exports = new AuthService();
