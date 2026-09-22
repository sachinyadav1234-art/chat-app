import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Peer from 'simple-peer';
import {
    resetCall,
    setCallAccepted,
    setCallEnded,
    setIsMuted,
    setIsVideoOff,
} from '../redux/callSlice';
import { BsMicMuteFill, BsMicFill, BsCameraVideoOffFill, BsCameraVideoFill } from 'react-icons/bs';
import { MdCallEnd, MdScreenShare, MdStopScreenShare } from 'react-icons/md';
import { IoVideocamOutline, IoCallOutline } from 'react-icons/io5';

const CallModal = () => {
    const dispatch = useDispatch();
    const { socket } = useSelector(store => store.socket);
    const { authUser } = useSelector(store => store.user);
    const {
        isReceivingCall,
        isCalling,
        callAccepted,
        callEnded,
        callType,
        caller,
        callerSignal,
        isMuted,
        isVideoOff,
    } = useSelector(store => store.call);

    const myVideoRef = useRef(null);
    const peerVideoRef = useRef(null);
    const connectionRef = useRef(null);
    const myStreamRef = useRef(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const timerRef = useRef(null);

    const selectedUser = useSelector(store => store.user.selectedUser);

    // ─── Get Local Media Stream ───────────────────────────────────────
    const getStream = useCallback(async (video = true) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: video && callType === 'video',
                audio: true
            });
            myStreamRef.current = stream;
            if (myVideoRef.current) {
                myVideoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            console.error("Error accessing media:", err);
            return null;
        }
    }, [callType]);

    // ─── Start call timer ─────────────────────────────────────────────
    useEffect(() => {
        if (callAccepted && !callEnded) {
            timerRef.current = setInterval(() => {
                setCallDuration(d => d + 1);
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [callAccepted, callEnded]);

    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ─── Answer incoming call ─────────────────────────────────────────
    const answerCall = async () => {
        const stream = await getStream();
        if (!stream) return;

        dispatch(setCallAccepted(true));

        const peer = new Peer({ initiator: false, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('answerCall', { signal: data, to: caller._id });
        });

        peer.on('stream', (remoteStream) => {
            if (peerVideoRef.current) {
                peerVideoRef.current.srcObject = remoteStream;
            }
        });

        peer.signal(callerSignal);
        connectionRef.current = peer;
    };

    // ─── Initiate call (called from App.js via callUser action) ──────
    useEffect(() => {
        if (!isCalling || !selectedUser || callAccepted) return;

        let active = true;
        (async () => {
            const stream = await getStream();
            if (!stream || !active) return;

            const peer = new Peer({ initiator: true, trickle: false, stream });

            peer.on('signal', (data) => {
                socket.emit('callUser', {
                    userToCall: selectedUser._id,
                    signalData: data,
                    from: authUser._id,
                    fromUser: { _id: authUser._id, fullName: authUser.fullName, profilePhoto: authUser.profilePhoto },
                    callType
                });
            });

            peer.on('stream', (remoteStream) => {
                if (peerVideoRef.current) {
                    peerVideoRef.current.srcObject = remoteStream;
                }
            });

            socket.on('callAccepted', (signal) => {
                dispatch(setCallAccepted(true));
                peer.signal(signal);
            });

            connectionRef.current = peer;
        })();

        return () => { active = false; };
    }, [isCalling]);

    // ─── Listen for call end ──────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        socket.on('callEnded', () => endCall());
        socket.on('callRejected', () => endCall());
        return () => {
            socket.off('callEnded');
            socket.off('callRejected');
        };
    }, [socket]);

    // ─── End call ────────────────────────────────────────────────────
    const endCall = () => {
        dispatch(setCallEnded(true));
        clearInterval(timerRef.current);
        setCallDuration(0);

        if (myStreamRef.current) {
            myStreamRef.current.getTracks().forEach(t => t.stop());
            myStreamRef.current = null;
        }
        if (connectionRef.current) {
            connectionRef.current.destroy();
            connectionRef.current = null;
        }
        if (socket && (isCalling || callAccepted)) {
            const targetId = caller?._id || selectedUser?._id;
            if (targetId) socket.emit('endCall', { to: targetId });
        }
        setTimeout(() => dispatch(resetCall()), 500);
    };

    // ─── Reject Call ──────────────────────────────────────────────────
    const rejectCall = () => {
        if (socket) socket.emit('rejectCall', { to: caller._id });
        dispatch(resetCall());
    };

    // ─── Mute / Unmute ────────────────────────────────────────────────
    const toggleMute = () => {
        if (myStreamRef.current) {
            myStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            dispatch(setIsMuted(!isMuted));
        }
    };

    // ─── Toggle Video ─────────────────────────────────────────────────
    const toggleVideo = () => {
        if (myStreamRef.current) {
            myStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            dispatch(setIsVideoOff(!isVideoOff));
        }
    };

    // ─── Screen Share ─────────────────────────────────────────────────
    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                if (connectionRef.current) {
                    const sender = connectionRef.current._pc?.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                }
                screenTrack.onended = () => {
                    toggleScreenShare();
                };
                setIsScreenSharing(true);
            } catch (err) {
                console.error('Screen share failed:', err);
            }
        } else {
            if (myStreamRef.current) {
                const videoTrack = myStreamRef.current.getVideoTracks()[0];
                if (connectionRef.current) {
                    const sender = connectionRef.current._pc?.getSenders().find(s => s.track?.kind === 'video');
                    if (sender && videoTrack) sender.replaceTrack(videoTrack);
                }
            }
            setIsScreenSharing(false);
        }
    };

    const isVisible = isReceivingCall || isCalling || callAccepted;
    if (!isVisible) return null;

    const callPerson = isCalling ? selectedUser : caller;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
            {/* ─── INCOMING CALL DIALOG ─── */}
            {isReceivingCall && !callAccepted && (
                <div className="flex flex-col items-center gap-6 p-10 bg-gray-900 rounded-3xl shadow-2xl border border-gray-700 w-80">
                    <div className="relative">
                        <img
                            src={caller?.profilePhoto}
                            alt={caller?.fullName}
                            className="w-24 h-24 rounded-full border-4 border-green-500 animate-pulse"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5">
                            {callType === 'video' ? (
                                <IoVideocamOutline className="text-white w-4 h-4" />
                            ) : (
                                <IoCallOutline className="text-white w-4 h-4" />
                            )}
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-white font-semibold text-xl">{caller?.fullName}</p>
                        <p className="text-gray-400 text-sm animate-pulse mt-1">
                            Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
                        </p>
                    </div>
                    <div className="flex gap-8">
                        <button
                            onClick={rejectCall}
                            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all"
                        >
                            <MdCallEnd className="text-white w-6 h-6" />
                        </button>
                        <button
                            onClick={answerCall}
                            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all"
                        >
                            {callType === 'video' ? (
                                <BsCameraVideoFill className="text-white w-5 h-5" />
                            ) : (
                                <IoCallOutline className="text-white w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ─── ACTIVE CALL VIEW ─── */}
            {(isCalling || callAccepted) && (
                <div className="relative w-full h-full flex flex-col bg-gray-950">
                    {/* Remote Video / Audio Avatar */}
                    <div className="flex-1 flex items-center justify-center relative">
                        {callType === 'video' ? (
                            <video
                                ref={peerVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <img
                                        src={callPerson?.profilePhoto}
                                        alt={callPerson?.fullName}
                                        className="w-32 h-32 rounded-full border-4 border-green-500"
                                    />
                                    {callAccepted && (
                                        <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-30" />
                                    )}
                                </div>
                                <p className="text-white text-2xl font-semibold">{callPerson?.fullName}</p>
                                <p className="text-gray-400 text-sm">
                                    {callAccepted ? formatDuration(callDuration) : "Calling..."}
                                </p>
                            </div>
                        )}

                        {/* Local video PIP */}
                        {callType === 'video' && (
                            <div className="absolute top-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-gray-600 shadow-xl">
                                <video
                                    ref={myVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Call status overlay */}
                        {callType === 'video' && (
                            <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-lg px-3 py-1">
                                <p className="text-white text-sm">
                                    {callAccepted ? formatDuration(callDuration) : "Calling..."}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Control Bar */}
                    <div className="bg-gray-900 bg-opacity-90 py-6 flex items-center justify-center gap-6">
                        <button
                            onClick={toggleMute}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted
                                ? <BsMicMuteFill className="text-white w-5 h-5" />
                                : <BsMicFill className="text-white w-5 h-5" />
                            }
                        </button>

                        {callType === 'video' && (
                            <button
                                onClick={toggleVideo}
                                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                title={isVideoOff ? "Enable Camera" : "Disable Camera"}
                            >
                                {isVideoOff
                                    ? <BsCameraVideoOffFill className="text-white w-5 h-5" />
                                    : <BsCameraVideoFill className="text-white w-5 h-5" />
                                }
                            </button>
                        )}

                        {callType === 'video' && (
                            <button
                                onClick={toggleScreenShare}
                                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                            >
                                {isScreenSharing
                                    ? <MdStopScreenShare className="text-white w-5 h-5" />
                                    : <MdScreenShare className="text-white w-5 h-5" />
                                }
                            </button>
                        )}

                        <button
                            onClick={endCall}
                            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-xl transition-all"
                            title="End Call"
                        >
                            <MdCallEnd className="text-white w-7 h-7" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallModal;
