import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Brain, History } from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "Profile",
      desc: "View and edit your personal details",
      link: "/profile",
      icon: <User size={40} />,
    },
    {
      title: "Predict",
      desc: "Get AI-powered career predictions",
      link: "/predict",
      icon: <Brain size={40} />,
    },
    {
      title: "History",
      desc: "View your past predictions & insights",
      link: "/history",
      icon: <History size={40} />,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1600&q=80')`,
        }}
      ></div>
      <div className="absolute inset-0 -z-10 bg-black/60"></div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16 pt-12"
      >
        <h1 className="text-5xl font-extrabold mb-4">Welcome to Edu2</h1>
        <p className="text-lg font-medium">
          Predict your future 🚀 | Unlock opportunities 🎯 | Achieve success 🌟
        </p>
      </motion.div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-6">
        {features.map((f, i) => (
          <Link key={i} to={f.link}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              whileHover={{ scale: 1.05 }}
              className="p-6 rounded-2xl shadow-xl bg-white/20 backdrop-blur-lg border border-white/30 hover:shadow-2xl transition transform duration-300"
            >
              <div className="mb-4">{f.icon}</div>
              <h2 className="text-2xl font-bold mb-2">{f.title}</h2>
              <p className="opacity-90">{f.desc}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
