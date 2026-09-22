import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from "react-hot-toast";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAuthUser } from '../redux/userSlice';
import { BASE_URL } from '..';
import { IoChatbubblesOutline } from 'react-icons/io5';

const Login = () => {
    const [user, setUser] = useState({ username: "", password: "" });
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/v1/user/login`, user, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true
            });
            dispatch(setAuthUser(res.data));
            navigate("/");
        } catch (error) {
            toast.error(error.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
            setUser({ username: "", password: "" });
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-950 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8 gap-3">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <IoChatbubblesOutline className="w-9 h-9 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-white">ChatterBox</h1>
                        <p className="text-gray-400 text-sm mt-1">Connect, Chat & Call with friends</p>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-800">
                    <h2 className="text-xl font-semibold text-white mb-6">Welcome back 👋</h2>
                    <form onSubmit={onSubmitHandler} className="flex flex-col gap-5">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Username</label>
                            <input
                                value={user.username}
                                onChange={(e) => setUser({ ...user, username: e.target.value })}
                                className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500 text-sm"
                                type="text"
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Password</label>
                            <input
                                value={user.password}
                                onChange={(e) => setUser({ ...user, password: e.target.value })}
                                className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500 text-sm"
                                type="password"
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : "Login"}
                        </button>
                    </form>
                    <p className="text-center text-gray-500 text-sm mt-6">
                        Don't have an account?{" "}
                        <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium">Sign Up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;