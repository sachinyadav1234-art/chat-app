import { createSlice } from "@reduxjs/toolkit";

const callSlice = createSlice({
    name: "call",
    initialState: {
        isReceivingCall: false,
        isCalling: false,
        callAccepted: false,
        callEnded: false,
        callType: 'audio',       // 'video' | 'audio'
        caller: null,             // { _id, fullName, profilePhoto, username } (when receiving)
        targetUser: null,         // { _id, fullName, profilePhoto, username } (when calling)
        callerSignal: null,
        isMuted: false,
        isVideoOff: false,
        callStatus: 'idle',       // 'idle' | 'calling' | 'receiving' | 'connected' | 'ended'
    },
    reducers: {
        setReceivingCall: (state, action) => {
            state.isReceivingCall = action.payload;
            if (action.payload) state.callStatus = 'receiving';
        },
        setIsCalling: (state, action) => {
            state.isCalling = action.payload;
            if (action.payload) state.callStatus = 'calling';
        },
        setCallAccepted: (state, action) => {
            state.callAccepted = action.payload;
            if (action.payload) state.callStatus = 'connected';
        },
        setCallEnded: (state, action) => {
            state.callEnded = action.payload;
            if (action.payload) state.callStatus = 'ended';
        },
        setCallType: (state, action) => {
            state.callType = action.payload;
        },
        setCaller: (state, action) => {
            state.caller = action.payload;
        },
        setTargetUser: (state, action) => {
            state.targetUser = action.payload;
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
            state.callType = 'audio';
            state.caller = null;
            state.targetUser = null;
            state.callerSignal = null;
            state.isMuted = false;
            state.isVideoOff = false;
            state.callStatus = 'idle';
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
    setTargetUser,
    setCallerSignal,
    setIsMuted,
    setIsVideoOff,
    resetCall
} = callSlice.actions;

export default callSlice.reducer;
