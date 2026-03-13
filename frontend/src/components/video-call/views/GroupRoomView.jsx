import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
} from "lucide-react";

const GroupRoomView = ({
  roomId,
  isCreator,
  peers,
  peerNames,
  joinRequests,
  acceptJoin,
  rejectJoin,
  focused,
  setFocused,
  screenSharing,
  myGroupVideoRefCb,
  myScreenVideoRefCb,
  bindPeerVideoEl,
  bindPeerScreenEl,
  toggleMic,
  micActive,
  toggleCamera,
  cameraActive,
  startScreenShare,
  stopScreenShare,
  leaveRoom,
  qualityMode,
  setQualityMode,
}) => {
  const getPeerName = (peerId) => peerNames?.[peerId] || "Participant";
  const getScreenLabel = (name) => `${name}'s Screen`;

  const videos = [
    {
      id: "myVideo",
      label: "You",
      ref: myGroupVideoRefCb,
      show: true,
      muted: true,
    },
    {
      id: "myScreen",
      label: "Your Screen",
      ref: myScreenVideoRefCb,
      show: screenSharing,
      muted: true,
    },
  ];

  for (const peerId of Object.keys(peers)) {
    const peerName = getPeerName(peerId);
    videos.push({
      id: `peer-${peerId}`,
      label: peerName,
      ref: bindPeerVideoEl(peerId),
      show: true,
      muted: false,
    });
    if (peers[peerId]?.screenActive) {
      videos.push({
        id: `screen-${peerId}`,
        label: getScreenLabel(peerName),
        ref: bindPeerScreenEl(peerId),
        show: true,
        muted: true,
      });
    }
  }

  const visibleVideos = videos.filter((v) => v.show);
  const focusedVideo = visibleVideos.find((v) => v.id === focused) || visibleVideos[0];
  const thumbnails = visibleVideos.filter((v) => v.id !== focusedVideo?.id);

  return (
    <div className="fixed inset-0 z-50 bg-base-200 flex flex-col p-4 text-base-content">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-lg">Room: </span>
          <span className="text-primary font-mono select-all">{roomId}</span>
          {isCreator && <span className="ml-2 text-green-400 text-sm">(creator)</span>}
          <span className="ml-3 text-base-content/60 text-sm">
            {Object.keys(peers).length + 1} participant{Object.keys(peers).length !== 0 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-base-content/60">Quality</span>
          <select
            value={qualityMode}
            onChange={(e) => setQualityMode(e.target.value)}
            // className="select select-xs select-bordered bg-base-100"
            className="select select-xs select-bordered border-base-300 bg-base-100 focus:border-primary focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-primary/25"
          >
            <option value="low">Low</option>
            <option value="balanced">Balanced</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {isCreator && joinRequests.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {joinRequests.map((r) => (
            <div
              key={r.socketId}
              className="flex items-center gap-3 bg-info/15 rounded-lg px-4 py-2 border border-info/30"
            >
              <span>
                <b>{r.name}</b> wants to join
              </span>
              <button className="btn btn-xs btn-success" onClick={() => acceptJoin(r.socketId)}>
                Accept
              </button>
              <button className="btn btn-xs btn-error" onClick={() => rejectJoin(r.socketId)}>
                Reject
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 flex-1 min-h-0 mb-3">
        {focusedVideo && (
          <div className="flex-1 min-w-0 flex flex-col">
            <p className="text-xs font-semibold text-base-content/70 mb-1">{focusedVideo.label}</p>
            <video
              playsInline
              autoPlay
              muted={focusedVideo.muted}
              ref={focusedVideo.ref}
              className="w-full h-full object-contain rounded-xl bg-base-300"
            />
          </div>
        )}
        {thumbnails.length > 0 && (
          <div className="flex flex-col gap-2 w-52 flex-shrink-0 overflow-y-auto">
            {thumbnails.map((v) => (
              <div key={v.id} onClick={() => setFocused(v.id)} className="cursor-pointer">
                <p className="text-xs font-semibold text-base-content/60 mb-1">{v.label}</p>
                <video
                  playsInline
                  autoPlay
                  muted={v.muted}
                  ref={v.ref}
                  className="w-full aspect-video object-contain rounded-lg bg-base-300"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 flex-wrap bg-base-100 border border-base-300 rounded-full px-4 py-2 self-center">
        <button className="btn btn-circle btn-neutral" onClick={toggleMic} title="Toggle mic">
          {micActive ? <Mic className="size-5" /> : <MicOff className="size-5 text-error" />}
        </button>
        <button className="btn btn-circle btn-neutral" onClick={toggleCamera} title="Toggle camera">
          {cameraActive ? <Video className="size-5" /> : <VideoOff className="size-5 text-error" />}
        </button>
        <button
          className="btn btn-circle btn-neutral"
          onClick={screenSharing ? stopScreenShare : startScreenShare}
          title="Toggle screen share"
        >
          {screenSharing ? (
            <MonitorOff className="size-5 text-error" />
          ) : (
            <Monitor className="size-5" />
          )}
        </button>
        <button className="btn btn-circle btn-error" onClick={leaveRoom} title="Leave room">
          <PhoneOff className="size-5" />
        </button>
      </div>
    </div>
  );
};

export default GroupRoomView;
