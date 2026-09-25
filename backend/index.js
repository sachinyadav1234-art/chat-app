import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import userRoute from "./routes/userRoute.js";
import messageRoute from "./routes/messageRoute.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app, server } from "./socket/socket.js";
dotenv.config({});

const PORT = process.env.PORT || 5000;

// middleware
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://chat-app-frontend-xi-neon.vercel.app",
    process.env.FRONTEND_URL,
].filter(Boolean);

const isOriginAllowed = (origin) => {
    if (!origin) return true; // allow curl, mobile apps, Postman
    if (allowedOrigins.includes(origin)) return true;
    if (origin.endsWith(".vercel.app")) return true; // allow all Vercel previews & production
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return true;
    return false;
};

const corsOption = {
    origin: function (origin, callback) {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
};
app.use(cors(corsOption));

// Health check endpoint
app.get("/", (req, res) => {
    res.status(200).json({ status: "ok", message: "Chat App Backend API is running successfully!" });
});
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/message", messageRoute);

server.listen(PORT, () => {
    connectDB();
    console.log(`Server listening at port ${PORT}`);
});
