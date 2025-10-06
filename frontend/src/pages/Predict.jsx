import React, { useEffect, useState } from "react";
import Select from "react-select";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Award, Star, Briefcase, User, Download, Target } from "lucide-react";
import SuccessPopup from "../components/SuccessPopup"; // make sure this path is correct

function Predict() {
  const [form, setForm] = useState({
    degree: "",
    major: "",
    cgpa: "",
    experience: "",
    skills: [],
    certifications: "",
  });

  const [result, setResult] = useState(null);
  const [options, setOptions] = useState({ degrees: [], majors: [], skills: [] });
  const [popup, setPopup] = useState({ show: false, message: "", type: "success" });

  // Load unique options
  useEffect(() => {
    fetch("http://localhost:5000/unique_values.json")
      .then((res) => res.json())
      .then(setOptions)
      .catch((err) => console.error("Error loading unique values:", err));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSelectChange = (selected, name) => {
    setForm({
      ...form,
      [name]: Array.isArray(selected) ? selected.map((s) => s.value) : selected?.value || "",
    });
  };

  const fetchProfile = () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setPopup({ show: true, message: "⚠ Please login first.", type: "error" });
      setTimeout(() => setPopup({ show: false, message: "", type: "error" }), 2000);
      return;
    }

    fetch("http://localhost:5000/profile", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data) {
          setPopup({ show: true, message: "⚠ No profile details found.", type: "error" });
          setTimeout(() => setPopup({ show: false, message: "", type: "error" }), 2000);
          return;
        }

        setForm({
          degree: data.degree || "",
          major: data.major || "",
          cgpa: data.cgpa != null ? data.cgpa : 0.0,
          experience: data.experience != null ? data.experience : 0,
          skills: data.skills ? data.skills.split(",").map((s) => s.trim()) : [],
          certifications: data.certifications || "",
        });

        setPopup({ show: true, message: " Profile loaded successfully!", type: "success" });
        setTimeout(() => setPopup({ show: false, message: "", type: "success" }), 2000);
      })
      .catch((err) => console.error("Error extracting profile:", err));
  };

  const handlePredict = (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    if (!token) {
      setPopup({ show: true, message: "⚠ Please login first.", type: "error" });
      setTimeout(() => setPopup({ show: false, message: "", type: "error" }), 2000);
      window.location.href = "/login";
      return;
    }

    const payload = {
      ...form,
      skills: form.skills.join(", "),
      certifications: form.certifications || "",
    };

    fetch("http://localhost:5000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        const top = data.top_predictions || [];
        while (top.length < 3) top.push({ role: "N/A", confidence: 0 });

        setResult(
          data.prediction
            ? {
                main: data.prediction,
                confidence: data.confidence || 0,
                top: top.slice(0, 3),
              }
            : {
                main: `⚠ ${data.error || "Prediction failed"}`,
                confidence: 0,
                top: [],
              }
        );

        setPopup({ show: true, message: " Prediction completed!", type: "success" });
        setTimeout(() => setPopup({ show: false, message: "", type: "success" }), 2500);
      })
      .catch((err) => {
        console.error("Error predicting:", err);
        setPopup({ show: true, message: "❌ Error during prediction.", type: "error" });
        setTimeout(() => setPopup({ show: false, message: "", type: "error" }), 2500);
      });
  };

  const getBarColor = (confidence) =>
    confidence >= 0.7 ? "#10B981" : confidence >= 0.4 ? "#FACC15" : "#EF4444";

  const getExplanation = (role) => {
    const { degree, major, skills, certifications, experience } = form;
    const skillList = skills.length ? skills.join(", ") : "N/A";

    if (role.toLowerCase().includes("data scientist"))
      return `Predicted because of your background in ${degree} - ${major}, analytical skills like ${skillList}, and certifications (${certifications || "N/A"}) relevant to ML/AI.`;

    if (role.toLowerCase().includes("software engineer"))
      return `Based on your degree in ${degree}, coding skills (${skillList}), and ${experience || 0} years of experience in development.`;

    if (role.toLowerCase().includes("backend"))
      return `Suggested because of your expertise in server-side skills (${skillList}) and ${experience || 0} years of backend-related work.`;

    if (role.toLowerCase().includes("frontend"))
      return `Likely match due to your UI/UX related skills (${skillList}) and knowledge in ${major || "your field"}.`;

    if (role.toLowerCase().includes("analyst"))
      return `Chosen because of your degree in ${degree}, analytical certifications (${certifications || "N/A"}), and skills in ${skillList}.`;

    return `Predicted based on your degree: ${degree || "N/A"}, major: ${major || "N/A"}, skills: ${skillList}, certifications: ${certifications || "N/A"}, and experience: ${experience || 0} years.`;
  };

  return (
    <div className="relative min-h-screen bg-gray-50 overflow-hidden p-6">
      {/* Success/Error Popup */}
      <AnimatePresence>
        {popup.show && (
          <SuccessPopup
            message={popup.message}
            type={popup.type}
            onClose={() => setPopup({ show: false, message: "", type: "success" })}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* ---- LEFT: Form ---- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="p-6 bg-white/70 backdrop-blur-lg shadow-xl rounded-xl border border-white/20"
        >
          <h2 className="text-2xl font-extrabold mb-6 text-center bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Job Role Prediction
          </h2>

          <form onSubmit={handlePredict} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/** Degree */}
            <SelectField
              label="Degree"
              icon={<BookOpen size={16} />}
              options={options.degrees}
              value={form.degree}
              onChange={(val) => handleSelectChange(val, "degree")}
            />

            {/** Major */}
            <SelectField
              label="Major"
              icon={<Award size={16} />}
              options={options.majors}
              value={form.major}
              onChange={(val) => handleSelectChange(val, "major")}
            />

            {/** CGPA */}
            <InputField
              label="CGPA"
              icon={<Star size={16} />}
              name="cgpa"
              value={form.cgpa}
              onChange={handleChange}
              type="number"
              step="0.01"
            />

            {/** Experience */}
            <InputField
              label="Experience (yrs)"
              icon={<Briefcase size={16} />}
              name="experience"
              value={form.experience}
              onChange={handleChange}
              type="number"
            />

            {/** Skills */}
            <SelectField
              label="Skills"
              icon={<User size={16} />}
              options={options.skills}
              value={form.skills}
              onChange={(val) => handleSelectChange(val, "skills")}
              isMulti
              fullWidth
            />

            {/** Certifications */}
            <div className="md:col-span-2">
              <label className="block mb-1 font-semibold flex items-center gap-1">
                <Award size={16} /> Certifications
              </label>
              <textarea
                name="certifications"
                value={form.certifications}
                onChange={handleChange}
                rows={2}
                className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
              />
            </div>

            {/** Buttons */}
            <div className="md:col-span-2 flex gap-3">
              <button
                type="button"
                onClick={fetchProfile}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 rounded-md font-semibold shadow hover:scale-105 transition"
              >
                <Download size={16} /> Pull From Profile
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-md font-semibold shadow hover:scale-105 transition"
              >
                <Target size={16} /> Predict
              </button>
            </div>
          </form>
        </motion.div>

        {/** ---- RIGHT: Prediction Panel ---- */}
        {result?.main && (
          <PredictionPanel result={result} getBarColor={getBarColor} getExplanation={getExplanation} />
        )}
      </div>
    </div>
  );
}

