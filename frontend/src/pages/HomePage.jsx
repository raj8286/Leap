import { useState } from "react";
import toast from "react-hot-toast"; // add this
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import Sidebar from "../components/Sidebar.jsx";
import NoChatSelected from "../components/NoChatSelected.jsx";
import ChatContainer from "../components/ChatContainer.jsx";
import VideoCallOverlay from "../components/VideoCallOverlay.jsx";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { groupCallActive, setGroupCallActive, onlineUsers, socket } = useAuthStore();

  const [callActive, setCallActive] = useState(false);
  const [callInitiating, setCallInitiating] = useState(false);
  const [targetUserForCall, setTargetUserForCall] = useState(null);

  // Called by ChatHeader's video button (caller side)
  const handleStartCall = (user) => {
    const isUserOnline = onlineUsers.some((id) => String(id) === String(user._id));
    if (!isUserOnline) {
      toast.error(`${user.fullName} is offline`);
      return;
    }
    if (!socket?.connected) {
      toast.error("Not connected to call server. Please refresh and try again.");
      return;
    }
    setTargetUserForCall(user);
    setCallInitiating(true);
    setCallActive(true);
  };

  const handleCallEnd = () => {
    setCallActive(false);
    setTargetUserForCall(null);
    setCallInitiating(false);
  };

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-6xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />
            {!selectedUser ? (
              <NoChatSelected />
            ) : (
              <ChatContainer onStartCall={() => handleStartCall(selectedUser)} />
            )}
          </div>
        </div>
      </div>

      {callActive && targetUserForCall && (
        <VideoCallOverlay
          targetUser={targetUserForCall}
          initiating={callInitiating}
          onCallEnd={handleCallEnd}
        />
      )}

      {groupCallActive && !callActive && (
        <VideoCallOverlay
          initialMode="group"
          onCallEnd={() => setGroupCallActive(false)}
        />
      )}
    </div>
  );
};

export default HomePage;
