import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";

export default function SuccessPopup({ message, type = "success", onClose }) {
  const isSuccess = type === "success";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border
        ${isSuccess ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}
    >
      {isSuccess ? (
        <CheckCircle className="text-green-500" size={28} />
      ) : (
        <XCircle className="text-red-500" size={28} />
      )}

      <span className={`font-medium ${isSuccess ? "text-green-700" : "text-red-700"}`}>
        {message}
      </span>

      <button
        onClick={onClose}
        className="ml-3 text-gray-500 hover:text-black transition"
        aria-label="close notification"
      >
        ✕
      </button>
    </motion.div>
  );
}
