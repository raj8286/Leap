import toast from "react-hot-toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWebrtcStore } from "../../../store/useWebrtcStore.js";
import { createDummyScreenStream } from "../utils/createDummyScreenStream.js";

const GROUP_AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const GROUP_QUALITY_PRESETS = {
  low: {
    camera: {
      video: {
        width: { ideal: 640, max: 960 },
        height: { ideal: 360, max: 540 },
        frameRate: { ideal: 12, max: 15 },
      },
      audio: GROUP_AUDIO_CONSTRAINTS,
    },
    screen: {
      video: {
        width: { ideal: 960, max: 1280 },
        height: { ideal: 540, max: 720 },
        frameRate: { ideal: 15, max: 20 },
      },
      audio: false,
    },
  },
  balanced: {
    camera: {
      video: {
        width: { ideal: 850, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 15, max: 20 },
      },
      audio: GROUP_AUDIO_CONSTRAINTS,
    },
    screen: {
      video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 20, max: 30 },
      },
      audio: false,
    },
  },
  high: {
    camera: {
      video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 20, max: 30 },
      },
      audio: GROUP_AUDIO_CONSTRAINTS,
    },
    screen: {
      video: {
        width: { ideal: 1920, max: 2560 },
        height: { ideal: 1080, max: 1440 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    },
  },
};

