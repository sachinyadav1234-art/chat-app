import mongoose from "mongoose";
import { Conversation } from "../models/conversationModel.js";
import { Message } from "../models/messageModel.js";
import { io } from "../socket/socket.js";

export const sendMessage = async (req, res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const { message } = req.body;

        if (!message || !String(message).trim()) {
            return res.status(400).json({ message: "Message cannot be empty", success: false });
        }

        if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: "Invalid receiver ID", success: false });
        }

        if (String(senderId) === String(receiverId)) {
            return res.status(400).json({ message: "Cannot send message to yourself", success: false });
        }

        let gotConversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
        });

        if (!gotConversation) {
            gotConversation = await Conversation.create({
                participants: [senderId, receiverId],
                messages: []
            });
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: String(message).trim()
        });

        if (newMessage) {
            gotConversation.messages.push(newMessage._id);
        }

        await Promise.all([gotConversation.save(), newMessage.save()]);

        // SOCKET IO: emit directly to receiver and sender rooms so all connected devices/tabs receive it in real-time
        io.to(receiverId).emit("newMessage", newMessage);
        io.to(senderId).emit("newMessage", newMessage);

        return res.status(201).json({
            success: true,
            newMessage
        });
    } catch (error) {
        console.error("SendMessage error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const getMessage = async (req, res) => {
    try {
        const receiverId = req.params.id;
        const senderId = req.id;

        if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: "Invalid receiver ID", success: false });
        }

        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        }).populate("messages");

        return res.status(200).json(conversation?.messages || []);
    } catch (error) {
        console.error("GetMessage error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};