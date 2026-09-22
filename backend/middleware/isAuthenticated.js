import jwt from "jsonwebtoken";

const isAuthenticated = async (req, res, next) => {
    try {
        let token = req.cookies?.token;

        // Fallback to Bearer token in Authorization header (crucial for cross-domain Vercel <-> Render)
        if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                message: "Authentication required. Please log in.",
                success: false
            });
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (!decode || !decode.userId) {
            return res.status(401).json({
                message: "Invalid or expired session. Please log in again.",
                success: false
            });
        }

        req.id = decode.userId;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        return res.status(401).json({
            message: "Invalid token or session expired.",
            success: false
        });
    }
};

export default isAuthenticated;