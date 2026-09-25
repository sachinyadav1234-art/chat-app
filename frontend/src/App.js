import Signup from './components/Signup';
import './App.css';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from './components/HomePage';
import Login from './components/Login';
import { useEffect } from 'react';
import { useSelector, useDispatch } from "react-redux";
import io from "socket.io-client";
import axios from "axios";
import toast from "react-hot-toast";
import { setSocket } from './redux/socketSlice';
import {
    setOnlineUsers,
    addFriendRequest,
    addFriend,
    setTypingUser,
    updateUserProfile,
    setFriends,
    setFriendRequests,
    setOtherUsers
} from './redux/userSlice';
import {
    setReceivingCall,
    setCaller,
    setCallerSignal,
    setCallType
} from './redux/callSlice';
import { BASE_URL } from '.';
import CallModal from './components/CallModal';

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />
    },
    {
        path: "/signup",
        element: <Signup />
    },
    {
        path: "/login",
        element: <Login />
    },
]);

function App() {
    const { authUser, token } = useSelector(store => store.user);
    const { socket } = useSelector(store => store.socket);
    const { isReceivingCall, isCalling, callAccepted } = useSelector(store => store.call);
    const dispatch = useDispatch();

    // Initial data load when logged in (Friends, Pending Requests, Other Users)
    useEffect(() => {
        if (!authUser) return;

        const fetchInitialData = async () => {
            const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
            try {
                const [friendsRes, requestsRes, othersRes] = await Promise.allSettled([
                    axios.get(`${BASE_URL}/api/v1/user/friends`, { headers: authHeader, withCredentials: true }),
                    axios.get(`${BASE_URL}/api/v1/user/friend-requests`, { headers: authHeader, withCredentials: true }),
                    axios.get(`${BASE_URL}/api/v1/user`, { headers: authHeader, withCredentials: true }),
                ]);

                if (friendsRes.status === "fulfilled" && Array.isArray(friendsRes.value.data)) {
                    dispatch(setFriends(friendsRes.value.data));
                }
                if (requestsRes.status === "fulfilled" && Array.isArray(requestsRes.value.data?.incoming)) {
                    dispatch(setFriendRequests(requestsRes.value.data.incoming));
                }
                if (othersRes.status === "fulfilled" && Array.isArray(othersRes.value.data)) {
                    dispatch(setOtherUsers(othersRes.value.data));
                }
            } catch (err) {
                console.error("Initial data load error:", err);
            }
        };

        fetchInitialData();
    }, [authUser?._id, token, dispatch]);

    // Socket Connection & Event Listeners
    useEffect(() => {
        if (authUser && authUser._id) {
            const socketio = io(`${BASE_URL}`, {
                query: { userId: authUser._id },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
            });
            dispatch(setSocket(socketio));

            // Online users
            socketio.on('getOnlineUsers', (onlineUsers) => {
                dispatch(setOnlineUsers(onlineUsers));
            });

            // Typing indicators
            socketio.on('typing', ({ from }) => {
                dispatch(setTypingUser({ userId: from, isTyping: true }));
            });
            socketio.on('stopTyping', ({ from }) => {
                dispatch(setTypingUser({ userId: from, isTyping: false }));
            });

            // Friend request received
            socketio.on('newFriendRequest', (sender) => {
                dispatch(addFriendRequest({ sender, _id: sender._id }));
                toast((t) => (
                    <div className="flex items-center gap-2">
                        <span>👋</span>
                        <span><strong>{sender.fullName || 'Someone'}</strong> sent you a friend request!</span>
                    </div>
                ), { duration: 4500 });
            });

            // Friend request accepted
            socketio.on('friendRequestAccepted', (newFriend) => {
                dispatch(addFriend(newFriend));
                toast.success(`${newFriend.fullName || 'User'} accepted your friend request! 🎉`, { duration: 4500 });
            });

            // Profile updated broadcast
            socketio.on('profileUpdated', (data) => {
                dispatch(updateUserProfile(data));
            });

            // WebRTC — incoming call
            socketio.on('incomingCall', ({ signal, from, fromUser, callType }) => {
                dispatch(setReceivingCall(true));
                dispatch(setCaller(fromUser || { _id: from }));
                dispatch(setCallerSignal(signal));
                dispatch(setCallType(callType));
            });

            return () => {
                socketio.off('getOnlineUsers');
                socketio.off('typing');
                socketio.off('stopTyping');
                socketio.off('newFriendRequest');
                socketio.off('friendRequestAccepted');
                socketio.off('profileUpdated');
                socketio.off('incomingCall');
                socketio.close();
            };
        } else {
            if (socket) {
                socket.close();
                dispatch(setSocket(null));
            }
        }
    }, [authUser?._id]);

    return (
        <div className="min-h-screen w-full bg-gray-950 flex flex-col">
            <RouterProvider router={router} />
            {authUser && (isReceivingCall || isCalling || callAccepted) && <CallModal />}
        </div>
    );
}

export default App;
