import React, { useEffect, useRef } from 'react';
import { useSelector } from "react-redux";

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

    return (
        <div ref={scroll} className={`flex items-end gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            <img
                src={(isOwn ? authUser?.profilePhoto : selectedUser?.profilePhoto) || `https://avatar.iran.liara.run/public?username=${(isOwn ? authUser?.username : selectedUser?.username) || 'user'}`}
                alt="avatar"
                onError={(e) => { e.target.src = `https://avatar.iran.liara.run/public?username=${(isOwn ? authUser?.username : selectedUser?.username) || 'user'}`; }}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mb-1"
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