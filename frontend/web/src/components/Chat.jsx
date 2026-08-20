import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Circle, MessageSquare, Trash2, Search, Users, X, Menu, ArrowLeft } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import sendSoundUrl from '../assets/sounds/message_send.mp3';
import receiveSoundUrl from '../assets/sounds/message_receive.mp3';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Chat = ({ username, token, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [recentUsers, setRecentUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeChat, setActiveChat] = useState(location.state?.targetUser || null);
  
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const [deleteMsgDialog, setDeleteMsgDialog] = useState({ isOpen: false, msgId: null });
  const [deleteChatDialog, setDeleteChatDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const activeChatRef = useRef(activeChat);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const playSound = (type) => {
    try {
      const audio = new Audio(type === 'send' ? sendSoundUrl : receiveSoundUrl);
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (err) {
      console.log('Audio error:', err);
    }
  };

  useEffect(() => {
    const newSocket = io(API_URL, {
      auth: { token }
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('userConnected', username);
    });

    newSocket.on('chatMessage', (message) => {
      const currentActiveChat = activeChatRef.current;
      const isForActiveChat = currentActiveChat && (message.senderId === currentActiveChat.id || message.targetUserId === currentActiveChat.id);
      
      if (isForActiveChat && message.sender !== username) {
        playSound('receive');
      }

      setActiveChat((currentActiveChatState) => {
        const shouldAddMessage = currentActiveChatState && (message.senderId === currentActiveChatState.id || message.targetUserId === currentActiveChatState.id);
        if (shouldAddMessage) {
          setMessages((prev) => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
        return currentActiveChatState;
      });
      fetchRecentUsers();
    });
    
    newSocket.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) => prev.filter(m => m.id !== messageId));
    });

    newSocket.on('conversationDeleted', ({ targetUserId, senderId }) => {
      setActiveChat((currentActiveChat) => {
        if (currentActiveChat && (currentActiveChat.id === targetUserId || currentActiveChat.id === senderId)) {
          return null;
        }
        return currentActiveChat;
      });
      fetchRecentUsers();
    });

    newSocket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('typing', (data) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.user);
        } else {
          next.delete(data.user);
        }
        return next;
      });
    });

    fetchRecentUsers();

    return () => newSocket.close();
  }, [username, token]);

  const fetchRecentUsers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/users/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      setTypingUsers(new Set());
      return;
    }

    axios.get(`${API_URL}/api/messages/${activeChat.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => {
      setMessages(data);
      setTypingUsers(new Set());
    }).catch(console.error);
  }, [activeChat, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const msgData = { text: newMessage };
    setNewMessage('');
    if (socket) socket.emit('typing', { user: username, targetUserId: activeChat.id, isTyping: false });

    playSound('send');

    try {
      await axios.post(`${API_URL}/api/messages/${activeChat.id}`, msgData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecentUsers();
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && activeChat) {
      socket.emit('typing', { user: username, targetUserId: activeChat.id, isTyping: true });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { user: username, targetUserId: activeChat.id, isTyping: false });
      }, 1000);
    }
  };

  const handleDeleteMessage = async () => {
    const msgId = deleteMsgDialog.msgId;
    setDeleteMsgDialog({ isOpen: false, msgId: null });
    
    if (!msgId) return;
    try {
      await axios.delete(`${API_URL}/api/messages/${msgId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const handleDeleteChat = async () => {
    setDeleteChatDialog(false);
    if (!activeChat) return;
    
    try {
      await axios.delete(`${API_URL}/api/conversations/${activeChat.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveChat(null);
      fetchRecentUsers();
    } catch (err) {
      console.error('Failed to delete chat', err);
    }
  };

  return (
    <div className={`chat-layout ${!activeChat ? 'no-active-chat' : 'has-active-chat'}`}>
      {/* Sidebar Backdrop for mobile */}
      <div 
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Sidebar for Contacts */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Chats</h2>
          <button 
            className="sidebar-toggle" 
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="contact-list">
          {recentUsers.length === 0 && (
            <div className="sidebar-empty">
              <MessageSquare size={32} className="sidebar-empty-icon" />
              <div>No recent chats.</div>
              <button 
                className="primary-btn" 
                onClick={() => navigate('/explore')}
              >
                <Users size={16} />
                Find People
              </button>
            </div>
          )}
          {recentUsers.map((user) => {
            const isOnline = onlineUsers.includes(user.username);
            const isActive = activeChat?.id === user.id;
            return (
              <div 
                key={user.id} 
                className={`contact-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveChat(user);
                  setSidebarOpen(false);
                }}
              >
                <div className="contact-avatar">
                  {user.profile_pic ? (
                    <img src={user.profile_pic} alt={user.username} />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                  {isOnline && <Circle size={10} className="online-indicator-badge" />}
                </div>
                <div className="contact-info">
                  <h4>{user.username}</h4>
                  <span className={`status-text ${isOnline ? 'online' : 'offline'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-chat">
        {!activeChat ? (
          <div className="empty-state-container">
            <div className="chat-header mobile-only-header">
              <button 
                type="button"
                className="mobile-menu-btn" 
                onClick={() => setSidebarOpen(true)}
                aria-label="Open chats"
              >
                <Menu size={20} />
              </button>
              <div className="chat-header-info">
                <h3>Messages</h3>
              </div>
            </div>
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <MessageSquare size={36} className="empty-icon" />
              </div>
              <h3>Your Messages</h3>
              <p>Select a contact to start chatting or find new people.</p>
              <button 
                className="primary-btn" 
                onClick={() => navigate('/explore')}
                style={{ marginTop: '16px' }}
              >
                <Search size={18} style={{ marginRight: '8px' }} />
                Find People
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button 
                  type="button"
                  className="mobile-menu-btn" 
                  onClick={() => setActiveChat(null)}
                  aria-label="Back to chats"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="chat-header-info">
                  <h3>{activeChat.username}</h3>
                  <span className={onlineUsers.includes(activeChat.username) ? 'online-text' : 'offline-text'}>
                    {onlineUsers.includes(activeChat.username) ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="chat-header-actions">
                <button 
                  className="icon-btn danger" 
                  title="Delete Chat"
                  onClick={() => setDeleteChatDialog(true)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((msg, idx) => {
                const isSentByMe = msg.sender === username;
                return (
                  <div 
                    key={msg.id} 
                    className={`message-wrapper ${isSentByMe ? 'sent' : 'received'}`}
                  >
                    <div className="message-bubble">
                      <div className="message-text">{msg.text}</div>
                      <div className="message-footer">
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isSentByMe && (
                          <button 
                            className="msg-delete-btn" 
                            title="Delete for Everyone"
                            onClick={() => setDeleteMsgDialog({ isOpen: true, msgId: msg.id })}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {activeChat && Array.from(typingUsers).includes(activeChat.username) && (
                <div className="typing-indicator">
                  {activeChat.username} is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="message-input-area">
              <input 
                type="text" 
                placeholder={`Message @${activeChat.username}...`}
                value={newMessage}
                onChange={handleTyping}
                maxLength={500}
              />
              <button type="submit" disabled={!newMessage.trim()}>
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </div>
      
      {/* Modals */}
      <ConfirmDialog 
        isOpen={deleteMsgDialog.isOpen}
        title="Delete Message"
        message="Are you sure you want to delete this message for everyone?"
        onConfirm={handleDeleteMessage}
        onCancel={() => setDeleteMsgDialog({ isOpen: false, msgId: null })}
        confirmText="Delete"
        isDestructive={true}
      />

      <ConfirmDialog 
        isOpen={deleteChatDialog}
        title="Delete Chat"
        message={`Are you sure you want to permanently delete your chat history with ${activeChat?.username}? This cannot be undone.`}
        onConfirm={handleDeleteChat}
        onCancel={() => setDeleteChatDialog(false)}
        confirmText="Delete Chat"
        isDestructive={true}
      />
    </div>
  );
};

export default Chat;
