import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addMessage } from "../redux/messageSlice";
import toast from "react-hot-toast";

const useGetRealTimeMessage = () => {
    const { socket } = useSelector(store => store.socket);
    const { authUser, selectedUser, otherUsers, friends } = useSelector(store => store.user);
    const dispatch = useDispatch();

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (newMessage) => {
            if (!newMessage) return;

            const selectedId = (selectedUser?._id || selectedUser?.id)?.toString();
            const senderId = (newMessage.senderId?._id || newMessage.senderId)?.toString();
            const receiverId = (newMessage.receiverId?._id || newMessage.receiverId)?.toString();
            const authId = (authUser?._id || authUser?.id)?.toString();

            const isCurrentChat = Boolean(selectedId && (senderId === selectedId || receiverId === selectedId));

            if (isCurrentChat) {
                dispatch(addMessage(newMessage));
            } else if (senderId && authId && senderId !== authId) {
                // Message from someone else in background: Show notification toast
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
    }, [socket, authUser, selectedUser, friends, otherUsers, dispatch]);
};

export default useGetRealTimeMessage;