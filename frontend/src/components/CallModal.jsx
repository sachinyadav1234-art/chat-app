import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Peer from 'simple-peer';
import toast from 'react-hot-toast';
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
import { getAvatarUrl } from '../utils/avatar';

// ─── Web Audio Tone Synthesizer ───────────────────────────────────────
class SoundEffectManager {
    constructor() {
        this.audioCtx = null;
        this.interval = null;
    }

    init() {
        try {
            if (!this.audioCtx) {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) {
                    this.audioCtx = new AudioCtxClass();
                }
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        } catch (e) {
            console.warn("Audio context init failed:", e);
        }
    }

    playOutgoingRing() {
        this.stop();
        this.init();
        if (!this.audioCtx) return;

        const beep = () => {
            try {
                if (!this.audioCtx) return;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
                gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 1.4);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start();
                osc.stop(this.audioCtx.currentTime + 1.4);
            } catch (err) {
                console.warn("Outgoing ring error:", err);
            }
        };

        beep();
        this.interval = setInterval(beep, 3200);
    }

    playIncomingRing() {
        this.stop();
        this.init();
        if (!this.audioCtx) return;

        const chime = () => {
            try {
                if (!this.audioCtx) return;
                const notes = [523.25, 659.25, 783.99, 1046.50];
                notes.forEach((freq, i) => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    const startTime = this.audioCtx.currentTime + i * 0.12;
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, startTime);
                    gain.gain.setValueAtTime(0.12, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);
                    osc.connect(gain);
                    gain.connect(this.audioCtx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + 0.35);
                });
            } catch (err) {
                console.warn("Incoming ring error:", err);
            }
        };

        chime();
        this.interval = setInterval(chime, 2500);
    }

    playEndTone() {
        this.stop();
        this.init();
        if (!this.audioCtx) return;

        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, this.audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(140, this.audioCtx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.4);
        } catch (err) {
            console.warn("End tone error:", err);
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

const sounds = new SoundEffectManager();

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ]
};

