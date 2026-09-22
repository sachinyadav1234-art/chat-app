import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { useDispatch, useSelector } from 'react-redux';
import { setFriends, setSelectedUser } from '../redux/userSlice';
import { setCaller, setCallType, setIsCalling } from '../redux/callSlice';
import { BASE_URL } from '..';
import { IoCallOutline, IoChatbubbleOutline } from 'react-icons/io5';
import { BsCameraVideoFill } from 'react-icons/bs';

const FriendsTab = () => {
    const dispatch = useDispatch();
    const { friends, onlineUsers } = useSelector(store => store.user);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchFriends = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${BASE_URL}/api/v1/user/friends`, { withCredentials: true });
                dispatch(setFriends(res.data));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchFriends();
    }, [dispatch]);

    const startChat = (friend) => {
        dispatch(setSelectedUser(friend));
    };

    const startCall = (friend, type) => {
        dispatch(setCallType(type));
        dispatch(setCaller(friend));
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
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 gap-3">
                <div className="text-4xl">👥</div>
                <p className="text-gray-400 text-sm">No friends yet.</p>
                <p className="text-gray-500 text-xs">Use the "Add Friends" tab to find people.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {friends.map(friend => {
                const isOnline = onlineUsers?.includes(friend._id);
                return (
                    <div
                        key={friend._id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-all group border-b border-gray-800"
                    >
                        <div className={`relative flex-shrink-0`}>
                            <img
                                src={friend.profilePhoto}
                                alt={friend.fullName}
                                className="w-11 h-11 rounded-full object-cover"
                            />
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{friend.fullName}</p>
                            <p className="text-gray-500 text-xs">{isOnline ? 'Online' : 'Offline'}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
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
