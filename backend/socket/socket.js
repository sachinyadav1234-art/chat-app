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
    transports: ['websocket', 'polling'],
});

const userSocketMap = {}; // { userId -> Set of socketId }

export const getReceiverSocketId = (receiverId) => {
    if (!userSocketMap[receiverId]) return null;
    return Array.from(userSocketMap[receiverId])[0];
};

io.on('connection', (socket) => {
    const rawUserId = socket.handshake.query.userId;
    const userId = rawUserId && rawUserId !== "undefined" && rawUserId !== "null" ? String(rawUserId).trim() : null;

    if (userId) {
        socket.join(userId);
        if (!userSocketMap[userId]) {
            userSocketMap[userId] = new Set();
        }
        userSocketMap[userId].add(socket.id);
    }

    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    // ─── Typing Indicators ───────────────────────────────────────
    socket.on('typing', ({ to }) => {
        const targetId = String(to || "").trim();
        if (targetId) {
            io.to(targetId).emit('typing', { from: userId });
        }
    });

    socket.on('stopTyping', ({ to }) => {
        const targetId = String(to || "").trim();
        if (targetId) {
            io.to(targetId).emit('stopTyping', { from: userId });
        }
    });

    // ─── WebRTC Signaling ─────────────────────────────────────────
    socket.on('callUser', ({ userToCall, signalData, from, fromUser, callType }) => {
        const targetId = String(userToCall || "").trim();
        const fromId = String(from || userId || "").trim();

        if (targetId && userSocketMap[targetId] && userSocketMap[targetId].size > 0) {
            io.to(targetId).emit('incomingCall', {
                signal: signalData,
                from: fromId,
                fromUser: fromUser || { _id: fromId },
                callType: callType || 'video'
            });
        } else {
            socket.emit('callRejected', { reason: 'User is currently offline' });
        }
    });

    socket.on('answerCall', ({ to, signal }) => {
        const targetId = String(to || "").trim();
        if (targetId) {
            io.to(targetId).emit('callAccepted', signal);
        }
    });

    socket.on('rejectCall', ({ to }) => {
        const targetId = String(to || "").trim();
        if (targetId) {
            io.to(targetId).emit('callRejected', { reason: 'Call declined' });
        }
    });

    socket.on('endCall', ({ to }) => {
        const targetId = String(to || "").trim();
        if (targetId) {
            io.to(targetId).emit('callEnded');
        }
    });

    socket.on('iceCandidate', ({ to, candidate }) => {
        const targetId = String(to || "").trim();
        if (targetId && candidate) {
            io.to(targetId).emit('iceCandidate', { candidate });
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

