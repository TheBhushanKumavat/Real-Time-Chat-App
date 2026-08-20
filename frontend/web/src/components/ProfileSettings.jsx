import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Trash2, Check, X, Edit2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ProfileSettings = ({ username, token, onUpdate, onLogout }) => {
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    dob: '',
    email: '',
    mobile: '',
    country_code: '+1',
    bio_public: false,
    dob_public: false,
    email_public: false,
    mobile_public: false,
    profile_pic_public: false,
    first_name_public: false,
    last_name_public: false,
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        bio: data.bio || '',
        dob: data.dob || '',
        email: data.email || '',
        mobile: data.mobile || '',
        country_code: data.country_code || '+1',
        bio_public: !!data.bio_public,
        dob_public: !!data.dob_public,
        email_public: !!data.email_public,
        mobile_public: !!data.mobile_public,
        profile_pic_public: !!data.profile_pic_public,
        first_name_public: !!data.first_name_public,
        last_name_public: !!data.last_name_public,
      });
      if (data.profile_pic) {
        setProfilePicPreview(data.profile_pic);
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const checkUsernameAvailability = async (usernameToCheck) => {
    if (!usernameToCheck || usernameToCheck === profile?.username) {
      setUsernameAvailable(null);
      setUsernameError('');
      return;
    }
    setUsernameChecking(true);
    setUsernameAvailable(null);
    setUsernameError('');
    try {
      const { data } = await axios.get(`${API_URL}/api/users/check-username?username=${encodeURIComponent(usernameToCheck)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsernameAvailable(data.available);
      if (!data.available) {
        setUsernameError(data.message);
      }
    } catch (err) {
      console.error('Username check failed', err);
    } finally {
      setUsernameChecking(false);
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setNewUsername(value);
    if (value === profile?.username) {
      setUsernameAvailable(null);
      setUsernameError('');
      return;
    }
    const err = validateUsername(value);
    setUsernameError(err);
    if (err) {
      setUsernameAvailable(false);
    } else {
      checkUsernameAvailability(value);
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

  const handleUsernameSave = async () => {
    const err = validateUsername(newUsername);
    if (err) {
      setUsernameError(err);
      return;
    }
    if (usernameAvailable === false) {
      setUsernameError('Username is not available');
      return;
    }
    try {
      await axios.put(`${API_URL}/api/users/profile`, { username: newUsername }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(prev => ({ ...prev, username: newUsername }));
      setIsEditingUsername(false);
      setUsernameError('');
      setUsernameAvailable(null);
      if (onUpdate) onUpdate(newUsername);
      setMessage('Username updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setUsernameError(err.response?.data?.error || 'Failed to update username');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
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
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'bio_public' || key === 'dob_public' || key === 'email_public' || 
            key === 'mobile_public' || key === 'profile_pic_public' || 
            key === 'first_name_public' || key === 'last_name_public') {
          submitData.append(key, value ? 1 : 0);
        } else {
          submitData.append(key, value);
        }
      });
      
      if (profilePic) {
        submitData.append('profile_pic', profilePic);
      }

      await axios.put(`${API_URL}/api/users/profile`, submitData, {
        headers: { 
          Authorization: `Bearer ${token}`,
        },
      });
      
      setMessage('Profile updated successfully!');
      if (onUpdate && formData.username !== profile?.username) {
        onUpdate(formData.username);
      }
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteDialogOpen(false);
    try {
      await axios.delete(`${API_URL}/api/users/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onLogout) onLogout();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account');
    }
  };

  return (
    <div className="profile-layout">
      <div className="profile-header">
        <h2>Profile Settings</h2>
        <p>Manage your account details and privacy.</p>
      </div>
      
      <div className="profile-content">
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {profilePicPreview ? (
                <img src={profilePicPreview} alt="Profile" />
              ) : (
                username ? username.charAt(0).toUpperCase() : '?'
              )}
              <div className="online-indicator-badge" style={{width: '16px', height: '16px', bottom: '4px', right: '4px'}}></div>
            </div>
            <div>
              <button 
                type="button" 
                className="avatar-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
               <div className="char-count char-count-sm">Max 100KB</div>
            </div>
          </div>

          <div className="privacy-toggle-row">
            <div>
              <div className="privacy-toggle-label">Make profile picture public</div>
              <div className="privacy-toggle-desc">Others can see your profile picture</div>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                name="profile_pic_public"
                checked={formData.profile_pic_public}
                onChange={handleChange}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>First Name <span className="required-asterisk">*</span></label>
              <input 
                type="text" 
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                maxLength={50}
                placeholder="First name"
              />
              <div className="privacy-toggle-row privacy-toggle-row--compact">
                <div>
                  <div className="privacy-toggle-label">Make first name public</div>
                  <div className="privacy-toggle-desc">Others can see your first name</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    name="first_name_public"
                    checked={formData.first_name_public}
                    onChange={handleChange}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div className="input-group">
              <label>Last Name <span className="required-asterisk">*</span></label>
              <input 
                type="text" 
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                maxLength={50}
                placeholder="Last name"
              />
              <div className="privacy-toggle-row privacy-toggle-row--compact">
                <div>
                  <div className="privacy-toggle-label">Make last name public</div>
                  <div className="privacy-toggle-desc">Others can see your last name</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    name="last_name_public"
                    checked={formData.last_name_public}
                    onChange={handleChange}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div className="input-group">
            <label>Username</label>
            {!isEditingUsername ? (
              <div className="username-display-row">
                <input 
                  type="text" 
                  value={profile?.username || username}
                  disabled
                  className="input-disabled"
                />
                <button 
                  type="button"
                  className="secondary-btn icon-only-btn"
                  onClick={() => {
                    setNewUsername(profile?.username || username);
                    setIsEditingUsername(true);
                  }}
                  title="Edit Username"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            ) : (
              <div>
                <div className="username-edit-row">
                  <div>
                    <input 
                      type="text" 
                      value={newUsername}
                      onChange={handleUsernameChange}
                      placeholder="Enter new username"
                      className={usernameError ? 'input-error' : ''}
                    />
                    {usernameChecking && <div className="char-count">Checking availability...</div>}
                    {usernameAvailable === true && !usernameChecking && (
                      <div className="char-count username-available">Username is available</div>
                    )}
                    {usernameError && <div className="field-error">{usernameError}</div>}
                  </div>
                  <button type="button" className="icon-btn" onClick={() => {
                    setIsEditingUsername(false);
                    setUsernameError('');
                    setUsernameAvailable(null);
                  }}>
                    <X size={18} />
                  </button>
                  <button type="button" className="icon-btn success" onClick={handleUsernameSave} disabled={!!usernameError || usernameChecking}>
                    <Check size={18} />
                  </button>
                </div>
              </div>
            )}
            <div className="char-count">Username is always public</div>
          </div>

          <div className="input-group">
            <label>Bio <span className="required-asterisk">*</span></label>
            <textarea 
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              required
              maxLength={160}
              placeholder="Tell us about yourself..."
              rows={2}
            />
            <div className="char-count">{formData.bio.length}/160</div>
            <div className="privacy-toggle-row privacy-toggle-row--compact">
              <div>
                <div className="privacy-toggle-label">Make bio public</div>
                <div className="privacy-toggle-desc">Others can see your bio</div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  name="bio_public"
                  checked={formData.bio_public}
                  onChange={handleChange}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Date of Birth <span className="required-asterisk">*</span></label>
              <input 
                type="date" 
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split('T')[0]}
              />
              <div className="privacy-toggle-row privacy-toggle-row--compact">
                <div>
                  <div className="privacy-toggle-label">Make date of birth public</div>
                  <div className="privacy-toggle-desc">Others can see your date of birth</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    name="dob_public"
                    checked={formData.dob_public}
                    onChange={handleChange}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div className="input-group">
              <label>Email <span className="required-asterisk">*</span></label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
              />
              <div className="privacy-toggle-row privacy-toggle-row--compact">
                <div>
                  <div className="privacy-toggle-label">Make email public</div>
                  <div className="privacy-toggle-desc">Others can see your email address</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    name="email_public"
                    checked={formData.email_public}
                    onChange={handleChange}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
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
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+91">+91</option>
                <option value="+61">+61</option>
                <option value="+49">+49</option>
                <option value="+33">+33</option>
                <option value="+81">+81</option>
                <option value="+86">+86</option>
              </select>
              <input 
                type="tel" 
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                required
                maxLength={15}
                placeholder="Mobile number"
                className="mobile-input"
              />
            </div>
            <div className="privacy-toggle-row privacy-toggle-row--compact">
              <div>
                <div className="privacy-toggle-label">Make mobile number public</div>
                <div className="privacy-toggle-desc">Others can see your mobile number</div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  name="mobile_public"
                  checked={formData.mobile_public}
                  onChange={handleChange}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <button type="submit" className="primary-btn" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="danger-zone">
          <h3>Danger Zone</h3>
          <p>Once you delete your account, there is no going back. All your chats will be permanently deleted from both sides.</p>
          <button 
            type="button"
            className="danger-btn"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 size={16} className="danger-btn-icon" />
            Delete Account
          </button>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={deleteDialogOpen}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This will delete all your chats from both sides and cannot be undone."
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmText="Delete Account"
        isDestructive={true}
      />
    </div>
  );
};

export default ProfileSettings;
