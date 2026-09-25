import React from 'react';
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from '../redux/userSlice';
import { getAvatarUrl } from '../utils/avatar';

const OtherUser = ({ user }) => {
    const dispatch = useDispatch();
    const { selectedUser, onlineUsers, typingUsers } = useSelector(store => store.user);
    const isOnline = onlineUsers?.includes(user._id);
    const isTyping = typingUsers?.[user._id];
    const isSelected = selectedUser?._id === user?._id;

    return (
        <div
            onClick={() => dispatch(setSelectedUser(user))}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-gray-800
                ${isSelected ? 'bg-blue-600 bg-opacity-20 border-l-2 border-l-blue-500' : 'hover:bg-gray-800'}`}
        >
            <div className="relative flex-shrink-0">
                <img
                    src={getAvatarUrl(user)}
                    alt={user?.fullName || 'User'}
                    className="w-11 h-11 rounded-full object-cover"
                    loading="lazy"
                />
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                    {user?.fullName}
                </p>
                <p className="text-xs truncate text-gray-500">
                    {isTyping ? (
                        <span className="text-green-400 italic flex items-center gap-1">
                            <span>typing</span>
                            <span className="flex gap-0.5">
                                <span className="inline-block w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="inline-block w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="inline-block w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </span>
                        </span>
                    ) : isOnline ? 'Online' : 'Offline'}
                </p>
            </div>
        </div>
    );
};

export default OtherUser;