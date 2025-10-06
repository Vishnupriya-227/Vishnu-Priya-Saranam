import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock } from "lucide-react";
import SuccessPopup from "../components/SuccessPopup"; // <-- important: relative path

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bgChoice, setBgChoice] = useState("career");
  const [popup, setPopup] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));

        setPopup({ type: "success", message: "✅ Login successful!" });

        setTimeout(() => {
          setPopup(null);
          navigate("/");
        }, 1800);
      } else {
        setPopup({ type: "error", message: data.error || "⚠ Invalid credentials" });
      }
    } catch (err) {
      console.error("Login Error:", err);
      setPopup({ type: "error", message: "⚠ Error connecting to server." });
    }
  };

  const backgrounds = {
    graduation:
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1600&q=80",
    students:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
    career:
      "https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&w=1600&q=80",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: `url(${backgrounds[bgChoice]})` }}
    >
      <div className={`absolute inset-0 ${bgChoice === "graduation" ? "" : "bg-black bg-opacity-50"}`}></div>

      <AnimatePresence>
        {popup && (
          <SuccessPopup
            type={popup.type}
            message={popup.message}
            onClose={() => setPopup(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-white shadow-xl border border-gray-100"
      >
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 blur-2xl opacity-30"></div>

        <div className="relative">
          <h2 className="text-3xl font-extrabold text-center mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Welcome to Edu2
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Choose Background</label>
            <select
              value={bgChoice}
              onChange={(e) => setBgChoice(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none"
            >
              <option value="graduation">🎓 Graduation Celebration</option>
              <option value="students">📚 Students Studying</option>
              <option value="career">💼 Career Teamwork</option>
            </select>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@user.com"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-400 focus:outline-none transition shadow-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-400 focus:outline-none transition shadow-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-2 rounded-lg font-semibold shadow-md hover:scale-105 transition"
            >
              Login
            </button>
          </form>

          <div className="text-center mt-4 text-sm">
            <Link to="/reset-password" className="text-red-500 hover:underline">Forgot Password?</Link>
          </div>
          <div className="text-center mt-2 text-sm">
            <span>Don’t have an account? </span>
            <Link to="/register" className="text-green-600 hover:underline">Register</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
