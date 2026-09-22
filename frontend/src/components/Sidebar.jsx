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
import {
    IoChatbubblesOutline,
    IoPersonAddOutline,
    IoPeopleOutline,
    IoMailOutline,
    IoLogOutOutline
} from 'react-icons/io5';

const TABS = [
    { id: 'chats', icon: IoChatbubblesOutline, label: 'Chats' },
    { id: 'friends', icon: IoPeopleOutline, label: 'Friends' },
    { id: 'requests', icon: IoMailOutline, label: 'Requests' },
    { id: 'add', icon: IoPersonAddOutline, label: 'Add' },
];

const Sidebar = () => {
    const [activeTab, setActiveTab] = useState('chats');
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
        <div className="w-72 flex flex-col bg-gray-900 border-r border-gray-800 min-h-0">
            {/* ─── User Profile Header ─── */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-gray-900">
                <div className="relative">
                    <img
                        src={authUser?.profilePhoto}
                        alt={authUser?.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-900" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{authUser?.fullName}</p>
                    <p className="text-gray-500 text-xs truncate">@{authUser?.username}</p>
                </div>
                <button
                    onClick={logoutHandler}
                    className="p-2 text-gray-500 hover:text-red-400 transition-all rounded-full hover:bg-gray-800"
                    title="Logout"
                >
                    <IoLogOutOutline className="w-5 h-5" />
                </button>
            </div>

            {/* ─── Tab Navigation ─── */}
            <div className="flex border-b border-gray-800 bg-gray-900">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs transition-all relative
                            ${activeTab === tab.id
                                ? 'text-blue-400 border-b-2 border-blue-500'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                        title={tab.label}
                    >
                        <div className="relative">
                            <tab.icon className="w-4.5 h-4.5" />
                            {tab.id === 'requests' && friendRequestBadge > 0 && (
                                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold" style={{ fontSize: '9px' }}>
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
    );
};

export default Sidebar;