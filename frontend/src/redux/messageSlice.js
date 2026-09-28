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
                const newId = (action.payload._id || action.payload.id)?.toString();
                const exists = state.messages.some(m => (m._id || m.id)?.toString() === newId);
                if (!exists) {
                    state.messages.push(action.payload);
                }
            }
        }
    }
});

export const { setMessages, addMessage } = messageSlice.actions;
export default messageSlice.reducer;