import React, { useState } from 'react';
import OtherUser from './OtherUser';
import useGetOtherUsers from '../hooks/useGetOtherUsers';
import { useSelector } from "react-redux";
import { IoChatbubblesOutline, IoCloseCircleOutline } from 'react-icons/io5';
import { BiSearchAlt2 } from 'react-icons/bi';

const OtherUsers = () => {
    useGetOtherUsers();
    const [filterQuery, setFilterQuery] = useState('');
    const { otherUsers } = useSelector(store => store.user);

    const filteredUsers = (otherUsers || []).filter(user => {
        if (!filterQuery.trim()) return true;
        const q = filterQuery.toLowerCase().trim();
        return (
            (user.fullName && user.fullName.toLowerCase().includes(q)) ||
            (user.username && user.username.toLowerCase().includes(q))
        );
    });

    if (!otherUsers || otherUsers.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                    <IoChatbubblesOutline className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-300 text-sm font-medium">No users yet</p>
                <p className="text-gray-500 text-xs max-w-xs">Use the "Add" tab to search and connect with other users.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search filter in Chats tab */}
            <div className="p-3 border-b border-gray-800 bg-gray-900">
                <div className="relative flex items-center">
                    <BiSearchAlt2 className="absolute left-3 text-gray-400 w-4 h-4 pointer-events-none" />
                    <input
                        type="text"
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        placeholder="Search chats..."
                        className="w-full bg-gray-800 text-white text-xs pl-9 pr-8 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500 transition-all"
                    />
                    {filterQuery && (
                        <button
                            onClick={() => setFilterQuery('')}
                            className="absolute right-2.5 text-gray-400 hover:text-white"
                            title="Clear"
                        >
                            <IoCloseCircleOutline className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* User List */}
            <div className='overflow-y-auto flex-1'>
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs">
                        No users match "{filterQuery}"
                    </div>
                ) : (
                    filteredUsers.map((user) => (
                        <OtherUser key={user._id} user={user} />
                    ))
                )}
            </div>
        </div>
    );
};

export default OtherUsers;