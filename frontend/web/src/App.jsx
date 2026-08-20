import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Chat from './components/Chat';
import ProfileSettings from './components/ProfileSettings';
import ExploreUsers from './components/ExploreUsers';
import Layout from './components/Layout';
import NotFound from './components/NotFound';
import { useTheme } from './context/ThemeContext';

const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setTheme } = useTheme();

  useEffect(() => {
    const storedUser = localStorage.getItem('chat_username');
    const storedToken = localStorage.getItem('chat_token');
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (username, newToken, theme) => {
    localStorage.setItem('chat_username', username);
    localStorage.setItem('chat_token', newToken);
    setUser(username);
    setToken(newToken);
    if (theme) {
      setTheme(theme);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_username');
    localStorage.removeItem('chat_token');
    setUser(null);
    setToken(null);
  };

  const handleProfileUpdate = (newUsername) => {
    localStorage.setItem('chat_username', newUsername);
    setUser(newUsername);
  };

  if (isLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/" replace /> : <Register onLogin={handleLogin} />} 
        />
        <Route 
          path="/forgot-password" 
          element={user ? <Navigate to="/" replace /> : <ForgotPassword />} 
        />

        {/* Protected Routes wrapped in Layout */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute user={user}>
              <Layout username={user} token={token} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Chat username={user} token={token} onLogout={handleLogout} />} />
          <Route path="explore" element={<ExploreUsers token={token} />} />
          <Route 
            path="profile" 
            element={
              <ProfileSettings 
                username={user} 
                token={token} 
                onUpdate={handleProfileUpdate} 
                onLogout={handleLogout}
              />
            } 
          />
        </Route>
        
        {/* 404 Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
