import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, Eye, EyeOff, Sun, Moon, MessageSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const COUNTRIES = [
  { code: '+1', name: 'US/CA (+1)' },
  { code: '+44', name: 'UK (+44)' },
  { code: '+91', name: 'India (+91)' },
  { code: '+61', name: 'Australia (+61)' },
  { code: '+49', name: 'Germany (+49)' },
  { code: '+33', name: 'France (+33)' },
  { code: '+81', name: 'Japan (+81)' },
  { code: '+86', name: 'China (+86)' },
  { code: '+7', name: 'Russia (+7)' },
  { code: '+55', name: 'Brazil (+55)' },
  { code: '+27', name: 'South Africa (+27)' },
  { code: '+971', name: 'UAE (+971)' },
];

const Register = ({ onLogin }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    bio: '',
    dob: '',
    email: '',
    mobile: '',
    country_code: '+1',
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  const checkUsernameAvailability = async (usernameToCheck) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setUsernameChecking(true);
    setUsernameAvailable(null);
    try {
      const { data } = await axios.get(`${API_URL}/api/users/check-username?username=${encodeURIComponent(usernameToCheck)}`);
      setUsernameAvailable(data.available);
      if (!data.available) {
        setFieldErrors(prev => ({ ...prev, username: data.message }));
      }
    } catch (err) {
      console.error('Username check failed', err);
    } finally {
      setUsernameChecking(false);
    }
  };

  const validateUsername = (value) => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 30) return 'Username must be 30 characters or less';
    if (/\s/.test(value)) return 'Username cannot contain spaces';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
    return '';
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'username':
        return validateUsername(value);
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (value.length > 128) return 'Password must be 128 characters or less';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      case 'first_name':
        if (!value) return 'First name is required';
        if (value.length > 50) return 'First name must be 50 characters or less';
        return '';
      case 'last_name':
        if (!value) return 'Last name is required';
        if (value.length > 50) return 'Last name must be 50 characters or less';
        return '';
      case 'bio':
        if (!value) return 'Bio is required';
        return '';
      case 'dob':
        if (!value) return 'Date of birth is required';
        const dobDate = new Date(value);
        const minAgeDate = new Date();
        minAgeDate.setFullYear(minAgeDate.getFullYear() - 15);
        if (dobDate > minAgeDate) return 'You must be at least 15 years old';
        return '';
      case 'email':
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email';
        return '';
      case 'mobile':
        if (!value) return 'Mobile number is required';
        if (!/^[0-9+\-\s()]{7,20}$/.test(value)) return 'Please enter a valid mobile number';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    const err = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: err }));
    
    if (name === 'username' && !err) {
      checkUsernameAvailability(value);
    } else if (name === 'username' && err) {
      setUsernameAvailable(null);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 100 * 1024) {
      setError('Profile picture must be less than 100KB');
      return;
    }
    
    setProfilePic(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicPreview(reader.result);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const usernameErr = validateUsername(formData.username);
    const passwordErr = validateField('password', formData.password);
    const confirmErr = validateField('confirmPassword', formData.confirmPassword);
    const firstNameErr = validateField('first_name', formData.first_name);
    const lastNameErr = validateField('last_name', formData.last_name);
    const bioErr = validateField('bio', formData.bio);
    const dobErr = validateField('dob', formData.dob);
    const emailErr = validateField('email', formData.email);
    const mobileErr = validateField('mobile', formData.mobile);
    
    const newFieldErrors = {
      username: usernameErr || (usernameAvailable === false ? 'Username is already taken' : ''),
      password: passwordErr,
      confirmPassword: confirmErr,
      first_name: firstNameErr,
      last_name: lastNameErr,
      bio: bioErr,
      dob: dobErr,
      email: emailErr,
      mobile: mobileErr
    };
    
    setFieldErrors(newFieldErrors);
    
    const hasErrors = Object.values(newFieldErrors).some(err => err);
    if (hasErrors || usernameAvailable === false) {
      setError('Please fix the errors below');
      return;
    }

    setIsLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('username', formData.username);
      submitData.append('password', formData.password);
      submitData.append('first_name', formData.first_name);
      submitData.append('last_name', formData.last_name);
      submitData.append('bio', formData.bio);
      submitData.append('dob', formData.dob);
      submitData.append('email', formData.email);
      submitData.append('mobile', formData.mobile);
      submitData.append('country_code', formData.country_code);
      
      if (profilePic) {
        submitData.append('profile_pic', profilePic);
      }

      const { data } = await axios.post(`${API_URL}/api/auth/register`, submitData);
      
      onLogin(data.user.username, data.token, data.user.theme);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box auth-box--register">
        <div className="auth-header-row">
          <div>
            <div className="auth-brand">
              <div className="auth-brand-icon">
                <MessageSquare size={18} />
              </div>
              <div className="auth-brand-text">ChatApp</div>
            </div>
            <h2>Create Account</h2>
            <p className="subtitle">Join the conversation. Stay anonymous.</p>
          </div>
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-section">
            <div className="form-section-title">Profile</div>
            <div className="input-group input-group--avatar">
              <label>Profile Picture</label>
              <div className="avatar-upload-row">
                <div className="profile-avatar-large avatar-preview">
                  {profilePicPreview ? (
                    <img src={profilePicPreview} alt="Preview" />
                  ) : (
                    <Camera size={24} />
                  )}
                </div>
                <div className="avatar-upload-info">
                  <button 
                    type="button" 
                    className="avatar-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Photo
                  </button>
                  <div className="char-count">Max 100KB · JPG, PNG</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>First Name <span className="required-asterisk">*</span></label>
                <input 
                  type="text" 
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  maxLength={50}
                  placeholder="First name"
                  className={fieldErrors.first_name ? 'input-error' : ''}
                />
                {fieldErrors.first_name && <div className="field-error">{fieldErrors.first_name}</div>}
              </div>
              <div className="input-group">
                <label>Last Name <span className="required-asterisk">*</span></label>
                <input 
                  type="text" 
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  maxLength={50}
                  placeholder="Last name"
                  className={fieldErrors.last_name ? 'input-error' : ''}
                />
                {fieldErrors.last_name && <div className="field-error">{fieldErrors.last_name}</div>}
              </div>
            </div>

            <div className="input-group">
              <label>Username <span className="required-asterisk">*</span></label>
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                maxLength={30}
                minLength={3}
                placeholder="Choose a username"
                className={fieldErrors.username ? 'input-error' : ''}
              />
              <div className="char-count">
                {usernameChecking ? 'Checking...' : (usernameAvailable === true ? <span className="username-available">Username available</span> : '')}
                <span style={{float: 'right'}}>{formData.username.length}/30</span>
              </div>
              {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
            </div>

            <div className="input-group">
              <label>Bio <span className="required-asterisk">*</span></label>
              <textarea 
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                maxLength={160}
                placeholder="Tell us a little about yourself..."
                rows={2}
                className={fieldErrors.bio ? 'input-error' : ''}
              />
              <div className="char-count">{formData.bio.length}/160</div>
              {fieldErrors.bio && <div className="field-error">{fieldErrors.bio}</div>}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Contact</div>
            <div className="form-row">
              <div className="input-group">
                <label>Date of Birth <span className="required-asterisk">*</span></label>
                <input 
                  type="date" 
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split('T')[0]}
                  className={fieldErrors.dob ? 'input-error' : ''}
                />
                {fieldErrors.dob && <div className="field-error">{fieldErrors.dob}</div>}
              </div>
              <div className="input-group">
                <label>Email <span className="required-asterisk">*</span></label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  placeholder="you@example.com"
                  className={fieldErrors.email ? 'input-error' : ''}
                />
                {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
              </div>
            </div>

            <div className="input-group">
              <label>Mobile Number <span className="required-asterisk">*</span></label>
              <div className="mobile-input-combo">
                <select 
                  name="country_code"
                  value={formData.country_code}
                  onChange={handleChange}
                  className="country-select"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <input 
                  type="tel" 
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  maxLength={15}
                  placeholder="Mobile number"
                  className={`mobile-input ${fieldErrors.mobile ? 'input-error' : ''}`}
                />
              </div>
              {fieldErrors.mobile && <div className="field-error">{fieldErrors.mobile}</div>}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Security</div>
            <div className="input-group">
              <label>Password <span className="required-asterisk">*</span></label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  minLength={6}
                  maxLength={128}
                  placeholder="Create a password"
                  className={fieldErrors.password ? 'input-error' : ''}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
            </div>

            <div className="input-group">
              <label>Confirm Password <span className="required-asterisk">*</span></label>
              <div className="password-input-wrapper">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  placeholder="Confirm your password"
                  className={fieldErrors.confirmPassword ? 'input-error' : ''}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <div className="field-error">{fieldErrors.confirmPassword}</div>}
            </div>
          </div>
          
          <button type="submit" className="primary-btn" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="toggle-auth">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