export function useGroupCall({ enabled, socket, authUser, onCallEnd }) {
  const [groupPhase, setGroupPhase] = useState("lobby");
  const [roomId, setRoomId] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [nameInput, setNameInput] = useState(authUser?.fullName || "");
  const [isCreator, setIsCreator] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [peers, setPeers] = useState({});
  const [peerNames, setPeerNames] = useState({});
  const [focused, setFocused] = useState("myVideo");
  const [screenSharing, setScreenSharing] = useState(false);
  const [qualityMode, setQualityMode] = useState("balanced");

  const myGroupVideoRef = useRef(null);
  const myScreenVideoRef = useRef(null);
  const peersRef = useRef(new Map());
  const peerVideoEls = useRef(new Map());
  const peerScreenEls = useRef(new Map());
  const orphanCandidatesRef = useRef(new Map());
  const localScreenStream = useRef(null);
  const screenSharingRef = useRef(false);
  const dummyStreamRef = useRef(null);
  const dummyTrackRef = useRef(null);
  const groupStreamRef = useRef(null);

  const { iceServers } = useWebrtcStore();

  useEffect(() => {
    screenSharingRef.current = screenSharing;
  }, [screenSharing]);

  const getDummyTrack = useCallback(() => {
    if (!dummyTrackRef.current) {
      dummyStreamRef.current = createDummyScreenStream();
      dummyTrackRef.current = dummyStreamRef.current.getVideoTracks()[0];
    }
    return dummyTrackRef.current;
  }, []);

  const getActiveQualityPreset = useCallback(() => {
    return GROUP_QUALITY_PRESETS[qualityMode] || GROUP_QUALITY_PRESETS.balanced;
  }, [qualityMode]);

  const createGroupPeerConnection = useCallback(
    (peerId) => {
      const s = groupStreamRef.current;
      if (!s) return null;

      const pc = new RTCPeerConnection(iceServers);
      s.getTracks().forEach((t) => pc.addTrack(t, s));

      const dummyTrack = getDummyTrack();
      const screenSender = localScreenStream.current
        ? pc.addTrack(
            localScreenStream.current.getVideoTracks()[0] || dummyTrack,
            localScreenStream.current
          )
        : pc.addTrack(dummyTrack, dummyStreamRef.current);

      let videoCount = 0;
      pc.ontrack = (event) => {
        if (event.track.kind !== "video") return;
        videoCount++;
        const incomingStream = event.streams[0];
        if (!incomingStream) return;
        const peerData = peersRef.current.get(peerId);
        if (!peerData) return;
        if (videoCount === 1) {
          peerData.remoteStream = incomingStream;
          const el = peerVideoEls.current.get(peerId);
          if (el && el.srcObject !== incomingStream) el.srcObject = incomingStream;
        } else {
          peerData.remoteScreenStream = incomingStream;
          const el = peerScreenEls.current.get(peerId);
          if (el && el.srcObject !== incomingStream) el.srcObject = incomingStream;
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit("room:sendICECandidate", { to: peerId, candidate: event.candidate });
        }
      };

      const peerData = {
        pc,
        screenSender,
        pendingCandidates: [],
        remoteStream: null,
        remoteScreenStream: null,
      };
      peersRef.current.set(peerId, peerData);

      const orphans = orphanCandidatesRef.current.get(peerId);
      if (orphans?.length) {
        peerData.pendingCandidates.push(...orphans);
        orphanCandidatesRef.current.delete(peerId);
      }

      setPeers((prev) => ({ ...prev, [peerId]: { screenActive: false } }));
      return pc;
    },
    [getDummyTrack, socket]
  );

  const flushGroupPendingCandidates = useCallback(async (peerId) => {
    const peerData = peersRef.current.get(peerId);
    if (!peerData || !peerData.pc.remoteDescription) return;
    const queued = [...peerData.pendingCandidates];
    peerData.pendingCandidates = [];
    for (const c of queued) {
      try {
        await peerData.pc.addIceCandidate(c);
      } catch (e) {
        console.error("ICE error:", e);
      }
    }
  }, []);

  const closeGroupPeer = useCallback((peerId) => {
    const peerData = peersRef.current.get(peerId);
    if (!peerData) return;
    peerData.pc.close();
    peersRef.current.delete(peerId);
    orphanCandidatesRef.current.delete(peerId);
    setPeers((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
    setPeerNames((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const closeAllGroupPeers = useCallback(() => {
    for (const peerId of [...peersRef.current.keys()]) closeGroupPeer(peerId);
  }, [closeGroupPeer]);

  useEffect(() => {
    if (!socket || !enabled) return;
    const localDisplayName = (nameInput.trim() || authUser?.fullName || "Participant").trim();

    const onRoomCreated = ({ roomId: rid }) => {
      setRoomId(rid);
      setIsCreator(true);
      setGroupPhase("inRoom");
    };

    const onRegenerateRoomId = () => toast.error("Room ID conflict. Please try again.");

    const onJoinRequest = ({ socketId, name }) =>
      setJoinRequests((prev) => [...prev, { socketId, name }]);

    const onJoinAccepted = async ({ roomId: rid, existingMembers }) => {
      setRoomId(rid);
      setWaitingForApproval(false);
      setGroupPhase("inRoom");
      for (const member of existingMembers) {
        const memberId = typeof member === "string" ? member : member?.socketId;
        const memberName = typeof member === "string" ? "" : member?.name || "";
        if (!memberId) continue;
        if (memberName) {
          setPeerNames((prev) => ({ ...prev, [memberId]: memberName }));
        }
        const pc = createGroupPeerConnection(memberId);
        if (!pc) continue;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("room:sendOffer", {
            to: memberId,
            signal: offer,
            fromName: localDisplayName,
          });
        } catch (e) {
          console.error("Offer error:", e);
        }
      }
    };

    const onJoinRejected = () => {
      setWaitingForApproval(false);
      toast.error("Your request to join was rejected.");
    };

    const onJoinError = ({ message }) => {
      setWaitingForApproval(false);
      toast.error(message || "Unable to join room.");
    };

    const onYouAreCreator = () => setIsCreator(true);

    const onPeerLeft = ({ socketId }) => closeGroupPeer(socketId);

    const onIncomingOffer = async ({ from, signal, fromName }) => {
      if (fromName) {
        setPeerNames((prev) => ({ ...prev, [from]: fromName }));
      }
      const pc = createGroupPeerConnection(from);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        await flushGroupPendingCandidates(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("room:sendAnswer", {
          to: from,
          signal: answer,
          fromName: localDisplayName,
        });
      } catch (e) {
        console.error("Answer error:", e);
      }
    };

    const onIncomingAnswer = async ({ from, signal, fromName }) => {
      if (fromName) {
        setPeerNames((prev) => ({ ...prev, [from]: fromName }));
      }
      const peerData = peersRef.current.get(from);
      if (!peerData) return;
      try {
        await peerData.pc.setRemoteDescription(new RTCSessionDescription(signal));
        await flushGroupPendingCandidates(from);
      } catch (e) {
        console.error("setRemoteDesc error:", e);
      }
    };

    const onIncomingICE = async ({ from, candidate }) => {
      const peerData = peersRef.current.get(from);
      if (!peerData) {
        const queued = orphanCandidatesRef.current.get(from) ?? [];
        queued.push(candidate);
        orphanCandidatesRef.current.set(from, queued);
        return;
      }
      const { pc } = peerData;
      if (!pc.remoteDescription) {
        peerData.pendingCandidates.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.error("ICE error:", e);
      }
    };

    const onRemoteScreenShareStatus = ({ from, sharing }) => {
      setPeers((prev) => {
        if (!prev[from]) return prev;
        return { ...prev, [from]: { screenActive: Boolean(sharing) } };
      });
    };

    socket.on("roomCreated", onRoomCreated);
    socket.on("regenerateRoomId", onRegenerateRoomId);
    socket.on("joinRequest", onJoinRequest);
    socket.on("joinAccepted", onJoinAccepted);
    socket.on("joinRejected", onJoinRejected);
    socket.on("joinError", onJoinError);
    socket.on("youAreCreator", onYouAreCreator);
    socket.on("peerLeft", onPeerLeft);
    socket.on("room:incomingOffer", onIncomingOffer);
    socket.on("room:incomingAnswer", onIncomingAnswer);
    socket.on("room:incomingICECandidate", onIncomingICE);
    socket.on("room:remoteScreenShareStatus", onRemoteScreenShareStatus);

    return () => {
      socket.off("roomCreated", onRoomCreated);
      socket.off("regenerateRoomId", onRegenerateRoomId);
      socket.off("joinRequest", onJoinRequest);
      socket.off("joinAccepted", onJoinAccepted);
      socket.off("joinRejected", onJoinRejected);
      socket.off("joinError", onJoinError);
      socket.off("youAreCreator", onYouAreCreator);
      socket.off("peerLeft", onPeerLeft);
      socket.off("room:incomingOffer", onIncomingOffer);
      socket.off("room:incomingAnswer", onIncomingAnswer);
      socket.off("room:incomingICECandidate", onIncomingICE);
      socket.off("room:remoteScreenShareStatus", onRemoteScreenShareStatus);
    };
  }, [
    authUser?.fullName,
    closeGroupPeer,
    createGroupPeerConnection,
    enabled,
    flushGroupPendingCandidates,
    nameInput,
    socket,
  ]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const init = async () => {
      const preset = getActiveQualityPreset();
      try {
        const s = await navigator.mediaDevices.getUserMedia(preset.camera);
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        groupStreamRef.current = s;
        if (myGroupVideoRef.current) myGroupVideoRef.current.srcObject = s;
      } catch (e) {
        console.error("getUserMedia error:", e);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [enabled, getActiveQualityPreset]);

  useEffect(() => {
    if (!enabled) return;
    const preset = getActiveQualityPreset();

    const cameraTrack = groupStreamRef.current?.getVideoTracks?.()[0];
    if (cameraTrack) {
      cameraTrack.applyConstraints(preset.camera.video).catch((e) => {
        console.error("camera applyConstraints error:", e);
      });
    }

    const screenTrack = localScreenStream.current?.getVideoTracks?.()[0];
    if (screenTrack) {
      screenTrack.applyConstraints(preset.screen.video).catch((e) => {
        console.error("screen applyConstraints error:", e);
      });
    }
  }, [enabled, getActiveQualityPreset]);

  const createRoom = useCallback(() => {
    const id = crypto.randomUUID().slice(0, 8);
    const creatorName = (nameInput.trim() || authUser?.fullName || "You").trim();
    socket?.emit("createRoom", { roomId: id, name: creatorName });
  }, [authUser?.fullName, nameInput, socket]);

  const joinRoom = useCallback(() => {
    const code = roomCodeInput.trim();
    if (!code) return toast.error("Enter a valid room code.");
    if (!nameInput.trim()) return toast.error("Enter your name.");
    setWaitingForApproval(true);
    socket?.emit("joinRoom", { roomId: code, name: nameInput.trim() });
  }, [nameInput, roomCodeInput, socket]);

  const acceptJoin = useCallback(
    (socketId) => {
      setJoinRequests((prev) => {
        const accepted = prev.find((r) => r.socketId === socketId);
        if (accepted?.name) {
          setPeerNames((names) => ({ ...names, [socketId]: accepted.name }));
        }
        return prev.filter((r) => r.socketId !== socketId);
      });
      socket?.emit("acceptJoin", { socketId });
    },
    [socket]
  );
 
  const rejectJoin = useCallback(
    (socketId) => {
      setJoinRequests((prev) => prev.filter((r) => r.socketId !== socketId));
      socket?.emit("rejectJoin", { socketId });
    },
    [socket]
  );

  const stopScreenShare = useCallback(async () => {
    const dummyTrack = getDummyTrack();
    for (const [, peerData] of peersRef.current) {
      if (peerData.screenSender && peerData.pc.connectionState !== "closed" && dummyTrack) {
        try {
          await peerData.screenSender.replaceTrack(dummyTrack);
        } catch (e) {
          console.error("replaceTrack error:", e);
        }
      }
    }
    localScreenStream.current?.getTracks().forEach((t) => t.stop());
    localScreenStream.current = null;
    if (myScreenVideoRef.current) myScreenVideoRef.current.srcObject = null;
    setScreenSharing(false);
    socket?.emit("room:screenShareStatus", { sharing: false });
  }, [getDummyTrack, socket]);

  const startScreenShare = useCallback(async () => {
    try {
      const preset = getActiveQualityPreset();
      const displayStream = await navigator.mediaDevices.getDisplayMedia(preset.screen);
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      for (const [, peerData] of peersRef.current) {
        if (peerData.screenSender && peerData.pc.connectionState !== "closed") {
          try {
            await peerData.screenSender.replaceTrack(screenTrack);
          } catch (e) {
            console.error("replaceTrack error:", e);
          }
        }
      }

      localScreenStream.current = displayStream;
      setScreenSharing(true);
      socket?.emit("room:screenShareStatus", { sharing: true });
      screenTrack.onended = () => stopScreenShare();
    } catch (e) {
      console.error("Screen share error:", e);
    }
  }, [getActiveQualityPreset, socket, stopScreenShare]);

  const leaveRoom = useCallback(async () => {
    if (screenSharingRef.current) await stopScreenShare();
    socket?.emit("leaveRoom");
    closeAllGroupPeers();
    orphanCandidatesRef.current.clear();
    if (dummyTrackRef.current) {
      dummyTrackRef.current.stop();
      dummyTrackRef.current = null;
      dummyStreamRef.current = null;
    }
    groupStreamRef.current?.getTracks().forEach((t) => t.stop());
    groupStreamRef.current = null;
    setGroupPhase("lobby");
    setRoomId("");
    setIsCreator(false);
    setJoinRequests([]);
    setPeers({});
    setPeerNames({});
    setFocused("myVideo");
    setWaitingForApproval(false);
    onCallEnd();
  }, [closeAllGroupPeers, onCallEnd, socket, stopScreenShare]);

  const bindPeerVideoEl = useCallback((peerId) => {
    return (el) => {
      if (!el) {
        peerVideoEls.current.delete(peerId);
        return;
      }
      peerVideoEls.current.set(peerId, el);
      const pd = peersRef.current.get(peerId);
      if (pd?.remoteStream && el.srcObject !== pd.remoteStream) el.srcObject = pd.remoteStream;
    };
  }, []);

  const bindPeerScreenEl = useCallback((peerId) => {
    return (el) => {
      if (!el) {
        peerScreenEls.current.delete(peerId);
        return;
      }
      peerScreenEls.current.set(peerId, el);
      const pd = peersRef.current.get(peerId);
      if (pd?.remoteScreenStream && el.srcObject !== pd.remoteScreenStream) {
        el.srcObject = pd.remoteScreenStream;
      }
    };
  }, []);

  const myGroupVideoRefCb = useCallback((el) => {
    myGroupVideoRef.current = el;
    if (el && groupStreamRef.current) el.srcObject = groupStreamRef.current;
  }, []);

  const myScreenVideoRefCb = useCallback((el) => {
    myScreenVideoRef.current = el;
    if (el && localScreenStream.current) el.srcObject = localScreenStream.current;
  }, []);

  const shortId = useCallback((id) => id?.slice(0, 6) ?? "?", []);

  return {
    groupPhase,
    roomId,
    roomCodeInput,
    setRoomCodeInput,
    nameInput,
    setNameInput,
    isCreator,
    waitingForApproval,
    joinRequests,
    peers,
    peerNames,
    focused,
    setFocused,
    screenSharing,
    qualityMode,
    setQualityMode,
    groupStreamRef,
    createRoom,
    joinRoom,
    acceptJoin,
    rejectJoin,
    leaveRoom,
    startScreenShare,
    stopScreenShare,
    bindPeerVideoEl,
    bindPeerScreenEl,
    myGroupVideoRefCb,
    myScreenVideoRefCb,
    shortId,
  };
}
