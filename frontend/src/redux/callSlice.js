import { createSlice } from "@reduxjs/toolkit";

const callSlice = createSlice({
    name: "call",
    initialState: {
        isReceivingCall: false,
        isCalling: false,
        callAccepted: false,
        callEnded: false,
        callType: null,       // 'video' | 'audio'
        caller: null,         // { _id, fullName, profilePhoto, username }
        callerSignal: null,
        stream: null,         // local stream
        isMuted: false,
        isVideoOff: false,
    },
    reducers: {
        setReceivingCall: (state, action) => {
            state.isReceivingCall = action.payload;
        },
        setIsCalling: (state, action) => {
            state.isCalling = action.payload;
        },
        setCallAccepted: (state, action) => {
            state.callAccepted = action.payload;
        },
        setCallEnded: (state, action) => {
            state.callEnded = action.payload;
        },
        setCallType: (state, action) => {
            state.callType = action.payload;
        },
        setCaller: (state, action) => {
            state.caller = action.payload;
        },
        setCallerSignal: (state, action) => {
            state.callerSignal = action.payload;
        },
        setIsMuted: (state, action) => {
            state.isMuted = action.payload;
        },
        setIsVideoOff: (state, action) => {
            state.isVideoOff = action.payload;
        },
        resetCall: (state) => {
            state.isReceivingCall = false;
            state.isCalling = false;
            state.callAccepted = false;
            state.callEnded = false;
            state.callType = null;
            state.caller = null;
            state.callerSignal = null;
            state.isMuted = false;
            state.isVideoOff = false;
        }
    }
});

export const {
    setReceivingCall,
    setIsCalling,
    setCallAccepted,
    setCallEnded,
    setCallType,
    setCaller,
    setCallerSignal,
    setIsMuted,
    setIsVideoOff,
    resetCall
} = callSlice.actions;

export default callSlice.reducer;
