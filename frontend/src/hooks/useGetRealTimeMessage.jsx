import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setMessages } from "../redux/messageSlice";
import toast from "react-hot-toast";

const useGetRealTimeMessage = () => {
    const { socket } = useSelector(store => store.socket);
    const { messages } = useSelector(store => store.message);
    const { selectedUser, otherUsers, friends } = useSelector(store => store.user);
    const dispatch = useDispatch();

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (newMessage) => {
            if (!newMessage) return;

            const isCurrentChat = selectedUser &&
                (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id);

            if (isCurrentChat) {
                // Avoid duplicate messages if already present
                const currentList = messages || [];
                const alreadyExists = currentList.some(m => m._id === newMessage._id);
                if (!alreadyExists) {
                    dispatch(setMessages([...currentList, newMessage]));
                }
            } else {
                // Message from someone else: Show notification toast
                const senderObj = (friends || []).find(f => f._id === newMessage.senderId) ||
                                  (otherUsers || []).find(u => u._id === newMessage.senderId);
                const senderName = senderObj?.fullName || "Someone";
                toast(`💬 ${senderName}: ${newMessage.message}`, {
                    duration: 3500,
                    position: "top-right"
                });
            }
        };

        socket.on("newMessage", handleNewMessage);
        return () => {
            socket.off("newMessage", handleNewMessage);
        };
    }, [socket, messages, selectedUser, friends, otherUsers, dispatch]);
};

export default useGetRealTimeMessage;