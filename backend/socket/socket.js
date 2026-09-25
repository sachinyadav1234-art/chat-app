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

const userSocketMap = {}; // { userId -> Set of socketId }

export const getReceiverSocketId = (receiverId) => {
    if (!userSocketMap[receiverId]) return null;
    return Array.from(userSocketMap[receiverId])[0];
};

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined" && userId !== "null") {
        socket.join(userId);
        if (!userSocketMap[userId]) {
            userSocketMap[userId] = new Set();
        }
        userSocketMap[userId].add(socket.id);
    }

    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    // ─── Typing Indicators ───────────────────────────────────────
    socket.on('typing', ({ to }) => {
        if (to) {
            io.to(to).emit('typing', { from: userId });
        }
    });

    socket.on('stopTyping', ({ to }) => {
        if (to) {
            io.to(to).emit('stopTyping', { from: userId });
        }
    });

    // ─── WebRTC Signaling ─────────────────────────────────────────
    socket.on('callUser', ({ userToCall, signalData, from, fromUser, callType }) => {
        if (userSocketMap[userToCall] && userSocketMap[userToCall].size > 0) {
            io.to(userToCall).emit('incomingCall', {
                signal: signalData,
                from,
                fromUser,
                callType
            });
        } else {
            socket.emit('callRejected', { reason: 'User is currently offline' });
        }
    });

    socket.on('answerCall', ({ to, signal }) => {
        if (to) {
            io.to(to).emit('callAccepted', signal);
        }
    });

    socket.on('rejectCall', ({ to }) => {
        if (to) {
            io.to(to).emit('callRejected', { reason: 'Call declined' });
        }
    });

    socket.on('endCall', ({ to }) => {
        if (to) {
            io.to(to).emit('callEnded');
        }
    });

    socket.on('iceCandidate', ({ to, candidate }) => {
        if (to) {
            io.to(to).emit('iceCandidate', { candidate });
        }
    });

    // ─── Disconnect ───────────────────────────────────────────────
    socket.on('disconnect', () => {
        if (userId && userSocketMap[userId]) {
            userSocketMap[userId].delete(socket.id);
            if (userSocketMap[userId].size === 0) {
                delete userSocketMap[userId];
            }
        }
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });
});

export { app, io, server };

