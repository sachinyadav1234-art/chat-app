/**
 * Media & Permissions Utility for WebRTC Audio & Video Calling
 * Handles getUserMedia, permissions inspection, HTTPS verification, and multi-tier fallbacks.
 */

export const checkMediaEnvironment = () => {
    // 1. Verify Secure Context (HTTPS or localhost)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
        return {
            supported: false,
            errorType: 'HTTPS_REQUIRED',
            message: 'Camera and microphone access requires a secure connection (HTTPS or localhost). Please open this app via HTTPS.'
        };
    }

    // 2. Verify mediaDevices API support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
            supported: false,
            errorType: 'UNSUPPORTED',
            message: 'Your browser does not support audio/video calling. Please update or switch to a modern browser (Chrome, Firefox, Safari, Edge).'
        };
    }

    return { supported: true };
};

/**
 * Robust getUserMedia with multi-tier fallbacks and device detection
 * @param {Object} options { video: boolean, audio: boolean }
 * @returns {Promise<{ stream: MediaStream|null, error: Error|null, errorType: string|null, message: string|null, isAudioOnly: boolean }>}
 */
export const getSafeUserMedia = async ({ video = true, audio = true } = {}) => {
    const envCheck = checkMediaEnvironment();
    if (!envCheck.supported) {
        return {
            stream: null,
            error: new Error(envCheck.message),
            errorType: envCheck.errorType,
            message: envCheck.message,
            isAudioOnly: false,
        };
    }

    // Default audio constraints with echo cancellation & noise suppression
    const baseAudioConstraints = audio ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    } : false;

    // ─── TIER 1: High Definition Video + Audio ─────────────────────────────
    if (video) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: baseAudioConstraints,
                video: {
                    width: { ideal: 1280, min: 320 },
                    height: { ideal: 720, min: 240 },
                    facingMode: 'user',
                }
            });
            return { stream, error: null, errorType: null, message: null, isAudioOnly: false };
        } catch (tier1Err) {
            console.warn("Tier 1 HD getUserMedia failed, trying Tier 2 standard constraints:", tier1Err.name, tier1Err.message);

            // If permission was explicitly denied, do not keep nagging with more requests
            if (tier1Err.name === 'NotAllowedError' || tier1Err.name === 'PermissionDeniedError') {
                return parseMediaError(tier1Err);
            }
        }

        // ─── TIER 2: Basic Video + Audio ──────────────────────────────────
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: baseAudioConstraints,
                video: true
            });
            return { stream, error: null, errorType: null, message: null, isAudioOnly: false };
        } catch (tier2Err) {
            console.warn("Tier 2 standard getUserMedia failed, trying Tier 3 fallback:", tier2Err.name, tier2Err.message);

            if (tier2Err.name === 'NotAllowedError' || tier2Err.name === 'PermissionDeniedError') {
                return parseMediaError(tier2Err);
            }
        }

        // ─── TIER 3: Fallback to Audio Only (if camera is missing or in use) ─
        if (audio) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: baseAudioConstraints,
                    video: false
                });
                return {
                    stream,
                    error: null,
                    errorType: 'CAMERA_UNAVAILABLE',
                    message: 'Camera could not be accessed. Continued with audio only.',
                    isAudioOnly: true
                };
            } catch (tier3Err) {
                return parseMediaError(tier3Err);
            }
        }
    } else {
        // Audio-only call requested
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: baseAudioConstraints,
                video: false
            });
            return { stream, error: null, errorType: null, message: null, isAudioOnly: true };
        } catch (audioErr) {
            return parseMediaError(audioErr);
        }
    }

    return {
        stream: null,
        error: new Error("Unable to acquire media devices."),
        errorType: 'UNKNOWN',
        message: 'Could not access audio or video hardware.',
        isAudioOnly: false
    };
};

/**
 * Parses getUserMedia errors into user-actionable descriptions and error types
 */
export const parseMediaError = (err) => {
    let errorType = 'UNKNOWN';
    let message = 'Could not access camera or microphone.';

    switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
        case 'SecurityError':
            errorType = 'PERMISSION_DENIED';
            message = 'Camera or microphone permission was blocked. Please allow camera and microphone access in your browser address bar settings.';
            break;

        case 'NotFoundError':
        case 'DevicesNotFoundError':
            errorType = 'NOT_FOUND';
            message = 'No camera or microphone found on this device. Please connect a device and try again.';
            break;

        case 'NotReadableError':
        case 'TrackStartError':
            errorType = 'DEVICE_IN_USE';
            message = 'Camera or microphone is already in use by another application (like Zoom, Teams, or another browser tab).';
            break;

        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
            errorType = 'OVERCONSTRAINED';
            message = 'Camera or microphone does not support the requested video resolution.';
            break;

        case 'TypeError':
            errorType = 'INVALID_CONSTRAINTS';
            message = 'Invalid media constraints specified.';
            break;

        default:
            errorType = 'UNKNOWN';
            message = err.message || 'An unexpected error occurred while accessing media devices.';
            break;
    }

    return {
        stream: null,
        error: err,
        errorType,
        message,
        isAudioOnly: false
    };
};