// Helper components
const InputField = ({ label, icon, ...props }) => (
  <div>
    <label className="block mb-1 font-semibold flex items-center gap-1">{icon} {label}</label>
    <input
      {...props}
      className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
    />
  </div>
);

const SelectField = ({ label, icon, options, value, onChange, isMulti = false, fullWidth = false }) => (
  <div className={fullWidth ? "md:col-span-2" : ""}>
    <label className="block mb-1 font-semibold flex items-center gap-1">{icon} {label}</label>
    <Select
      isMulti={isMulti}
      className="text-gray-900 text-sm"
      options={options.map((o) => ({ value: o, label: o }))}
      value={isMulti ? value.map((v) => ({ value: v, label: v })) : value ? { value, label: value } : null}
      onChange={onChange}
    />
  </div>
);

const PredictionPanel = ({ result, getBarColor, getExplanation }) => (
  <motion.div
    initial={{ x: "100%", opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ duration: 0.6 }}
    className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl rounded-xl flex flex-col"
  >
    <h3 className="text-xl font-bold mb-4">✨ Predicted Job Role ✨</h3>
    <div className="mb-6 text-center">
      <p className="text-3xl font-extrabold">{result.main}</p>
      <p className="text-lg">Confidence: {Math.round(result.confidence * 100)}%</p>
      <div className="h-2 w-full bg-white/30 rounded-full mt-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(result.confidence * 100)}%` }}
          transition={{ duration: 1.2 }}
          className="h-2 bg-green-400 rounded-full"
        />
      </div>
    </div>

    <div className="flex-1 overflow-y-auto">
      <h4 className="font-semibold mb-2">Top Predictions:</h4>
      <ul className="space-y-4">
        {result.top.map((p, i) => (
          <li key={i}>
            <div className="flex items-center justify-between">
              <span>{p.role}</span>
              <span className="font-semibold">{Math.round(p.confidence * 100)}%</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${p.confidence * 100}%` }}
                transition={{ duration: 1.2, delay: i * 0.1 }}
                className="h-2 rounded-full"
                style={{ backgroundColor: getBarColor(p.confidence) }}
              />
            </div>
            <p className="text-xs mt-1 text-white/80">{getExplanation(p.role)}</p>
          </li>
        ))}
      </ul>
    </div>
  </motion.div>
);

export default Predict;
