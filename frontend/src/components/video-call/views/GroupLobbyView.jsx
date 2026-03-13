import { X } from "lucide-react";

const GroupLobbyView = ({
  onCallEnd,
  createRoom,
  nameInput,
  setNameInput,
  roomCodeInput,
  setRoomCodeInput,
  joinRoom,
  waitingForApproval,
  qualityMode,
  setQualityMode,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-base-300/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6 text-base-content p-8">
      <button
        onClick={onCallEnd}
        className="absolute top-4 right-4 btn btn-ghost btn-circle text-base-content cursor-pointer"
      >
        <X className="size-6" />
      </button>

      <h2 className="text-2xl font-bold">Group Video Call</h2>

      <div className="bg-base-100 border border-base-300 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
        <div>
          <h3 className="font-semibold mb-2">Create a Room</h3>
          <button className="btn btn-primary w-full cursor-pointer" onClick={createRoom}>
            Create Room
          </button>
        </div>

        <div className="divider text-base-content/40">OR</div>

        <div className="space-y-2">
          <h3 className="font-semibold mb-2">Call Quality</h3>
          <select
            value={qualityMode}
            onChange={(e) => setQualityMode(e.target.value)}
            // className="select select-bordered w-full text-base-content bg-base-100"
            className="select select-bordered w-full border-base-300 bg-base-100 focus:border-primary focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-primary/25"
          >
            <option value="low">Low (save data/CPU)</option>
            <option value="balanced">Balanced</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold mb-2">Join a Room</h3>
          <input
            type="text"
            placeholder="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="input input-bordered w-full text-base-content placeholder:text-base-content/50 bg-base-100"
          />
          <input
            type="text"
            placeholder="Room code"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value)}
            className="input input-bordered w-full text-base-content placeholder:text-base-content/50 bg-base-100"
          />
          <button
            className="btn btn-secondary w-full cursor-pointer"
            onClick={joinRoom}
            disabled={waitingForApproval}
          >
            {waitingForApproval ? "Waiting for approval..." : "Join Room"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupLobbyView;
