import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { setFriendRequests, removeFriendRequest, addFriend } from '../redux/userSlice';
import { BASE_URL } from '..';
import { FiCheck, FiX, FiClock } from 'react-icons/fi';
import { IoMailOpenOutline, IoPaperPlaneOutline } from 'react-icons/io5';
import { getAvatarUrl } from '../utils/avatar';

const FriendRequestsTab = () => {
    const dispatch = useDispatch();
    const { friendRequests, token } = useSelector(store => store.user);
    const [subTab, setSubTab] = useState('incoming'); // 'incoming' | 'outgoing'
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cancellingId, setCancellingId] = useState(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/v1/user/friend-requests`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                withCredentials: true
            });
            dispatch(setFriendRequests(res.data.incoming || []));
            setOutgoingRequests(res.data.outgoing || []);
        } catch (err) {
            console.error("Fetch friend requests error:", err);
        } finally {
            setLoading(false);
        }
    }, [token, dispatch]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

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

    const cancelSentRequest = async (receiverId) => {
        setCancellingId(receiverId);
        try {
            await axios.post(
                `${BASE_URL}/api/v1/user/friend-request/cancel/${receiverId}`,
                {},
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    withCredentials: true
                }
            );
            setOutgoingRequests(prev => prev.filter(r => (r.receiver?._id || r._id)?.toString() !== receiverId.toString()));
            toast.success("Friend request cancelled");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error cancelling request");
        } finally {
            setCancellingId(null);
        }
    };

    const incomingCount = friendRequests?.length || 0;
    const outgoingCount = outgoingRequests?.length || 0;

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-900">
            {/* Sub-tab pills */}
            <div className="flex p-2 gap-2 bg-gray-950/60 border-b border-gray-800">
                <button
                    onClick={() => setSubTab('incoming')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        subTab === 'incoming'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
                    }`}
                >
                    <IoMailOpenOutline className="w-3.5 h-3.5" />
                    <span>Received</span>
                    {incomingCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${subTab === 'incoming' ? 'bg-blue-800 text-white' : 'bg-red-500 text-white'}`}>
                            {incomingCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setSubTab('outgoing')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        subTab === 'outgoing'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
                    }`}
                >
                    <IoPaperPlaneOutline className="w-3.5 h-3.5" />
                    <span>Sent</span>
                    {outgoingCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${subTab === 'outgoing' ? 'bg-blue-800 text-white' : 'bg-gray-700 text-gray-300'}`}>
                            {outgoingCount}
                        </span>
                    )}
                </button>
            </div>

            {loading && incomingCount === 0 && outgoingCount === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <span className="loading loading-spinner text-primary"></span>
                </div>
            ) : subTab === 'incoming' ? (
                // ─── INCOMING REQUESTS ───
                incomingCount === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                            <IoMailOpenOutline className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-300 text-sm font-medium">No received requests</p>
                        <p className="text-gray-500 text-xs max-w-xs">When someone sends you a friend request, it will appear here.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            Received Requests ({incomingCount})
                        </div>
                        {friendRequests.map(request => {
                            const sender = request.sender || {};
                            const senderId = sender._id || request.sender;
                            return (
                                <div
                                    key={request._id || senderId}
                                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 hover:bg-gray-800/70 transition-all"
                                >
                                    <img
                                        src={getAvatarUrl(sender.profilePhoto, sender.fullName || sender.username)}
                                        alt={sender.fullName || "User"}
                                        loading="lazy"
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
                )
            ) : (
                // ─── OUTGOING (SENT) REQUESTS ───
                outgoingCount === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                            <IoPaperPlaneOutline className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-300 text-sm font-medium">No sent requests</p>
                        <p className="text-gray-500 text-xs max-w-xs">Requests you send to others in the "Add" tab will appear here.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            Sent Requests ({outgoingCount})
                        </div>
                        {outgoingRequests.map(request => {
                            const receiver = request.receiver || {};
                            const receiverId = receiver._id || request._id;
                            return (
                                <div
                                    key={request._id || receiverId}
                                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 hover:bg-gray-800/70 transition-all"
                                >
                                    <img
                                        src={getAvatarUrl(receiver.profilePhoto, receiver.fullName || receiver.username)}
                                        alt={receiver.fullName || "User"}
                                        loading="lazy"
                                        className="w-11 h-11 rounded-full flex-shrink-0 object-cover border border-gray-700"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium text-sm truncate">{receiver.fullName || "User"}</p>
                                        <p className="text-gray-500 text-xs truncate">@{receiver.username || ""}</p>
                                        <div className="flex items-center gap-1 text-yellow-400 text-[11px] mt-0.5">
                                            <FiClock className="w-3 h-3" /> Pending response
                                        </div>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => cancelSentRequest(receiverId)}
                                            disabled={cancellingId === receiverId}
                                            className="text-xs px-2.5 py-1 rounded-full bg-gray-800 hover:bg-red-600/80 text-gray-300 hover:text-white border border-gray-700 transition-all"
                                            title="Cancel Request"
                                        >
                                            {cancellingId === receiverId ? (
                                                <span className="loading loading-spinner loading-xs"></span>
                                            ) : (
                                                "Cancel"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
};

export default FriendRequestsTab;
