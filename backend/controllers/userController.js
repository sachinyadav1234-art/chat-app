import { User } from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { io, getReceiverSocketId } from "../socket/socket.js";
import cloudinary from "../config/cloudinary.js";

// Cookie configuration for cross-site and secure environments
const getCookieOptions = () => ({
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: "none",
    secure: true,
});

// Helper: Escape regex to prevent regex injection attacks
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// ─── REGISTER ─────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
    try {
        const { fullName, username, password, confirmPassword, gender } = req.body;

        if (!fullName || !username || !password || !confirmPassword || !gender) {
            return res.status(400).json({ message: "All fields are required", success: false });
        }

        const cleanUsername = String(username).trim().toLowerCase();
        if (cleanUsername.length < 3) {
            return res.status(400).json({ message: "Username must be at least 3 characters", success: false });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters", success: false });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match", success: false });
        }

        const existingUser = await User.findOne({ username: cleanUsername });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists. Try a different one.", success: false });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const maleProfilePhoto = `https://avatar.iran.liara.run/public/boy?username=${cleanUsername}`;
        const femaleProfilePhoto = `https://avatar.iran.liara.run/public/girl?username=${cleanUsername}`;

        const newUser = await User.create({
            fullName: String(fullName).trim(),
            username: cleanUsername,
            password: hashedPassword,
            profilePhoto: gender === "male" ? maleProfilePhoto : femaleProfilePhoto,
            gender
        });

        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });

        return res.status(201)
            .cookie("token", token, getCookieOptions())
            .json({
                message: "Account created successfully.",
                success: true,
                token,
                user: {
                    _id: newUser._id,
                    username: newUser.username,
                    fullName: newUser.fullName,
                    profilePhoto: newUser.profilePhoto,
                    bio: newUser.bio || ""
                }
            });
    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "All fields are required", success: false });
        }

        const cleanUsername = String(username).trim().toLowerCase();
        const user = await User.findOne({ username: cleanUsername });
        if (!user) {
            return res.status(400).json({ message: "Incorrect username or password", success: false });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({ message: "Incorrect username or password", success: false });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });

        return res.status(200)
            .cookie("token", token, getCookieOptions())
            .json({
                message: "Logged in successfully",
                success: true,
                token,
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                profilePhoto: user.profilePhoto,
                bio: user.bio || ""
            });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export const logout = (req, res) => {
    try {
        return res.status(200)
            .cookie("token", "", { ...getCookieOptions(), maxAge: 0 })
            .json({ message: "Logged out successfully.", success: true });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// ─── GET OTHER USERS ─────────────────────────────────────────────────────────
export const getOtherUsers = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const otherUsers = await User.find({ _id: { $ne: loggedInUserId } })
            .select("-password -friendRequests")
            .limit(50);
        return res.status(200).json(otherUsers);
    } catch (error) {
        console.error("Get Other Users Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// ─── SEARCH & SUGGEST USERS ───────────────────────────────────────────────────
export const searchUsers = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const { query } = req.query;

        let users;
        if (query && String(query).trim() !== "") {
            const sanitized = escapeRegex(String(query).trim());
            const regex = new RegExp(sanitized, "i");
            users = await User.find({
                _id: { $ne: loggedInUserId },
                $or: [{ fullName: regex }, { username: regex }]
            }).select("-password").limit(30);
        } else {
            // Suggestions: return recent/suggested users if no query provided
            users = await User.find({
                _id: { $ne: loggedInUserId }
            }).select("-password").sort({ createdAt: -1 }).limit(20);
        }

        const me = await User.findById(loggedInUserId).select("friends friendRequests");
        const myFriendIds = me?.friends?.map(f => f.toString()) || [];
        const myIncomingRequests = me?.friendRequests || [];

        const result = users.map(u => {
            const uId = u._id.toString();
            const isFriend = myFriendIds.includes(uId);

            // Did this user send ME a pending request?
            const receivedRequest = myIncomingRequests.find(
                r => r.sender && r.sender.toString() === uId && r.status === "pending"
            );

            // Did I send THIS USER a pending request?
            const sentRequest = u.friendRequests?.find(
                r => r.sender && r.sender.toString() === loggedInUserId.toString() && r.status === "pending"
            );

            let friendStatus = "none";
            if (isFriend) friendStatus = "friends";
            else if (sentRequest) friendStatus = "pending";
            else if (receivedRequest) friendStatus = "received";

            const userObj = u.toObject();
            delete userObj.friendRequests;

            return {
                ...userObj,
                friendStatus
            };
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Search Users Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// ─── GET FRIENDS ─────────────────────────────────────────────────────────────
export const getFriends = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const user = await User.findById(loggedInUserId).populate("friends", "-password -friendRequests");
        return res.status(200).json(user ? user.friends : []);
    } catch (error) {
        console.error("Get Friends Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// ─── GET FRIEND REQUESTS ─────────────────────────────────────────────────────
export const getFriendRequests = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const user = await User.findById(loggedInUserId).populate("friendRequests.sender", "-password -friendRequests");
        const incoming = user?.friendRequests?.filter(r => r.status === "pending" && r.sender) || [];
        return res.status(200).json({ incoming });
    } catch (error) {
        console.error("Get Friend Requests Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// ─── SEND FRIEND REQUEST ─────────────────────────────────────────────────────
export const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;

        if (!receiverId || senderId === receiverId) {
            return res.status(400).json({ message: "Invalid user request", success: false });
        }

        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        // 1. Check if already friends
        if (sender.friends.map(f => f.toString()).includes(receiverId)) {
            return res.status(400).json({ message: "Already friends with this user", success: false });
        }

        // 2. Check if receiver already sent a request to sender (cross-request -> auto-accept!)
        const incomingFromReceiver = sender.friendRequests.find(
            r => r.sender && r.sender.toString() === receiverId && r.status === "pending"
        );
        if (incomingFromReceiver) {
            incomingFromReceiver.status = "accepted";
            if (!sender.friends.map(f => f.toString()).includes(receiverId)) sender.friends.push(receiverId);
            if (!receiver.friends.map(f => f.toString()).includes(senderId)) receiver.friends.push(senderId);
            await sender.save();
            await receiver.save();

            const receiverSocketId = getReceiverSocketId(receiverId);
            if (receiverSocketId) {
                io.to(receiverId).emit("friendRequestAccepted", {
                    _id: sender._id,
                    fullName: sender.fullName,
                    username: sender.username,
                    profilePhoto: sender.profilePhoto,
                    bio: sender.bio || ""
                });
            }

            return res.status(200).json({
                message: "You are now friends!",
                success: true,
                autoAccepted: true,
                friend: {
                    _id: receiver._id,
                    fullName: receiver.fullName,
                    username: receiver.username,
                    profilePhoto: receiver.profilePhoto,
                    bio: receiver.bio || ""
                }
            });
        }

        // 3. Check if request is already pending
        const existing = receiver.friendRequests.find(
            r => r.sender && r.sender.toString() === senderId && r.status === "pending"
        );
        if (existing) {
            return res.status(400).json({ message: "Friend request already sent", success: false });
        }

        // 4. Remove any previous non-pending request and push fresh pending request
        receiver.friendRequests = receiver.friendRequests.filter(
            r => !(r.sender && r.sender.toString() === senderId)
        );
        receiver.friendRequests.push({ sender: senderId, status: "pending" });
        await receiver.save();

        // 5. Real-time notification to receiver
        io.to(receiverId).emit("newFriendRequest", {
            _id: sender._id,
            fullName: sender.fullName,
            username: sender.username,
            profilePhoto: sender.profilePhoto,
            bio: sender.bio || ""
        });

        return res.status(200).json({ message: "Friend request sent successfully", success: true });
    } catch (error) {
        console.error("Send Friend Request Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// ─── ACCEPT FRIEND REQUEST ───────────────────────────────────────────────────
export const acceptFriendRequest = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const senderId = req.params.id;

        const me = await User.findById(loggedInUserId);
        const sender = await User.findById(senderId);

        if (!sender) return res.status(404).json({ message: "User not found", success: false });

        const requestIndex = me.friendRequests.findIndex(
            r => r.sender && r.sender.toString() === senderId && r.status === "pending"
        );

        if (requestIndex === -1) {
            // Check if already friends
            if (me.friends.map(f => f.toString()).includes(senderId)) {
                return res.status(200).json({
                    message: "Already friends",
                    success: true,
                    friend: {
                        _id: sender._id,
                        fullName: sender.fullName,
                        username: sender.username,
                        profilePhoto: sender.profilePhoto,
                        bio: sender.bio || ""
                    }
                });
            }
            return res.status(400).json({ message: "No pending friend request found", success: false });
        }

        me.friendRequests[requestIndex].status = "accepted";
        if (!me.friends.map(f => f.toString()).includes(senderId)) me.friends.push(senderId);
        if (!sender.friends.map(f => f.toString()).includes(loggedInUserId)) sender.friends.push(loggedInUserId);

        // Also resolve reciprocal request if any
        sender.friendRequests.forEach(r => {
            if (r.sender && r.sender.toString() === loggedInUserId) {
                r.status = "accepted";
            }
        });

        await me.save();
        await sender.save();

        // Emit real-time notification to the sender who requested
        io.to(senderId).emit("friendRequestAccepted", {
            _id: me._id,
            fullName: me.fullName,
            username: me.username,
            profilePhoto: me.profilePhoto,
            bio: me.bio || ""
        });

        return res.status(200).json({
            message: "Friend request accepted",
            success: true,
            friend: {
                _id: sender._id,
                fullName: sender.fullName,
                username: sender.username,
                profilePhoto: sender.profilePhoto,
                bio: sender.bio || ""
            }
        });
    } catch (error) {
        console.error("Accept Friend Request Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// ─── REJECT FRIEND REQUEST ───────────────────────────────────────────────────
export const rejectFriendRequest = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const senderId = req.params.id;
        const me = await User.findById(loggedInUserId);

        const idx = me.friendRequests.findIndex(
            r => r.sender && r.sender.toString() === senderId && r.status === "pending"
        );

        if (idx === -1) {
            return res.status(400).json({ message: "No pending friend request found", success: false });
        }

        me.friendRequests[idx].status = "rejected";
        await me.save();

        return res.status(200).json({ message: "Friend request rejected", success: true });
    } catch (error) {
        console.error("Reject Friend Request Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// ─── UPDATE PROFILE (DP + Bio) ───────────────────────────────────────────────
export const updateProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio } = req.body;
        let profilePhoto;

        if (req.file) {
            const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && 
                                  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
                                  process.env.CLOUDINARY_API_KEY && 
                                  process.env.CLOUDINARY_API_KEY !== "your_api_key";
            if (hasCloudinary) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: "chatterbox/avatars",
                            transformation: [
                                { width: 300, height: 300, crop: "fill", gravity: "face" },
                                { quality: "auto", fetch_format: "auto" }
                            ]
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    stream.end(req.file.buffer);
                });
                profilePhoto = uploadResult.secure_url;
            } else {
                // Fallback to base64 data URI if Cloudinary is not configured yet
                const base64Data = req.file.buffer.toString("base64");
                profilePhoto = `data:${req.file.mimetype};base64,${base64Data}`;
            }
        }

        const updateData = {};
        if (profilePhoto) updateData.profilePhoto = profilePhoto;
        if (bio !== undefined) updateData.bio = String(bio).trim().slice(0, 160);

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true })
            .select("-password -friendRequests");

        // Real-time socket broadcast to online friends
        const userWithFriends = await User.findById(userId).select("friends");
        userWithFriends?.friends?.forEach(friendId => {
            io.to(friendId.toString()).emit("profileUpdated", {
                userId,
                profilePhoto: updatedUser.profilePhoto,
                fullName: updatedUser.fullName,
                bio: updatedUser.bio,
            });
        });

        return res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser,
            success: true
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        return res.status(500).json({ message: "Failed to update profile", success: false });
    }
};