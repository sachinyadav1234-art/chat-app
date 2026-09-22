import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
    name: "user",
    initialState: {
        authUser: null,
        otherUsers: null,
        selectedUser: null,
        onlineUsers: null,
        friends: [],
        friendRequests: [],       // incoming pending requests
        searchResultUsers: [],
        friendRequestBadge: 0,    // notification count
        typingUsers: {},          // { userId: boolean }
    },
    reducers: {
        setAuthUser: (state, action) => {
            state.authUser = action.payload;
        },
        setOtherUsers: (state, action) => {
            state.otherUsers = action.payload;
        },
        setSelectedUser: (state, action) => {
            state.selectedUser = action.payload;
        },
        setOnlineUsers: (state, action) => {
            state.onlineUsers = action.payload;
        },
        setFriends: (state, action) => {
            state.friends = action.payload;
        },
        setFriendRequests: (state, action) => {
            state.friendRequests = action.payload;
            state.friendRequestBadge = action.payload.length;
        },
        addFriendRequest: (state, action) => {
            state.friendRequests.push(action.payload);
            state.friendRequestBadge = state.friendRequests.length;
        },
        removeFriendRequest: (state, action) => {
            state.friendRequests = state.friendRequests.filter(
                r => r.sender._id !== action.payload
            );
            state.friendRequestBadge = state.friendRequests.length;
        },
        addFriend: (state, action) => {
            if (!state.friends.find(f => f._id === action.payload._id)) {
                state.friends.push(action.payload);
            }
        },
        setSearchResultUsers: (state, action) => {
            state.searchResultUsers = action.payload;
        },
        setTypingUser: (state, action) => {
            const { userId, isTyping } = action.payload;
            state.typingUsers = { ...state.typingUsers, [userId]: isTyping };
        },
    }
});

export const {
    setAuthUser,
    setOtherUsers,
    setSelectedUser,
    setOnlineUsers,
    setFriends,
    setFriendRequests,
    addFriendRequest,
    removeFriendRequest,
    addFriend,
    setSearchResultUsers,
    setTypingUser,
} = userSlice.actions;

export default userSlice.reducer;