import toast from "react-hot-toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWebrtcStore } from "../../../store/useWebrtcStore.js";
import { createDummyScreenStream } from "../utils/createDummyScreenStream.js";

const ONE_TO_ONE_MEDIA_CONSTRAINTS = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export function useOneToOneCall({
  enabled,
  socket,
  authUser,
  incomingCall,
  setIncomingCall,
  targetUser,
  initiating,
  onCallEnd,
}) {

  const { iceServers } = useWebrtcStore();

  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);

  const myVideoRef = useRef(null);
  const myScreenVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteScreenVideoRef = useRef(null);
  const pcRef = useRef(null);
  const screenSenderRef = useRef(null);
  const streamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteScreenStreamRef = useRef(null);
  const callHungUpRef = useRef(false);
  const callConnectedRef = useRef(false);
  const pendingCandidatesRef = useRef([]);
  const localScreenStreamRef = useRef(null);
  const dummyStreamRef = useRef(null);
  const dummyTrackRef = useRef(null);
  const [screenSharing, setScreenSharing] = useState(false);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    remoteScreenStreamRef.current = remoteScreenStream;
  }, [remoteScreenStream]);

  const cleanup = useCallback(() => {
    callConnectedRef.current = false;
    pendingCandidatesRef.current = [];
    localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localScreenStreamRef.current = null;
    if (myScreenVideoRef.current) myScreenVideoRef.current.srcObject = null;
    setRemoteScreenSharing(false);
    setScreenSharing(false);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    screenSenderRef.current = null;
    if (dummyTrackRef.current) {
      dummyTrackRef.current.stop();
      dummyTrackRef.current = null;
      dummyStreamRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setRemoteStream(null);
    setRemoteScreenStream(null);
  }, []);

  const getDummyTrack = useCallback(() => {
    if (!dummyTrackRef.current) {
      dummyStreamRef.current = createDummyScreenStream();
      dummyTrackRef.current = dummyStreamRef.current.getVideoTracks()[0];
    }
    return dummyTrackRef.current;
  }, []);

  const bindMyVideoEl = useCallback((el) => {
    myVideoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play?.().catch(() => {});
    }
  }, []);

  const bindMyScreenVideoEl = useCallback((el) => {
    myScreenVideoRef.current = el;
    if (el && localScreenStreamRef.current && el.srcObject !== localScreenStreamRef.current) {
      el.srcObject = localScreenStreamRef.current;
      el.play?.().catch(() => {});
    }
  }, []);

  const bindRemoteVideoEl = useCallback((el) => {
    remoteVideoRef.current = el;
    if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
      el.play?.().catch(() => {});
    }
  }, []);

  const bindRemoteScreenVideoEl = useCallback((el) => {
    remoteScreenVideoRef.current = el;
    if (el && remoteScreenStreamRef.current && el.srcObject !== remoteScreenStreamRef.current) {
      el.srcObject = remoteScreenStreamRef.current;
      el.play?.().catch(() => {});
    }
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    const queued = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.error("Pending ICE candidate error:", e);
      }
    }
  }, []);

  const hangUp = useCallback(() => {
    if (callHungUpRef.current) return;
    callHungUpRef.current = true;
    socket?.emit("hangUp", { to: targetUser?._id });

    cleanup();
    setIncomingCall(null);
    onCallEnd();
  }, [cleanup, onCallEnd, setIncomingCall, socket, targetUser?._id]);

  const createPeerConnection = useCallback(
    (localStream) => {
      const pc = new RTCPeerConnection(iceServers);
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      const dummyTrack = getDummyTrack();
      const screenSender = localScreenStreamRef.current
        ? pc.addTrack(
            localScreenStreamRef.current.getVideoTracks()[0] || dummyTrack,
            localScreenStreamRef.current
          )
        : pc.addTrack(dummyTrack, dummyStreamRef.current);
      screenSenderRef.current = screenSender;

      let videoCount = 0;

      pc.ontrack = (event) => {
        if (event.track.kind !== "video") return;
        videoCount++;
        const incomingStream = event.streams[0];
        if (!incomingStream) return;

        if (videoCount === 1) {
          setRemoteStream(incomingStream);
        } else {
          setRemoteScreenStream(incomingStream);
          if (
            remoteScreenVideoRef.current &&
            remoteScreenVideoRef.current.srcObject !== incomingStream
          ) {
            remoteScreenVideoRef.current.srcObject = incomingStream;
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit("sendICECandidate", {
            to: targetUser?._id,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          callConnectedRef.current = true;
        }
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          // Avoid auto-ending before the callee has a chance to answer.
          if (callConnectedRef.current) {
            hangUp();
          }
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [getDummyTrack, hangUp, socket, targetUser?._id]
  );

  const stopScreenShare = useCallback(async () => {
    const displayStream = localScreenStreamRef.current;
    if (!displayStream) return;

    const dummyTrack = getDummyTrack();
    const screenSender = screenSenderRef.current;

    if (screenSender && dummyTrack) {
      try {
        await screenSender.replaceTrack(dummyTrack);
      } catch (e) {
        console.error("replaceTrack error:", e);
      }
    }

    displayStream.getTracks().forEach((t) => t.stop());
    localScreenStreamRef.current = null;
    setScreenSharing(false);
    socket?.emit("oneToOne:screenShareStatus", { to: targetUser?._id, sharing: false });
    if (myScreenVideoRef.current) myScreenVideoRef.current.srcObject = null;
  }, [getDummyTrack, socket, targetUser?._id]);

  const startScreenShare = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) {
        displayStream.getTracks().forEach((t) => t.stop());
        return;
      }

      const screenSender = screenSenderRef.current;
      if (!screenSender) {
        displayStream.getTracks().forEach((t) => t.stop());
        return;
      }

      await screenSender.replaceTrack(screenTrack);
      localScreenStreamRef.current = displayStream;
      setScreenSharing(true);
      socket?.emit("oneToOne:screenShareStatus", { to: targetUser?._id, sharing: true });
      if (myScreenVideoRef.current) myScreenVideoRef.current.srcObject = displayStream;
      screenTrack.onended = () => {
        void stopScreenShare();
      };
    } catch (e) {
      console.error("Screen share error:", e);
    }
  }, [socket, stopScreenShare, targetUser?._id]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    callHungUpRef.current = false;

    const init = async () => {
      let localStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia(ONE_TO_ONE_MEDIA_CONSTRAINTS);
      } catch {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
          return;
        }
      }
      if (cancelled) {
        localStream.getTracks().forEach((t) => t.stop());
        return;
      }

      setStream(localStream);
      if (myVideoRef.current) myVideoRef.current.srcObject = localStream;

      const pc = createPeerConnection(localStream);

      if (initiating) {
        // Caller: create and send offer.
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit("callUser", {
          to: targetUser?._id,
          signal: offer,
          from: authUser._id,
          callerName: authUser.fullName,
          callerPic: authUser.profilePic || "",
        });
      } else {
        // Callee: use stored signal to answer.
        const call = incomingCall;
        if (!call?.signal) return;

        await pc.setRemoteDescription(new RTCSessionDescription(call.signal));
        await flushPendingCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket?.emit("answerCall", { to: call.from, signal: answer });
      }
    };

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, flushPendingCandidates]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (remoteScreenVideoRef.current && remoteScreenStreamRef.current) {
      remoteScreenVideoRef.current.srcObject = remoteScreenStreamRef.current;
    }
  }, [remoteScreenStream]);

  useEffect(() => {
    if (myVideoRef.current && streamRef.current) {
      myVideoRef.current.srcObject = streamRef.current;
    }
  }, [stream]);

  useEffect(() => {
    if (!socket || !enabled) return;

    const onCallAccepted = async ({ signal }) => {
      if (!pcRef.current) return;
      try {
        if (pcRef.current.remoteDescription) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        await flushPendingCandidates();
      } catch (e) {
        console.error("setRemoteDescription error:", e);
      }
    };

    const onCallUnavailable = ({ reason }) => {
      cleanup();
      setIncomingCall(null);
      onCallEnd();
      toast.error(reason === "offline" ? "User is offline" : "User is unavailable");
    };

    const onIncomingICE = async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.error("ICE candidate error:", e);
      }
    };

    const onRemoteScreenShareStatus = ({ sharing }) => {
      setRemoteScreenSharing(Boolean(sharing));
    };

    const onCallEnded = () => {
      if (!callHungUpRef.current) {
        cleanup();
        setIncomingCall(null);
        onCallEnd();
      }
    };

    const onCallRejected = () => {
      cleanup();
      setIncomingCall(null);
      onCallEnd();
    };

    socket.on("callUnavailable", onCallUnavailable);
    socket.on("callAccepted", onCallAccepted);
    socket.on("incomingICECandidate", onIncomingICE);
    socket.on("oneToOne:remoteScreenShareStatus", onRemoteScreenShareStatus);
    socket.on("callEnded", onCallEnded);
    socket.on("callRejected", onCallRejected);

    return () => {
      socket.off("callUnavailable", onCallUnavailable);
      socket.off("callAccepted", onCallAccepted);
      socket.off("incomingICECandidate", onIncomingICE);
      socket.off("oneToOne:remoteScreenShareStatus", onRemoteScreenShareStatus);
      socket.off("callEnded", onCallEnded);
      socket.off("callRejected", onCallRejected);
    };
  }, [cleanup, enabled, flushPendingCandidates, onCallEnd, setIncomingCall, socket]);

  return {
    stream,
    remoteStream,
    remoteScreenStream,
    screenSharing,
    remoteScreenSharing,
    bindMyVideoEl,
    bindMyScreenVideoEl,
    bindRemoteVideoEl,
    bindRemoteScreenVideoEl,
    cleanup,
    hangUp,
    startScreenShare,
    stopScreenShare,
  };
}
