import React, { useEffect } from 'react'
import Sidebar from './Sidebar'
import MessageContainer from './MessageContainer'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

const HomePage = () => {
    const { authUser } = useSelector(store => store.user);
    const navigate = useNavigate();

    useEffect(() => {
        if (!authUser) {
            navigate("/login");
        }
    }, [authUser, navigate]);

    return (
        <div className="w-full h-screen flex bg-gray-950">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <MessageContainer />
            </div>
        </div>
    );
};

export default HomePage;