import { Server } from "socket.io";
import http from "http";
import express from "express";

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://chat-app-frontend-xi-neon.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

const isOriginAllowed = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    if (origin.endsWith(".vercel.app")) return true;
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return true;
    return false;
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isOriginAllowed(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
};

const userSocketMap = {}; // { userId -> socketId }

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId !== undefined) {
        userSocketMap[userId] = socket.id;
    }

    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    // ─── Typing Indicators ───────────────────────────────────────
    socket.on('typing', ({ to }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing', { from: userId });
        }
    });

    socket.on('stopTyping', ({ to }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('stopTyping', { from: userId });
        }
    });

    // ─── WebRTC Signaling ─────────────────────────────────────────
    socket.on('callUser', ({ userToCall, signalData, from, fromUser, callType }) => {
        const receiverSocketId = userSocketMap[userToCall];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('incomingCall', {
                signal: signalData,
                from,
                fromUser,
                callType
            });
        }
    });

    socket.on('answerCall', ({ to, signal }) => {
        const callerSocketId = userSocketMap[to];
        if (callerSocketId) {
            io.to(callerSocketId).emit('callAccepted', signal);
        }
    });

    socket.on('rejectCall', ({ to }) => {
        const callerSocketId = userSocketMap[to];
        if (callerSocketId) {
            io.to(callerSocketId).emit('callRejected');
        }
    });

    socket.on('endCall', ({ to }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('callEnded');
        }
    });

    socket.on('iceCandidate', ({ to, candidate }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('iceCandidate', { candidate });
        }
    });

    // ─── Disconnect ───────────────────────────────────────────────
    socket.on('disconnect', () => {
        delete userSocketMap[userId];
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });
});

export { app, io, server };
