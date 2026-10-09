import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import "./extras.css";

const API = "http://localhost:5000/api";
const LOCAL_KEY = "dapitan-live";
const OFFLINE_LOGIN = { username: "admin", password: "admin123" }; // used only while the backend live.cjs is not connected
const THRESHOLDS = { moderate: 40, high: 60 }; // percent of capacity

const fallbackSites = [
  {id:"rizal-shrine",name:"Rizal Shrine",shortName:"Rizal Shrine",position:[8.66722,123.41667],address:"Talisay, Dapitan City",status:"High",currentVisitors:32,capacity:50,description:"Historic estate where Jose Rizal lived during his exile.",history:"Rizal purchased land in Talisay after his lottery winnings and moved there in March 1893. He spent much of his 1892–1896 exile there, working as a physician, farmer, teacher, merchant, inventor and artist.",highlights:["Casa Residencia","Rizal's aqueduct","Mi Retiro Rock"],recommendation:"Try the Relief Map or Landing Site if you want a less crowded stop."},
  {id:"relief-map",name:"Relief Map of Mindanao",shortName:"Relief Map",position:[8.65487,123.42471],address:"Dapitan City Plaza",status:"Moderate",currentVisitors:18,capacity:40,description:"Historic three-dimensional map associated with Rizal's civic work in Dapitan.",history:"Constructed during Rizal's exile in 1892 with Francisco de Paula Sanchez, S.J., and assistance from church personnel and parish-school students. It formed part of Rizal's work to beautify the town plaza.",highlights:["Dapitan City Plaza","St. James Church","Rizal's civic work"],recommendation:"Continue to the Landing Site nearby to follow Rizal's arrival story."},
  {id:"landing-site",name:"Punto del Desembarco de Rizal",shortName:"Rizal Landing Site",position:[8.65638,123.41907],address:"Sunset Boulevard, Sta. Cruz",status:"Low",currentVisitors:7,capacity:30,description:"Historic beach where Rizal landed in Dapitan on July 17, 1892.",history:"The NHCP marker records that Rizal landed here at about 7:00 PM on July 17, 1892, accompanied by Captain Delgras and three artillerymen, beginning his life in exile in Dapitan.",highlights:["Sta. Cruz beach","July 17, 1892","Sunset Boulevard"],recommendation:"Currently the least crowded featured site."}
];

const NAV_LABEL = { "Map": "Map", "Heritage Sites": "Sites", "Recommendations": "Suggested", "My Itinerary": "Itinerary" };
const levelOf = pct => pct >= THRESHOLDS.high ? "High" : pct >= THRESHOLDS.moderate ? "Moderate" : "Low";
const percentOf = (visitors, capacity) => capacity > 0 ? Math.min(100, Math.round((visitors / capacity) * 100)) : 0;
const formatTime = iso => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const empty = { overrides: {}, messages: [] };
const readLocal = () => { try { return { ...empty, ...JSON.parse(localStorage.getItem(LOCAL_KEY)) }; } catch { return empty; } };
const writeLocal = data => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch {} };

async function request(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}/live${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("offline");
  return res.json();
}

// Admin overrides and visitor notices. Uses the backend when live.cjs is mounted,
// otherwise keeps everything in this browser's localStorage.
function useLive() {
  const [live, setLive] = useState(readLocal);
  const [serverOn, setServerOn] = useState(false);
  const [token, setToken] = useState(null);

  const refresh = useCallback(async () => {
    try { setLive(await request("")); setServerOn(true); }
    catch { setLive(readLocal()); setServerOn(false); }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 8000);
    const onStorage = e => e.key === LOCAL_KEY && refresh();
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(timer); window.removeEventListener("storage", onStorage); };
  }, [refresh]);

  const mutate = async (path, method, body, offline) => {
    try { await request(path, { method, body, token }); }
    catch (e) {
      if (e.message === "unauthorized") { setToken(null); return; }
      writeLocal(offline(readLocal()));
    }
    await refresh();
  };

  const login = async (username, password) => {
    try {
      const res = await request("/login", { method: "POST", body: { username, password } });
      setToken(res.token);
      return true;
    } catch (e) {
      if (e.message === "unauthorized") return false;
      // backend not connected: fall back to the offline login
      if (username !== OFFLINE_LOGIN.username || password !== OFFLINE_LOGIN.password) return false;
      setToken("local");
      return true;
    }
  };

  return {
    live, serverOn, isAdmin: !!token, login, logout: () => setToken(null),
    saveSite: (id, patch) => mutate(`/sites/${id}`, "PUT", patch,
      d => ({ ...d, overrides: { ...d.overrides, [id]: patch } })),
    resetSite: id => mutate(`/sites/${id}`, "DELETE", undefined,
      d => { const overrides = { ...d.overrides }; delete overrides[id]; return { ...d, overrides }; }),
    sendMessage: (text, siteId) => mutate("/messages", "POST", { text, siteId },
      d => ({ ...d, messages: [{ id: String(Date.now()), text, siteId, createdAt: new Date().toISOString() }, ...d.messages] })),
    deleteMessage: id => mutate(`/messages/${id}`, "DELETE", undefined,
      d => ({ ...d, messages: d.messages.filter(m => m.id !== id) }))
  };
}

