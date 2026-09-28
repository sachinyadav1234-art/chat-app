import { createSlice } from "@reduxjs/toolkit";

const messageSlice = createSlice({
    name: "message",
    initialState: {
        messages: null,
    },
    reducers: {
        setMessages: (state, action) => {
            state.messages = action.payload;
        },
        addMessage: (state, action) => {
            if (!action.payload) return;
            if (!state.messages) {
                state.messages = [action.payload];
            } else {
                const exists = state.messages.some(m => m._id === action.payload._id);
                if (!exists) {
                    state.messages.push(action.payload);
                }
            }
        }
    }
});

export const { setMessages, addMessage } = messageSlice.actions;
export default messageSlice.reducer;