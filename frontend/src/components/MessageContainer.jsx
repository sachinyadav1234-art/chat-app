import React from 'react';
import SendInput from './SendInput';
import Messages from './Messages';
import { useSelector, useDispatch } from "react-redux";
import { setSelectedUser } from '../redux/userSlice';
import { setCaller, setCallType, setIsCalling } from '../redux/callSlice';
import { IoCallOutline, IoVideocamOutline, IoArrowBackOutline } from 'react-icons/io5';
import { HiDotsVertical } from 'react-icons/hi';

const MessageContainer = () => {
    const { selectedUser, authUser, onlineUsers, typingUsers } = useSelector(store => store.user);
    const dispatch = useDispatch();

    const isOnline = onlineUsers?.includes(selectedUser?._id);
    const isTyping = typingUsers?.[selectedUser?._id];

    const startCall = (type) => {
        dispatch(setCallType(type));
        dispatch(setCaller(selectedUser));
        dispatch(setIsCalling(true));
    };

    return (
        <>
            {selectedUser !== null ? (
                <div className="flex-1 flex flex-col bg-gray-950 min-h-0">
                    {/* ─── Header ─── */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
                        <button
                            onClick={() => dispatch(setSelectedUser(null))}
                            className="md:hidden p-1 text-gray-400 hover:text-white"
                        >
                            <IoArrowBackOutline className="w-5 h-5" />
                        </button>

                        <div className="relative">
                            <img
                                src={selectedUser?.profilePhoto}
                                alt={selectedUser?.fullName}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-600'}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">{selectedUser?.fullName}</p>
                            <p className="text-xs">
                                {isTyping ? (
                                    <span className="text-green-400 italic flex items-center gap-1">
                                        typing
                                        <span className="flex gap-0.5 items-center">
                                            <span className="inline-block w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="inline-block w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="inline-block w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </span>
                                    </span>
                                ) : (
                                    <span className={isOnline ? 'text-green-400' : 'text-gray-500'}>
                                        {isOnline ? 'Online' : 'Offline'}
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => startCall('audio')}
                                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                                title="Voice Call"
                            >
                                <IoCallOutline className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => startCall('video')}
                                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                                title="Video Call"
                            >
                                <IoVideocamOutline className="w-5 h-5" />
                            </button>
                            <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
                                <HiDotsVertical className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ─── Messages ─── */}
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <Messages />
                    </div>

                    {/* ─── Input ─── */}
                    <div className="flex-shrink-0">
                        <SendInput />
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-center items-center bg-gray-950 gap-4">
                    <div className="w-20 h-20 rounded-full bg-blue-600 bg-opacity-20 flex items-center justify-center">
                        <IoCallOutline className="w-10 h-10 text-blue-400" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl text-white font-bold mb-1">Hi, {authUser?.fullName}! 👋</h1>
                        <p className="text-gray-400 text-sm">Select a chat or friend to start messaging</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default MessageContainer;