const CallModal = () => {
    const dispatch = useDispatch();
    const { socket } = useSelector(store => store.socket);
    const { authUser, selectedUser } = useSelector(store => store.user);
    const {
        isReceivingCall,
        isCalling,
        callAccepted,
        callEnded,
        callType,
        caller,
        targetUser,
        callerSignal,
        isMuted,
        isVideoOff,
    } = useSelector(store => store.call);

    const myVideoRef = useRef(null);
    const peerVideoRef = useRef(null);
    const peerAudioRef = useRef(null);
    const connectionRef = useRef(null);
    const myStreamRef = useRef(null);

    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const timerRef = useRef(null);

    const activeTarget = isCalling ? (targetUser || selectedUser) : caller;

    // ─── Attach Local & Remote Streams to Media Elements ──────────────
    useEffect(() => {
        if (myVideoRef.current && localStream) {
            myVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isCalling, callAccepted, callType]);

    useEffect(() => {
        if (peerVideoRef.current && remoteStream) {
            peerVideoRef.current.srcObject = remoteStream;
        }
        if (peerAudioRef.current && remoteStream) {
            peerAudioRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, callAccepted, callType]);

    // ─── Acquire Local Media Stream ──────────────────────────────────
    const getStream = useCallback(async (videoRequested = true) => {
        try {
            const constraints = {
                audio: true,
                video: videoRequested && callType === 'video' ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } : false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            myStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error("Error accessing media devices:", err);
            toast.error("Could not access microphone or camera. Please check browser permissions.");
            return null;
        }
    }, [callType]);

    // ─── Call Duration Timer ─────────────────────────────────────────
    useEffect(() => {
        if (callAccepted && !callEnded) {
            sounds.stop();
            timerRef.current = setInterval(() => {
                setCallDuration(d => d + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callAccepted, callEnded]);

    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ─── Ringtone Sound Management ───────────────────────────────────
    useEffect(() => {
        if (isReceivingCall && !callAccepted) {
            sounds.playIncomingRing();
        } else if (isCalling && !callAccepted) {
            sounds.playOutgoingRing();
        } else {
            sounds.stop();
        }
        return () => sounds.stop();
    }, [isReceivingCall, isCalling, callAccepted]);

    // ─── Answer Incoming Call ────────────────────────────────────────
    const answerCall = async () => {
        sounds.stop();
        const stream = await getStream();
        if (!stream) {
            rejectCall();
            return;
        }

        dispatch(setCallAccepted(true));

        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
            config: ICE_SERVERS
        });

        peer.on('signal', (data) => {
            if (socket && caller?._id) {
                socket.emit('answerCall', { signal: data, to: caller._id });
            }
        });

        peer.on('stream', (incomingStream) => {
            setRemoteStream(incomingStream);
        });

        peer.on('error', (err) => {
            console.error('Peer connection error:', err);
            endCall();
        });

        peer.on('close', () => {
            endCall();
        });

        if (callerSignal) {
            peer.signal(callerSignal);
        }
        connectionRef.current = peer;
    };

    // ─── Outgoing Call Initiation ────────────────────────────────────
    useEffect(() => {
        const target = targetUser || selectedUser;
        if (!isCalling || !target || callAccepted || !socket) return;

        let active = true;
        (async () => {
            const stream = await getStream();
            if (!stream || !active) {
                if (!stream) dispatch(resetCall());
                return;
            }

            const peer = new Peer({
                initiator: true,
                trickle: false,
                stream,
                config: ICE_SERVERS
            });

            peer.on('signal', (data) => {
                socket.emit('callUser', {
                    userToCall: target._id,
                    signalData: data,
                    from: authUser._id,
                    fromUser: {
                        _id: authUser._id,
                        fullName: authUser.fullName,
                        profilePhoto: authUser.profilePhoto,
                        username: authUser.username
                    },
                    callType
                });
            });

            peer.on('stream', (incomingStream) => {
                setRemoteStream(incomingStream);
            });

            peer.on('error', (err) => {
                console.error('Caller peer connection error:', err);
                endCall();
            });

            peer.on('close', () => {
                endCall();
            });

            const onCallAccepted = (signal) => {
                sounds.stop();
                dispatch(setCallAccepted(true));
                peer.signal(signal);
            };

            socket.once('callAccepted', onCallAccepted);
            connectionRef.current = peer;
        })();

        return () => {
            active = false;
        };
    }, [isCalling, socket, targetUser, selectedUser]);

    // ─── Socket Event Listeners for Call Termination ─────────────────
    useEffect(() => {
        if (!socket) return;

        const handleCallEnded = () => {
            toast('Call ended', { icon: '📞' });
            cleanupAndReset();
        };

        const handleCallRejected = (data) => {
            const reason = data?.reason || 'Call was declined';
            toast.error(reason);
            cleanupAndReset();
        };

        socket.on('callEnded', handleCallEnded);
        socket.on('callRejected', handleCallRejected);

        return () => {
            socket.off('callEnded', handleCallEnded);
            socket.off('callRejected', handleCallRejected);
        };
    }, [socket, caller, targetUser, selectedUser]);

    // ─── Cleanup Helper ──────────────────────────────────────────────
    const cleanupAndReset = useCallback(() => {
        sounds.playEndTone();
        dispatch(setCallEnded(true));
        if (timerRef.current) clearInterval(timerRef.current);
        setCallDuration(0);
        setIsScreenSharing(false);

        if (myStreamRef.current) {
            myStreamRef.current.getTracks().forEach(track => track.stop());
            myStreamRef.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);

        if (connectionRef.current) {
            try {
                connectionRef.current.destroy();
            } catch (e) {
                // ignore
            }
            connectionRef.current = null;
        }

        setTimeout(() => {
            dispatch(resetCall());
        }, 400);
    }, [dispatch]);

    // ─── End Active Call ─────────────────────────────────────────────
    const endCall = () => {
        const targetId = caller?._id || targetUser?._id || selectedUser?._id;
        if (socket && targetId && (isCalling || callAccepted || isReceivingCall)) {
            socket.emit('endCall', { to: targetId });
        }
        cleanupAndReset();
    };

    // ─── Reject Incoming Call ────────────────────────────────────────
    const rejectCall = () => {
        sounds.stop();
        if (socket && caller?._id) {
            socket.emit('rejectCall', { to: caller._id });
        }
        cleanupAndReset();
    };

    // ─── Mute / Unmute Microphone ────────────────────────────────────
    const toggleMute = () => {
        if (myStreamRef.current) {
            const audioTracks = myStreamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            dispatch(setIsMuted(!isMuted));
        }
    };

    // ─── Toggle Camera On / Off ───────────────────────────────────────
    const toggleVideo = () => {
        if (myStreamRef.current) {
            const videoTracks = myStreamRef.current.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            dispatch(setIsVideoOff(!isVideoOff));
        }
    };

    // ─── Screen Sharing ──────────────────────────────────────────────
    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                if (connectionRef.current && connectionRef.current._pc) {
                    const sender = connectionRef.current._pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                }
                screenTrack.onended = () => {
                    toggleScreenShare();
                };
                setIsScreenSharing(true);
            } catch (err) {
                console.error('Screen sharing error:', err);
                toast.error("Screen sharing was cancelled or not supported");
            }
        } else {
            if (myStreamRef.current) {
                const videoTrack = myStreamRef.current.getVideoTracks()[0];
                if (connectionRef.current && connectionRef.current._pc && videoTrack) {
                    const sender = connectionRef.current._pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(videoTrack);
                }
            }
            setIsScreenSharing(false);
        }
    };

    const isVisible = isReceivingCall || isCalling || callAccepted;
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn">
            {/* Hidden audio element for remote voice in audio calls */}
            <audio ref={peerAudioRef} autoPlay playsInline />

            {/* ─── INCOMING CALL DIALOG ─── */}
            {isReceivingCall && !callAccepted && (
                <div className="flex flex-col items-center gap-6 p-8 bg-gray-900/95 rounded-3xl shadow-2xl border border-gray-800 w-84 max-w-xs sm:max-w-sm text-center">
                    <div className="relative">
                        <img
                            src={getAvatarUrl(caller?.profilePhoto, caller?.fullName || caller?.username)}
                            alt={caller?.fullName}
                            loading="lazy"
                            className="w-24 h-24 rounded-full border-4 border-emerald-500 object-cover shadow-lg"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-2 shadow-md">
                            {callType === 'video' ? (
                                <IoVideocamOutline className="text-white w-5 h-5" />
                            ) : (
                                <IoCallOutline className="text-white w-5 h-5" />
                            )}
                        </div>
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-30 pointer-events-none" />
                    </div>

                    <div>
                        <p className="text-white font-bold text-xl">{caller?.fullName || "Incoming User"}</p>
                        <p className="text-emerald-400 text-sm font-medium animate-pulse mt-1">
                            Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
                        </p>
                    </div>

                    <div className="flex items-center gap-10 mt-2">
                        <button
                            onClick={rejectCall}
                            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center shadow-lg transition-all"
                            title="Decline Call"
                        >
                            <MdCallEnd className="text-white w-6 h-6" />
                        </button>
                        <button
                            onClick={answerCall}
                            className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 flex items-center justify-center shadow-lg transition-all"
                            title="Accept Call"
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

            {/* ─── ACTIVE CALL VIEW (Calling / In-Call) ─── */}
            {(isCalling || callAccepted) && (
                <div className="relative w-full h-full flex flex-col bg-gray-950 overflow-hidden">
                    {/* Header info in call */}
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-gray-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-gray-800 shadow-lg">
                        <img
                            src={getAvatarUrl(activeTarget?.profilePhoto, activeTarget?.fullName || activeTarget?.username)}
                            alt={activeTarget?.fullName}
                            loading="lazy"
                            className="w-8 h-8 rounded-full object-cover border border-gray-700"
                        />
                        <div>
                            <p className="text-white text-xs font-semibold">{activeTarget?.fullName}</p>
                            <p className="text-gray-400 text-[11px]">
                                {callAccepted ? formatDuration(callDuration) : 'Calling...'}
                            </p>
                        </div>
                    </div>

                    {/* Main Stage (Video or Audio Avatar) */}
                    <div className="flex-1 flex items-center justify-center relative min-h-0">
                        {callType === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                {remoteStream ? (
                                    <video
                                        ref={peerVideoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-contain md:object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative">
                                            <img
                                                src={getAvatarUrl(activeTarget?.profilePhoto, activeTarget?.fullName || activeTarget?.username)}
                                                alt={activeTarget?.fullName}
                                                loading="lazy"
                                                className="w-28 h-28 rounded-full border-4 border-blue-500 object-cover shadow-2xl"
                                            />
                                            <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-30 pointer-events-none" />
                                        </div>
                                        <p className="text-white text-xl font-semibold">{activeTarget?.fullName}</p>
                                        <p className="text-blue-400 text-sm font-medium animate-pulse">
                                            {callAccepted ? "Connecting video..." : "Ringing..."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-5">
                                <div className="relative">
                                    <img
                                        src={getAvatarUrl(activeTarget?.profilePhoto, activeTarget?.fullName || activeTarget?.username)}
                                        alt={activeTarget?.fullName}
                                        loading="lazy"
                                        className="w-32 h-32 rounded-full border-4 border-emerald-500 object-cover shadow-2xl"
                                    />
                                    {callAccepted ? (
                                        <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-pulse opacity-50 pointer-events-none" />
                                    ) : (
                                        <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-30 pointer-events-none" />
                                    )}
                                </div>
                                <p className="text-white text-2xl font-bold">{activeTarget?.fullName}</p>
                                <p className="text-gray-400 text-sm">
                                    {callAccepted ? formatDuration(callDuration) : "Ringing..."}
                                </p>
                            </div>
                        )}

                        {/* Local PIP Video */}
                        {callType === 'video' && (
                            <div className="absolute top-4 right-4 w-32 sm:w-44 aspect-video rounded-2xl overflow-hidden border-2 border-gray-700 shadow-2xl bg-gray-900 z-20">
                                <video
                                    ref={myVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                {isVideoOff && (
                                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-gray-400 text-xs font-medium">
                                        Camera Off
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom Control Bar */}
                    <div className="bg-gray-900/90 backdrop-blur-md py-5 px-6 flex items-center justify-center gap-5 border-t border-gray-800 flex-shrink-0">
                        <button
                            onClick={toggleMute}
                            className={`w-13 h-13 p-3.5 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all ${
                                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-800 hover:bg-gray-700'
                            }`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? (
                                <BsMicMuteFill className="text-white w-5 h-5" />
                            ) : (
                                <BsMicFill className="text-white w-5 h-5" />
                            )}
                        </button>

                        {callType === 'video' && (
                            <button
                                onClick={toggleVideo}
                                className={`w-13 h-13 p-3.5 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all ${
                                    isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-800 hover:bg-gray-700'
                                }`}
                                title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                            >
                                {isVideoOff ? (
                                    <BsCameraVideoOffFill className="text-white w-5 h-5" />
                                ) : (
                                    <BsCameraVideoFill className="text-white w-5 h-5" />
                                )}
                            </button>
                        )}

                        {callType === 'video' && (
                            <button
                                onClick={toggleScreenShare}
                                className={`w-13 h-13 p-3.5 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all ${
                                    isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'
                                }`}
                                title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                            >
                                {isScreenSharing ? (
                                    <MdStopScreenShare className="text-white w-5 h-5" />
                                ) : (
                                    <MdScreenShare className="text-white w-5 h-5" />
                                )}
                            </button>
                        )}

                        <button
                            onClick={endCall}
                            className="w-14 h-14 p-4 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center shadow-xl transition-all"
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
