import { User } from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { io, getReceiverSocketId } from "../socket/socket.js";

export const register = async (req, res) => {
    try {
        const { fullName, username, password, confirmPassword, gender } = req.body;
        if (!fullName || !username || !password || !confirmPassword || !gender) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Password do not match" });
        }

        const user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: "Username already exist, try different" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const maleProfilePhoto = `https://avatar.iran.liara.run/public/boy?username=${username}`;
        const femaleProfilePhoto = `https://avatar.iran.liara.run/public/girl?username=${username}`;

        const newUser = await User.create({
            fullName,
            username,
            password: hashedPassword,
            profilePhoto: gender === "male" ? maleProfilePhoto : femaleProfilePhoto,
            gender
        });
        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "Incorrect username or password", success: false });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({ message: "Incorrect username or password", success: false });
        }
        const tokenData = { userId: user._id };
        const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

        return res.status(200)
            .cookie("token", token, { maxAge: 1 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'strict' })
            .json({
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                profilePhoto: user.profilePhoto,
                bio: user.bio
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const logout = (req, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully."
        });
    } catch (error) {
        console.log(error);
    }
};

export const getOtherUsers = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const otherUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password -friendRequests");
        return res.status(200).json(otherUsers);
    } catch (error) {
        console.log(error);
    }
};

export const searchUsers = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const { query } = req.query;
        if (!query || query.trim() === "") {
            return res.status(200).json([]);
        }
        const regex = new RegExp(query.trim(), "i");
        const users = await User.find({
            _id: { $ne: loggedInUserId },
            $or: [{ fullName: regex }, { username: regex }]
        }).select("-password -friendRequests");

        const me = await User.findById(loggedInUserId).select("friends friendRequests");

        const result = users.map(u => {
            const isFriend = me.friends.map(f => f.toString()).includes(u._id.toString());
            const sentRequest = me.friendRequests.find(r => r.sender.toString() === u._id.toString() && r.status === "pending");
            const receivedRequest = u.friendRequests ? u.friendRequests.find(r => r.sender.toString() === loggedInUserId && r.status === "pending") : null;

            let friendStatus = "none";
            if (isFriend) friendStatus = "friends";
            else if (sentRequest) friendStatus = "received"; // they sent to me
            else if (receivedRequest) friendStatus = "pending"; // I sent to them

            return { ...u.toObject(), friendStatus };
        });

        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getFriends = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const user = await User.findById(loggedInUserId).populate("friends", "-password -friendRequests");
        return res.status(200).json(user.friends);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getFriendRequests = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const user = await User.findById(loggedInUserId).populate("friendRequests.sender", "-password -friendRequests");
        const incoming = user.friendRequests.filter(r => r.status === "pending");
        return res.status(200).json({ incoming });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;

        if (senderId === receiverId) {
            return res.status(400).json({ message: "Cannot send request to yourself" });
        }

        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if already friends
        if (sender.friends.map(f => f.toString()).includes(receiverId)) {
            return res.status(400).json({ message: "Already friends" });
        }

        // Check if request already exists in receiver's requests
        const existingRequest = receiver.friendRequests.find(
            r => r.sender.toString() === senderId && r.status === "pending"
        );
        if (existingRequest) {
            return res.status(400).json({ message: "Friend request already sent" });
        }

        receiver.friendRequests.push({ sender: senderId, status: "pending" });
        await receiver.save();

        // Emit real-time notification to receiver
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newFriendRequest", {
                _id: sender._id,
                fullName: sender.fullName,
                username: sender.username,
                profilePhoto: sender.profilePhoto
            });
        }

        return res.status(200).json({ message: "Friend request sent successfully", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const acceptFriendRequest = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const senderId = req.params.id;

        const me = await User.findById(loggedInUserId);
        const sender = await User.findById(senderId);

        if (!sender) {
            return res.status(404).json({ message: "User not found" });
        }

        const requestIndex = me.friendRequests.findIndex(
            r => r.sender.toString() === senderId && r.status === "pending"
        );
        if (requestIndex === -1) {
            return res.status(400).json({ message: "No pending friend request found" });
        }

        // Update request status
        me.friendRequests[requestIndex].status = "accepted";

        // Add to friends list for both users
        if (!me.friends.map(f => f.toString()).includes(senderId)) {
            me.friends.push(senderId);
        }
        if (!sender.friends.map(f => f.toString()).includes(loggedInUserId)) {
            sender.friends.push(loggedInUserId);
        }

        await me.save();
        await sender.save();

        // Notify sender in real time
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("friendRequestAccepted", {
                _id: me._id,
                fullName: me.fullName,
                username: me.username,
                profilePhoto: me.profilePhoto
            });
        }

        return res.status(200).json({ message: "Friend request accepted", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const rejectFriendRequest = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const senderId = req.params.id;

        const me = await User.findById(loggedInUserId);
        const requestIndex = me.friendRequests.findIndex(
            r => r.sender.toString() === senderId && r.status === "pending"
        );
        if (requestIndex === -1) {
            return res.status(400).json({ message: "No pending friend request found" });
        }

        me.friendRequests[requestIndex].status = "rejected";
        await me.save();

        return res.status(200).json({ message: "Friend request rejected", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};