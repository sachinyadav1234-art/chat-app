import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URL } from '..';
import { IoChatbubblesOutline } from 'react-icons/io5';

const Signup = () => {
    const [user, setUser] = useState({
        fullName: "",
        username: "",
        password: "",
        confirmPassword: "",
        gender: "",
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        if (!user.gender) {
            toast.error("Please select a gender");
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/v1/user/register`, user, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true
            });
            if (res.data.success) {
                navigate("/login");
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-950 px-4 py-8">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8 gap-3">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <IoChatbubblesOutline className="w-9 h-9 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-white">ChatterBox</h1>
                        <p className="text-gray-400 text-sm mt-1">Create your free account</p>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-800">
                    <h2 className="text-xl font-semibold text-white mb-6">Create Account 🚀</h2>
                    <form onSubmit={onSubmitHandler} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Full Name</label>
                            <input
                                value={user.fullName}
                                onChange={(e) => setUser({ ...user, fullName: e.target.value })}
                                className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500 text-sm"
                                type="text"
                                placeholder="Your full name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Username</label>
                            <input
                                value={user.username}
                                onChange={(e) => setUser({ ...user, username: e.target.value })}
                                className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500 text-sm"
                                type="text"
                                placeholder="Choose a username"
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
                                placeholder="Create a password"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
                            <input
                                value={user.confirmPassword}
                                onChange={(e) => setUser({ ...user, confirmPassword: e.target.value })}
                                className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500 text-sm"
                                type="password"
                                placeholder="Confirm your password"
                                required
                            />
                        </div>

                        {/* Gender selector */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Gender</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setUser({ ...user, gender: "male" })}
                                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
                                        ${user.gender === 'male'
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    👨 Male
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUser({ ...user, gender: "female" })}
                                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
                                        ${user.gender === 'female'
                                            ? 'bg-pink-600 border-pink-600 text-white'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    👩 Female
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-1"
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : "Create Account"}
                        </button>
                    </form>

                    <p className="text-center text-gray-500 text-sm mt-6">
                        Already have an account?{" "}
                        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Log In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;