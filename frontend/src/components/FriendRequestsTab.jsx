import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { setFriendRequests, removeFriendRequest, addFriend } from '../redux/userSlice';
import { BASE_URL } from '..';
import { FiCheck, FiX } from 'react-icons/fi';
import { IoMailOpenOutline } from 'react-icons/io5';

const FriendRequestsTab = () => {
    const dispatch = useDispatch();
    const { friendRequests, token } = useSelector(store => store.user);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${BASE_URL}/api/v1/user/friend-requests`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    withCredentials: true
                });
                dispatch(setFriendRequests(res.data.incoming || []));
            } catch (err) {
                console.error("Fetch friend requests error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, [token, dispatch]);

    const acceptRequest = async (senderId) => {
        try {
            const res = await axios.post(
                `${BASE_URL}/api/v1/user/friend-request/accept/${senderId}`,
                {},
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    withCredentials: true
                }
            );
            if (res.data?.friend) {
                dispatch(addFriend(res.data.friend));
            } else {
                const accepted = friendRequests.find(r => (r.sender?._id || r.sender) === senderId);
                if (accepted && accepted.sender) dispatch(addFriend(accepted.sender));
            }
            dispatch(removeFriendRequest(senderId));
            toast.success("Friend request accepted! 🎉");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error accepting request");
        }
    };

    const rejectRequest = async (senderId) => {
        try {
            await axios.post(
                `${BASE_URL}/api/v1/user/friend-request/reject/${senderId}`,
                {},
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    withCredentials: true
                }
            );
            dispatch(removeFriendRequest(senderId));
            toast.success("Request rejected");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error rejecting request");
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <span className="loading loading-spinner text-primary"></span>
            </div>
        );
    }

    if (!friendRequests || friendRequests.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                    <IoMailOpenOutline className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-300 text-sm font-medium">No pending requests</p>
                <p className="text-gray-500 text-xs max-w-xs">When someone sends you a friend request, it will appear here.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                Incoming Requests ({friendRequests.length})
            </div>
            {friendRequests.map(request => {
                const sender = request.sender || {};
                const senderId = sender._id || request.sender;
                return (
                    <div
                        key={request._id || senderId}
                        className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-all"
                    >
                        <img
                            src={sender.profilePhoto || `https://avatar.iran.liara.run/public?username=${sender.username || 'user'}`}
                            alt={sender.fullName || "User"}
                            onError={(e) => { e.target.src = `https://avatar.iran.liara.run/public?username=${sender.username || 'user'}`; }}
                            className="w-11 h-11 rounded-full flex-shrink-0 object-cover border border-gray-700"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{sender.fullName || "User"}</p>
                            <p className="text-gray-500 text-xs truncate">@{sender.username || ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => acceptRequest(senderId)}
                                className="p-2 rounded-full bg-green-600 hover:bg-green-700 active:scale-95 text-white transition-all shadow-sm"
                                title="Accept"
                            >
                                <FiCheck className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => rejectRequest(senderId)}
                                className="p-2 rounded-full bg-gray-700 hover:bg-red-600 active:scale-95 text-gray-300 hover:text-white transition-all shadow-sm"
                                title="Reject"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default FriendRequestsTab;
