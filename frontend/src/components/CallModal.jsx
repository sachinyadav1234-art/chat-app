import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
import { IoVideocamOutline, IoCallOutline, IoShieldCheckmarkOutline, IoRefreshOutline } from 'react-icons/io5';
import { getAvatarUrl } from '../utils/avatar';
import { getSafeUserMedia } from '../utils/mediaPermissions';

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
        { urls: 'stun:global.stun.twilio.com:3478' }
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
    const peerConnectionRef = useRef(null);
    const myStreamRef = useRef(null);
    const pendingIceCandidatesRef = useRef([]);

    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [permissionError, setPermissionError] = useState(null); // { errorType, message }
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

    // ─── Acquire Local Media Stream with Fallback ─────────────────────
    const acquireMedia = useCallback(async (videoRequested = true) => {
        setPermissionError(null);
        const { stream, errorType, message } = await getSafeUserMedia({
            video: videoRequested && callType === 'video',
            audio: true
        });

        if (!stream) {
            setPermissionError({ errorType, message });
            toast.error(message || "Could not access microphone or camera");
            return null;
        }

        if (message) {
            toast(message, { icon: "ℹ️" });
        }

        myStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
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
        if (isReceivingCall && !callAccepted && !permissionError) {
            sounds.playIncomingRing();
        } else if (isCalling && !callAccepted && !permissionError) {
            sounds.playOutgoingRing();
        } else {
            sounds.stop();
        }
        return () => sounds.stop();
    }, [isReceivingCall, isCalling, callAccepted, permissionError]);

    // ─── Cleanup Helper ──────────────────────────────────────────────
    const cleanupAndReset = useCallback(() => {
        sounds.playEndTone();
        dispatch(setCallEnded(true));
        if (timerRef.current) clearInterval(timerRef.current);
        setCallDuration(0);
        setIsScreenSharing(false);
        setPermissionError(null);

        if (myStreamRef.current) {
            myStreamRef.current.getTracks().forEach(track => track.stop());
            myStreamRef.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
        pendingIceCandidatesRef.current = [];

        if (peerConnectionRef.current) {
            try {
                peerConnectionRef.current.close();
            } catch (e) {
                // ignore
            }
            peerConnectionRef.current = null;
        }

        setTimeout(() => {
            dispatch(resetCall());
        }, 400);
    }, [dispatch]);

    // ─── Create RTCPeerConnection Helper ─────────────────────────────
    const createPeerConnection = useCallback((targetId, stream) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        // Add local tracks
        if (stream) {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        }

        // Remote track received
        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        };

        // ICE Candidate discovered
        pc.onicecandidate = (event) => {
            if (event.candidate && socket && targetId) {
                socket.emit('iceCandidate', {
                    to: targetId,
                    candidate: event.candidate
                });
            }
        };

        return pc;
    }, [socket]);

    // ─── Answer Incoming Call (Callee) ────────────────────────────────
    const answerCall = async () => {
        sounds.stop();
        const stream = await acquireMedia(callType === 'video');
        if (!stream) {
            return;
        }

        dispatch(setCallAccepted(true));

        const targetId = caller?._id;
        const pc = createPeerConnection(targetId, stream);

        try {
            if (callerSignal) {
                await pc.setRemoteDescription(new RTCSessionDescription(callerSignal));

                while (pendingIceCandidatesRef.current.length > 0) {
                    const candidate = pendingIceCandidatesRef.current.shift();
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.warn("Error adding queued ICE candidate:", err);
                    }
                }
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (socket && targetId) {
                socket.emit('answerCall', { signal: answer, to: targetId });
            }
        } catch (err) {
            console.error("Error creating WebRTC answer:", err);
            toast.error("Failed to establish peer connection");
            endCall();
        }
    };

    // ─── Outgoing Call Initiation (Caller) ────────────────────────────
    const startOutgoingCall = useCallback(async (target) => {
        const stream = await acquireMedia(callType === 'video');
        if (!stream) return;

        const targetId = target._id;
        const pc = createPeerConnection(targetId, stream);

        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: callType === 'video'
            });
            await pc.setLocalDescription(offer);

            socket.emit('callUser', {
                userToCall: targetId,
                signalData: offer,
                from: authUser._id,
                fromUser: {
                    _id: authUser._id,
                    fullName: authUser.fullName,
                    profilePhoto: authUser.profilePhoto,
                    username: authUser.username
                },
                callType
            });
        } catch (err) {
            console.error("Error creating WebRTC offer:", err);
            toast.error("Failed to initiate call");
            cleanupAndReset();
        }
    }, [acquireMedia, authUser, callType, cleanupAndReset, createPeerConnection, socket]);

    useEffect(() => {
        const target = targetUser || selectedUser;
        if (!isCalling || !target || callAccepted || !socket) return;

        startOutgoingCall(target);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCalling, socket, targetUser, selectedUser]);

    // ─── Socket Event Listeners for Call Signaling ────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleCallAccepted = async (answerSignal) => {
            sounds.stop();
            dispatch(setCallAccepted(true));

            const pc = peerConnectionRef.current;
            if (pc && pc.signalingState !== 'closed') {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answerSignal));

                    while (pendingIceCandidatesRef.current.length > 0) {
                        const candidate = pendingIceCandidatesRef.current.shift();
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (err) {
                            console.warn("Error adding queued ICE candidate:", err);
                        }
                    }
                } catch (err) {
                    console.error("Error setting remote description for answer:", err);
                }
            }
        };

        const handleIceCandidate = async ({ candidate }) => {
            if (!candidate) return;
            const pc = peerConnectionRef.current;
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.warn("Failed to add ICE candidate:", err);
                }
            } else {
                pendingIceCandidatesRef.current.push(candidate);
            }
        };

        const handleCallEnded = () => {
            toast('Call ended', { icon: '📞' });
            cleanupAndReset();
        };

        const handleCallRejected = (data) => {
            const reason = data?.reason || 'Call was declined';
            toast.error(reason);
            cleanupAndReset();
        };

        socket.on('callAccepted', handleCallAccepted);
        socket.on('iceCandidate', handleIceCandidate);
        socket.on('callEnded', handleCallEnded);
        socket.on('callRejected', handleCallRejected);

        return () => {
            socket.off('callAccepted', handleCallAccepted);
            socket.off('iceCandidate', handleIceCandidate);
            socket.off('callEnded', handleCallEnded);
            socket.off('callRejected', handleCallRejected);
        };
    }, [socket, cleanupAndReset, dispatch]);

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
            const nextMuted = !isMuted;
            audioTracks.forEach(track => {
                track.enabled = !nextMuted;
            });
            dispatch(setIsMuted(nextMuted));
        }
    };

    // ─── Toggle Camera On / Off ───────────────────────────────────────
    const toggleVideo = () => {
        if (myStreamRef.current) {
            const videoTracks = myStreamRef.current.getVideoTracks();
            const nextVideoOff = !isVideoOff;
            videoTracks.forEach(track => {
                track.enabled = !nextVideoOff;
            });
            dispatch(setIsVideoOff(nextVideoOff));
        }
    };

    // ─── Screen Sharing ──────────────────────────────────────────────
    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                const pc = peerConnectionRef.current;
                if (pc) {
                    const senders = pc.getSenders();
                    const videoSender = senders.find(s => s.track?.kind === 'video');
                    if (videoSender) {
                        videoSender.replaceTrack(screenTrack);
                    }
                }
                screenTrack.onended = () => {
                    stopScreenSharing();
                };
                setIsScreenSharing(true);
            } catch (err) {
                console.error('Screen sharing error:', err);
                if (err.name !== 'NotAllowedError') {
                    toast.error("Screen sharing was cancelled or not supported");
                }
            }
        } else {
            stopScreenSharing();
        }
    };

    const stopScreenSharing = () => {
        if (myStreamRef.current) {
            const originalVideoTrack = myStreamRef.current.getVideoTracks()[0];
            const pc = peerConnectionRef.current;
            if (pc && originalVideoTrack) {
                const senders = pc.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(originalVideoTrack);
                }
            }
        }
        setIsScreenSharing(false);
    };

    const isVisible = isReceivingCall || isCalling || callAccepted;
    if (!isVisible) return null;

    // ─── PERMISSION / DEVICE ERROR OVERLAY ────────────────────────────
    if (permissionError) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
                <div className="flex flex-col items-center p-6 sm:p-8 bg-gray-900 rounded-3xl shadow-2xl border border-gray-800 max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                        <IoShieldCheckmarkOutline className="w-9 h-9" />
                    </div>

                    <h2 className="text-white font-bold text-lg sm:text-xl mb-2">
                        {permissionError.errorType === 'HTTPS_REQUIRED'
                            ? 'HTTPS Connection Required'
                            : 'Camera & Microphone Access Needed'}
                    </h2>

                    <p className="text-gray-300 text-sm leading-relaxed mb-5">
                        {permissionError.message}
                    </p>

                    {permissionError.errorType === 'PERMISSION_DENIED' && (
                        <div className="w-full bg-gray-800/80 rounded-2xl p-4 text-left text-xs text-gray-300 space-y-2 mb-6 border border-gray-700">
                            <p className="font-semibold text-white flex items-center gap-1.5">
                                <span>💡</span> How to enable permissions:
                            </p>
                            <p>1. Click the <strong>lock / camera / settings</strong> icon in your browser's address bar (next to the URL).</p>
                            <p>2. Set <strong>Camera</strong> and <strong>Microphone</strong> permissions to <strong>Allow</strong>.</p>
                            <p>3. Click the <strong>"Retry Permission"</strong> button below.</p>
                        </div>
                    )}

                    <div className="flex items-center gap-3 w-full">
                        <button
                            onClick={cleanupAndReset}
                            className="flex-1 py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                const target = targetUser || selectedUser;
                                if (isCalling && target) {
                                    startOutgoingCall(target);
                                } else if (isReceivingCall) {
                                    answerCall();
                                }
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                            <IoRefreshOutline className="w-4 h-4" /> Retry Permission
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn">
            {/* Hidden audio element for remote audio in audio/video calls */}
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
