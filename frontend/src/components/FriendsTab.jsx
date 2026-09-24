import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setFriends, setSelectedUser } from '../redux/userSlice';
import { setTargetUser, setCallType, setIsCalling } from '../redux/callSlice';
import { BASE_URL } from '..';
import { IoCallOutline, IoChatbubbleOutline, IoPeopleOutline } from 'react-icons/io5';
import { BsCameraVideoFill } from 'react-icons/bs';

const FriendsTab = () => {
    const dispatch = useDispatch();
    const { friends, onlineUsers, token } = useSelector(store => store.user);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchFriends = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${BASE_URL}/api/v1/user/friends`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    withCredentials: true
                });
                dispatch(setFriends(Array.isArray(res.data) ? res.data : []));
            } catch (err) {
                console.error("Fetch friends error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFriends();
    }, [token, dispatch]);

    const startChat = (friend) => {
        dispatch(setSelectedUser(friend));
    };

    const startCall = (friend, type) => {
        dispatch(setSelectedUser(friend));
        dispatch(setCallType(type));
        dispatch(setTargetUser(friend));
        dispatch(setIsCalling(true));
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <span className="loading loading-spinner text-primary"></span>
            </div>
        );
    }

    if (!friends || friends.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                    <IoPeopleOutline className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-300 text-sm font-medium">No friends yet</p>
                <p className="text-gray-500 text-xs max-w-xs">Use the "Add" tab to search and connect with other users.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                All Friends ({friends.length})
            </div>
            {friends.map(friend => {
                const isOnline = onlineUsers?.includes(friend._id);
                return (
                    <div
                        key={friend._id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-all group border-b border-gray-800"
                    >
                        <div className="relative flex-shrink-0">
                            <img
                                src={friend.profilePhoto || `https://avatar.iran.liara.run/public?username=${friend.username}`}
                                alt={friend.fullName}
                                className="w-11 h-11 rounded-full object-cover border border-gray-700"
                            />
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startChat(friend)}>
                            <p className="text-white font-medium text-sm truncate">{friend.fullName}</p>
                            <p className="text-gray-500 text-xs">{isOnline ? '🟢 Online' : '⚪ Offline'}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                            <button
                                onClick={() => startChat(friend)}
                                className="p-2 rounded-full hover:bg-blue-600 text-gray-400 hover:text-white transition-all"
                                title="Message"
                            >
                                <IoChatbubbleOutline className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => startCall(friend, 'audio')}
                                className="p-2 rounded-full hover:bg-green-600 text-gray-400 hover:text-white transition-all"
                                title="Voice Call"
                            >
                                <IoCallOutline className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => startCall(friend, 'video')}
                                className="p-2 rounded-full hover:bg-purple-600 text-gray-400 hover:text-white transition-all"
                                title="Video Call"
                            >
                                <BsCameraVideoFill className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default FriendsTab;
