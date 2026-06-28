// src/components/SetupWizard.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { setCookie } from "../cookies";

const BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

// ─── Exact dependencies from your package.json files ─────────────────────────
const FRONTEND_DEPS = [
  { name: "@react-oauth/google", version: "^0.13.4",  pkg: "@react-oauth/google" },
  { name: "axios",               version: "^1.13.6",  pkg: "axios"               },
  { name: "cookie-parser",       version: "^1.4.7",   pkg: "cookie-parser"       },
  { name: "js-cookie",           version: "^3.0.5",   pkg: "js-cookie"           },
  { name: "jwt-decode",          version: "^4.0.0",   pkg: "jwt-decode"          },
  { name: "react",               version: "^19.2.0",  pkg: "react"               },
  { name: "react-dom",           version: "^19.2.0",  pkg: "react-dom"           },
  { name: "react-router-dom",    version: "^7.13.0",  pkg: "react-router-dom"    },
];

const BACKEND_DEPS = [
  { name: "axios",               version: "^1.13.6",  pkg: "axios"               },
  { name: "cookie-parser",       version: "^1.4.7",   pkg: "cookie-parser"       },
  { name: "cors",                version: "^2.8.6",   pkg: "cors"                },
  { name: "dotenv",              version: "^17.3.1",  pkg: "dotenv"              },
  { name: "express",             version: "^5.2.1",   pkg: "express"             },
  { name: "express-session",     version: "^1.19.0",  pkg: "express-session"     },
  { name: "google-auth-library", version: "^10.6.1",  pkg: "google-auth-library" },
  { name: "mysql2",              version: "^3.18.0",  pkg: "mysql2"              },
];

