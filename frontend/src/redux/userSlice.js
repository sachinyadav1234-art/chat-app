import { createSlice } from "@reduxjs/toolkit";

const initialToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

const userSlice = createSlice({
    name: "user",
    initialState: {
        authUser: null,
        token: initialToken,
        otherUsers: [],
        selectedUser: null,
        onlineUsers: [],
        friends: [],
        friendRequests: [],       // incoming pending requests
        searchResultUsers: [],
        friendRequestBadge: 0,    // notification count
        typingUsers: {},          // { userId: boolean }
    },
    reducers: {
        setAuthUser: (state, action) => {
            if (action.payload === null) {
                state.authUser = null;
                state.token = null;
                state.otherUsers = [];
                state.selectedUser = null;
                state.onlineUsers = [];
                state.friends = [];
                state.friendRequests = [];
                state.searchResultUsers = [];
                state.friendRequestBadge = 0;
                state.typingUsers = {};
                try {
                    localStorage.removeItem('token');
                    localStorage.removeItem('authUser');
                } catch (e) {}
            } else {
                state.authUser = action.payload;
                const token = action.payload.token || action.payload.user?.token;
                if (token && token !== 'undefined' && token !== 'null') {
                    state.token = token;
                    try {
                        localStorage.setItem('token', token);
                    } catch (e) {}
                }
            }
        },
        setToken: (state, action) => {
            state.token = action.payload;
            try {
                if (action.payload && action.payload !== 'undefined' && action.payload !== 'null') {
                    localStorage.setItem('token', action.payload);
                } else {
                    localStorage.removeItem('token');
                }
            } catch (e) {}
        },
        setOtherUsers: (state, action) => {
            state.otherUsers = Array.isArray(action.payload) ? action.payload : [];
        },
        setSelectedUser: (state, action) => {
            state.selectedUser = action.payload;
        },
        setOnlineUsers: (state, action) => {
            state.onlineUsers = action.payload || [];
        },
        setFriends: (state, action) => {
            state.friends = Array.isArray(action.payload) ? action.payload : [];
        },
        setFriendRequests: (state, action) => {
            state.friendRequests = Array.isArray(action.payload) ? action.payload : [];
            state.friendRequestBadge = state.friendRequests.length;
        },
        addFriendRequest: (state, action) => {
            const newReq = action.payload;
            if (!newReq) return;
            const senderId = (newReq.sender?._id || newReq.sender || newReq._id)?.toString();
            if (!state.friendRequests) state.friendRequests = [];
            const exists = state.friendRequests.some(
                r => (r.sender?._id || r.sender || r._id)?.toString() === senderId
            );
            if (!exists) {
                state.friendRequests.unshift(newReq);
                state.friendRequestBadge = state.friendRequests.length;
            }
        },
        removeFriendRequest: (state, action) => {
            const targetId = action.payload?.toString();
            if (!targetId || !state.friendRequests) return;
            state.friendRequests = state.friendRequests.filter(
                r => (r.sender?._id?.toString() || r.sender?.toString() || r._id?.toString()) !== targetId
            );
            state.friendRequestBadge = state.friendRequests.length;
        },
        addFriend: (state, action) => {
            const newFriend = action.payload;
            if (!newFriend) return;
            if (!state.friends) state.friends = [];
            const friendId = (newFriend._id || newFriend)?.toString();
            const exists = state.friends.some(f => (f._id || f)?.toString() === friendId);
            if (!exists) {
                state.friends.unshift(newFriend);
            }
        },
        updateUserProfile: (state, action) => {
            const { userId, profilePhoto, fullName, bio } = action.payload;
            if (!userId) return;
            const uId = userId.toString();

            if (state.authUser && state.authUser._id?.toString() === uId) {
                state.authUser = {
                    ...state.authUser,
                    ...(profilePhoto && { profilePhoto }),
                    ...(fullName && { fullName }),
                    ...(bio !== undefined && { bio })
                };
            }

            if (state.friends) {
                state.friends = state.friends.map(f =>
                    (f._id?.toString() === uId)
                        ? { ...f, ...(profilePhoto && { profilePhoto }), ...(fullName && { fullName }), ...(bio !== undefined && { bio }) }
                        : f
                );
            }

            if (state.otherUsers) {
                state.otherUsers = state.otherUsers.map(u =>
                    (u._id?.toString() === uId)
                        ? { ...u, ...(profilePhoto && { profilePhoto }), ...(fullName && { fullName }), ...(bio !== undefined && { bio }) }
                        : u
                );
            }

            if (state.selectedUser && state.selectedUser._id?.toString() === uId) {
                state.selectedUser = {
                    ...state.selectedUser,
                    ...(profilePhoto && { profilePhoto }),
                    ...(fullName && { fullName }),
                    ...(bio !== undefined && { bio })
                };
            }
        },
        setSearchResultUsers: (state, action) => {
            state.searchResultUsers = action.payload || [];
        },
        setTypingUser: (state, action) => {
            const { userId, isTyping } = action.payload;
            state.typingUsers = { ...state.typingUsers, [userId]: isTyping };
        },
    }
});

export const {
    setAuthUser,
    setToken,
    setOtherUsers,
    setSelectedUser,
    setOnlineUsers,
    setFriends,
    setFriendRequests,
    addFriendRequest,
    removeFriendRequest,
    addFriend,
    updateUserProfile,
    setSearchResultUsers,
    setTypingUser,
} = userSlice.actions;

export default userSlice.reducer;