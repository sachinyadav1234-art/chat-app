import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || "djhbfvdshjbeerff";

const isAuthenticated = async (req, res, next) => {
    try {
        let token = null;

        // 1. Primary: Authorization header Bearer token (preferred for cross-origin & mobile)
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            const parts = req.headers.authorization.split(" ");
            if (parts.length === 2 && parts[1] && parts[1] !== "undefined" && parts[1] !== "null") {
                token = parts[1].trim();
            }
        }

        // 2. Secondary: Cookie fallback
        if (!token && req.cookies?.token && req.cookies.token !== "undefined" && req.cookies.token !== "null") {
            token = req.cookies.token.trim();
        }

        if (!token) {
            return res.status(401).json({
                message: "Authentication required. Please log in.",
                success: false
            });
        }

        const decode = jwt.verify(token, JWT_SECRET);
        if (!decode || !decode.userId) {
            return res.status(401).json({
                message: "Invalid or expired session. Please log in again.",
                success: false
            });
        }

        const user = await User.findById(decode.userId).select("_id fullName username");
        if (!user) {
            return res.status(401).json({
                message: "User session expired or account not found. Please log in again.",
                success: false
            });
        }

        req.id = user._id.toString();
        req.user = user;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        return res.status(401).json({
            message: "Invalid token or session expired. Please log in again.",
            success: false
        });
    }
};

export default isAuthenticated;