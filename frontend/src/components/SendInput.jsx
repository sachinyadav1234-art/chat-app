import React, { useState, useRef, useEffect } from 'react';
import { IoSend } from "react-icons/io5";
import { BsEmojiSmile } from "react-icons/bs";
import EmojiPicker from 'emoji-picker-react';
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setMessages } from '../redux/messageSlice';
import { BASE_URL } from '..';

const SendInput = () => {
    const [message, setMessage] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isTypingEmit, setIsTypingEmit] = useState(false);
    const dispatch = useDispatch();
    const { selectedUser } = useSelector(store => store.user);
    const { messages } = useSelector(store => store.message);
    const { socket } = useSelector(store => store.socket);
    const { authUser } = useSelector(store => store.user);
    const typingTimeoutRef = useRef(null);
    const emojiRef = useRef(null);

    // Close emoji picker on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const onEmojiClick = (emojiData) => {
        setMessage(prev => prev + emojiData.emoji);
    };

    const handleInputChange = (e) => {
        setMessage(e.target.value);

        // Emit typing indicator
        if (socket && selectedUser) {
            if (!isTypingEmit) {
                socket.emit('typing', { to: selectedUser._id });
                setIsTypingEmit(true);
            }
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('stopTyping', { to: selectedUser._id });
                setIsTypingEmit(false);
            }, 1500);
        }
    };

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        // Stop typing indicator
        if (socket && selectedUser) {
            socket.emit('stopTyping', { to: selectedUser._id });
            setIsTypingEmit(false);
            clearTimeout(typingTimeoutRef.current);
        }

        try {
            const res = await axios.post(
                `${BASE_URL}/api/v1/message/send/${selectedUser?._id}`,
                { message },
                {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                }
            );
            dispatch(setMessages([...messages, res?.data?.newMessage]));
        } catch (error) {
            console.log(error);
        }
        setMessage("");
        setShowEmojiPicker(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            onSubmitHandler(e);
        }
    };

    return (
        <div className="relative px-4 py-3 bg-gray-900 border-t border-gray-800">
            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div ref={emojiRef} className="absolute bottom-16 left-4 z-50 shadow-2xl">
                    <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme="dark"
                        height={380}
                        width={300}
                        searchDisabled={false}
                        skinTonesDisabled
                    />
                </div>
            )}

            <form onSubmit={onSubmitHandler} className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(prev => !prev)}
                    className="p-2 text-gray-400 hover:text-yellow-400 transition-all rounded-full hover:bg-gray-800 flex-shrink-0"
                    title="Emoji"
                >
                    <BsEmojiSmile className="w-5 h-5" />
                </button>

                <input
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-full border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500 transition-all"
                />

                <button
                    type="submit"
                    disabled={!message.trim()}
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                        ${message.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                    title="Send"
                >
                    <IoSend className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};

export default SendInput;