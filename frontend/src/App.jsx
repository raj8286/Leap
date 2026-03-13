import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore.js";
import { useThemeStore } from "./store/useThemeStore.js";
import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar.jsx";
import IncomingCallModal from "./components/IncomingCallModal.jsx";
import VideoCallOverlay from "./components/VideoCallOverlay.jsx";
import HomePage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, incomingCall, setIncomingCall } = useAuthStore();
  const { theme } = useThemeStore();
  const [incomingCallActive, setIncomingCallActive] = useState(false);
  const [incomingCallTarget, setIncomingCallTarget] = useState(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  const handleAcceptIncomingCall = () => {
    if (!incomingCall) return;
    setIncomingCallTarget({
      _id: incomingCall.from,
      fullName: incomingCall.callerName,
      profilePic: incomingCall.callerPic,
    });
    setIncomingCallActive(true);
  };

  const handleIncomingCallEnd = () => {
    setIncomingCallActive(false);
    setIncomingCallTarget(null);
    setIncomingCall(null);
  };

  return (
    <div data-theme={theme}>
      <Navbar />
      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
      </Routes>

      {authUser && !incomingCallActive && (
        <IncomingCallModal onAccept={handleAcceptIncomingCall} />
      )}

      {incomingCallActive && incomingCallTarget && (
        <VideoCallOverlay
          targetUser={incomingCallTarget}
          initiating={false}
          onCallEnd={handleIncomingCallEnd}
        />
      )}

      <Toaster />
    </div>
  );
};

export default App;
