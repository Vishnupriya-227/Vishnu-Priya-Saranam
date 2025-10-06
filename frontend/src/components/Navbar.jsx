// src/components/Navbar.jsx
import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react"; // icons

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const links = [
    { to: "/home", label: "Home" },
    { to: "/profile", label: "Profile" },
    { to: "/predict", label: "Predict" },
    { to: "/history", label: "History" },
    { to: "/logout", label: "Logout" }, // special handling
  ];

  // ✅ Logout with backend call
  const handleLogout = async () => {
    try {
      await fetch("http://127.0.0.1:5000/logout", {
        method: "POST",
        credentials: "include", // send cookies so Flask clears them
      });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      sessionStorage.removeItem("user"); // clear session always
      window.location.href = "/login";   // redirect
    }
  };

  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Brand */}
        <h1 className="font-extrabold text-2xl tracking-wide">
          Edu2 <span className="text-yellow-300">Job Prediction</span>
        </h1>

        {/* User Info (Desktop) */}
        {user && (
          <div className="hidden md:block mr-4 text-sm font-medium">
            👤 {user.name} ({user.email})
          </div>
        )}

        {/* Desktop Links */}
        <div className="space-x-6 hidden md:flex">
          {links.map((link) =>
            link.label === "Logout" ? (
              <button
                key={link.to}
                onClick={handleLogout}
                className="transition px-3 py-2 rounded-lg font-medium hover:bg-indigo-500 hover:bg-opacity-30"
              >
                {link.label}
              </button>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `transition px-3 py-2 rounded-lg font-medium ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-md"
                      : "hover:bg-indigo-500 hover:bg-opacity-30"
                  }`
                }
              >
                {link.label}
              </NavLink>
            )
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-indigo-700 text-white px-4 py-3 space-y-3">
          {user && (
            <div className="mb-3 text-sm font-medium">
              👤 {user.name} <br />
              <span className="text-gray-200">{user.email}</span>
            </div>
          )}

          {links.map((link) =>
            link.label === "Logout" ? (
              <button
                key={link.to}
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="block w-full text-left px-3 py-2 rounded-lg font-medium hover:bg-indigo-500 hover:bg-opacity-30"
              >
                {link.label}
              </button>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg font-medium ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-md"
                      : "hover:bg-indigo-500 hover:bg-opacity-30"
                  }`
                }
              >
                {link.label}
              </NavLink>
            )
          )}
        </div>
      )}
    </nav>
  );
}
