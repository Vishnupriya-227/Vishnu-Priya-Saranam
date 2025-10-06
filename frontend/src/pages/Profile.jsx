import React, { useEffect, useState } from "react";
import Select from "react-select";
import { motion } from "framer-motion";
import { User, Award, BookOpen, Briefcase, Star, Edit } from "lucide-react";
import SuccessPopup from "../components/SuccessPopup";

function Profile() {
  const [form, setForm] = useState({
    degree: "",
    major: "",
    cgpa: "",
    experience: "",
    skills: [],
    certifications: "",
  });

  const [options, setOptions] = useState({ degrees: [], majors: [], skills: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: "", type: "success" });

  // Fetch dropdown options (degrees, majors, skills)
  useEffect(() => {
    fetch("http://localhost:5000/unique_values.json")
      .then((res) => res.json())
      .then((data) => setOptions(data))
      .catch((err) => console.error("Error loading unique values:", err));
  }, []);

  // Fetch existing user profile
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5000/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setForm({
            degree: data.degree || "",
            major: data.major || "",
            cgpa: data.cgpa != null ? data.cgpa : "",
            experience: data.experience != null ? data.experience : "",
            skills: data.skills ? data.skills.split(",").map((s) => s.trim()) : [],
            certifications: data.certifications || "",
          });
        }
      })
      .catch((err) => console.error("Error fetching profile:", err));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (selected, name) => {
    if (Array.isArray(selected)) {
      setForm({ ...form, [name]: selected.map((s) => s.value) });
    } else {
      setForm({ ...form, [name]: selected?.value || "" });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    if (!token) {
      setPopup({ show: true, message: "⚠ Please login first.", type: "error" });
      setTimeout(() => setPopup({ show: false, message: "", type: "error" }), 1200);
      window.location.href = "/login";
      return;
    }

    fetch("http://localhost:5000/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...form, skills: form.skills.join(", ") }),
    })
      .then((res) => res.json())
      .then((data) => {
        setPopup({
          show: true,
          message: data.message || "Profile saved successfully!",
          type: "success",
        });
        setIsEditing(false);
        setTimeout(() => setPopup({ show: false, message: "", type: "success" }), 1200);
      })
      .catch(() => {
        setPopup({
          show: true,
          message: "❌ Error saving profile. Please try again.",
          type: "error",
        });
        setTimeout(() => setPopup({ show: false, message: "", type: "error" }), 1200);
      });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-pink-400 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-400 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-pulse"></div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 p-6 max-w-lg w-full bg-white/50 backdrop-blur-xl shadow-xl rounded-xl border border-white/20"
      >
        {/* Heading with Edit Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-extrabold text-indigo-600">User Profile</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 transition"
            >
              <Edit size={16} /> Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Degree */}
          <div>
            <label className="block mb-1 font-semibold flex items-center gap-1">
              <BookOpen size={16} /> Degree
            </label>
            <Select
              isDisabled={!isEditing}
              className="text-gray-900 text-sm"
              options={options.degrees.map((d) => ({ value: d, label: d }))}
              value={form.degree ? { value: form.degree, label: form.degree } : null}
              onChange={(val) => handleSelectChange(val, "degree")}
            />
          </div>

          {/* Major */}
          <div>
            <label className="block mb-1 font-semibold flex items-center gap-1">
              <Award size={16} /> Major
            </label>
            <Select
              isDisabled={!isEditing}
              className="text-gray-900 text-sm"
              options={options.majors.map((m) => ({ value: m, label: m }))}
              value={form.major ? { value: form.major, label: form.major } : null}
              onChange={(val) => handleSelectChange(val, "major")}
            />
          </div>

          {/* CGPA */}
          <div>
            <label className="block mb-1 font-semibold flex items-center gap-1">
              <Star size={16} /> CGPA
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              name="cgpa"
              value={form.cgpa}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          {/* Experience */}
          <div>
            <label className="block mb-1 font-semibold flex items-center gap-1">
              <Briefcase size={16} /> Experience (yrs)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              name="experience"
              value={form.experience}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          {/* Skills */}
          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold flex items-center gap-1">
              <User size={16} /> Skills
            </label>
            <Select
              isMulti
              isDisabled={!isEditing}
              className="text-gray-900 text-sm"
              options={options.skills.map((s) => ({ value: s, label: s }))}
              value={form.skills.map((s) => ({ value: s, label: s }))}
              onChange={(val) => handleSelectChange(val, "skills")}
            />
          </div>

          {/* Certifications */}
          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold flex items-center gap-1">
              <Award size={16} /> Certifications
            </label>
            <textarea
              name="certifications"
              value={form.certifications}
              onChange={handleChange}
              disabled={!isEditing}
              rows={2}
              className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          {/* Save Button (only when editing) */}
          {isEditing && (
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-md font-semibold shadow hover:scale-105 transition"
              >
                Save Profile
              </button>
            </div>
          )}
        </form>
      </motion.div>

      {/* Success Popup (Top Right) */}
      {popup.show && (
        <SuccessPopup
          message={popup.message}
          type={popup.type}
          onClose={() => setPopup({ show: false, message: "", type: "success" })}
        />
      )}
    </div>
  );
}

export default Profile;
