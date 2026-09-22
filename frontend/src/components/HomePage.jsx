import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import MessageContainer from './MessageContainer';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
    const { authUser, selectedUser } = useSelector(store => store.user);
    const navigate = useNavigate();

    useEffect(() => {
        if (!authUser) {
            navigate("/login");
        }
    }, [authUser, navigate]);

    return (
        <div className="w-full h-screen h-[100dvh] flex bg-gray-950 overflow-hidden">
            {/* Sidebar: Full screen on mobile when no chat is open; Fixed width on desktop */}
            <div className={`
                ${selectedUser ? 'hidden md:flex' : 'flex w-full'}
                md:w-80 lg:w-96 flex-col bg-gray-900 border-r border-gray-800 min-h-0 h-full flex-shrink-0
            `}>
                <Sidebar />
            </div>

            {/* Chat Area: Full screen on mobile when a chat is selected; Flex-1 on desktop */}
            <div className={`
                ${selectedUser ? 'flex w-full' : 'hidden md:flex'}
                flex-1 flex-col overflow-hidden min-h-0 h-full bg-gray-950
            `}>
                <MessageContainer />
            </div>
        </div>
    );
};

export default HomePage;