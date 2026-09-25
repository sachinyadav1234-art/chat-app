import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import { BASE_URL } from '..';
import { addFriend, removeFriendRequest } from '../redux/userSlice';
import { BiSearchAlt2 } from 'react-icons/bi';
import { IoPersonAddOutline, IoCloseCircleOutline, IoSparklesOutline, IoCheckmark } from 'react-icons/io5';
import { FiClock, FiUsers } from 'react-icons/fi';
import { getAvatarUrl } from '../utils/avatar';

const AddFriendsTab = () => {
    const dispatch = useDispatch();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [actionLoading, setActionLoading] = useState({});
    const { friends, friendRequests, token } = useSelector(store => store.user);

    // Fetch suggestions or search query
    const fetchUsers = useCallback(async (queryText) => {
        setSearching(true);
        try {
            const url = queryText && queryText.trim() !== ''
                ? `${BASE_URL}/api/v1/user/search?query=${encodeURIComponent(queryText.trim())}`
                : `${BASE_URL}/api/v1/user/search`;

            const res = await axios.get(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                withCredentials: true
            });
            setResults(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Fetch users error:", err);
            if (queryText) {
                toast.error("Could not complete search");
            }
        } finally {
            setSearching(false);
        }
    }, [token]);

    // Debounced Live Search as user types (and immediate initial load)
    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(async () => {
            if (isMounted) {
                await fetchUsers(searchQuery);
            }
        }, searchQuery ? 300 : 0);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [searchQuery, fetchUsers]);

    const handleClear = () => {
        setSearchQuery('');
        fetchUsers('');
    };

    const sendRequest = async (userId) => {
        setActionLoading(prev => ({ ...prev, [userId]: true }));
        try {
            const res = await axios.post(
                `${BASE_URL}/api/v1/user/friend-request/send/${userId}`,
                {},
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    withCredentials: true
                }
            );

            if (res.data?.autoAccepted) {
                const targetUser = results.find(u => u._id === userId);
                if (targetUser) dispatch(addFriend(targetUser));
                setResults(prev => prev.map(u => u._id === userId ? { ...u, friendStatus: 'friends' } : u));
                toast.success("You are now friends! 🎉");
            } else {
                setResults(prev => prev.map(u => u._id === userId ? { ...u, friendStatus: 'pending' } : u));
                toast.success("Friend request sent! ✉️");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send request");
        } finally {
            setActionLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

    const acceptRequest = async (userId) => {
        setActionLoading(prev => ({ ...prev, [userId]: true }));
        try {
            const res = await axios.post(
                `${BASE_URL}/api/v1/user/friend-request/accept/${userId}`,
                {},
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    withCredentials: true
                }
            );

            const targetUser = results.find(u => u._id === userId);
            if (res.data?.friend) {
                dispatch(addFriend(res.data.friend));
            } else if (targetUser) {
                dispatch(addFriend(targetUser));
            }
            dispatch(removeFriendRequest(userId));
            setResults(prev => prev.map(u => u._id === userId ? { ...u, friendStatus: 'friends' } : u));
            toast.success("Friend request accepted! 🎉");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to accept request");
        } finally {
            setActionLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

    const getStatusButton = (user) => {
        const uId = user._id?.toString();
        const isFriend = friends?.some(f => (f._id || f)?.toString() === uId) || user.friendStatus === 'friends';
        if (isFriend) {
            return (
                <div className="flex items-center gap-1 text-green-500 text-xs font-medium px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                    <FiUsers className="w-3 h-3" /> Friends
                </div>
            );
        }

        const hasIncomingRequest = friendRequests?.some(
            r => (r.sender?._id || r.sender)?.toString() === uId
        ) || user.friendStatus === 'received';

        if (hasIncomingRequest) {
            return (
                <button
                    onClick={() => acceptRequest(user._id)}
                    disabled={actionLoading[user._id]}
                    className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full transition-all shadow-sm"
                    title="Accept Friend Request"
                >
                    {actionLoading[user._id] ? (
                        <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                        <>
                            <IoCheckmark className="w-3.5 h-3.5" /> Accept
                        </>
                    )}
                </button>
            );
        }

        if (user.friendStatus === 'pending') {
            return (
                <div className="flex items-center gap-1 text-yellow-400 text-xs font-medium px-3 py-1.5 bg-yellow-400/10 rounded-full border border-yellow-400/20">
                    <FiClock className="w-3 h-3" /> Requested
                </div>
            );
        }

        return (
            <button
                onClick={() => sendRequest(user._id)}
                disabled={actionLoading[user._id]}
                className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full transition-all shadow-sm disabled:opacity-50"
            >
                {actionLoading[user._id] ? (
                    <span className="loading loading-spinner loading-xs"></span>
                ) : (
                    <>
                        <IoPersonAddOutline className="w-3.5 h-3.5" /> Add
                    </>
                )}
            </button>
        );
    };

    const isShowingSuggestions = searchQuery.trim() === '';

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search Input Bar */}
            <div className="p-4 border-b border-gray-800">
                <div className="relative flex items-center">
                    <BiSearchAlt2 className="absolute left-3.5 text-gray-400 w-4 h-4 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or @username..."
                        className="w-full bg-gray-800 text-white text-sm pl-10 pr-9 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500 transition-all"
                    />
                    {searchQuery ? (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 text-gray-400 hover:text-white"
                            title="Clear"
                        >
                            <IoCloseCircleOutline className="w-4 h-4" />
                        </button>
                    ) : (
                        searching && (
                            <span className="absolute right-3 loading loading-spinner loading-xs text-blue-400"></span>
                        )
                    )}
                </div>
            </div>

            {/* Results / Suggestions Header */}
            <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider bg-gray-900 border-b border-gray-800">
                <span className="flex items-center gap-1.5">
                    {isShowingSuggestions ? (
                        <>
                            <IoSparklesOutline className="text-yellow-400 w-3.5 h-3.5" />
                            Suggested People
                        </>
                    ) : (
                        `Search Results (${results.length})`
                    )}
                </span>
                {searching && <span className="loading loading-dots loading-xs text-blue-400"></span>}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto">
                {results.length === 0 && !searching && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                        <div className="text-4xl">🔍</div>
                        <p className="text-gray-300 text-sm font-medium">No users found</p>
                        <p className="text-gray-500 text-xs">Try searching for a different name or username.</p>
                    </div>
                )}

                {results.map(user => (
                    <div
                        key={user._id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-all"
                    >
                        <img
                            src={getAvatarUrl(user.profilePhoto, user.fullName || user.username)}
                            alt={user.fullName || 'User'}
                            loading="lazy"
                            className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-gray-700"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{user.fullName}</p>
                            <p className="text-gray-400 text-xs truncate">@{user.username}</p>
                            {user.bio && (
                                <p className="text-gray-500 text-xs truncate mt-0.5">{user.bio}</p>
                            )}
                        </div>
                        {getStatusButton(user)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AddFriendsTab;
