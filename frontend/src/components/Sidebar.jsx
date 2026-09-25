import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import { setAuthUser, setOtherUsers, setSelectedUser, setFriends, setFriendRequests } from '../redux/userSlice';
import { setMessages } from '../redux/messageSlice';
import { BASE_URL } from '..';
import OtherUsers from './OtherUsers';
import FriendsTab from './FriendsTab';
import FriendRequestsTab from './FriendRequestsTab';
import AddFriendsTab from './AddFriendsTab';
import ProfileEditModal from './ProfileEditModal';
import {
    IoChatbubblesOutline,
    IoPersonAddOutline,
    IoPeopleOutline,
    IoMailOutline,
    IoLogOutOutline,
    IoPencilOutline,
} from 'react-icons/io5';

const TABS = [
    { id: 'chats', icon: IoChatbubblesOutline, label: 'Chats' },
    { id: 'friends', icon: IoPeopleOutline, label: 'Friends' },
    { id: 'requests', icon: IoMailOutline, label: 'Requests' },
    { id: 'add', icon: IoPersonAddOutline, label: 'Add' },
];

const Sidebar = () => {
    const [activeTab, setActiveTab] = useState('chats');
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const { authUser, friendRequestBadge } = useSelector(store => store.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const logoutHandler = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/v1/user/logout`, { withCredentials: true });
            toast.success(res.data.message || "Logged out");
            dispatch(setAuthUser(null));
            dispatch(setMessages(null));
            dispatch(setOtherUsers(null));
            dispatch(setSelectedUser(null));
            dispatch(setFriends([]));
            dispatch(setFriendRequests([]));
            navigate("/login");
        } catch (error) {
            console.error(error);
        }
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'chats': return <OtherUsers />;
            case 'friends': return <FriendsTab />;
            case 'requests': return <FriendRequestsTab />;
            case 'add': return <AddFriendsTab />;
            default: return <OtherUsers />;
        }
    };

    return (
        <>
            <div className="w-full h-full flex flex-col bg-gray-900 min-h-0">
                {/* ─── User Profile Header ─── */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-gray-900">
                    {/* Clickable avatar → edit profile */}
                    <div
                        className="relative cursor-pointer group flex-shrink-0"
                        onClick={() => setShowProfileEdit(true)}
                        title="Edit Profile"
                    >
                        <img
                            src={authUser?.profilePhoto || `https://avatar.iran.liara.run/public?username=${authUser?.username || 'user'}`}
                            alt={authUser?.fullName || 'User'}
                            onError={(e) => { e.target.src = `https://avatar.iran.liara.run/public?username=${authUser?.username || 'user'}`; }}
                            className="w-11 h-11 rounded-full object-cover border-2 border-transparent group-hover:border-blue-500 transition-all"
                        />
                        {/* Camera overlay */}
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all">
                            <IoPencilOutline className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{authUser?.fullName}</p>
                        <p className="text-gray-500 text-xs truncate">
                            {authUser?.bio || `@${authUser?.username}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowProfileEdit(true)}
                            className="p-1.5 text-gray-500 hover:text-blue-400 transition-all rounded-full hover:bg-gray-800"
                            title="Edit Profile"
                        >
                            <IoPencilOutline className="w-4 h-4" />
                        </button>
                        <button
                            onClick={logoutHandler}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-all rounded-full hover:bg-gray-800"
                            title="Logout"
                        >
                            <IoLogOutOutline className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ─── Tab Navigation ─── */}
                <div className="flex border-b border-gray-800 bg-gray-900">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-all relative
                                ${activeTab === tab.id
                                    ? 'text-blue-400 border-b-2 border-blue-500'
                                    : 'text-gray-500 hover:text-gray-300'}`}
                            title={tab.label}
                        >
                            <div className="relative">
                                <tab.icon className="w-5 h-5" />
                                {tab.id === 'requests' && friendRequestBadge > 0 && (
                                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold" style={{ fontSize: '9px' }}>
                                        {friendRequestBadge > 9 ? '9+' : friendRequestBadge}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs leading-none">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* ─── Tab Content ─── */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {renderTab()}
                </div>
            </div>

            {/* ─── Profile Edit Modal ─── */}
            {showProfileEdit && (
                <ProfileEditModal onClose={() => setShowProfileEdit(false)} />
            )}
        </>
    );
};

export default Sidebar;