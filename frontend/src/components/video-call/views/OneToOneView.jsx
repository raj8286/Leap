import { useState } from "react";
import { DEFAULT_PROFILE_ICON } from "../../../constants/index.js";
import { Mic, MicOff, Monitor, MonitorOff, PhoneOff, Video, VideoOff } from "lucide-react";

const OneToOneView = ({
  remoteStream,
  remoteVideoRef,
  remoteScreenSharing,
  remoteScreenVideoRef,
  targetUser,
  initiating,
  stream,
  myVideoRef,
  myScreenVideoRef,
  toggleMic,
  micActive,
  toggleCamera,
  cameraActive,
  hangUp,
  screenSharing,
  startScreenShare,
  stopScreenShare,
}) => {
  const [focused, setFocused] = useState("remoteVideo");

  const videos = [
    {
      id: "remoteVideo",
      label: targetUser?.fullName || "Participant",
      ref: remoteVideoRef,
      muted: false,
      show: true,
      isPlaceholder: !remoteStream,
    },
    {
      id: "myVideo",
      label: "You",
      ref: myVideoRef,
      muted: true,
      show: Boolean(stream),
      isPlaceholder: false,
    },
    {
      id: "myScreen",
      label: "Your Screen",
      ref: myScreenVideoRef,
      muted: true,
      show: screenSharing,
      isPlaceholder: false,
    },
    {
      id: "remoteScreen",
      label: `${targetUser?.fullName || "Participant"}'s Screen`,
      ref: remoteScreenVideoRef,
      muted: true,
      show: remoteScreenSharing,
      isPlaceholder: false,
    },
  ];

  const visibleVideos = videos.filter((v) => v.show);
  const focusedVideo = visibleVideos.find((v) => v.id === focused) || visibleVideos[0];
  const thumbnails = visibleVideos.filter((v) => v.id !== focusedVideo?.id);

  const renderTile = (video, isMain) => {
    if (video.isPlaceholder) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-base-content">
          <img
            src={targetUser?.profilePic || DEFAULT_PROFILE_ICON}
            alt={targetUser?.fullName}
            className="size-28 rounded-full border-4 border-base-content/20 object-cover"
          />
          <h2 className="text-xl font-bold">{targetUser?.fullName}</h2>
          <p className="text-base-content/60 animate-pulse">
            {initiating ? "Calling..." : "Connecting..."}
          </p>
        </div>
      );
    }

    return (
      <video
        ref={video.ref}
        autoPlay
        playsInline
        muted={video.muted}
        className={
          isMain
            ? "w-full h-full object-contain rounded-xl bg-base-300"
            : "w-full aspect-video object-contain rounded-lg bg-base-300"
        }
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-base-200 flex flex-col">
      <div className="flex-1 min-h-0 p-4">
        <div className="flex gap-3 h-full min-h-0">
          {focusedVideo && (
            <div className="flex-1 min-w-0 flex flex-col">
              <p className="text-xs font-semibold text-base-content/70 mb-1">{focusedVideo.label}</p>
              <div className="w-full h-full min-h-0">{renderTile(focusedVideo, true)}</div>
            </div>
          )}

          {thumbnails.length > 0 && (
            <div className="flex flex-col gap-2 w-52 flex-shrink-0 overflow-y-auto">
              {thumbnails.map((v) => (
                <div key={v.id} onClick={() => setFocused(v.id)} className="cursor-pointer">
                  <p className="text-xs font-semibold text-base-content/60 mb-1">{v.label}</p>
                  {renderTile(v, false)}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="shrink-0 bg-base-100 border-t border-base-300 flex items-center justify-center gap-4 py-4 px-6">
        <button className="btn btn-circle btn-neutral" onClick={toggleMic} title="Toggle microphone">
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

        <button className="btn btn-circle btn-error btn-lg" onClick={hangUp} title="Hang up">
          <PhoneOff className="size-6" />
        </button>
      </div>
    </div>
  );
};

export default OneToOneView;
