import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { BASE_URL } from '..';
import { BiSearchAlt2 } from 'react-icons/bi';
import { IoPersonAddOutline } from 'react-icons/io5';
import { FiCheck, FiClock, FiUsers } from 'react-icons/fi';

const AddFriendsTab = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [sentRequests, setSentRequests] = useState({});
    const { friends } = useSelector(store => store.user);

    const search = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/v1/user/search?query=${encodeURIComponent(searchQuery)}`, { withCredentials: true });
            setResults(res.data);
        } catch (err) {
            toast.error("Search failed");
        } finally {
            setSearching(false);
        }
    };

    const sendRequest = async (userId) => {
        try {
            await axios.post(`${BASE_URL}/api/v1/user/friend-request/send/${userId}`, {}, { withCredentials: true });
            setSentRequests(prev => ({ ...prev, [userId]: true }));
            toast.success("Friend request sent! ✉️");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send request");
        }
    };

    const getStatusButton = (user) => {
        const isFriend = friends?.find(f => f._id === user._id);
        if (isFriend) {
            return (
                <div className="flex items-center gap-1 text-green-500 text-xs font-medium px-3 py-1.5 bg-green-500 bg-opacity-10 rounded-full">
                    <FiUsers className="w-3 h-3" /> Friends
                </div>
            );
        }
        if (user.friendStatus === 'pending' || sentRequests[user._id]) {
            return (
                <div className="flex items-center gap-1 text-yellow-500 text-xs font-medium px-3 py-1.5 bg-yellow-500 bg-opacity-10 rounded-full">
                    <FiClock className="w-3 h-3" /> Pending
                </div>
            );
        }
        if (user.friendStatus === 'received') {
            return (
                <div className="flex items-center gap-1 text-blue-400 text-xs font-medium px-3 py-1.5 bg-blue-400 bg-opacity-10 rounded-full">
                    <FiCheck className="w-3 h-3" /> Sent you request
                </div>
            );
        }
        return (
            <button
                onClick={() => sendRequest(user._id)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all"
            >
                <IoPersonAddOutline className="w-3.5 h-3.5" /> Add
            </button>
        );
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4">
                <form onSubmit={search} className="flex gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or username..."
                        className="flex-1 bg-gray-800 text-white text-sm px-4 py-2 rounded-full border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500"
                    />
                    <button
                        type="submit"
                        className="w-9 h-9 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    >
                        {searching ? (
                            <span className="loading loading-spinner loading-xs text-white"></span>
                        ) : (
                            <BiSearchAlt2 className="text-white w-4 h-4" />
                        )}
                    </button>
                </form>
            </div>

            <div className="flex-1 overflow-y-auto">
                {results.length === 0 && !searching && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center px-4">
                        <div className="text-4xl">🔍</div>
                        <p className="text-gray-400 text-sm">Search for people to add as friends.</p>
                    </div>
                )}
                {results.map(user => (
                    <div
                        key={user._id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-all"
                    >
                        <img
                            src={user.profilePhoto}
                            alt={user.fullName}
                            className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{user.fullName}</p>
                            <p className="text-gray-500 text-xs">@{user.username}</p>
                        </div>
                        {getStatusButton(user)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AddFriendsTab;
