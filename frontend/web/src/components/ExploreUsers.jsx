import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, Circle, MessageSquareText } from 'lucide-react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ExploreUsers = ({ token }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAllUsers(data);
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchUsers();

    const newSocket = io(API_URL, { auth: { token } });
    newSocket.on('onlineUsers', (users) => setOnlineUsers(users));
    
    return () => newSocket.close();
  }, [token, searchQuery]);

  const displayedUsers = allUsers;

  const startChat = (user) => {
    navigate('/', { state: { targetUser: user } });
  };

  return (
    <div className="explore-layout">
      <div className="explore-header">
        <h2>Find People</h2>
        <p>Search for users to start a conversation. Everyone is anonymous here.</p>
        
        <div className="explore-search">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="explore-grid">
        {displayedUsers.length === 0 && (
          <div className="empty-state explore-empty">
            <Search size={48} className="empty-icon" />
            <h3>No users found</h3>
            <p>Try a different search term</p>
          </div>
        )}
        
        {displayedUsers.map(user => {
          const isOnline = onlineUsers.includes(user.username);
          const displayName = user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}` 
            : user.username;
          return (
            <div key={user.id} className="user-card">
              <div className="contact-avatar large">
                {user.profile_pic ? (
                  <img src={user.profile_pic} alt={user.username} />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
                {isOnline && <Circle size={14} className="online-indicator-badge" />}
              </div>
              <div className="user-card-info">
                <h3>{displayName}</h3>
                <span className={`status-text ${isOnline ? 'online' : 'offline'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                 {user.bio && <p className="user-card-bio">{user.bio}</p>}
              </div>
              <button className="primary-btn sm" onClick={() => startChat(user)}>
                <MessageSquareText size={16} />
                Message
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExploreUsers;
