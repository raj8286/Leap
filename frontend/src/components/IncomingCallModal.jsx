import { Phone, PhoneOff } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { DEFAULT_PROFILE_ICON } from "../constants/index.js";

const IncomingCallModal = ({ onAccept }) => {
  const { incomingCall, setIncomingCall, socket } = useAuthStore();

  if (!incomingCall) return null;

  const handleAccept = () => {
    onAccept();
    // incomingCall stays in store — VideoCallOverlay reads it to set remote description
  };

  const handleDecline = () => {
    if (socket) {
      socket.emit("rejectCall", { to: incomingCall.from });
    }
    setIncomingCall(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 min-w-[300px] animate-in fade-in zoom-in duration-200">
        <div className="relative">
          <img
            src={incomingCall.callerPic || DEFAULT_PROFILE_ICON}
            alt={incomingCall.callerName}
            className="size-24 rounded-full object-cover border-4 border-primary/30"
          />
          <span className="absolute bottom-1 right-1 size-4 bg-green-500 rounded-full border-2 border-base-100" />
        </div>

        <div className="text-center">
          <p className="text-base-content/60 text-sm">Incoming video call</p>
          <h2 className="text-xl font-bold mt-1">{incomingCall.callerName}</h2>
        </div>

        <div className="flex gap-6 mt-2">
          <button
            onClick={handleDecline}
            className="btn btn-circle btn-error btn-lg"
            title="Decline"
          >
            <PhoneOff className="size-6" />
          </button>
          <button
            onClick={handleAccept}
            className="btn btn-circle btn-success btn-lg"
            title="Accept"
          >
            <Phone className="size-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
