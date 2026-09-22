import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { setFriendRequests, removeFriendRequest, addFriend } from '../redux/userSlice';
import { BASE_URL } from '..';
import { FiCheck, FiX } from 'react-icons/fi';

const FriendRequestsTab = () => {
    const dispatch = useDispatch();
    const { friendRequests } = useSelector(store => store.user);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${BASE_URL}/api/v1/user/friend-requests`, { withCredentials: true });
                dispatch(setFriendRequests(res.data.incoming || []));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, [dispatch]);

    const acceptRequest = async (senderId) => {
        try {
            await axios.post(`${BASE_URL}/api/v1/user/friend-request/accept/${senderId}`, {}, { withCredentials: true });
            const accepted = friendRequests.find(r => r.sender._id === senderId);
            if (accepted) dispatch(addFriend(accepted.sender));
            dispatch(removeFriendRequest(senderId));
            toast.success("Friend request accepted! 🎉");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error accepting request");
        }
    };

    const rejectRequest = async (senderId) => {
        try {
            await axios.post(`${BASE_URL}/api/v1/user/friend-request/reject/${senderId}`, {}, { withCredentials: true });
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
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 gap-3">
                <div className="text-4xl">📬</div>
                <p className="text-gray-400 text-sm">No pending requests</p>
                <p className="text-gray-500 text-xs">When someone sends you a friend request, it'll appear here.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <p className="text-xs text-gray-500 px-4 py-2 uppercase font-semibold tracking-wider">
                Incoming Requests ({friendRequests.length})
            </p>
            {friendRequests.map(request => (
                <div
                    key={request._id || request.sender._id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-all"
                >
                    <img
                        src={request.sender.profilePhoto}
                        alt={request.sender.fullName}
                        className="w-11 h-11 rounded-full flex-shrink-0 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{request.sender.fullName}</p>
                        <p className="text-gray-500 text-xs">@{request.sender.username}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => acceptRequest(request.sender._id)}
                            className="p-2 rounded-full bg-green-600 hover:bg-green-700 text-white transition-all"
                            title="Accept"
                        >
                            <FiCheck className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => rejectRequest(request.sender._id)}
                            className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all"
                            title="Reject"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FriendRequestsTab;
