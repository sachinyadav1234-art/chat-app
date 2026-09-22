import React from 'react';
import OtherUser from './OtherUser';
import useGetOtherUsers from '../hooks/useGetOtherUsers';
import { useSelector } from "react-redux";
import { IoChatbubblesOutline } from 'react-icons/io5';

const OtherUsers = () => {
    useGetOtherUsers();
    const { otherUsers } = useSelector(store => store.user);

    if (!otherUsers) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <span className="loading loading-spinner text-primary"></span>
            </div>
        );
    }

    if (otherUsers.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                    <IoChatbubblesOutline className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-300 text-sm font-medium">No recent conversations</p>
                <p className="text-gray-500 text-xs max-w-xs">Start a conversation from your Friends list or Add tab.</p>
            </div>
        );
    }

    return (
        <div className='overflow-y-auto flex-1'>
            {otherUsers.map((user) => (
                <OtherUser key={user._id} user={user} />
            ))}
        </div>
    );
};

export default OtherUsers;