import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Briefcase, PieChart as PieIcon } from "lucide-react";

export default function History() {
  const [history, setHistory] = useState([]);
  const [viewAll, setViewAll] = useState(false);
  const [selectedUser, setSelectedUser] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDegree, setSelectedDegree] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

  const sessionUser = (() => {
    try { return JSON.parse(sessionStorage.getItem("user") || "null"); }
    catch { return null; }
  })();

  const isAdmin = sessionUser?.role === "admin";
  const COLORS = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444", "#06b6d4"];
  const safeValue = (val) => (val === null || val === undefined ? "-" : val);

  // Fetch history
  useEffect(() => {
    if (!token) { navigate("/login"); return; }

    const url = viewAll && isAdmin
      ? "http://127.0.0.1:5000/history/all"
      : "http://127.0.0.1:5000/history";

    setLoading(true);
    setError("");

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.status === 401) { sessionStorage.clear(); navigate("/login"); return null; }
        if (!res.ok) throw new Error("Failed to fetch history");
        return res.json();
      })
      .then(data => { if (data) setHistory(data); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, viewAll, navigate, isAdmin]);

  // Unique users for admin filtering
  const uniqueUsers = isAdmin
    ? Array.from(new Set(history.map(h => `${h.user_id}|${h.user_name || ""}|${h.user_email || ""}`)))
        .map(u => { const [id, name, email] = u.split("|"); return { id, name, email }; })
    : [];

  const filteredHistory = selectedUser === "all"
    ? history
    : history.filter(h => String(h.user_id) === selectedUser);

  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const roles = Array.from(new Set(filteredHistory.map(h => h.result || "Unknown")));
  const degrees = Array.from(new Set(filteredHistory.map(h => h.degree || h.major).filter(Boolean)));

  const eduJobTrends = degrees.map(deg => {
    const row = { degree: deg };
    roles.forEach(r => {
      row[r] = filteredHistory.filter(h => (h.degree || h.major) === deg && h.result === r).length;
    });
    return row;
  });

  const degreeOptions = degrees;
  useEffect(() => { if (!selectedDegree && degreeOptions.length) setSelectedDegree(degreeOptions[0]); }, [degreeOptions, selectedDegree]);

  const jobDomainsForDegree = selectedDegree
    ? Object.values(
        filteredHistory.filter(h => (h.degree || h.major) === selectedDegree)
          .reduce((acc, h) => { const role = h.result || "Unknown"; acc[role] = acc[role] || { domain: role, value: 0 }; acc[role].value++; return acc; }, {})
      )
    : [];

  // Radar Chart calculations
  const currentRecord = filteredHistory.slice().reverse().find(h => {
    if (!sessionUser) return true;
    const uId = sessionUser.id || sessionUser._id || sessionUser.user_id;
    return uId && String(h.user_id) === String(uId);
  }) || filteredHistory[filteredHistory.length - 1] || null;

  const peersByMajor = currentRecord ? filteredHistory.filter(h => h !== currentRecord && h.major === currentRecord.major) : [];
  const peersByDegree = currentRecord ? filteredHistory.filter(h => h !== currentRecord && (h.degree || h.major) === (currentRecord.degree || currentRecord.major)) : [];
  let peers = peersByMajor.length ? peersByMajor : peersByDegree.length ? peersByDegree : filteredHistory.filter(h => currentRecord ? h.user_id !== currentRecord.user_id : true);
  if (currentRecord) peers = peers.filter(p => p !== currentRecord);

  const countSkills = s => !s ? 0 : Array.isArray(s) ? s.length : String(s).split(",").map(x => x.trim()).filter(Boolean).length;
  const maxCgpa = Math.max(10, ...filteredHistory.map(h => Number(h.cgpa) || 0));
  const maxExp = Math.max(1, ...filteredHistory.map(h => Number(h.experience) || 0));
  const maxSkills = Math.max(1, ...filteredHistory.map(h => countSkills(h.skills)));

  const userCgpa = currentRecord ? Number(currentRecord.cgpa) || 0 : 0;
  const userExp = currentRecord ? Number(currentRecord.experience) || 0 : 0;
  const userSkills = currentRecord ? countSkills(currentRecord.skills) : 0;
  const userCert = currentRecord && currentRecord.certifications ? 1 : 0;

  const peersAvgCgpa = peers.length ? peers.reduce((s,p) => s + (Number(p.cgpa) || 0),0)/peers.length : 0;
  const peersAvgExp = peers.length ? peers.reduce((s,p) => s + (Number(p.experience) || 0),0)/peers.length : 0;
  const peersAvgSkills = peers.length ? peers.reduce((s,p) => s + countSkills(p.skills),0)/peers.length : 0;
  const peersCertPerc = peers.length ? (peers.filter(p => p.certifications).length / peers.length) * 100 : 0;

  const radarData = [
    { metric:"CGPA", You: Math.round((userCgpa/maxCgpa)*100), Peers: Math.round((peersAvgCgpa/maxCgpa)*100) },
    { metric:"Experience", You: Math.round((userExp/maxExp)*100), Peers: Math.round((peersAvgExp/maxExp)*100) },
    { metric:"Skills", You: Math.round((userSkills/maxSkills)*100), Peers: Math.round((peersAvgSkills/maxSkills)*100) },
    { metric:"Certifications", You: userCert ? 100 : 0, Peers: Math.round(peersCertPerc) },
  ];

  const formatDate = dateStr => dateStr ? new Date(dateStr).toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "";

  // CSV download functions
  const downloadCSV = (rows, fileName) => {
    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const generateCSVRows = (data) => {
    const csvRows = [];
    const headers = [
      ...(isAdmin && viewAll ? ["User", "Email"] : []),
      "Date","Degree","Major","CGPA","Experience","Skills","Certifications","Predicted Role","Top 3 Suggestions"
    ];
    csvRows.push(headers.join(","));
    data.forEach(h => {
      const topSuggestions = Array.isArray(h.top_predictions) && h.top_predictions.length > 0
        ? h.top_predictions.slice(0,3).map(p => `${p.role}(${Math.round((Number(p.confidence)||1)*100)}%)`).join(" | ")
        : `${h.result || ""}(${Math.round((Number(h.confidence)||1)*100)}%)`;
      const row = [
        ...(isAdmin && viewAll ? [safeValue(h.user_name), safeValue(h.user_email)] : []),
        formatDate(h.date),
        safeValue(h.degree),
        safeValue(h.major),
        safeValue(h.cgpa),
        safeValue(h.experience),
        Array.isArray(h.skills) ? h.skills.join("; ") : safeValue(h.skills),
        safeValue(h.certifications),
        safeValue(h.result),
        topSuggestions
      ];
      csvRows.push(row.join(","));
    });
    return csvRows;
  }

  // Admin-only actions
  const clearAllHistory = () => {
    if (!window.confirm("⚠ Clear ALL history?")) return;
    fetch("http://127.0.0.1:5000/history/clear_all", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(() => setHistory([]))
      .catch(() => alert("Error clearing all history"));
  };

  const deleteRecord = (id) => {
    if (!window.confirm("Delete this record?")) return;
    fetch(`http://127.0.0.1:5000/history/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(() => setHistory(prev => prev.filter(h => h.id !== id)))
      .catch(() => alert("Error deleting record"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
          <h2 className="text-2xl font-extrabold text-indigo-700 flex items-center gap-2">📜 Prediction History</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>navigate("/")} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm shadow">← Home</button>
            {!viewAll && history.length>0 && (
              <button onClick={()=>{
                if(window.confirm("Clear your history?")) {
                  fetch("http://127.0.0.1:5000/history/clear",{method:"DELETE",headers:{Authorization:`Bearer ${token}`}})
                    .then(()=>setHistory([]));
                }
              }} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm shadow">🗑 Clear My History</button>
            )}
            {isAdmin && (
              <button onClick={()=>setViewAll(!viewAll)} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm shadow">{viewAll ? "👤 My History":"🌍 All Users"}</button>
            )}
            {isAdmin && viewAll && history.length>0 && (
              <button onClick={clearAllHistory} className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 text-sm shadow">🧹 Clear All History</button>
            )}
            {paginatedHistory.length>0 && (
              <button onClick={()=>downloadCSV(generateCSVRows(paginatedHistory),"current_page_history.csv")} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm shadow">📥 Download Current Page</button>
            )}
            {filteredHistory.length>0 && (
              <button onClick={()=>downloadCSV(generateCSVRows(filteredHistory),"all_filtered_history.csv")} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm shadow">📥 Download All Filtered</button>
            )}
          </div>
        </div>

        {/* Loading & Error */}
        {loading && <p className="text-center text-gray-500">Loading...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {/* User filter dropdown */}
        {viewAll && isAdmin && uniqueUsers.length>0 && (
          <div className="mb-4">
            <label className="mr-2 font-semibold">Filter:</label>
            <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-sm">
              <option value="all">🌍 All Users</option>
              {uniqueUsers.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
        )}

        {/* Table */}
        {filteredHistory.length>0 ? (
          <div className="overflow-x-auto mb-8">
            <table className="w-full border border-gray-200 text-xs rounded-lg overflow-hidden">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  {isAdmin && viewAll && <th className="p-2 border">User</th>}
                  {isAdmin && viewAll && <th className="p-2 border">Email</th>}
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Degree</th>
                  <th className="p-2 border">Major</th>
                  <th className="p-2 border">CGPA</th>
                  <th className="p-2 border">Exp</th>
                  <th className="p-2 border">Skills</th>
                  <th className="p-2 border">Certs</th>
                  <th className="p-2 border">Predicted Role</th>
                  <th className="p-2 border">Top 3 Suggestions</th>
                  {isAdmin && viewAll && <th className="p-2 border">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((h,i)=>{
                  const topSuggestions = Array.isArray(h.top_predictions) && h.top_predictions.length>0
                    ? h.top_predictions.slice(0,3)
                    : [{ role:h.result||"", confidence:Number(h.confidence)||1 }];
                  return (
                    <tr key={i} className="text-center border-t">
                      {isAdmin && viewAll && <td className="p-2 font-medium">{safeValue(h.user_name)}</td>}
                      {isAdmin && viewAll && <td className="p-2">{safeValue(h.user_email)}</td>}
                      <td className="p-2">{formatDate(h.date)}</td>
                      <td className="p-2">{safeValue(h.degree)}</td>
                      <td className="p-2">{safeValue(h.major)}</td>
                      <td className="p-2">{safeValue(h.cgpa)}</td>
                      <td className="p-2">{safeValue(h.experience)}</td>
                      <td className="p-2">{Array.isArray(h.skills) ? h.skills.join(", ") : safeValue(h.skills)}</td>
                      <td className="p-2">{safeValue(h.certifications)}</td>
                      <td className="p-2 font-semibold text-indigo-600">{safeValue(h.result)}</td>
                      <td className="p-2 text-left">
                        {topSuggestions.map((p,idx)=>(
                          <div key={idx} className="mb-1">
                            <div className="flex justify-between text-xs">
                              <span>{safeValue(p.role)}</span>
                              <span>{Math.round((Number(p.confidence)||1)*100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded">
                              <div className="bg-indigo-500 h-2 rounded" style={{width:`${(Number(p.confidence)||1)*100}%`}}></div>
                            </div>
                          </div>
                        ))}
                      </td>
                      {isAdmin && viewAll && (
                        <td className="p-2">
                          <button onClick={()=>deleteRecord(h.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow"> Delete</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination controls */}
            {filteredHistory.length > recordsPerPage && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >Prev</button>
                <span className="text-sm">Page {currentPage} of {Math.ceil(filteredHistory.length / recordsPerPage)}</span>
                <button
                  disabled={currentPage === Math.ceil(filteredHistory.length / recordsPerPage)}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >Next</button>
              </div>
            )}
          </div>
        ) : (!loading && <p className="text-center text-gray-500 mb-6">No history yet.</p>)}

        {/* Charts */}
        {filteredHistory.length>0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Education → Job Trends */}
            <div className="bg-gradient-to-br from-yellow-100 to-orange-100 p-4 rounded-xl shadow">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-1"><Briefcase size={16} /> Education → Job Trends</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={eduJobTrends} margin={{ top: 10, right: 10, left: 0, bottom:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="degree" angle={-20} textAnchor="end" interval={0} height={60} />
                  <YAxis />
                  <Tooltip />
                  <Legend verticalAlign="top" />
                  {roles.map((role,i)=><Bar key={role} dataKey={role} stackId="a" fill={COLORS[i % COLORS.length]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Job Domains Pie */}
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-4 rounded-xl shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm flex items-center gap-1"><PieIcon size={16} /> Job Domains (by Degree)</h3>
                <select value={selectedDegree} onChange={(e)=>setSelectedDegree(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  {degreeOptions.length === 0 && <option value="">No degrees</option>}
                  {degreeOptions.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={jobDomainsForDegree} dataKey="value" nameKey="domain" cx="50%" cy="50%" outerRadius={80} label>
                    {jobDomainsForDegree.map((entry,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart */}
            <div className="bg-gradient-to-br from-green-100 to-teal-100 p-4 rounded-xl shadow">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-1"><GraduationCap size={16} /> Skill Radar</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0,100]} />
                  <Radar name="You" dataKey="You" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
                  <Radar name="Peers" dataKey="Peers" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
                  <Legend verticalAlign="bottom" />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
