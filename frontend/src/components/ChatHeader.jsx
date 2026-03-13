import { X, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";
import { DEFAULT_PROFILE_ICON } from "../constants/index.js";

const ChatHeader = ({ onStartCall }) => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isSelectedUserOnline = onlineUsers.some(
    (id) => String(id) === String(selectedUser._id)
  );

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser.profilePic || DEFAULT_PROFILE_ICON}
                alt={selectedUser.fullName}
              />
            </div>
          </div>

          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {isSelectedUserOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onStartCall}
            className={`btn btn-sm btn-ghost btn-circle ${
              !isSelectedUserOnline ? "opacity-60" : ""
            }`}
            title={
              isSelectedUserOnline
                ? "Start video call"
                : "User is offline"
            }
          >
            <Video className="size-5 text-primary" />
          </button>

          <button
            onClick={() => setSelectedUser(null)}
            className="btn btn-sm btn-ghost btn-circle cursor-pointer"
            title="Close chat"
          >
            <X className="cursor-pointer" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;