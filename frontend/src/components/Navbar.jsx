import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";
import { useThemeStore } from "../store/useThemeStore.js";
import { LogOut, Moon, Sun, User } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="bg-base-100/80 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2.5 hover:opacity-80 transition-all cursor-pointer"
            >
              <div className="size-11 rounded-xl border border-base-300 bg-primary/10 flex items-center justify-center">
                <img src="/assets/chat.svg" alt="Leap logo" className="size-7 object-contain" />
              </div>
              <h1 className="text-lg font-bold">Leap</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
                className="btn btn-sm btn-circle transition-colors cursor-pointer"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            {authUser && (
              <>
                <Link to="/profile" className="btn btn-sm gap-2 cursor-pointer">
                  <User className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
                <button
                  className="btn btn-sm gap-2 flex items-center cursor-pointer"
                  onClick={logout}
                >
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
