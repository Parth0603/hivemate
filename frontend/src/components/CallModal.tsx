import { useEffect, useRef, useState } from 'react';
import { BrowserCompatibility } from '../utils/browserCompatibility';
import './CallModal.css';

interface CallModalProps {
  callId: string;
  callType: 'voice' | 'video';
  isIncoming: boolean;
  callerName?: string;
  callerId?: string;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  socket: any;
}

const CallModal = ({
  callId,
  callType,
  isIncoming,
  callerName,
  callerId,
  onAccept,
  onReject,
  onEnd,
  socket
}: CallModalProps) => {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'active' | 'ended'>(
    isIncoming ? 'ringing' : 'connecting'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [hasLocalVideoTrack, setHasLocalVideoTrack] = useState(callType === 'video');
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<any | null>(null);
  const pendingIceCandidatesRef = useRef<any[]>([]);
  const hasAcceptedIncomingRef = useRef(!isIncoming);

  const normalizeUserId = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value._id) return String(value._id);
    return String(value);
  };

  useEffect(() => {
    if (socket) {
      socket.on('webrtc:offer', handleOffer);
      socket.on('webrtc:answer', handleAnswer);
      socket.on('webrtc:ice-candidate', handleIceCandidate);
      socket.on('call:accepted', handleCallAccepted);
      socket.on('call:rejected', handleCallRejected);
      socket.on('call:ended', handleCallEnded);
    }

    if (!isIncoming && callStatus === 'connecting') {
      initializeCall();
    }

    return () => {
      cleanup();
      if (socket) {
        socket.off('webrtc:offer', handleOffer);
        socket.off('webrtc:answer', handleAnswer);
        socket.off('webrtc:ice-candidate', handleIceCandidate);
        socket.off('call:accepted', handleCallAccepted);
        socket.off('call:rejected', handleCallRejected);
        socket.off('call:ended', handleCallEnded);
      }
    };
  }, []);

  const initializeCall = async (): Promise<boolean> => {
    try {
      if (peerConnectionRef.current && localStreamRef.current) return true;

      const stream = await getUserMedia();
      localStreamRef.current = stream;
      const hasVideo = stream.getVideoTracks().length > 0;
      setHasLocalVideoTrack(hasVideo);
      setIsVideoEnabled(hasVideo);

      if (localVideoRef.current && callType === 'video' && hasVideo) {
        localVideoRef.current.srcObject = stream;
      }

      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      if (!isIncoming) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        const targetUserId = normalizeUserId(callerId);
        if (targetUserId) {
          socket.emit('webrtc:offer', { targetUserId, offer, callId });
        }
      }

      return true;
    } catch (err: any) {
      console.error('Failed to initialize call:', err);
      setError(err?.message || 'Could not start call media');
      return false;
    }
  };

  const getUserMedia = async (): Promise<MediaStream> => {
    if (!BrowserCompatibility.isGetUserMediaSupported()) {
      throw new Error('Camera and microphone are not supported in this browser.');
    }

    if (callType === 'video') {
      try {
        return await BrowserCompatibility.getUserMedia({
          audio: true,
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        setError('Camera permission denied. Continuing with voice only.');
        return await BrowserCompatibility.getUserMedia({ audio: true, video: false });
      }
    }

    return await BrowserCompatibility.getUserMedia({ audio: true, video: false });
  };

  const createPeerConnection = (): RTCPeerConnection => {
    const RTCPeerConnectionClass = BrowserCompatibility.getRTCPeerConnection();
    if (!RTCPeerConnectionClass) throw new Error('WebRTC is not supported in this browser.');

    const peerConnection = new RTCPeerConnectionClass({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const targetUserId = normalizeUserId(callerId);
        if (!targetUserId) return;
        socket.emit('webrtc:ice-candidate', {
          targetUserId,
          candidate: event.candidate,
          callId
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(() => undefined);
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === 'connected') {
        setCallStatus('active');
        return;
      }
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        handleCallEnded();
      }
    };

    return peerConnection;
  };

  const processOffer = async (data: any) => {
    try {
      if (!peerConnectionRef.current) {
        const ok = await initializeCall();
        if (!ok || !peerConnectionRef.current) return;
      }

      const peerConnection = peerConnectionRef.current;
      if (!peerConnection) return;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await flushPendingIceCandidates();

      const targetUserId = normalizeUserId(data.fromUserId);
      if (!targetUserId) return;
      socket.emit('webrtc:answer', {
        targetUserId,
        answer,
        callId
      });
    } catch (err) {
      console.error('Failed to handle offer:', err);
    }
  };

  const handleOffer = async (data: any) => {
    if (isIncoming && !hasAcceptedIncomingRef.current) {
      pendingOfferRef.current = data;
      return;
    }
    await processOffer(data);
  };

  const handleAnswer = async (data: any) => {
    try {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      await flushPendingIceCandidates();
    } catch (err) {
      console.error('Failed to handle answer:', err);
    }
  };

  const flushPendingIceCandidates = async () => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection || !peerConnection.remoteDescription) return;
    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();
      if (!candidate) continue;
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to flush ICE candidate:', err);
      }
    }
  };

  const handleIceCandidate = async (data: any) => {
    try {
      if (!peerConnectionRef.current) {
        pendingIceCandidatesRef.current.push(data.candidate);
        return;
      }
      if (!peerConnectionRef.current.remoteDescription) {
        pendingIceCandidatesRef.current.push(data.candidate);
        return;
      }
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
      console.error('Failed to handle ICE candidate:', err);
    }
  };

  const handleCallAccepted = () => {
    setCallStatus('connecting');
  };

  const handleCallRejected = () => {
    setCallStatus('ended');
    setError('Call was declined');
    setTimeout(() => onReject(), 1200);
  };

  const handleCallEnded = () => {
    setCallStatus('ended');
    cleanup();
    setTimeout(() => onEnd(), 800);
  };

  const handleAcceptCall = async () => {
    onAccept();
    const initiatorId = normalizeUserId(callerId);
    socket.emit('call:accept', { callId, initiatorId });
    hasAcceptedIncomingRef.current = true;
    setCallStatus('connecting');

    const ok = await initializeCall();
    if (!ok) return;

    if (pendingOfferRef.current) {
      await processOffer(pendingOfferRef.current);
      pendingOfferRef.current = null;
    }
  };

  const handleRejectCall = () => {
    const initiatorId = normalizeUserId(callerId);
    socket.emit('call:reject', { callId, initiatorId });
    onReject();
  };

  const handleEndCall = () => {
    onEnd();
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack || callType !== 'video') return;
    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoEnabled(videoTrack.enabled);
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  return (
    <div className="call-modal-overlay">
      <div className="call-modal" role="dialog" aria-modal="true" aria-label={`${callType} call`}>
        {callStatus === 'ringing' && isIncoming && (
          <div className="call-ringing">
            <div className="caller-info">
              <div className="caller-avatar">{callerName?.charAt(0).toUpperCase() || '?'}</div>
              <h2>{callerName || 'Unknown'}</h2>
              <p>Incoming {callType} call</p>
            </div>
            <div className="call-actions">
              <button className="accept-button" onClick={handleAcceptCall} type="button">
                Accept
              </button>
              <button className="reject-button" onClick={handleRejectCall} type="button">
                Decline
              </button>
            </div>
          </div>
        )}

        {(callStatus === 'connecting' || callStatus === 'active') && (
          <div className="call-active">
            <div className="video-container">
              <audio ref={remoteAudioRef} autoPlay playsInline />

              <div className="call-top-bar">
                <h3>{callerName || 'Unknown'}</h3>
                <p>{callStatus === 'connecting' ? 'Connecting...' : 'Secure call'}</p>
              </div>

              {callType === 'video' && (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`remote-video ${!hasLocalVideoTrack ? 'audio-fallback' : ''}`}
                  />
                  {hasLocalVideoTrack ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="local-video"
                    />
                  ) : (
                    <div className="local-video-unavailable">Your camera is off</div>
                  )}
                </>
              )}

              {callType === 'voice' && (
                <div className="voice-call-display">
                  <div className="caller-avatar-large">{callerName?.charAt(0).toUpperCase() || '?'}</div>
                  <h2>{callerName || 'Unknown'}</h2>
                  <p className="call-status-text">
                    {callStatus === 'connecting' ? 'Connecting...' : 'Connected'}
                  </p>
                </div>
              )}
            </div>

            <div className="call-controls">
              <button
                className={`control-button ${isMuted ? 'active' : ''}`}
                onClick={toggleMute}
                type="button"
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <span className="icon">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              {callType === 'video' && (
                <button
                  className={`control-button ${!isVideoEnabled ? 'active' : ''}`}
                  onClick={toggleVideo}
                  type="button"
                  aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                  title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  <span className="icon">{isVideoEnabled ? 'Camera On' : 'Camera Off'}</span>
                </button>
              )}
              <button
                className="control-button end-call"
                onClick={handleEndCall}
                type="button"
                aria-label="End call"
                title="End call"
              >
                <span className="icon">End</span>
              </button>
            </div>
          </div>
        )}

        {callStatus === 'ended' && (
          <div className="call-ended">
            <p>{error || 'Call ended'}</p>
          </div>
        )}

        {error && callStatus !== 'ended' && (
          <div className="call-error">
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;
