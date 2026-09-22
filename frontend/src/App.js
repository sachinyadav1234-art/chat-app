import Signup from './components/Signup';
import './App.css';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from './components/HomePage';
import Login from './components/Login';
import { useEffect } from 'react';
import { useSelector, useDispatch } from "react-redux";
import io from "socket.io-client";
import { setSocket } from './redux/socketSlice';
import { setOnlineUsers, addFriendRequest, addFriend, setTypingUser } from './redux/userSlice';
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
    const { authUser } = useSelector(store => store.user);
    const { socket } = useSelector(store => store.socket);
    const dispatch = useDispatch();

    useEffect(() => {
        if (authUser) {
            const socketio = io(`${BASE_URL}`, {
                query: { userId: authUser._id }
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

            // Friend request notifications
            socketio.on('newFriendRequest', (sender) => {
                dispatch(addFriendRequest({ sender, _id: sender._id }));
            });
            socketio.on('friendRequestAccepted', (newFriend) => {
                dispatch(addFriend(newFriend));
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
                socketio.off('incomingCall');
                socketio.close();
            };
        } else {
            if (socket) {
                socket.close();
                dispatch(setSocket(null));
            }
        }
    }, [authUser]);

    return (
        <div className="min-h-screen w-full bg-gray-950 flex flex-col">
            <RouterProvider router={router} />
            {authUser && <CallModal />}
        </div>
    );
}

export default App;
