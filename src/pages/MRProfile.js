import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import API, { getUploadUrl } from '../utils/api';
import ImageCropper from '../components/ImageCropper';

const MRProfile = () => {
  const { refreshUser } = useContext(AuthContext);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    company: '',
    territory: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await API.get('/auth/me');
      setFormData({
        name: data.user.name || '',
        mobile: data.user.mobile || '',
        company: data.user.company || '',
        territory: data.user.territory || ''
      });
      setProfileImage(data.user.profileImage);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMessage('Image size should be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob) => {
    setShowCropper(false);
    setUploading(true);

    const formData = new FormData();
    formData.append('image', croppedBlob, 'profile.jpg');

    try {
      const { data } = await API.post('/upload/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfileImage(data.data.imageUrl);
      if (refreshUser) refreshUser();
      setMessage('Profile image updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error uploading image');
    } finally {
      setUploading(false);
      setSelectedImage(null);
    }
  };

  const handleRemoveImage = async () => {
    if (!window.confirm('Remove profile image?')) return;
    
    try {
      await API.delete('/upload/profile-image');
      setProfileImage(null);
      if (refreshUser) refreshUser();
      setMessage('Profile image removed');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error removing image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await API.put('/mrs/profile', formData);
      if (refreshUser) refreshUser();
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Profile Settings</h1>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.includes('success') || message.includes('updated') || message.includes('removed')
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        {/* Profile Image Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            {profileImage ? (
              <img 
                src={getUploadUrl(profileImage)}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-100"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-semibold border-4 border-blue-100">
                {formData.name?.charAt(0).toUpperCase() || 'M'}
              </div>
            )}
            
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full flex items-center justify-center cursor-pointer transition-all"
            >
              <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
            {profileImage && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">Click to upload • Supports JPG, PNG, GIF</p>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., PharmaCorp India"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Territory</label>
              <input
                type="text"
                value={formData.territory}
                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Mumbai West"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && selectedImage && (
        <ImageCropper
          image={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => { setShowCropper(false); setSelectedImage(null); }}
        />
      )}
    </div>
  );
};

export default MRProfile;