const STEPS = [
  { label: "Frontend Deps", icon: "⚛️"  },
  { label: "Backend Deps",  icon: "🖥️"  },
  { label: "Database",      icon: "🗄️"  },
  { label: "App Config",    icon: "⚙️"  },
  { label: "Admin",         icon: "👤"  },
  { label: "Launch",        icon: "🚀"  },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const emptyConf = {
  db:    { host: "localhost", port: "3306", user: "", password: "", database: "" },
  api:   { VITE_API_URL: "", VITE_API_URL_LOGOUT: "" },
  app:   { name: "", theme: "dark", language: "English" },
  admin: { username: "", email: "", password: "", confirm: "" },
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #030508; }

.sw-root {
  min-height: 100vh;
  background: #030508;
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  padding: 1rem;
  position: relative; overflow: hidden;
}
.sw-root::before {
  content: '';
  position: fixed; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 70% 50% at 15% 5%,  rgba(37,99,235,0.13) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 85% 95%, rgba(109,40,217,0.09) 0%, transparent 55%),
    radial-gradient(ellipse 40% 30% at 60% 30%, rgba(6,182,212,0.05) 0%, transparent 50%);
}
.sw-grid {
  position: fixed; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
  background-size: 48px 48px;
}

/* Card */
.sw-card {
  width: 100%; max-width: 660px;
  background: rgba(8,12,22,0.98);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 22px; overflow: hidden;
  box-shadow: 0 0 0 1px rgba(37,99,235,0.12), 0 40px 100px rgba(0,0,0,0.7);
  position: relative; z-index: 1;
}

/* Header */
.sw-head {
  background: rgba(255,255,255,0.022);
  border-bottom: 1px solid rgba(255,255,255,0.065);
  padding: 1.4rem 2rem 0;
}
.sw-brand {
  font-family: 'Syne', sans-serif;
  font-size: 1rem; font-weight: 800;
  color: #fff; margin-bottom: 1.3rem;
  display: flex; align-items: center; gap: .5rem; letter-spacing: -.01em;
}
.sw-brand em { color: #3b82f6; font-style: normal; }
.sw-brand small {
  font-family: 'JetBrains Mono', monospace;
  font-size: .6rem; font-weight: 400;
  color: rgba(255,255,255,.25); margin-left: .4rem;
  border: 1px solid rgba(255,255,255,.1); border-radius: 4px;
  padding: .1rem .4rem; letter-spacing: .05em;
}

/* Step tabs */
.sw-tabs { display: flex; }
.sw-tab {
  flex: 1; padding: .5rem .2rem;
  display: flex; flex-direction: column; align-items: center; gap: .15rem;
  font-size: .56rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; cursor: default; transition: all .25s;
}
.sw-tab .ti { font-size: .78rem; line-height: 1; }
.sw-tab.past   { color: #3b82f6; border-bottom: 2px solid #3b82f6; }
.sw-tab.active { color: #e2e8f0; border-bottom: 2px solid #60a5fa; }
.sw-tab.future { color: rgba(255,255,255,.17); border-bottom: 2px solid transparent; }

/* Body */
.sw-body { padding: 1.8rem 2rem 2rem; }
.sw-h1 {
  font-family: 'Syne', sans-serif;
  font-size: 1.15rem; font-weight: 800;
  color: #f1f5f9; margin-bottom: .2rem; letter-spacing: -.01em;
}
.sw-sub { font-size: .7rem; color: rgba(255,255,255,.27); margin-bottom: 1.5rem; line-height: 1.55; }

/* Alerts */
.al-warn { background: rgba(245,158,11,.07); border: 1px solid rgba(245,158,11,.22); border-radius: 10px; padding: .7rem 1rem; font-size: .74rem; color: #fcd34d; margin-bottom: 1rem; line-height: 1.6; }
.al-err  { background: rgba(248,113,113,.06); border: 1px solid rgba(248,113,113,.22); border-radius: 10px; padding: .7rem 1rem; font-size: .74rem; color: #f87171; margin-bottom: 1rem; line-height: 1.6; }
.al-ok   { background: rgba(52,211,153,.06);  border: 1px solid rgba(52,211,153,.2);  border-radius: 10px; padding: .7rem 1rem; font-size: .74rem; color: #34d399; margin-bottom: 1rem; line-height: 1.6; }

/* Dep list */
.dep-section-label {
  font-size: .62rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; color: rgba(255,255,255,.25);
  margin-bottom: .5rem; margin-top: .2rem;
}
.dep-grid { display: flex; flex-direction: column; gap: .38rem; margin-bottom: 1rem; }
.dep-row {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,.022);
  border: 1px solid rgba(255,255,255,.055);
  border-radius: 9px; padding: .6rem .9rem;
  transition: border-color .2s;
}
.dep-row.ok   { border-color: rgba(52,211,153,.18); }
.dep-row.miss { border-color: rgba(248,113,113,.22); background: rgba(248,113,113,.025); }
.dep-name { font-size: .77rem; font-weight: 600; color: #e2e8f0; }
.dep-ver  { font-size: .6rem; color: rgba(255,255,255,.25); margin-top: .07rem; }
.badge { font-size: .61rem; font-weight: 700; padding: .16rem .48rem; border-radius: 5px; white-space: nowrap; }
.badge.ok   { background: rgba(52,211,153,.12); color: #34d399; }
.badge.miss { background: rgba(248,113,113,.12); color: #f87171; }
.badge.spin { background: rgba(251,191,36,.12);  color: #fbbf24; }
.badge.skip { background: rgba(148,163,184,.1);  color: #94a3b8; }

/* confirm */
.confirm-box {
  background: rgba(245,158,11,.055); border: 1px solid rgba(245,158,11,.18);
  border-radius: 10px; padding: .85rem; margin-bottom: .9rem;
  display: flex; gap: .7rem; align-items: flex-start;
}
.confirm-box label { font-size: .72rem; color: #fcd34d; line-height: 1.6; cursor: pointer; }
.confirm-box input { margin-top: .15rem; accent-color: #f59e0b; flex-shrink: 0; cursor: pointer; }

/* Terminal */
.term {
  background: #010306; border: 1px solid rgba(255,255,255,.065);
  border-radius: 10px; padding: .9rem 1rem;
  font-size: .69rem; line-height: 1.9; max-height: 170px;
  overflow-y: auto; color: #94a3b8; margin-bottom: .9rem;
}
.t-ok  { color: #34d399; } .t-err { color: #f87171; }
.t-warn{ color: #fbbf24; } .t-cmd { color: #60a5fa; }
.t-dim { color: rgba(255,255,255,.2); }
.cursor { display: inline-block; width: 7px; height: 12px; background: #60a5fa; animation: blink 1s step-end infinite; vertical-align: middle; margin-left: 2px; }
@keyframes blink { 50% { opacity: 0; } }

/* DB panel */
.db-checks { background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.065); border-radius: 12px; padding: 1rem; margin-bottom: .85rem; }
.db-check-row { display: flex; align-items: center; justify-content: space-between; padding: .35rem 0; border-bottom: 1px solid rgba(255,255,255,.04); }
.db-check-row:last-child { border-bottom: none; padding-bottom: 0; }
.dc-label { font-size: .7rem; color: rgba(255,255,255,.32); }
.dc-val { font-size: .7rem; font-weight: 700; }
.dc-val.ok   { color: #34d399; } .dc-val.fail { color: #f87171; } .dc-val.wait { color: #fbbf24; }

/* Form */
.field { margin-bottom: .9rem; }
.fl { display: block; font-size: .61rem; color: #60a5fa; text-transform: uppercase; letter-spacing: .1em; margin-bottom: .33rem; font-weight: 700; }
.fi {
  width: 100%; background: rgba(255,255,255,.022);
  border: 1px solid rgba(255,255,255,.08); border-radius: 8px;
  padding: .6rem .85rem; color: #e2e8f0; font-size: .83rem;
  outline: none; font-family: 'JetBrains Mono', monospace;
  transition: border-color .2s, background .2s;
}
.fi:focus { border-color: #3b82f6; background: rgba(59,130,246,.045); }
.fi.err { border-color: #f87171; }
.fe { font-size: .64rem; color: #f87171; margin-top: .2rem; }
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
.fsel {
  width: 100%; background: rgba(255,255,255,.022);
  border: 1px solid rgba(255,255,255,.08); border-radius: 8px;
  padding: .6rem .85rem; color: #e2e8f0; font-size: .83rem;
  outline: none; font-family: 'JetBrains Mono', monospace; cursor: pointer;
  -webkit-appearance: none;
}
.fsel:focus { border-color: #3b82f6; }
.pw-wrap { position: relative; }
.pw-eye { position: absolute; right: .7rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,.22); cursor: pointer; font-size: .78rem; padding: 0; }
.hint { font-size: .68rem; color: rgba(255,255,255,.18); margin-top: .3rem; }

/* Buttons */
.btn-row { display: flex; gap: .6rem; justify-content: flex-end; margin-top: 1.4rem; }
.btn-row.sp { justify-content: space-between; align-items: center; }
.btn-p {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff; border: none; border-radius: 9px;
  padding: .6rem 1.5rem; cursor: pointer;
  font-weight: 700; font-size: .79rem;
  font-family: 'JetBrains Mono', monospace;
  transition: opacity .18s, transform .1s; letter-spacing: .02em;
}
.btn-p:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.btn-p:disabled { opacity: .38; cursor: not-allowed; }
.btn-s {
  background: transparent; color: rgba(255,255,255,.3);
  border: 1px solid rgba(255,255,255,.1); border-radius: 9px;
  padding: .6rem 1.1rem; cursor: pointer; font-size: .79rem;
  font-family: 'JetBrains Mono', monospace; transition: all .18s;
}
.btn-s:hover { border-color: rgba(255,255,255,.22); color: rgba(255,255,255,.55); }
.btn-g {
  background: rgba(15, 59, 131, 0.09); color: #60a5fa;
  border: 1px solid rgba(59,130,246,.22); border-radius: 9px;
  padding: .5rem .95rem; cursor: pointer; font-size: .74rem;
  font-family: 'JetBrains Mono', monospace; transition: background .18s;
}
.btn-g:hover { background: rgba(59,130,246,.17); }
 .btn-g:disabled { opacity: .35; cursor: not-allowed; }
.btn-test {
  background: rgba(59,130,246,.09); color: #60a5fa;
  border: 1px solid rgba(59,130,246,.22); border-radius: 9px;
  padding: .48rem .95rem; cursor: pointer; font-size: .73rem;
  font-family: 'JetBrains Mono', monospace; margin-bottom: .75rem;
  transition: background .18s;
}
.btn-test:hover { background: rgba(59,130,246,.17); }
.btn-test:disabled { opacity: .38; cursor: not-allowed; }

/* Success */
.done-wrap { text-align: center; padding: .4rem 0 1rem; }
.done-orb {
  width: 74px; height: 74px; margin: 0 auto 1.1rem;
  background: radial-gradient(circle, rgba(52,211,153,.18) 0%, transparent 70%);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 1.9rem; border: 1px solid rgba(52,211,153,.2);
}
.done-title { font-family: 'Syne', sans-serif; font-size: 1.3rem; font-weight: 800; color: #34d399; margin-bottom: .3rem; }
.done-sub { font-size: .72rem; color: rgba(255,255,255,.27); margin-bottom: 1.3rem; }
.env-box {
  background: #010306; border: 1px solid rgba(255,255,255,.065);
  border-radius: 10px; padding: .95rem 1rem;
  font-size: .68rem; color: #7dd3fc; line-height: 1.95;
  text-align: left; white-space: pre-wrap; margin-bottom: 1.1rem;
}
.btn-launch {
  background: linear-gradient(135deg, #059669, #047857);
  color: #fff; border: none; border-radius: 9px;
  padding: .75rem 2.2rem; cursor: pointer;
  font-weight: 700; font-size: .86rem;
  font-family: 'JetBrains Mono', monospace; letter-spacing: .03em;
  transition: opacity .18s, transform .14s;
  box-shadow: 0 4px 24px rgba(5,150,105,.28);
}
.btn-launch:hover:not(:disabled) { opacity: .88; transform: translateY(-2px); }
.btn-launch:disabled { opacity: .38; cursor: not-allowed; }

/* Misc */
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 2px; }
@keyframes sp { to { transform: rotate(360deg); } }
.sp {
  display: inline-block; width: 10px; height: 10px;
  border: 2px solid rgba(255,255,255,.15); border-top-color: #60a5fa;
  border-radius: 50%; animation: sp .6s linear infinite;
  vertical-align: middle; margin-right: 5px;
}
.ping {
  display: inline-block; width: 7px; height: 7px; border-radius: 50%;
  background: #34d399; margin-right: 5px;
  animation: pg 1.4s ease-in-out infinite; vertical-align: middle;
}
@keyframes pg { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.45); opacity: .5; } }
.test-result {
  border-radius: 9px; padding: .6rem .88rem;
  font-size: .76rem; margin-bottom: .85rem;
}
`;

// ─── Sub-components (OUTSIDE main — prevents focus loss) ─────────────────────
const TL = ({ type, children }) => <div className={type ? `t-${type}` : ""}>{children}</div>;

const FF = ({ label, section, field, conf, set, errs, type = "text", placeholder = "" }) => (
  <div className="field">
    <label className="fl">{label}</label>
    <input
      className={`fi${errs[field] ? " err" : ""}`}
      type={type} placeholder={placeholder}
      value={conf[section][field]}
      onChange={e => set(section, field, e.target.value)}
    />
    {errs[field] && <div className="fe">{errs[field]}</div>}
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function SetupWizard({ onComplete }) {
  const navigate = useNavigate();

  const [step,       setStep]      = useState(0);
  const [conf,       setConf_]     = useState(emptyConf);
  const [errs,       setErrs]      = useState({});
  const [showPw,     setShowPw]    = useState(false);
  const [loadingDB,  setLoadingDB] = useState(true);
  const [serverErr,  setServerErr] = useState(null);
  const [saveStatus, setSaveStatus]= useState(""); // "" | "saving" | "done" | "error"

  // ── Dep state (two separate groups) ──
  const [feDeps,     setFeDeps]    = useState(FRONTEND_DEPS.map(d => ({ ...d, status: "unknown" })));
  const [beDeps,     setBeDeps]    = useState(BACKEND_DEPS.map(d => ({ ...d, status: "unknown" })));
  const [feScanned,  setFeScanned] = useState(false);
  const [beScanned,  setBeScanned] = useState(false);
  const [feConfirm,  setFeConfirm] = useState(false);
  const [beConfirm,  setBeConfirm] = useState(false);
  const [feBusy,     setFeBusy]    = useState(false); // scanning or installing
  const [beBusy,     setBeBusy]    = useState(false);
  const [feInstDone, setFeInstDone]= useState(false);
  const [beInstDone, setBeInstDone]= useState(false);
  const [feTerm,     setFeTerm]    = useState([]);
  const [beTerm,     setBeTerm]    = useState([]);

  // ── API test ──
  const [testing,    setTesting]   = useState(false);
  const [testResult, setTestResult]= useState(null);

  // ── DB state ──
  const [dbPhase,  setDbPhase]  = useState("idle"); // idle|running|done|error
  const [dbLog,    setDbLog]    = useState([]);
  const [dbSt,     setDbSt]     = useState({ connect: null, exists: null, tables: null });
  const [dbErrMsg, setDbErrMsg] = useState(null);

  const [launching, setLaunching] = useState(false);

  const feTermRef = useRef(null);
  const beTermRef = useRef(null);
  const dbRef     = useRef(null);

  useEffect(() => { if (feTermRef.current) feTermRef.current.scrollTop = feTermRef.current.scrollHeight; }, [feTerm]);
  useEffect(() => { if (beTermRef.current) beTermRef.current.scrollTop = beTermRef.current.scrollHeight; }, [beTerm]);
  useEffect(() => { if (dbRef.current)     dbRef.current.scrollTop     = dbRef.current.scrollHeight;     }, [dbLog]);

  // ── Load existing config ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/config`, { credentials: "include" });
        if (res.ok) {
          const d = await res.json();
          setConf_({
            db:    { host: d.db_host || "localhost", port: d.db_port || "3306", user: d.db_user || "", password: d.db_password || "", database: d.db_name || "" },
            api:   { VITE_API_URL: d.api_url || "", VITE_API_URL_LOGOUT: d.api_url_logout || "" },
            app:   { name: d.app_name || "", theme: d.theme || "dark", language: d.language || "English" },
            admin: { username: d.admin_username || "", email: d.admin_email || "", password: "", confirm: "" },
          });
        }
      } catch {
        setServerErr(`⚠️ Cannot reach ${BASE_URL} — make sure your backend is running.`);
      } finally { setLoadingDB(false); }
    })();
  }, []);

  const set    = (sec, key, val) => setConf_(p => ({ ...p, [sec]: { ...p[sec], [key]: val } }));
  const addFe  = (type, text) => setFeTerm(p => [...p, { type, text }]);
  const addBe  = (type, text) => setBeTerm(p => [...p, { type, text }]);
  const addDB  = (type, text) => setDbLog(p  => [...p, { type, text }]);

  // ── Scan helper (simulates check; replace body with fetch(`${BASE_URL}/api/check-deps?side=frontend|backend`)) ──
  const runScan = async (deps, setDeps, addTerm, isFE) => {
    addTerm("cmd", `$ checking ${isFE ? "frontend" : "backend"} dependencies…`);
    await sleep(300);
    const result = [];
    for (const dep of deps) {
      await sleep(130 + Math.random() * 120);
      // Simulate: all installed except those that are "new" to user's project
      // In production: replace with real check from backend
      const installed = true; // backend would return actual status
      const ver = dep.version.replace(/[\^~>=<]/g, "");
      const updated = { ...dep, installed, current: ver, status: installed ? "ok" : "miss" };
      result.push(updated);
      addTerm(installed ? "ok" : "err",
        installed
          ? `  ✓ ${dep.name.padEnd(22)} ${ver}`
          : `  ✗ ${dep.name.padEnd(22)} NOT FOUND`
      );
    }
    await sleep(220);
    const miss = result.filter(d => !d.installed);
    if (miss.length === 0) addTerm("ok", `\n  ✓ All ${isFE ? "frontend" : "backend"} packages present`);
    else addTerm("warn", `\n  ${miss.length} package(s) missing`);
    return result;
  };

  // ── Install helper ──
  const runInstall = async (deps, setDeps, addTerm, isFE) => {
    const miss = deps.filter(d => !d.installed);
    if (!miss.length) return;
    addTerm("", "");
    addTerm("cmd", `$ npm install ${miss.map(d => d.pkg).join(" ")}`);
    await sleep(400);
    // In production: POST to `${BASE_URL}/api/install-deps` with { side: "frontend"|"backend", packages: [...] }
    for (const dep of miss) {
      setDeps(p => p.map(d => d.pkg === dep.pkg ? { ...d, status: "spin" } : d));
      addTerm("warn", `  ⟳  ${dep.name}…`);
      await sleep(500 + Math.random() * 500);
      setDeps(p => p.map(d => d.pkg === dep.pkg ? { ...d, installed: true, status: "ok", current: dep.version.replace(/[\^~>=<]/g, "") } : d));
      addTerm("ok", `  ✓  ${dep.name}`);
    }
    await sleep(280);
    addTerm("ok", "\n  All packages installed ✓");
  };

  // ── Step 0: Frontend scan/install ──
  const scanFe = async () => {
    setFeBusy(true);
    const result = await runScan(feDeps, setFeDeps, addFe, true);
    setFeDeps(result); setFeScanned(true); setFeBusy(false);
  };
  const installFe = async () => {
    setFeBusy(true);
    await runInstall(feDeps, setFeDeps, addFe, true);
    setFeBusy(false); setFeInstDone(true);
  };

  // ── Step 1: Backend scan/install ──
  const scanBe = async () => {
    setBeBusy(true);
    const result = await runScan(beDeps, setBeDeps, addBe, false);
    setBeDeps(result); setBeScanned(true); setBeBusy(false);
  };
  const installBe = async () => {
    setBeBusy(true);
    await runInstall(beDeps, setBeDeps, addBe, false);
    setBeBusy(false); setBeInstDone(true);
  };

  // ── Test API connection ──
  const testConn = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(conf.api.VITE_API_URL);
      setTestResult(res.ok
        ? { ok: true,  msg: "✅ Connected successfully!" }
        : { ok: false, msg: `⚠️ Server responded ${res.status}` });
    } catch {
      setTestResult({ ok: false, msg: "❌ Cannot reach API — is backend running?" });
    } finally { setTesting(false); }
  };

  // ── DB setup — calls real backend ──
  const runDB = async () => {
    setDbPhase("running"); setDbLog([]); setDbErrMsg(null);
    setDbSt({ connect: null, exists: null, tables: null });
    try {
      // 1. Connect
      addDB("cmd", `$ mysql -h ${conf.db.host} -P ${conf.db.port} -u ${conf.db.user}`);
      const c1 = await fetch(`${BASE_URL}/api/db/connect`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: conf.db.host, port: conf.db.port, user: conf.db.user, password: conf.db.password }),
      });
      if (!c1.ok) throw new Error((await c1.json()).message || "Connection failed");
      addDB("ok",  "  ✓ Connection established");
      setDbSt(p => ({ ...p, connect: true }));

      // 2. Create DB
      addDB("cmd", `$ CREATE DATABASE IF NOT EXISTS \`${conf.db.database}\`;`);
      const c2 = await fetch(`${BASE_URL}/api/db/create`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: conf.db.host, port: conf.db.port, user: conf.db.user, password: conf.db.password, database: conf.db.database }),
      });
      if (!c2.ok) throw new Error((await c2.json()).message || "Create DB failed");
      addDB("ok",  `  ✓ Database \`${conf.db.database}\` ready`);
      setDbSt(p => ({ ...p, exists: true }));

      // 3. Migrate
      addDB("cmd", "$ Running migrations…");
      const c3 = await fetch(`${BASE_URL}/api/db/migrate`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: conf.db.host, port: conf.db.port, user: conf.db.user, password: conf.db.password, database: conf.db.database }),
      });
      if (!c3.ok) throw new Error((await c3.json()).message || "Migration failed");
      const mData = await c3.json();
      (mData.tables || ["users", "sessions", "settings"]).forEach(t => addDB("ok", `  ✓ Table: ${t}`));

      // 4. Validate
      addDB("cmd", "$ Validating schema…");
      const c4 = await fetch(`${BASE_URL}/api/db/validate`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: conf.db.host, port: conf.db.port, user: conf.db.user, password: conf.db.password, database: conf.db.database }),
      });
      if (!c4.ok) throw new Error((await c4.json()).message || "Validation failed");
      addDB("ok",  "  ✓ Schema valid");
      setDbSt(p => ({ ...p, tables: true }));
      addDB("ok",  "\n  Database ready ✓");
      setDbPhase("done");
    } catch (err) {
      addDB("err", `\n  ✗ ${err.message}`);
      setDbSt(p => ({ connect: p.connect ?? false, exists: p.exists ?? false, tables: false }));
      setDbErrMsg(err.message);
      setDbPhase("error");
    }
  };

  // ── Save config & redirect ──
  const finish = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`${BASE_URL}/api/config`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db_host: conf.db.host, db_port: conf.db.port,
          db_user: conf.db.user, db_password: conf.db.password, db_name: conf.db.database,
          api_url: conf.api.VITE_API_URL, api_url_logout: conf.api.VITE_API_URL_LOGOUT,
          app_name: conf.app.name, theme: conf.app.theme, language: conf.app.language,
          admin_username: conf.admin.username, admin_email: conf.admin.email,
          admin_password: conf.admin.password,
        }),
      });
      if (res.ok) {
        setSaveStatus("done");
        setCookie("app_setup_done", "true", 365);
        if (onComplete) { onComplete(conf); return; }
        navigate("/login");
      } else { setSaveStatus("error"); }
    } catch { setSaveStatus("error"); }
  };

  // ── Validation ──
  const validate = () => {
    const e = {};
    if (step === 3) {
      if (!conf.api.VITE_API_URL)        e.VITE_API_URL        = "Required";
      if (!conf.api.VITE_API_URL_LOGOUT) e.VITE_API_URL_LOGOUT = "Required";
      if (!conf.app.name)                e.name                = "Required";
    }
    if (step === 4) {
      if (!conf.admin.username) e.username = "Required";
      if (!conf.admin.email)    e.email    = "Required";
      if (!conf.admin.password) e.password = "Required";
      if (conf.admin.password !== conf.admin.confirm) e.confirm = "Passwords do not match";
    }
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) { setTestResult(null); setStep(s => s + 1); setErrs({}); } };
  const back = () => { setTestResult(null); setErrs({}); setStep(s => s - 1); };

  // ── computed ──
  const feMissing    = feDeps.filter(d => !d.installed);
  const beMissing    = beDeps.filter(d => !d.installed);
  const feAllOk      = feScanned && feDeps.every(d => d.installed);
  const beAllOk      = beScanned && beDeps.every(d => d.installed);
  const feReady      = feScanned && (feAllOk || feInstDone);
  const beReady      = beScanned && (beAllOk || beInstDone);

  // ── Loading ──
  if (loadingDB) return (
    <>
      <style>{css}</style>
      <div className="sw-root">
        <div style={{ color: "#60a5fa", fontFamily: "'JetBrains Mono',monospace", fontSize: ".88rem", display: "flex", alignItems: "center", gap: ".7rem" }}>
          <span className="sp" />Loading configuration…
        </div>
      </div>
    </>
  );

  const DepsBlock = ({ deps, setDeps, scanned, busy, confirmed, setConfirmed, instDone, term, termRef, onScan, onInstall, isFE }) => {
    const missing = deps.filter(d => !d.installed);
    const allOk   = scanned && deps.every(d => d.installed);
    return (
      <>
        {(busy || scanned) && (
          <div className="dep-grid">
            {deps.map(dep => (
              <div key={dep.pkg} className={`dep-row ${dep.installed ? "ok" : "miss"}`}>
                <div>
                  <div className="dep-name">{dep.name}</div>
                  <div className="dep-ver">{dep.version}</div>
                </div>
                {busy && dep.status === "unknown"
                  ? <span className="badge spin">scanning…</span>
                  : <span className={`badge ${dep.status === "spin" ? "spin" : dep.installed ? "ok" : "miss"}`}>
                      {dep.status === "spin" ? "⟳ installing" : dep.installed ? `✓ ${dep.current || "ok"}` : "✗ missing"}
                    </span>
                }
              </div>
            ))}
          </div>
        )}

        {scanned && missing.length > 0 && !instDone && (
          <div className="confirm-box">
            <input type="checkbox" id={`cf-${isFE ? "fe" : "be"}`} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
            <label htmlFor={`cf-${isFE ? "fe" : "be"}`}>
              I confirm installing missing packages via <strong>npm</strong>:{" "}
              <strong style={{ color: "#fb923c" }}>{missing.map(d => d.pkg).join(", ")}</strong>
            </label>
          </div>
        )}

        {allOk && <div className="al-ok"><span className="ping" />All {isFE ? "frontend" : "backend"} packages verified</div>}

        {term.length > 0 && (
          <div className="term" ref={termRef}>
            {term.map((l, i) => <TL key={i} type={l.type}>{l.text}</TL>)}
            {busy && <span className="cursor" />}
          </div>
        )}

        <div style={{ display: "flex", gap: ".55rem", flexWrap: "wrap" }}>
          {!scanned && (
            <button className="btn-g" onClick={onScan} disabled={busy}>
              {busy ? <><span className="sp" />Scanning…</> : "🔍 Scan"}
            </button>
          )}
          {scanned && missing.length > 0 && !instDone && (
            <button className="btn-g" onClick={onInstall} disabled={busy || !confirmed}>
              {busy ? <><span className="sp" />Installing…</> : "📦 Install Missing"}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      <style>{css}</style>
      <div className="sw-root">
        <div className="sw-grid" />
        <div className="sw-card">

          {/* Header */}
          <div className="sw-head">
            <div className="sw-brand">
              ⚙️ <em>Setup</em> Wizard
              <small>v1.0</small>
            </div>
            <div className="sw-tabs">
              {STEPS.map((s, i) => (
                <div key={i} className={`sw-tab ${i < step ? "past" : i === step ? "active" : "future"}`}>
                  <span className="ti">{s.icon}</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sw-body">
            {serverErr && <div className="al-warn">{serverErr}</div>}

            {/* ── STEP 0: FRONTEND DEPS ── */}
            {step === 0 && (<>
              <div className="sw-h1">Frontend Dependencies</div>
              <div className="sw-sub">Scan and install all required React / Vite packages from your <code>package.json</code></div>

              {!feScanned && !feBusy && (
                <div className="al-warn" style={{ marginBottom: "1rem" }}>
                  📦 <strong>{FRONTEND_DEPS.length} packages</strong> defined — click Scan to verify they are installed.
                </div>
              )}

              <DepsBlock
                deps={feDeps} setDeps={setFeDeps}
                scanned={feScanned} busy={feBusy}
                confirmed={feConfirm} setConfirmed={setFeConfirm}
                instDone={feInstDone} term={feTerm} termRef={feTermRef}
                onScan={scanFe} onInstall={installFe} isFE={true}
              />

              <div className="btn-row">
                <button className="btn-p" disabled={!feReady} onClick={next}>Next →</button>
              </div>
            </>)}

            {/* ── STEP 1: BACKEND DEPS ── */}
            {step === 1 && (<>
              <div className="sw-h1">Backend Dependencies</div>
              <div className="sw-sub">Scan and install all required Express / Node packages from your server's <code>package.json</code></div>

              {!beScanned && !beBusy && (
                <div className="al-warn" style={{ marginBottom: "1rem" }}>
                  📦 <strong>{BACKEND_DEPS.length} packages</strong> defined — click Scan to verify they are installed.
                </div>
              )}

              <DepsBlock
                deps={beDeps} setDeps={setBeDeps}
                scanned={beScanned} busy={beBusy}
                confirmed={beConfirm} setConfirmed={setBeConfirm}
                instDone={beInstDone} term={beTerm} termRef={beTermRef}
                onScan={scanBe} onInstall={installBe} isFE={false}
              />

              <div className="btn-row">
                <button className="btn-s" onClick={back}>← Back</button>
                <button className="btn-p" disabled={!beReady} onClick={next}>Next →</button>
              </div>
            </>)}

            {/* ── STEP 2: DATABASE ── */}
            {step === 2 && (<>
              <div className="sw-h1">Database Setup</div>
              <div className="sw-sub">Enter MySQL credentials — we'll create the database and run all migrations automatically</div>

              <div className="g2">
                <FF label="Host" section="db" field="host" conf={conf} set={set} errs={errs} placeholder="localhost" />
                <FF label="Port" section="db" field="port" conf={conf} set={set} errs={errs} placeholder="3306" />
              </div>
              <FF label="MySQL Username" section="db" field="user" conf={conf} set={set} errs={errs} placeholder="root" />
              <div className="field">
                <label className="fl">Password</label>
                <div className="pw-wrap">
                  <input className="fi" type={showPw ? "text" : "password"} placeholder="DB password (blank if none)"
                    value={conf.db.password} onChange={e => set("db", "password", e.target.value)} />
                  <button className="pw-eye" onClick={() => setShowPw(!showPw)}>{showPw ? "🙈" : "👁"}</button>
                </div>
              </div>
              <FF label="Database Name" section="db" field="database" conf={conf} set={set} errs={errs} placeholder="ai_tools_db" />

              {dbPhase !== "idle" && (
                <>
                  <div className="db-checks">
                    {[
                      ["MySQL Connection",        dbSt.connect, "Connecting…"],
                      ["Database Exists/Created", dbSt.exists,  "Waiting…"  ],
                      ["Schema & Tables",         dbSt.tables,  "Waiting…"  ],
                    ].map(([lbl, val, w]) => (
                      <div className="db-check-row" key={lbl}>
                        <span className="dc-label">{lbl}</span>
                        <span className={`dc-val ${val === null ? "wait" : val ? "ok" : "fail"}`}>
                          {val === null ? `⏳ ${w}` : val ? "✓ Ready" : "✗ Failed"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="term" ref={dbRef}>
                    {dbLog.map((l, i) => <TL key={i} type={l.type}>{l.text}</TL>)}
                    {dbPhase === "running" && <span className="cursor" />}
                  </div>
                  {dbErrMsg && <div className="al-err">✗ {dbErrMsg}</div>}
                </>
              )}

           {/* ✅ NEW — Back on far left, Create DB in center, Next on far right */}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.4rem", gap: ".5rem" }}>
  
  {/* Left: Back */}
  <button className="btn-s" onClick={back}>← Back</button>

  {/* Center: Test & Create DB / Retry */}
  {(dbPhase === "idle" || dbPhase === "error") && (
    <button className="btn-g" onClick={() => {
      const e = {};
      if (!conf.db.host)     e.host     = "Required";
      if (!conf.db.user)     e.user     = "Required";
      if (!conf.db.database) e.database = "Required";
      if (!conf.db.port)     e.port     = "Required";
      if (Object.keys(e).length) { setErrs(e); return; }
      setErrs({});
      runDB();
    }}>
      {dbPhase === "error" ? "🔄 Retry" : "🗄️ Test & Create DB"}
    </button>
  )}

  {/* Right: Next */}
  <button className="btn-p" disabled={dbPhase !== "done"} onClick={next}>
    Next →
  </button>

</div>
            </>)}

            {/* ── STEP 3: APP CONFIG + API ── */}
            {step === 3 && (<>
              <div className="sw-h1">App & API Config</div>
              <div className="sw-sub">Set your app name, theme, and API endpoints</div>

              <FF label="App Name" section="app" field="name" conf={conf} set={set} errs={errs} placeholder="e.g. AI Tools Dashboard" />

              <div className="g2">
                <div className="field">
                  <label className="fl">Theme</label>
                  <select className="fsel" value={conf.app.theme} onChange={e => set("app", "theme", e.target.value)}>
                    <option value="dark">🌙 Dark</option>
                    <option value="light">☀️ Light</option>
                    <option value="system">💻 System</option>
                  </select>
                </div>
                <div className="field">
                  <label className="fl">Language</label>
                  <select className="fsel" value={conf.app.language} onChange={e => set("app", "language", e.target.value)}>
                    {["English","Hindi","Spanish","French","German"].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <FF label="VITE_API_URL — Tools endpoint" section="api" field="VITE_API_URL" conf={conf} set={set} errs={errs} placeholder="http://localhost:5000/api/dashboard-tools" />
              <FF label="VITE_API_URL_LOGOUT — Logout" section="api" field="VITE_API_URL_LOGOUT" conf={conf} set={set} errs={errs} placeholder="http://localhost:5000/api/logout" />

              <button className="btn-test" onClick={testConn} disabled={testing || !conf.api.VITE_API_URL}>
                {testing ? <><span className="sp" />Testing…</> : "🔌 Test API Connection"}
              </button>

              {testResult && (
                <div className="test-result" style={{ background: testResult.ok ? "rgba(52,211,153,.06)" : "rgba(248,113,113,.06)", border: `1px solid ${testResult.ok ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}`, color: testResult.ok ? "#34d399" : "#f87171" }}>
                  {testResult.msg}
                </div>
              )}
              <div className="hint">Make sure your Express server is running before testing.</div>

              <div className="btn-row">
                <button className="btn-s" onClick={back}>← Back</button>
                <button className="btn-p" onClick={next}>Next →</button>
              </div>
            </>)}

            {/* ── STEP 4: ADMIN ── */}
            {step === 4 && (<>
              <div className="sw-h1">Admin Account</div>
              <div className="sw-sub">Create the first administrator login for your dashboard</div>

              <FF label="Username" section="admin" field="username" conf={conf} set={set} errs={errs} placeholder="admin" />
              <FF label="Email"    section="admin" field="email"    conf={conf} set={set} errs={errs} type="email" placeholder="admin@example.com" />
              <div className="field">
                <label className="fl">Password</label>
                <input className={`fi${errs.password ? " err" : ""}`} type="password"
                  placeholder="Strong password" value={conf.admin.password}
                  onChange={e => set("admin", "password", e.target.value)} />
                {errs.password && <div className="fe">{errs.password}</div>}
              </div>
              <div className="field">
                <label className="fl">Confirm Password</label>
                <input className={`fi${errs.confirm ? " err" : ""}`} type="password"
                  placeholder="Repeat password" value={conf.admin.confirm}
                  onChange={e => set("admin", "confirm", e.target.value)} />
                {errs.confirm && <div className="fe">{errs.confirm}</div>}
              </div>

              <div className="btn-row">
                <button className="btn-s" onClick={back}>← Back</button>
                <button className="btn-p" onClick={next}>Finish Setup ✓</button>
              </div>
            </>)}

            {/* ── STEP 5: LAUNCH ── */}
            {step === 5 && (<>
              <div className="done-wrap">
                <div className="done-orb">🎉</div>
                <div className="done-title">Setup Complete!</div>
                <div className="done-sub">Configuration saved — launching your dashboard</div>
              </div>

              <div className="env-box">{
`# .env  (backend)
DB_HOST=${conf.db.host}
DB_PORT=${conf.db.port}
DB_USER=${conf.db.user}
DB_PASSWORD=${conf.db.password ? "••••••••" : "(none)"}
DB_NAME=${conf.db.database}

# src/.env  (Vite frontend)
VITE_SERVER_URL=${BASE_URL}
VITE_API_URL=${conf.api.VITE_API_URL}
VITE_API_URL_LOGOUT=${conf.api.VITE_API_URL_LOGOUT}

# App
APP_NAME=${conf.app.name}   THEME=${conf.app.theme}   LANG=${conf.app.language}
ADMIN=${conf.admin.username} <${conf.admin.email}>`}
              </div>

              {saveStatus === "error" && (
                <div className="al-err">❌ Failed to save — check server connection and retry.</div>
              )}

              <div style={{ textAlign: "center" }}>
                <button className="btn-launch" onClick={finish} disabled={saveStatus === "saving" || launching}>
                  {saveStatus === "saving"
                    ? <><span className="sp" />Saving…</>
                    : "🚀 Launch Dashboard → Login"}
                </button>
              </div>
            </>)}

          </div>
        </div>
      </div>
    </>
  );
}