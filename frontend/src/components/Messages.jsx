import React, { useRef, useEffect } from 'react';
import Message from './Message';
import useGetMessages from '../hooks/useGetMessages';
import { useSelector } from "react-redux";
import useGetRealTimeMessage from '../hooks/useGetRealTimeMessage';

const Messages = () => {
    useGetMessages();
    useGetRealTimeMessage();
    const { messages } = useSelector(store => store.message);
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col">
            {!messages || messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                    No messages yet. Say hi! 👋
                </div>
            ) : (
                <>
                    {messages.map((message) => (
                        <Message key={message._id} message={message} />
                    ))}
                    <div ref={endRef} />
                </>
            )}
        </div>
    );
};

export default Messages;