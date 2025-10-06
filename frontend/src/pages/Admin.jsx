import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, FileText } from "lucide-react";
import { saveAs } from "file-saver";
import SuccessPopup from "../components/SuccessPopup";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

export default function AdminPage() {
  const token = sessionStorage.getItem("token");
  const COLORS = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444", "#06b6d4"];
  const recordsPerPage = 5;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [popup, setPopup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDegree, setSelectedDegree] = useState("");

  // Fetch history
  useEffect(() => {
    if (!token) return;
    fetch("http://127.0.0.1:5000/history/all", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error(err));
  }, [token]);

  const safeValue = val => val === null || val === undefined ? "-" : val;
  const formatDate = dateStr => dateStr ? new Date(dateStr).toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "";

  // Create Admin
  const handleCreateAdmin = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/admin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setPopup({ type: "success", message: "✅ Admin created successfully!" });
        setName(""); setEmail(""); setPassword("");
      } else {
        setPopup({ type: "error", message: data.error || "⚠ Failed to create admin" });
      }
    } catch (err) {
      setPopup({ type: "error", message: "⚠ Error connecting to server." });
    }
    setLoading(false);
  };

  // Filter & search
  const uniqueUsers = Array.from(new Set(history.map(h => `${h.user_id}|${h.user_name||""}|${h.user_email||""}`)))
    .map(u => { const [id,name,email] = u.split("|"); return { id,name,email }; });

  const filteredHistory = history
    .filter(h => selectedUser === "all" || String(h.user_id) === selectedUser)
    .filter(h => {
      const term = searchTerm.toLowerCase();
      return h.user_name?.toLowerCase().includes(term) ||
             h.user_email?.toLowerCase().includes(term) ||
             (h.degree||"").toLowerCase().includes(term) ||
             (h.major||"").toLowerCase().includes(term);
    });

  const paginatedHistory = filteredHistory.slice((currentPage-1)*recordsPerPage, currentPage*recordsPerPage);

  const degreeOptions = Array.from(new Set(history.map(h => h.degree || h.major).filter(Boolean)));
  useEffect(() => { if (!selectedDegree && degreeOptions.length) setSelectedDegree(degreeOptions[0]); }, [degreeOptions, selectedDegree]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["User","Email","Date","Degree","Major","CGPA","Experience","Skills","Certifications","Predicted Role"];
    const rows = filteredHistory.map(h=>[
      h.user_name||"",h.user_email||"",formatDate(h.date),h.degree||"",h.major||"",
      h.cgpa||"",h.experience||"",
      Array.isArray(h.skills)?h.skills.join(", "):h.skills||"",
      h.certifications||"",h.result||""
    ]);
    const csvContent = [headers,...rows].map(e=>e.join(",")).join("\n");
    saveAs(new Blob([csvContent], {type:"text/csv;charset=utf-8"}), "history.csv");
  };

  // Clear history
  const clearHistory = async (userId=null) => {
    if (!window.confirm("Are you sure you want to clear history?")) return;
    const url = userId ? `http://127.0.0.1:5000/history/clear/${userId}` : "http://127.0.0.1:5000/history/clear";
    await fetch(url, { method:"DELETE", headers:{Authorization:`Bearer ${token}`} });
    setHistory(prev => userId ? prev.filter(h=>String(h.user_id)!==String(userId)) : []);
  };

  // Chart data
  const roles = Array.from(new Set(filteredHistory.map(h=>h.result||"Unknown")));
  const eduJobTrends = degreeOptions.map(deg => {
    const row = { degree: deg };
    roles.forEach(r => row[r] = filteredHistory.filter(h=>(h.degree||h.major)===deg && h.result===r).length);
    return row;
  });

  const jobDomainsForDegree = selectedDegree
    ? Object.values(filteredHistory.filter(h=>(h.degree||h.major)===selectedDegree)
        .reduce((acc,h)=>{
          const role=h.result||"Unknown"; acc[role]=acc[role]||{domain:role,value:0}; acc[role].value++; return acc;
        },{}))
    : [];

  const currentRecord = filteredHistory[0] || null;
  const peers = currentRecord ? filteredHistory.filter(h=>h.user_id !== currentRecord.user_id && (h.degree||h.major) === (currentRecord.degree||currentRecord.major)) : [];
  const countSkills = s => !s ? 0 : Array.isArray(s)? s.length : String(s).split(",").map(x=>x.trim()).filter(Boolean).length;

  const maxCgpa = Math.max(10, ...filteredHistory.map(h=>Number(h.cgpa)||0));
  const maxExp = Math.max(1, ...filteredHistory.map(h=>Number(h.experience)||0));
  const maxSkills = Math.max(1, ...filteredHistory.map(h=>countSkills(h.skills)));

  const userCgpa = currentRecord ? Number(currentRecord.cgpa)||0 : 0;
  const userExp = currentRecord ? Number(currentRecord.experience)||0 : 0;
  const userSkills = currentRecord ? countSkills(currentRecord.skills) : 0;
  const userCert = currentRecord && currentRecord.certifications ? 1 : 0;

  const peersAvgCgpa = peers.length ? peers.reduce((s,p)=>s+(Number(p.cgpa)||0),0)/peers.length : 0;
  const peersAvgExp = peers.length ? peers.reduce((s,p)=>s+(Number(p.experience)||0),0)/peers.length : 0;
  const peersAvgSkills = peers.length ? peers.reduce((s,p)=>s+countSkills(p.skills),0)/peers.length : 0;
  const peersCertPerc = peers.length ? (peers.filter(p=>p.certifications).length/peers.length)*100 : 0;

  const radarData = [
    { metric:"CGPA", You: Math.round((userCgpa/maxCgpa)*100), Peers: Math.round((peersAvgCgpa/maxCgpa)*100) },
    { metric:"Experience", You: Math.round((userExp/maxExp)*100), Peers: Math.round((peersAvgExp/maxExp)*100) },
    { metric:"Skills", You: Math.round((userSkills/maxSkills)*100), Peers: Math.round((peersAvgSkills/maxSkills)*100) },
    { metric:"Certifications", You: userCert?100:0, Peers: Math.round(peersCertPerc) },
  ];

  // Components
  const CreateAdminForm = () => (
    <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} className="mb-8 p-6 bg-white rounded-2xl shadow max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Create Admin</h2>
      <form onSubmit={handleCreateAdmin} className="space-y-4">
        <input type="text" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required className="w-full px-3 py-2 border rounded"/>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full px-3 py-2 border rounded"/>
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full px-3 py-2 border rounded"/>
        <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white py-2 rounded">{loading ? "Creating..." : "Create Admin"}</button>
      </form>
    </motion.div>
  );

  const HistoryTable = () => (
    <div className="overflow-x-auto max-w-7xl mx-auto bg-white rounded-2xl shadow p-4 mb-8">
      {filteredHistory.length === 0 ? (
        <p className="text-center text-gray-500 py-20">No records yet</p>
      ) : (
        <>
        <table className="w-full text-xs border-collapse border border-gray-200">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">User</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Degree</th>
              <th className="border p-2">Major</th>
              <th className="border p-2">CGPA</th>
              <th className="border p-2">Exp</th>
              <th className="border p-2">Skills</th>
              <th className="border p-2">Certs</th>
              <th className="border p-2">Predicted Role</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedHistory.map((h,i)=>(
              <tr key={i} className="text-center border-t">
                <td className="p-2">{safeValue(h.user_name)}</td>
                <td className="p-2">{safeValue(h.user_email)}</td>
                <td className="p-2">{formatDate(h.date)}</td>
                <td className="p-2">{safeValue(h.degree)}</td>
                <td className="p-2">{safeValue(h.major)}</td>
                <td className="p-2">{safeValue(h.cgpa)}</td>
                <td className="p-2">{safeValue(h.experience)}</td>
                <td className="p-2">{Array.isArray(h.skills)?h.skills.join(", "):safeValue(h.skills)}</td>
                <td className="p-2">{safeValue(h.certifications)}</td>
                <td className="p-2">{safeValue(h.result)}</td>
                <td className="p-2">
                  <button onClick={()=>clearHistory(h.user_id)} className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1"><Trash2 size={14}/> Clear</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredHistory.length > recordsPerPage && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Prev</button>
            <span>Page {currentPage} of {Math.ceil(filteredHistory.length/recordsPerPage)}</span>
            <button disabled={currentPage===Math.ceil(filteredHistory.length/recordsPerPage)} onClick={()=>setCurrentPage(p=>p+1)} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
          </div>
        )}
        </>
      )}
    </div>
  );

  const DashboardCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
      {/* Education → Job Trends */}
      <div className="bg-yellow-100 p-4 rounded-xl shadow">
        <h3 className="font-bold mb-2">Education → Job Trends</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={eduJobTrends}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="degree" angle={-20} textAnchor="end" interval={0} height={60}/>
            <YAxis/>
            <Tooltip/>
            <Legend verticalAlign="top"/>
            {roles.map((role,i)=><Bar key={role} dataKey={role} stackId="a" fill={COLORS[i%COLORS.length]}/>)}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="bg-indigo-100 p-4 rounded-xl shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">Job Domains (by Degree)</h3>
          <select value={selectedDegree} onChange={e=>setSelectedDegree(e.target.value)} className="border rounded px-2 py-1 text-sm">
            {degreeOptions.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie dataKey="value" data={jobDomainsForDegree} nameKey="domain" cx="50%" cy="50%" outerRadius={80} label>
              {jobDomainsForDegree.map((entry,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie>
            <Tooltip/>
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart */}
      {currentRecord && (
        <div className="bg-green-100 p-4 rounded-xl shadow">
          <h3 className="font-bold mb-2 text-sm">Peer Comparison (Your vs Others)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid/>
              <PolarAngleAxis dataKey="metric"/>
              <PolarRadiusAxis angle={30} domain={[0,100]}/>
              <Radar name="You" dataKey="You" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3}/>
              <Radar name="Peers" dataKey="Peers" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3}/>
              <Legend verticalAlign="bottom" height={36}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <AnimatePresence>{popup && <SuccessPopup type={popup.type} message={popup.message} onClose={()=>setPopup(null)} />}</AnimatePresence>

      <CreateAdminForm />

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2 max-w-7xl mx-auto">
        <input placeholder="Search by name, email, degree, major" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="px-3 py-2 border rounded flex-1"/>
        <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="px-3 py-2 border rounded">
          <option value="all">All Users</option>
          {uniqueUsers.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
        </select>
        <button onClick={()=>clearHistory()} className="bg-red-500 text-white px-4 py-2 rounded flex items-center gap-1"><Trash2 size={16}/> Clear All</button>
        <button onClick={exportCSV} className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-1"><FileText size={16}/> Export CSV</button>
      </div>

      <HistoryTable />
      <DashboardCharts />
    </div>
  );
}
