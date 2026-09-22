import React, { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import { setAuthUser } from '../redux/userSlice';
import { BASE_URL } from '..';
import { IoCameraOutline, IoClose, IoCheckmark } from 'react-icons/io5';

const ProfileEditModal = ({ onClose }) => {
    const dispatch = useDispatch();
    const { authUser } = useSelector(store => store.user);
    const [preview, setPreview] = useState(authUser?.profilePhoto);
    const [selectedFile, setSelectedFile] = useState(null);
    const [bio, setBio] = useState(authUser?.bio || '');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be smaller than 5MB');
            return;
        }
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            if (selectedFile) formData.append('profilePhoto', selectedFile);
            formData.append('bio', bio);

            const res = await axios.post(`${BASE_URL}/api/v1/user/update-profile`, formData, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            dispatch(setAuthUser({
                ...authUser,
                profilePhoto: res.data.user.profilePhoto,
                bio: res.data.user.bio,
            }));
            toast.success('Profile updated! ✅');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                    <h2 className="text-white font-semibold">Edit Profile</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-800">
                        <IoClose className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center gap-6">
                    {/* Profile Picture */}
                    <div className="relative group">
                        <img
                            src={preview}
                            alt="Profile"
                            className="w-28 h-28 rounded-full object-cover border-4 border-gray-700"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all"
                        >
                            <IoCameraOutline className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg border-2 border-gray-900 transition-all"
                        >
                            <IoCameraOutline className="w-4 h-4 text-white" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                    <p className="text-gray-500 text-xs -mt-3">Click camera to change photo</p>

                    {/* Name (read-only) */}
                    <div className="w-full">
                        <label className="block text-sm text-gray-400 mb-1.5">Full Name</label>
                        <div className="w-full bg-gray-800 text-gray-400 px-4 py-2.5 rounded-xl border border-gray-700 text-sm">
                            {authUser?.fullName}
                        </div>
                    </div>

                    {/* Username (read-only) */}
                    <div className="w-full">
                        <label className="block text-sm text-gray-400 mb-1.5">Username</label>
                        <div className="w-full bg-gray-800 text-gray-400 px-4 py-2.5 rounded-xl border border-gray-700 text-sm">
                            @{authUser?.username}
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="w-full">
                        <label className="block text-sm text-gray-400 mb-1.5">Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            maxLength={120}
                            rows={2}
                            placeholder="Write a short bio..."
                            className="w-full bg-gray-800 text-white px-4 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500 text-sm resize-none"
                        />
                        <p className="text-gray-600 text-xs text-right mt-0.5">{bio.length}/120</p>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="loading loading-spinner loading-sm" />
                        ) : (
                            <>
                                <IoCheckmark className="w-5 h-5" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileEditModal;