const pinIcon = (status) => L.divIcon({
  className: "heritage-pin-wrap",
  html: `<div class="heritage-pin ${status.toLowerCase()}"><span>★</span></div>`,
  iconSize:[42,42], iconAnchor:[21,38], popupAnchor:[0,-38]
});

function LocateButton({setUser}) {
  const map = useMap();
  const locate = () => map.locate({setView:false, enableHighAccuracy:true});
  useEffect(() => {
    map.on("locationfound", e => setUser([e.latlng.lat,e.latlng.lng]));
    return () => map.off("locationfound");
  }, [map,setUser]);
  return <button className="locate" onClick={locate}>⌖</button>;
}

function SiteEditor({ site, overridden, onSave, onReset }) {
  const [visitors, setVisitors] = useState(String(site.currentVisitors));
  const [capacity, setCapacity] = useState(String(site.capacity));
  useEffect(() => {
    setVisitors(String(site.currentVisitors));
    setCapacity(String(site.capacity));
  }, [site.currentVisitors, site.capacity]);

  const v = Math.max(0, Math.round(Number(visitors) || 0));
  const c = Math.max(1, Math.round(Number(capacity) || 1));
  const percent = percentOf(v, c);
  const level = levelOf(percent);
  const dirty = v !== site.currentVisitors || c !== site.capacity;

  return <article className={`admin-site ${level.toLowerCase()}`}>
    <div className="admin-site-head"><strong>{site.name}</strong><span className="admin-pill">{level}</span></div>
    <div className="admin-percent"><b>{percent}%</b><span>{v} of {c} visitors</span></div>
    <div className="admin-bar"><span style={{width:`${percent}%`}}/></div>
    <div className="admin-fields">
      <label>Visitors now<input type="number" min="0" value={visitors} onChange={e=>setVisitors(e.target.value)} /></label>
      <label>Capacity<input type="number" min="1" value={capacity} onChange={e=>setCapacity(e.target.value)} /></label>
    </div>
    <div className="admin-btns">
      <button className="send" disabled={!dirty} onClick={()=>onSave(site.id,{currentVisitors:v,capacity:c})}>{dirty ? "Save changes" : "Saved"}</button>
      {overridden && <button className="ghost" onClick={()=>onReset(site.id)}>Back to sensor data</button>}
    </div>
  </article>;
}

function Composer({ sites, onSend }) {
  const [text, setText] = useState("");
  const [target, setTarget] = useState("all");
  const send = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    await onSend(text.trim(), target === "all" ? null : target);
    setText("");
  };
  return <form className="composer" onSubmit={send}>
    <label>Send to
      <select value={target} onChange={e=>setTarget(e.target.value)}>
        <option value="all">All sites</option>
        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
    <label>Message
      <textarea rows={3} maxLength={200} value={text} onChange={e=>setText(e.target.value)} placeholder="Example: Relief Map is closed for cleaning until 2 PM." />
    </label>
    <div className="composer-foot"><small>{text.length}/200</small><button className="send" disabled={!text.trim()}>Send to visitors</button></div>
  </form>;
}

function Gate({ onVisitor, onLogin }) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    const ok = await onLogin(username.trim(), password);
    setBusy(false);
    if (!ok) { setError("Wrong username or password."); setPassword(""); }
  };

  return <div className="app-shell gate">
    <div className="gate-hero">
      <div className="brand-mark">D</div>
      <h1>Dapitan Rizal Heritage</h1>
      <p>Explore the Rizal heritage sites and check how crowded they are before you go.</p>
    </div>
    <div className="gate-card">
      {!adminOpen ? <>
        <button className="send gate-visitor" onClick={onVisitor}>Continue as visitor</button>
        <button className="gate-admin" onClick={()=>setAdminOpen(true)}>Admin sign in</button>
      </> : <form onSubmit={submit}>
        <h2>Admin sign in</h2>
        <label>Username<input autoFocus autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="send" disabled={busy || !username.trim() || !password}>Sign in</button>
        <button type="button" className="ghost" onClick={()=>{ setAdminOpen(false); setError(""); }}>← Back</button>
      </form>}
    </div>
  </div>;
}

