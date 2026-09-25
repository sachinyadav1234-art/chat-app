import { useEffect } from 'react';
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { setMessages } from '../redux/messageSlice';
import { BASE_URL } from '..';

const useGetMessages = () => {
    const { selectedUser, token } = useSelector(store => store.user);
    const dispatch = useDispatch();

    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedUser?._id) return;
            try {
                const res = await axios.get(`${BASE_URL}/api/v1/message/${selectedUser._id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    withCredentials: true
                });
                dispatch(setMessages(res.data || []));
            } catch (error) {
                console.error("Fetch messages error:", error);
                dispatch(setMessages([]));
            }
        };
        fetchMessages();
    }, [selectedUser?._id, token, dispatch]);
};

export default useGetMessages;