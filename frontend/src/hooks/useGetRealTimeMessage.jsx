import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addMessage } from "../redux/messageSlice";
import toast from "react-hot-toast";

const useGetRealTimeMessage = () => {
    const { socket } = useSelector(store => store.socket);
    const { selectedUser, otherUsers, friends } = useSelector(store => store.user);
    const dispatch = useDispatch();

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (newMessage) => {
            if (!newMessage) return;

            const selectedId = selectedUser?._id?.toString();
            const senderId = (newMessage.senderId?._id || newMessage.senderId)?.toString();
            const receiverId = (newMessage.receiverId?._id || newMessage.receiverId)?.toString();

            const isCurrentChat = selectedId && (senderId === selectedId || receiverId === selectedId);

            if (isCurrentChat) {
                dispatch(addMessage(newMessage));
            } else {
                // Message from someone else: Show notification toast
                const senderObj = (friends || []).find(f => (f._id || f)?.toString() === senderId) ||
                                  (otherUsers || []).find(u => (u._id || u)?.toString() === senderId);
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
    }, [socket, selectedUser, friends, otherUsers, dispatch]);
};

export default useGetRealTimeMessage;