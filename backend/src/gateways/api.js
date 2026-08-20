const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authService = require('../business/AuthService');
const messageService = require('../business/MessageService');
const userRepository = require('../data/repositories/UserRepository');
const conversationRepository = require('../data/repositories/ConversationRepository');
const messageRepository = require('../data/repositories/MessageRepository');
const eventBus = require('../events/bus');
const cors = require('cors');

const router = express.Router();

const allowedOrigins = process.env.ALLOWED_FRONTENDS ? process.env.ALLOWED_FRONTENDS.split(',') : '*';
router.use(cors({ origin: allowedOrigins }));

// Configure multer for memory storage (we'll convert to base64)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 } // 100KB limit
});

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Simple request logging middleware
router.use((req, res, next) => {
  console.log(`[API] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Helper to convert buffer to base64 data URL
const bufferToDataUrl = (buffer, mimetype) => {
  const base64 = buffer.toString('base64');
  return `data:${mimetype};base64,${base64}`;
};

router.post('/auth/register', upload.single('profile_pic'), async (req, res) => {
  try {
    const { username, password, first_name, last_name, bio, dob, email, mobile, country_code } = req.body;
    let profilePic = null;
    
    if (req.file) {
      profilePic = bufferToDataUrl(req.file.buffer, req.file.mimetype);
    }
    
    const result = await authService.register({ 
      username, 
      password, 
      first_name, 
      last_name, 
      bio, 
      dob, 
      email, 
      mobile, 
      country_code,
      profile_pic: profilePic
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const authenticateToken = require('../middleware/auth');

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await userRepository.getAllUsers();
    res.json(users.filter(u => u.id !== req.user.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/search', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q || '';
    const users = await userRepository.getPublicUsers(query);
    res.json(users.filter(u => u.id !== req.user.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/check-username', async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const user = await userRepository.findByUsername(username);
    
    let currentUserId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'enterprise_secret_key_v2');
          currentUserId = decoded.id;
        } catch (e) {
          // Ignore invalid token here
        }
      }
    }

    if (user && user.id !== currentUserId) {
      return res.json({ available: false, message: 'Username is already taken' });
    }
    res.json({ available: true, message: 'Username is available' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/recent', authenticateToken, async (req, res) => {
  try {
    const users = await conversationRepository.getRecentConversations(req.user.id);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await userRepository.findById(req.user.id);
    const { password, reset_token, reset_expires, ...publicUser } = user;
    res.json(publicUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const user = await userRepository.findByIdPublic(targetUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const filtered = {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      status: user.status,
      last_seen: user.last_seen,
      bio: user.bio_public ? user.bio : null,
      dob: user.dob_public ? user.dob : null,
      email: user.email_public ? user.email : null,
      mobile: user.mobile_public ? user.mobile : null,
      country_code: user.mobile_public ? user.country_code : null,
      profile_pic: user.profile_pic_public ? user.profile_pic : null,
      theme: user.theme || 'light',
    };
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/profile', upload.single('profile_pic'), authenticateToken, async (req, res) => {
  try {
    const allowedFields = [
      'first_name', 'last_name', 'bio', 'dob', 'email', 'mobile', 'country_code', 'theme',
      'bio_public', 'dob_public', 'email_public', 'mobile_public', 'profile_pic_public',
      'first_name_public', 'last_name_public'
    ];
    const fields = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        fields[key] = req.body[key];
      }
    }
    
    if (req.file) {
      fields.profile_pic = bufferToDataUrl(req.file.buffer, req.file.mimetype);
    }
    
    await userRepository.updateProfile(req.user.id, fields);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/profile/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    await userRepository.updateProfile(req.user.id, { status });
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/users/account', authenticateToken, async (req, res) => {
  try {
    await userRepository.deleteUser(req.user.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/messages/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.targetUserId, 10);
    const history = await messageService.getHistory(req.user.id, targetUserId);
    const mapped = history.map(m => ({
      id: m.id,
      text: m.payload,
      sender: m.sender,
      timestamp: m.created_at,
      sequence: m.sequence_num
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/messages/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.length > 500) {
      return res.status(400).json({ error: 'Message must be between 1 and 500 characters' });
    }
    const targetUserId = parseInt(req.params.targetUserId, 10);
    const senderId = req.user.id;
    
    const savedMsg = await messageService.processIncomingMessage(senderId, targetUserId, text);
    res.json({
      id: savedMsg.id,
      text: savedMsg.payload,
      sender: savedMsg.sender,
      timestamp: savedMsg.created_at,
      sequence: savedMsg.sequence_num
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const success = await messageRepository.deleteMessage(messageId, req.user.id);
    
    if (success) {
      eventBus.emit('MessageDeleted', { messageId });
      res.json({ success: true });
    } else {
      res.status(403).json({ error: 'Not authorized or message not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/conversations/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.targetUserId, 10);
    const conversationId = await conversationRepository.getDirectConversation(req.user.id, targetUserId);
    
    await conversationRepository.deleteConversation(conversationId);
    
    eventBus.emit('ConversationDeleted', { conversationId, targetUserId, senderId: req.user.id });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
