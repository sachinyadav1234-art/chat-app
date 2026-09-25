import { useEffect } from 'react';
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setOtherUsers } from '../redux/userSlice';
import { BASE_URL } from '..';

const useGetOtherUsers = () => {
    const dispatch = useDispatch();
    const { token, authUser } = useSelector(store => store.user);

    useEffect(() => {
        const fetchOtherUsers = async () => {
            if (!authUser) return;
            try {
                const res = await axios.get(`${BASE_URL}/api/v1/user`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    withCredentials: true
                });
                dispatch(setOtherUsers(res.data));
            } catch (error) {
                console.error("Fetch other users error:", error);
                dispatch(setOtherUsers([]));
            }
        };
        fetchOtherUsers();
    }, [authUser, token, dispatch]);
};

export default useGetOtherUsers;