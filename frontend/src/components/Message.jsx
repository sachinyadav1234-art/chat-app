import React, { useEffect, useRef } from 'react';
import { useSelector } from "react-redux";
import { getAvatarUrl } from '../utils/avatar';

const Message = ({ message }) => {
    const scroll = useRef();
    const { authUser, selectedUser } = useSelector(store => store.user);
    const isOwn = message?.senderId === authUser?._id;

    useEffect(() => {
        scroll.current?.scrollIntoView({ behavior: "smooth" });
    }, [message]);

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const targetUser = isOwn ? authUser : selectedUser;

    return (
        <div ref={scroll} className={`flex items-end gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            <img
                src={getAvatarUrl(targetUser)}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mb-1"
                loading="lazy"
            />
            <div className={`flex flex-col gap-0.5 max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'}`}>
                <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm
                        ${isOwn
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                        }`}
                >
                    {message?.message}
                </div>
                <span className="text-xs text-gray-600 px-1">
                    {formatTime(message?.createdAt)}
                </span>
            </div>
        </div>
    );
};

export default Message;