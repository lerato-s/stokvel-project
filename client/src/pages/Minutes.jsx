import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./minutes.css";
import "./g.css";

const API = import.meta.env.VITE_API_URL;

function authHeader() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = user.token || user.accessToken || user.user?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Minutes Document (read-only formatted view) ───────────────────────────────
function MinutesDocument({ meeting, members, minutes }) {
  const attendance = minutes.attendance || {};
  const present = members.filter((m) => attendance[m._id] === "present");
  const absent  = members.filter((m) => attendance[m._id] === "absent");
  const late    = members.filter((m) => attendance[m._id] === "late");

  return (
    <div className="minutes-document">
      <div className="minutes-doc-header">
        <div className="minutes-doc-logo">◈ Stokvel Manager</div>
        <h1 className="minutes-doc-title">Meeting Minutes</h1>
        <div className="minutes-doc-meta">
          <span>Date: {formatDate(meeting.date)}</span>
          <span>Time: {meeting.time || "—"}</span>
          <span>Venue: {meeting.venue || "—"}</span>
          {meeting.minutesSentAt && (
            <span>Recorded: {formatDateTime(meeting.minutesSentAt)}</span>
          )}
        </div>
      </div>

      <hr className="minutes-doc-divider" />

      <section className="minutes-doc-section">
        <h2 className="minutes-doc-section-title">Attendance</h2>
        <div className="minutes-doc-attendance-grid">
          <div>
            <h4 className="minutes-doc-attendance-label present-label">✓ Present ({present.length})</h4>
            {present.length === 0 ? <p className="minutes-doc-empty">None recorded</p> : (
              <ul className="minutes-doc-list">
                {present.map((m) => (
                  <li key={m._id}>{m.name} <span className="minutes-doc-role">({m.role})</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="minutes-doc-attendance-label late-label">◷ Late ({late.length})</h4>
            {late.length === 0 ? <p className="minutes-doc-empty">None recorded</p> : (
              <ul className="minutes-doc-list">
                {late.map((m) => (
                  <li key={m._id}>{m.name} <span className="minutes-doc-role">({m.role})</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="minutes-doc-attendance-label absent-label">✕ Absent ({absent.length})</h4>
            {absent.length === 0 ? <p className="minutes-doc-empty">None recorded</p> : (
              <ul className="minutes-doc-list">
                {absent.map((m) => (
                  <li key={m._id}>{m.name} <span className="minutes-doc-role">({m.role})</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <hr className="minutes-doc-divider" />

      {meeting.notes && (
        <>
          <section className="minutes-doc-section">
            <h2 className="minutes-doc-section-title">Agenda</h2>
            <p className="minutes-doc-body">{meeting.notes}</p>
          </section>
          <hr className="minutes-doc-divider" />
        </>
      )}

      <section className="minutes-doc-section">
        <h2 className="minutes-doc-section-title">Summary</h2>
        {minutes.summary
          ? <p className="minutes-doc-body">{minutes.summary}</p>
          : <p className="minutes-doc-empty">No summary recorded.</p>}
      </section>

      <hr className="minutes-doc-divider" />

      <section className="minutes-doc-section">
        <h2 className="minutes-doc-section-title">Decisions Made</h2>
        {!minutes.decisions || minutes.decisions.length === 0
          ? <p className="minutes-doc-empty">No decisions recorded.</p>
          : (
            <ol className="minutes-doc-numbered">
              {minutes.decisions.map((d, i) => <li key={i}>{d}</li>)}
            </ol>
          )}
      </section>

      <hr className="minutes-doc-divider" />

      <section className="minutes-doc-section">
        <h2 className="minutes-doc-section-title">Action Items</h2>
        {!minutes.actions || minutes.actions.length === 0
          ? <p className="minutes-doc-empty">No action items recorded.</p>
          : (
            <ol className="minutes-doc-numbered">
              {minutes.actions.map((a, i) => <li key={i}>{a}</li>)}
            </ol>
          )}
      </section>

      <hr className="minutes-doc-divider" />

      <div className="minutes-doc-footer">
        <span>Stokvel Manager — Official Meeting Record</span>
        <span>{formatDate(meeting.date)}</span>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function MeetingMinutes() {
  const { meetingId } = useParams();
  const navigate      = useNavigate();

  const currentUser      = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserEmail = currentUser.email || currentUser.user?.email || "";
  const currentUsername  = currentUser.username || currentUser.user?.username || "";

  const [meeting,    setMeeting]    = useState(null);
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState("");
  const [viewDoc,    setViewDoc]    = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // form state
  const [summary,    setSummary]    = useState("");
  const [decisions,  setDecisions]  = useState([""]);
  const [actions,    setActions]    = useState([""]);
  const [attendance, setAttendance] = useState({});

  const hasMinutes = meeting?.minutes?.summary ||
    (meeting?.minutes?.decisions?.length > 0) ||
    (meeting?.minutes?.actions?.length > 0);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    async function load() {
      try {
        const meetRes = await axios.get(
          `${API}/api/meetings/${meetingId}`,
          { headers: authHeader() }
        );
        const m = meetRes.data;
        setMeeting(m);

        const membersRes = await axios.get(
          `${API}/api/members?groupId=${m.group}`,
          { headers: authHeader() }
        );
        const memberList = membersRes.data;
        setMembers(memberList);

        if (m.minutes) {
          setSummary(m.minutes.summary || "");
          setDecisions(m.minutes.decisions?.length > 0 ? m.minutes.decisions : [""]);
          setActions(m.minutes.actions?.length > 0 ? m.minutes.actions : [""]);
          const savedAttendance = m.minutes.attendance || {};
          const init = {};
          memberList.forEach((mem) => {
            init[mem._id] = savedAttendance[mem._id] || "present";
          });
          setAttendance(init);
          if (m.minutes.summary || m.minutes.decisions?.length > 0) setViewDoc(true);
        } else {
          const init = {};
          memberList.forEach((mem) => { init[mem._id] = "present"; });
          setAttendance(init);
        }
      } catch (err) {
        showToast("Failed to load meeting: " + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [meetingId]);

  function setMemberAttendance(id, status) {
    setAttendance((prev) => ({ ...prev, [id]: status }));
  }

  function addDecision()    { setDecisions((d) => [...d, ""]); }
  function addAction()      { setActions((a)   => [...a, ""]); }
  function removeDecision(i){ setDecisions((d) => d.filter((_, idx) => idx !== i)); }
  function removeAction(i)  { setActions((a)   => a.filter((_, idx) => idx !== i)); }
  function updateDecision(i, v) { setDecisions((d) => d.map((x, idx) => idx === i ? v : x)); }
  function updateAction(i, v)   { setActions((a)   => a.map((x, idx) => idx === i ? v : x)); }

  async function handleSave() {
    if (!summary.trim()) { showToast("Please add a summary before saving."); return; }
    setSaving(true);
    try {
      const { data } = await axios.patch(
        `${API}/api/meetings/${meetingId}`,
        {
          minutes: {
            summary,
            decisions: decisions.filter((d) => d.trim()),
            actions:   actions.filter((a) => a.trim()),
            attendance,
          },
          status: "completed",
        },
        { headers: authHeader() }
      );
      setMeeting(data);
      showToast("✓ Minutes saved successfully");
      setViewDoc(true);
    } catch (err) {
      showToast("Failed to save: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  }

  const present = members.filter((m) => attendance[m._id] === "present");
  const absent  = members.filter((m) => attendance[m._id] === "absent");
  const late    = members.filter((m) => attendance[m._id] === "late");

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="app-layout">

      {/* ── Topbar (matches Group.jsx) ── */}
      <header className="topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
        <span className="logo-icon">◈</span>
        <span className="logo-text">Stokvel</span>
        
      </header>

      <div className="app-body">

        {/* ── Sidebar overlay (mobile) ── */}
        <div
          className={`sidebar-overlay${sidebarOpen ? " open" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── Sidebar ── */}
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`} aria-label="Navigation">
          <nav>
            <ul className="sidebar-nav">
              
              {hasMinutes && (
                <>
                  <li>
                    <a
                      href="#edit"
                      className={`nav-item${!viewDoc ? " active" : ""}`}
                      onClick={(e) => { e.preventDefault(); setViewDoc(false); setSidebarOpen(false); }}
                    >
                      
                      Edit Minutes
                    </a>
                  </li>
                  <li>
                    <a
                      href="#doc"
                      className={`nav-item${viewDoc ? " active" : ""}`}
                      onClick={(e) => { e.preventDefault(); setViewDoc(true); setSidebarOpen(false); }}
                    >
                      <span className="nav-icon">📄</span>
                      View Document
                    </a>
                  </li>
                </>
              )}
            </ul>
          </nav>

          {/* Sidebar user footer */}
          <footer className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {getInitials(currentUsername || currentUserEmail || "U")}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{currentUsername || "User"}</span>
                <span className="sidebar-user-email">{currentUserEmail}</span>
              </div>
            </div>
          </footer>
        </aside>

        {/* ── Main content ── */}
        <div className="main">
          <main id="main-content">

            {/* Toast */}
            {toast && <div className="minutes-toast">{toast}</div>}

            {loading ? (
              <p className="empty-state">Loading meeting…</p>
            ) : (
              <div className="minutes-page">

                {/* Page header */}
                <div className="section-header-bar">
                  <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
                  
                  {hasMinutes && (
                    <button
                      className="btn-secondary"
                      onClick={() => setViewDoc((v) => !v)}
                    >
                      {viewDoc ? " Edit Minutes" : "📄 "}
                    </button>
                  )}
                </div>

                {/* Meeting info strip */}
                

                {/* ── Document view ── */}
                {viewDoc && meeting.minutes ? (
                  <MinutesDocument
                    meeting={meeting}
                    members={members}
                    minutes={meeting.minutes}
                  />
                ) : (

                  /* ── Edit / record form ── */
                  <div className="minutes-form">

                    {/* Summary */}
                    <div className="card minutes-section">
                      <h3 className="minutes-section-title">Summary</h3>
                      <textarea
                        className="minutes-textarea"
                        rows={4}
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Write a brief summary of what was discussed..."
                      />
                    </div>

                    {/* Decisions */}
                    <div className="card minutes-section">
                      <h3 className="minutes-section-title">Decisions Made</h3>
                      {decisions.map((d, i) => (
                        <div key={i} className="minutes-list-row">
                          <span className="minutes-list-num">{i + 1}.</span>
                          <input
                            className="minutes-input"
                            value={d}
                            onChange={(e) => updateDecision(i, e.target.value)}
                            placeholder="e.g. Payout schedule confirmed for next month"
                          />
                          {decisions.length > 1 && (
                            <button
                              className="minutes-remove-btn"
                              onClick={() => removeDecision(i)}
                              aria-label="Remove"
                            >✕</button>
                          )}
                        </div>
                      ))}
                      <button className="btn-ghost minutes-add-btn" onClick={addDecision}>
                        + Add Decision
                      </button>
                    </div>

                    {/* Action items */}
                    <div className="card minutes-section">
                      <h3 className="minutes-section-title">Action Items</h3>
                      {actions.map((a, i) => (
                        <div key={i} className="minutes-list-row">
                          <span className="minutes-list-num">{i + 1}.</span>
                          <input
                            className="minutes-input"
                            value={a}
                            onChange={(e) => updateAction(i, e.target.value)}
                            placeholder="e.g. Treasurer to send reminders by Friday"
                          />
                          {actions.length > 1 && (
                            <button
                              className="minutes-remove-btn"
                              onClick={() => removeAction(i)}
                              aria-label="Remove"
                            >✕</button>
                          )}
                        </div>
                      ))}
                      <button className="btn-ghost minutes-add-btn" onClick={addAction}>
                        + Add Action Item
                      </button>
                    </div>

                    {/* Attendance */}
                    <div className="card minutes-section">
                      <div className="minutes-attendance-header">
                        <h3 className="minutes-section-title">Attendance</h3>
                        <div className="minutes-attendance-summary">
                          <span className="present-label">✓ {present.length} present</span>
                          <span className="late-label">◷ {late.length} late</span>
                          <span className="absent-label">✕ {absent.length} absent</span>
                        </div>
                      </div>
                      <ul className="minutes-attendance-list">
                        {members.map((m) => (
                          <li key={m._id} className="minutes-attendance-row">
                            <div className="minutes-member-info">
                              <div
                                className="payout-avatar"
                                style={{ width: 32, height: 32, fontSize: 12 }}
                              >
                                {m.initials}
                              </div>
                              <div>
                                <strong style={{ fontSize: 13 }}>{m.name}</strong>
                                <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: 6 }}>
                                  {m.role}
                                </span>
                              </div>
                            </div>
                            <div className="minutes-attendance-btns">
                              {["present", "late", "absent"].map((s) => (
                                <button
                                  key={s}
                                  className={`minutes-att-btn ${s}${attendance[m._id] === s ? " selected" : ""}`}
                                  onClick={() => setMemberAttendance(m._id, s)}
                                >
                                  {s === "present" ? "✓ Present" : s === "late" ? "◷ Late" : "✕ Absent"}
                                </button>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Save row */}
                    <div className="minutes-save-row">
                      <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ minWidth: 200 }}
                      >
                        {saving ? "Saving…" : hasMinutes ? "✓ Update Minutes" : "✓ Save & Complete Meeting"}
                      </button>
                      {hasMinutes && (
                        <button className="btn-secondary" onClick={() => setViewDoc(true)}>
                          📄 
                        </button>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}