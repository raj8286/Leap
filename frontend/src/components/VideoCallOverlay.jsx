import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useGroupCall } from "./video-call/hooks/useGroupCall.js";
import { useOneToOneCall } from "./video-call/hooks/useOneToOneCall.js";
import GroupLobbyView from "./video-call/views/GroupLobbyView.jsx";
import GroupRoomView from "./video-call/views/GroupRoomView.jsx";
import OneToOneView from "./video-call/views/OneToOneView.jsx";

const VideoCallOverlay = ({
  targetUser = null,
  initiating = false,
  onCallEnd,
  initialMode = "oneToOne",
}) => {
  const { socket, authUser, incomingCall, setIncomingCall } = useAuthStore();

  const mode = initialMode;
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);

  const oneToOne = useOneToOneCall({
    enabled: mode === "oneToOne",
    socket,
    authUser,
    incomingCall,
    setIncomingCall,
    targetUser,
    initiating,
    onCallEnd,
  });

  const group = useGroupCall({
    enabled: mode === "group",
    socket,
    authUser,
    onCallEnd,
  });

  const toggleMic = () => {
    const activeStream = mode === "oneToOne" ? oneToOne.stream : group.groupStreamRef.current;
    const t = activeStream?.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setMicActive(t.enabled);
  };

  const toggleCamera = () => {
    const activeStream = mode === "oneToOne" ? oneToOne.stream : group.groupStreamRef.current;
    const t = activeStream?.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setCameraActive(t.enabled);
  };

  if (mode === "group" && group.groupPhase === "lobby") {
    return (
      <GroupLobbyView
        onCallEnd={onCallEnd}
        createRoom={group.createRoom}
        nameInput={group.nameInput}
        setNameInput={group.setNameInput}
        roomCodeInput={group.roomCodeInput}
        setRoomCodeInput={group.setRoomCodeInput}
        joinRoom={group.joinRoom}
        waitingForApproval={group.waitingForApproval}
        qualityMode={group.qualityMode}
        setQualityMode={group.setQualityMode}
      />
    );
  }

  if (mode === "group" && group.groupPhase === "inRoom") {
    return (
      <GroupRoomView
        roomId={group.roomId}
        isCreator={group.isCreator}
        peers={group.peers}
        peerNames={group.peerNames}
        joinRequests={group.joinRequests}
        acceptJoin={group.acceptJoin}
        rejectJoin={group.rejectJoin}
        focused={group.focused}
        setFocused={group.setFocused}
        screenSharing={group.screenSharing}
        myGroupVideoRefCb={group.myGroupVideoRefCb}
        myScreenVideoRefCb={group.myScreenVideoRefCb}
        bindPeerVideoEl={group.bindPeerVideoEl}
        bindPeerScreenEl={group.bindPeerScreenEl}
        toggleMic={toggleMic}
        micActive={micActive}
        toggleCamera={toggleCamera}
        cameraActive={cameraActive}
        startScreenShare={group.startScreenShare}
        stopScreenShare={group.stopScreenShare}
        leaveRoom={group.leaveRoom}
        qualityMode={group.qualityMode}
        setQualityMode={group.setQualityMode}
      />
    );
  }

  return (
    <OneToOneView
      remoteStream={oneToOne.remoteStream}
      remoteVideoRef={oneToOne.bindRemoteVideoEl}
      remoteScreenSharing={oneToOne.remoteScreenSharing}
      remoteScreenVideoRef={oneToOne.bindRemoteScreenVideoEl}
      targetUser={targetUser}
      initiating={initiating}
      stream={oneToOne.stream}
      myVideoRef={oneToOne.bindMyVideoEl}
      myScreenVideoRef={oneToOne.bindMyScreenVideoEl}
      screenSharing={oneToOne.screenSharing}
      startScreenShare={oneToOne.startScreenShare}
      stopScreenShare={oneToOne.stopScreenShare}
      toggleMic={toggleMic}
      micActive={micActive}
      toggleCamera={toggleCamera}
      cameraActive={cameraActive}
      hangUp={oneToOne.hangUp}
    />
  );
};

export default VideoCallOverlay;
 