function Admin({ sites, api, nameOf, onLeave }) {
  return <section className="admin">
    <div className="admin-head"><h2>Admin</h2><button className="ghost" onClick={onLeave}>Sign out</button></div>
    <p className={`sync ${api.serverOn ? "on" : "off"}`}>
      {api.serverOn ? "Connected to the server. Visitors on any device see your changes." : "Server not connected. Your changes show in this browser only."}
    </p>
    {sites.map(s => <SiteEditor key={s.id} site={s} overridden={!!api.live.overrides[s.id]} onSave={api.saveSite} onReset={api.resetSite} />)}
    <h3>Message to visitors</h3>
    <Composer sites={sites} onSend={api.sendMessage} />
    {api.live.messages.length > 0 && <>
      <h3>Sent messages</h3>
      <ul className="sent">
        {api.live.messages.map(m => <li key={m.id}>
          <div><b>{nameOf(m.siteId)}</b><p>{m.text}</p><time>{formatTime(m.createdAt)}</time></div>
          <button className="del" onClick={()=>api.deleteMessage(m.id)}>Delete</button>
        </li>)}
      </ul>
    </>}
  </section>;
}

function App() {
  const [baseSites,setBaseSites] = useState(fallbackSites);
  const [selectedId,setSelectedId] = useState(fallbackSites[0].id);
  const [query,setQuery] = useState("");
  const [tab,setTab] = useState("Map");
  const [showHistory,setShowHistory] = useState(false);
  const [user,setUser] = useState(null);
  const [entered,setEntered] = useState(false);
  const api = useLive();

  const leave = () => { api.logout(); setEntered(false); setTab("Map"); };
  const adminLogin = async (username, password) => {
    if (!(await api.login(username, password))) return false;
    setTab("Admin"); setEntered(true);
    return true;
  };
  // if the server rejects the admin session, go back to the start screen
  useEffect(() => { if (tab === "Admin" && !api.isAdmin) leave(); }, [tab, api.isAdmin]);

  useEffect(() => {
    fetch(`${API}/sites`).then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length) { setBaseSites(data); setSelectedId(data[0].id); }
    }).catch(() => {});
  }, []);

  // Admin values win over sensor data. Status always follows the percentage.
  const sites = useMemo(() => baseSites.map(s => {
    const o = api.live.overrides[s.id];
    const m = o ? { ...s, ...o, source: "set by admin" } : s;
    const percent = percentOf(m.currentVisitors, m.capacity);
    return { ...m, percent, status: levelOf(percent) };
  }), [baseSites, api.live.overrides]);

  const selected = sites.find(s => s.id === selectedId) || sites[0];
  const ranked = useMemo(() => [...sites].sort((a,b) => a.percent - b.percent), [sites]);
  const nameOf = id => sites.find(s => s.id === id)?.shortName || sites.find(s => s.id === id)?.name || "All sites";

  const filtered = useMemo(() => sites.filter(s =>
    `${s.name} ${s.address}`.toLowerCase().includes(query.toLowerCase())
  ), [sites,query]);

  const directions = (site) => {
    const destination = `${site.position[0]},${site.position[1]}`;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => window.open(`https://www.google.com/maps/dir/?api=1&origin=${p.coords.latitude},${p.coords.longitude}&destination=${destination}&travelmode=walking`, "_blank"),
        () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank")
      );
    } else window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank");
  };

  const statusClass = s => s.status.toLowerCase();
  const advice = (s,i) => i === 0 ? "Least crowded right now. A good place to start."
    : s.status === "High" ? `Busy right now (${s.percent}% full). Try ${ranked[0].shortName || ranked[0].name} instead.`
    : `${s.percent}% full right now.`;

  if (!entered) return <Gate onVisitor={()=>setEntered(true)} onLogin={adminLogin} />;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">D</div>
        <div><strong>DAPITAN</strong><span>RIZAL HERITAGE TOURISM</span></div>
      </div>
      <div className="top-actions">
        <button>⌕</button>
        {api.isAdmin && <button aria-label="Admin panel" onClick={()=>setTab(tab === "Admin" ? "Map" : "Admin")}>⚙</button>}
        <button className="home-btn" onClick={leave}>{api.isAdmin ? "Sign out" : "← Home"}</button>
      </div>
    </header>

    <main>
      {tab === "Admin" ? <Admin sites={sites} api={api} nameOf={nameOf} onLeave={leave} /> : <>
      <section className="hero">
        <div><span className="eyebrow">SHRINE CITY OF THE PHILIPPINES</span><h1>Discover Dapitan's Rizal Heritage</h1>
        <p>Explore historic places connected to Jose Rizal and see current visitor conditions.</p></div>
      </section>

      <div className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search heritage sites..." /></div>

      {api.live.messages.length > 0 && <section className="notices" aria-label="Notices">
        {api.live.messages.slice(0,3).map(m => <div className="notice" key={m.id}>
          <span className="notice-tag">{nameOf(m.siteId)}</span><p>{m.text}</p><time>{formatTime(m.createdAt)}</time>
        </div>)}
      </section>}

      {tab === "Map" && <section className="map-card">
        <div className="map-head"><div><strong>Heritage Map</strong><span>Live map • Dapitan City</span></div><span className="live">● LIVE</span></div>
        <div className="map-box">
          <MapContainer center={[8.6605,123.4208]} zoom={14} scrollWheelZoom={true}>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filtered.map(site => <Marker key={site.id} position={site.position} icon={pinIcon(site.status)} eventHandlers={{click:()=>{setSelectedId(site.id);setShowHistory(false)}}}><Popup><b>{site.name}</b><br/>{site.status} • {site.percent}% full</Popup></Marker>)}
            {user && <Marker position={user}><Popup>Your current location</Popup></Marker>}
            <LocateButton setUser={setUser}/>
          </MapContainer>
        </div>
        <div className="legend"><span><i className="dot low"/>Low</span><span><i className="dot moderate"/>Moderate</span><span><i className="dot high"/>High</span><span className="map-note">Prototype sensor readings</span></div>
      </section>}

      {tab === "Heritage Sites" && <section className="site-list">
        <div className="section-title"><span>Featured Heritage Sites</span><small>{sites.length} places</small></div>
        {filtered.map(s => <button className={`site-row ${statusClass(s)}`} key={s.id} onClick={()=>{setSelectedId(s.id);setTab("Map")}}>
          <div className={`site-icon ${statusClass(s)}`}>★</div><div className="site-row-text"><strong>{s.name}</strong><span>{s.address} • {s.percent}% full</span></div><span className={`pill ${statusClass(s)}`}>{s.status}</span>
        </button>)}
      </section>}

      {tab === "Recommendations" && <section className="recommendation-page">
        <div className="section-title"><span>Where should I go?</span><small>Based on crowd level</small></div>
        {ranked.map((s,i)=><button className={`recommend-row ${statusClass(s)}`} key={s.id} onClick={()=>{setSelectedId(s.id);setTab("Map")}}><span className="rank">{i+1}</span><div><strong>{s.name}</strong><p>{advice(s,i)}</p></div><span className={`pill ${statusClass(s)}`}>{s.status}</span></button>)}
      </section>}

      {tab === "My Itinerary" && <section className="itinerary"><div className="section-title"><span>My Itinerary</span><small>Build your heritage route</small></div><p className="empty">Choose a site from the Heritage Sites tab to start exploring. Use <b>Get Directions</b> to navigate from your current location.</p></section>}

      <section className={`selected-card ${statusClass(selected)}`}>
        <div className="selected-top"><div><span className="eyebrow">SELECTED SITE</span><h2>{selected.name}</h2><p>{selected.address}</p></div><span className={`status-badge ${statusClass(selected)}`}>{selected.status}</span></div>
        <div className="stats"><div><b>{selected.currentVisitors}</b><span>Visitors now</span></div><div><b>{selected.percent}%</b><span>Occupancy</span></div><div><b>{selected.capacity}</b><span>Capacity</span></div></div>
        <div className="bar"><span style={{width:`${selected.percent}%`}}/></div>
        <p className="description">{selected.description}</p>
        <div className="buttons"><button className="primary" onClick={()=>setShowHistory(!showHistory)}>{showHistory ? "Hide History" : "View History"}</button><button onClick={()=>directions(selected)}>Get Directions ↗</button></div>
        {showHistory && <div className="history"><h3>Historical Background</h3><p>{selected.history}</p><h4>What to see</h4><div className="chips">{selected.highlights.map(x=><span key={x}>{x}</span>)}</div><small>Visitor count source: {selected.source || "prototype demo data"}</small></div>}
      </section>
      </>}
    </main>

    <nav className="bottom-nav">{["Map","Heritage Sites","Recommendations","My Itinerary"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}><span>{x==="Map"?"⌖":x==="Heritage Sites"?"▦":x==="Recommendations"?"✦":"✓"}</span>{NAV_LABEL[x]}</button>)}</nav>
  </div>
}

createRoot(document.getElementById("root")).render(<App />);
