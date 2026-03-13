import { useChatStore } from "../store/useChatStore.js";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader.jsx";
import MessageInput from "./MessageInput.jsx";
import MessageSkeleton from "./skeletons/MessageSkeleton.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { formatMessageTime, formatCallDuration } from "../lib/utils.js";
import { DEFAULT_PROFILE_ICON } from "../constants/index.js";
import { Phone } from "lucide-react";

const ChatContainer = ({ onStartCall }) => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader onStartCall={onStartCall} />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader onStartCall={onStartCall} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isMine = message.senderId === authUser._id;

          if (message.type === "call") {
            return (
              <div
                key={message._id}
                className={`chat ${isMine ? "chat-end" : "chat-start"}`}
                ref={messageEndRef}
              >
                <div className="chat-bubble flex items-center gap-2 bg-base-300 text-base-content">
                  <Phone className="size-4 text-primary" />
                  <span className="text-sm font-medium">Video call</span>
                  {message.duration > 0 && (
                    <span className="text-xs text-base-content/60">
                      · {formatCallDuration(message.duration)}
                    </span>
                  )}
                </div>
                <div className="chat-footer opacity-50 text-xs mt-1">
                  {formatMessageTime(message.createdAt)}
                </div>
              </div>
            );
          }

          return (
            <div
              key={message._id}
              className={`chat ${isMine ? "chat-end" : "chat-start"}`}
              ref={messageEndRef}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isMine
                        ? authUser.profilePic || DEFAULT_PROFILE_ICON
                        : selectedUser.profilePic || DEFAULT_PROFILE_ICON
                    }
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div className="chat-bubble flex flex-col">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
                {message.text && <p>{message.text}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
