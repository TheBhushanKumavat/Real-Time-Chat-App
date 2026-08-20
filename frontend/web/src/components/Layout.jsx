import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MessageSquare, Settings, LogOut, User, Users, Sun, Moon } from 'lucide-react';
import axios from 'axios';
import ConfirmDialog from './ConfirmDialog';
import { useTheme } from '../context/ThemeContext';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Layout = ({ username, token, onLogout }) => {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleConfirmLogout = () => {
    setIsLogoutDialogOpen(false);
    onLogout();
  };

  const handleToggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    toggleTheme();
    try {
      if (token) {
        await axios.put(`${API_URL}/api/users/profile`, { theme: newTheme }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('Failed to sync theme', err);
    }
  };

  return (
    <div className="app-layout">
      <nav className="global-nav">
        <div className="nav-top">
          <div className="brand-icon">
            <MessageSquare size={24} />
          </div>
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Recent Chats">
            <MessageSquare size={20} />
          </NavLink>
          <NavLink to="/explore" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Find People">
            <Users size={20} />
          </NavLink>
        </div>
        
        <div className="nav-bottom">
        <div 
          className="nav-profile nav-profile--clickable" 
          title={username}
          onClick={() => navigate('/profile')}
        >
          {username ? username.charAt(0).toUpperCase() : <User size={20} />}
        </div>
        <button className="nav-item" onClick={handleToggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <button className="nav-item" disabled title="Settings">
          <Settings size={20} />
        </button>
        <button className="nav-item logout" onClick={() => setIsLogoutDialogOpen(true)} title="Logout">
          <LogOut size={20} />
        </button>
        </div>
      </nav>
      
      <main className="main-content">
        <Outlet />
      </main>

      <ConfirmDialog 
        isOpen={isLogoutDialogOpen}
        title="Logout"
        message="Are you sure you want to log out of your account?"
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutDialogOpen(false)}
        confirmText="Logout"
        isDestructive={true}
      />
    </div>
  );
};

export default Layout;
