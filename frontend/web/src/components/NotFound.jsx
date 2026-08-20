import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="not-found-wrapper">
      <div className="not-found-box">
        <div className="not-found-code">404</div>
        <h2 className="not-found-title">Page not found</h2>
        <p className="not-found-desc">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="primary-btn" style={{ width: 'auto', padding: '0 24px', height: 44, textDecoration: 'none' }}>
            <Home size={18} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} />
            Go Home
          </Link>
          <Link to="/explore" className="secondary-btn" style={{ width: 'auto', padding: '0 24px', height: 44, textDecoration: 'none' }}>
            <Search size={18} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} />
            Find People
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
