import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

// ─── 1-to-1: userId → socketId ───────────────────────────────────────────────
const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// ─── Group rooms: roomId → { creator, members: Set<socketId>, pendingRequests } ─
const rooms = new Map();
// socketId → roomId  (reverse lookup for disconnect)
const socketToRoom = new Map();

// ─────────────────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ── 1-to-1 video call signaling ────────────────────────────────────────────

  // Caller → server: relay incoming call notification to target
  socket.on("callUser", ({ to, signal, from, callerName, callerPic }) => {
    const targetSocketId = userSocketMap[to];
    const callerSocketId = userSocketMap[from] || socket.id;
  
    if (!targetSocketId) {
      io.to(callerSocketId).emit("callUnavailable", {
        to,
        reason: "offline",
      });
      return;
    }
  
    io.to(targetSocketId).emit("incomingCall", {
      from,
      signal,
      callerName,
      callerPic,
    });
  });

  // Callee answers → relay accepted signal back to caller
  socket.on("answerCall", ({ to, signal }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", { signal });
    }
  });

  // ICE candidate relay for 1-to-1 (to = MongoDB userId)
  socket.on("sendICECandidate", ({ to, candidate }) => {
    const targetSocketId = userSocketMap[to];
    if (targetSocketId) {
      io.to(targetSocketId).emit("incomingICECandidate", {
        from: userId,
        candidate,
      });
    }
  });

  // 1-to-1 screen share status relay (to = MongoDB userId)
  socket.on("oneToOne:screenShareStatus", ({ to, sharing }) => {
    const targetSocketId = userSocketMap[to];
    if (targetSocketId) {
      io.to(targetSocketId).emit("oneToOne:remoteScreenShareStatus", {
        from: userId,
        sharing: Boolean(sharing),
      });
    }
  });

  // Callee rejects the call
  socket.on("rejectCall", ({ to }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRejected");
    }
  });

  // Either side hangs up — save a call-log message and broadcast to both users
  socket.on("hangUp", async ({ to, duration }) => {
    const otherSocketId = userSocketMap[to];
    if (otherSocketId) {
      io.to(otherSocketId).emit("callEnded");
    }

    // Persist call-log message
    if (userId && to) {
      try {
        const callMessage = new Message({
          senderId: userId,
          receiverId: to,
          type: "call",
          duration: duration || 0,
          text: "Video call",
        });
        await callMessage.save();

        // Emit newMessage to both participants so it shows up instantly
        const mySocketId = userSocketMap[userId];
        if (mySocketId) io.to(mySocketId).emit("newMessage", callMessage);
        if (otherSocketId) io.to(otherSocketId).emit("newMessage", callMessage);
      } catch (err) {
        console.error("Failed to save call message:", err.message);
      }
    }
  });

  // ── Group video call signaling (room-based) ────────────────────────────────
  // Events are prefixed with "room:" to avoid naming conflicts with 1-to-1

  socket.on("createRoom", (payload) => {
    const roomId =
      typeof payload === "string" ? payload : payload?.roomId;
    const creatorName =
      (typeof payload === "object" ? payload?.name : "")?.trim() || "Participant";

    if (!roomId) {
      socket.emit("regenerateRoomId");
      return;
    }

    if (rooms.get(roomId)) {
      socket.emit("regenerateRoomId");
      return;
    }
    rooms.set(roomId, {
      creator: socket.id,
      members: new Set([socket.id]),
      pendingRequests: [],
      memberNames: { [socket.id]: creatorName },
    });
    socket.join(roomId);
    socketToRoom.set(socket.id, roomId);
    socket.emit("roomCreated", { roomId });
  });

  socket.on("joinRoom", ({ roomId, name }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit("joinError", { message: "Room not found" });
    if (room.members.has(socket.id))
      return socket.emit("joinError", { message: "Already in room" });

    room.pendingRequests.push({ socketId: socket.id, name });
    io.to(room.creator).emit("joinRequest", { socketId: socket.id, name });
  });

  socket.on("acceptJoin", ({ socketId }) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || room.creator !== socket.id) return;

    const joinerSocket = io.sockets.sockets.get(socketId);
    if (!joinerSocket) {
      room.pendingRequests = room.pendingRequests.filter(
        (r) => r.socketId !== socketId
      );
      return;
    }

    const acceptedRequest = room.pendingRequests.find(
      (r) => r.socketId === socketId
    );
    room.pendingRequests = room.pendingRequests.filter(
      (r) => r.socketId !== socketId
    );

    const existingMembers = [...room.members].map((memberSocketId) => ({
      socketId: memberSocketId,
      name: room.memberNames?.[memberSocketId] || "",
    }));
    joinerSocket.join(roomId);
    room.members.add(socketId);
    room.memberNames = room.memberNames || {};
    room.memberNames[socketId] = acceptedRequest?.name?.trim() || "Participant";
    socketToRoom.set(socketId, roomId);

    io.to(socketId).emit("joinAccepted", { roomId, existingMembers });
  });

  socket.on("rejectJoin", ({ socketId }) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || room.creator !== socket.id) return;

    room.pendingRequests = room.pendingRequests.filter(
      (r) => r.socketId !== socketId
    );
    io.to(socketId).emit("joinRejected");
  });

  // Group signaling — uses socket IDs (not MongoDB userIds)
  socket.on("room:sendOffer", ({ to, signal, fromName }) => {
    io.to(to).emit("room:incomingOffer", { from: socket.id, signal, fromName });
  });

  socket.on("room:sendAnswer", ({ to, signal, fromName }) => {
    io.to(to).emit("room:incomingAnswer", { from: socket.id, signal, fromName });
  });

  socket.on("room:sendICECandidate", ({ to, candidate }) => {
    io.to(to).emit("room:incomingICECandidate", {
      from: socket.id,
      candidate,
    });
  });

  // Broadcast screen-share status change to the entire room
  socket.on("room:screenShareStatus", ({ sharing }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit("room:remoteScreenShareStatus", {
      from: socket.id,
      sharing,
    });
  });

  socket.on("leaveRoom", () => handleRoomLeave(socket));

  // ── Disconnect ─────────────────────────────────────────────────────────────

  socket.on("disconnect", () => {
    if (userId) delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    handleRoomLeave(socket);
  });
});

function handleRoomLeave(socket) {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) {
    socketToRoom.delete(socket.id);
    return;
  }

  room.members.delete(socket.id);
  if (room.memberNames) delete room.memberNames[socket.id];
  socketToRoom.delete(socket.id);
  socket.to(roomId).emit("peerLeft", { socketId: socket.id });
  socket.leave(roomId);

  if (room.members.size === 0) {
    rooms.delete(roomId);
    return;
  }

  if (room.creator === socket.id) {
    const newCreator = [...room.members][0];
    room.creator = newCreator;
    io.to(newCreator).emit("youAreCreator");
    for (const req of room.pendingRequests) {
      io.to(newCreator).emit("joinRequest", {
        socketId: req.socketId,
        name: req.name,
      });
    }
  }
}

export { io, app, server };
