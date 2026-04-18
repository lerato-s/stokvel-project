import { useState, useRef, useCallback } from "react";
import "./group.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  return <div className={`toast${message ? " show" : ""}`}>{message}</div>;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, actions }) {
  return (
    <div
      className={`modal-overlay${open ? " open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>{title}</h3>
        {children}
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ members, meetings, groupConfig, onConfigureGroup }) {
  const amount = groupConfig.amount;
  const pool =
    amount && members.length
      ? `R ${(Number(amount) * members.length).toLocaleString()}`
      : "—";
  const upcoming = meetings
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Members</div>
          <div className="stat-value">{members.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Pool</div>
          <div className="stat-value">{pool}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next Payout</div>
          <div className="stat-value">{members.length ? "Slot 1" : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next Meeting</div>
          <div className="stat-value">
            {upcoming.length ? formatDate(upcoming[0].date) : "—"}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card group-summary">
          <div className="card-header">
            <h2>{groupConfig.name || "No Group Yet"}</h2>
            <span className={`badge${groupConfig.name ? " active" : ""}`}>
              {groupConfig.name ? "Active" : "Not Configured"}
            </span>
          </div>
          {[
            ["Contribution", amount && groupConfig.freq ? `R${amount} / ${groupConfig.freq}` : "—"],
            ["Meeting", groupConfig.meetWeek && groupConfig.meetDay ? `Every ${groupConfig.meetWeek} ${groupConfig.meetDay}` : "—"],
            ["Cycle", groupConfig.cycle || "—"],
            ["Payout Method", groupConfig.payoutMethod || "—"],
          ].map(([label, val]) => (
            <div className="group-detail" key={label}>
              <span>{label}</span>
              <strong>{val}</strong>
            </div>
          ))}
          <button className="btn-secondary" onClick={onConfigureGroup}>
            Configure Group
          </button>
        </div>

        <div className="card recent-activity">
          <h3 className="card-title">Recent Activity</h3>
          <ActivityList members={members} meetings={meetings} />
        </div>
      </div>
    </>
  );
}

function ActivityList({ members, meetings }) {
  const now = new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
  const items = [
    ...members.slice().reverse().slice(0, 4).map((m) => ({
      color: "blue",
      text: `${m.name} invited as ${m.role}`,
    })),
    ...meetings.slice().reverse().slice(0, 3).map((m) => ({
      color: "blue",
      text: `Meeting scheduled for ${formatDate(m.date)}`,
    })),
  ];

  if (!items.length) {
    return (
      <ul className="activity-list">
        <li>
          <span className="dot" style={{ background: "var(--text-dim)" }} />
          <span style={{ color: "var(--text-dim)" }}>
            No activity yet — invite members to get started.
          </span>
        </li>
      </ul>
    );
  }

  return (
    <ul className="activity-list">
      {items.map((it, i) => (
        <li key={i}>
          <span className={`dot ${it.color}`} />
          {it.text} — {now}
        </li>
      ))}
    </ul>
  );
}

// ── Create Group ──────────────────────────────────────────────────────────────
function CreateGroup({ groupConfig, onSave }) {
  const [form, setForm] = useState({
    name: "", amount: "", freq: "", cycle: "", max: "",
    meetFreq: "", meetDay: "", meetWeek: "", payoutMethod: "", rules: "",
    ...groupConfig,
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const handleReset = () =>
    setForm({
      name: "", amount: "", freq: "", cycle: "", max: "",
      meetFreq: "", meetDay: "", meetWeek: "", payoutMethod: "", rules: "",
    });

  return (
    <div className="form-page">
      <div className="form-intro">
        <h2>Configure Your Stokvel</h2>
        <p>Set up the rules of your group. These will be visible to all members.</p>
      </div>
      <form className="stokvel-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field full">
            <label>Group Name</label>
            <input value={form.name} onChange={set("name")} placeholder="e.g. Mzansi Savers" />
          </div>
          <div className="field">
            <label>Contribution Amount (ZAR)</label>
            <input type="number" value={form.amount} onChange={set("amount")} placeholder="e.g. 500" min="1" />
          </div>
          <div className="field">
            <label>Contribution Frequency</label>
            <select value={form.freq} onChange={set("freq")}>
              <option value="">— Select —</option>
              {["Monthly", "Weekly", "Bi-weekly"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Cycle Duration</label>
            <select value={form.cycle} onChange={set("cycle")}>
              <option value="">— Select —</option>
              {["6 Months", "12 Months", "18 Months", "24 Months"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Max Members</label>
            <input type="number" value={form.max} onChange={set("max")} placeholder="e.g. 12" min="2" />
          </div>
          <div className="field">
            <label>Meeting Frequency</label>
            <select value={form.meetFreq} onChange={set("meetFreq")}>
              <option value="">— Select —</option>
              {["Weekly", "Monthly", "Quarterly"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Meeting Day</label>
            <select value={form.meetDay} onChange={set("meetDay")}>
              <option value="">— Select —</option>
              {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Meeting Week of Month</label>
            <select value={form.meetWeek} onChange={set("meetWeek")}>
              <option value="">— Select —</option>
              {["1st","2nd","3rd","4th","Last"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field full">
            <label>Payout Method</label>
            <div className="radio-group">
              {["Fixed Order (Roster)", "Lucky Draw", "Need-Based (Vote)"].map((v) => (
                <label
                  key={v}
                  className={`radio-option${form.payoutMethod === v ? " selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="payout"
                    value={v}
                    checked={form.payoutMethod === v}
                    onChange={() => setForm((f) => ({ ...f, payoutMethod: v }))}
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div className="field full">
            <label>Group Rules / Notes</label>
            <textarea
              rows="3"
              value={form.rules}
              onChange={set("rules")}
              placeholder="e.g. Late payments will incur a R50 penalty..."
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">Save Configuration</button>
          <button type="button" className="btn-ghost" onClick={handleReset}>Reset</button>
        </div>
      </form>
    </div>
  );
}

// ── Members ───────────────────────────────────────────────────────────────────
function Members({ members, onInvite }) {
  return (
    <>
      <div className="section-header-bar">
        <h2>Members</h2>
        <button className="btn-invite" onClick={onInvite}>+ Invite New Member</button>
      </div>
      <div className="members-grid">
        {members.length === 0 ? (
          <p className="empty-state">No members yet. Invite someone to get started.</p>
        ) : (
          members.map((m, i) => (
            <div className="member-card" key={i}>
              <div className={`member-avatar ${m.status}`}>{m.initials}</div>
              <div className="member-info">
                <strong>{m.name}</strong>
                <span className="member-role">{m.role}</span>
              </div>
              <span className={`status-badge ${m.status}`}>{m.status}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ── Payouts ───────────────────────────────────────────────────────────────────
function Payouts({ members, groupConfig, onReorder }) {
  const dragRef = useRef(null);
  const pool =
    groupConfig.amount && members.length
      ? `R ${(Number(groupConfig.amount) * members.length).toLocaleString()}`
      : "—";

  const handleDragStart = (i) => { dragRef.current = i; };
  const handleDrop = (i) => {
    if (dragRef.current === null || dragRef.current === i) return;
    const reordered = [...members];
    const [moved] = reordered.splice(dragRef.current, 1);
    reordered.splice(i, 0, moved);
    onReorder(reordered);
    dragRef.current = null;
  };

  return (
    <>
      <div className="section-header-bar">
        <h2>Payout Roster</h2>
        <span className="hint">Drag to reorder</span>
      </div>
      <div className="payout-list">
        {members.length === 0 ? (
          <p className="empty-state">No members added yet.</p>
        ) : (
          members.map((m, i) => (
            <div
              key={i}
              className="payout-row"
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
            >
              <span className="payout-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="payout-avatar">{m.initials}</div>
              <div className="payout-name">
                <strong>{m.name}</strong>
                <span>{m.role}</span>
              </div>
              <span className="payout-amount">{pool}</span>
              <span className="payout-status">Pending</span>
              <span className="drag-handle">⠿</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ── Meetings ──────────────────────────────────────────────────────────────────
function Meetings({ meetings, onAddMeeting }) {
  return (
    <>
      <div className="section-header-bar">
        <h2>Meeting Schedule</h2>
        <button className="btn-invite" onClick={onAddMeeting}>+ Add Meeting</button>
      </div>
      <div className="meetings-table-wrap">
        <table className="meetings-table">
          <thead>
            <tr>
              {["#", "Date", "Time", "Venue", "Status", "Notes"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">No meetings scheduled yet.</td>
              </tr>
            ) : (
              meetings.map((m, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{formatDate(m.date)}</td>
                  <td>{m.time || "—"}</td>
                  <td>{m.venue}</td>
                  <td><span className={`status-badge ${m.status}`}>{m.status}</span></td>
                  <td>{m.notes || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function Group() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [groupConfig, setGroupConfig] = useState({});
  const [toast, setToast] = useState("");
  const [inviteModal, setInviteModal] = useState(false);
  const [meetingModal, setMeetingModal] = useState(false);

  const [inviteName, setInviteName] = useState("");
  const [inviteContact, setInviteContact] = useState("");

  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [meetVenue, setMeetVenue] = useState("");
  const [meetNotes, setMeetNotes] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  const navItems = [
    { id: "dashboard",    icon: "⌂", label: "Dashboard" },
    { id: "create-group", icon: "✦", label: "Create Group" },
    { id: "members",      icon: "⬡", label: "Members" },
    { id: "payouts",      icon: "◎", label: "Payout Order" },
    { id: "meetings",     icon: "◷", label: "Meetings" },
  ];

  const sectionTitle = navItems.find((n) => n.id === activeSection)?.label || "";

  const sendInvite = () => {
    if (!inviteName.trim() || !inviteContact.trim()) {
      showToast("Please fill in all fields");
      return;
    }
    setMembers((prev) => [
      ...prev,
      { name: inviteName.trim(), role: "Member", status: "pending", initials: getInitials(inviteName) },
    ]);
    setInviteName("");
    setInviteContact("");
    setInviteModal(false);
    showToast(`✓ Invite sent to ${inviteName.trim()}`);
  };

  const addMeeting = () => {
    if (!meetDate || !meetVenue.trim()) {
      showToast("Please add date and venue");
      return;
    }
    setMeetings((prev) =>
      [...prev, { date: meetDate, time: meetTime, venue: meetVenue.trim(), status: "upcoming", notes: meetNotes.trim() }]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    );
    setMeetDate(""); setMeetTime(""); setMeetVenue(""); setMeetNotes("");
    setMeetingModal(false);
    showToast("✓ Meeting added");
  };

  const saveConfig = (form) => {
    if (!form.name.trim()) { showToast("Please enter a group name"); return; }
    setGroupConfig(form);
    showToast("✓ Group configuration saved");
    setActiveSection("dashboard");
  };

  return (
    <>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">Stokvel</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.id}
              href="#"
              className={`nav-item${activeSection === item.id ? " active" : ""}`}
              onClick={(e) => { e.preventDefault(); setActiveSection(item.id); }}
            >
              <span className="nav-icon">{item.icon}</span> {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="admin-badge">ADMIN</div>
          <p className="admin-name">—</p>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-title">{sectionTitle}</div>
          <div className="topbar-actions">
            <button className="btn-invite" onClick={() => setInviteModal(true)}>
              + Invite Member
            </button>
          </div>
        </header>

        {/* Sections use the same .section / .section.active pattern as the original CSS */}
        <section className={`section${activeSection === "dashboard" ? " active" : ""}`}>
          <Dashboard
            members={members}
            meetings={meetings}
            groupConfig={groupConfig}
            onConfigureGroup={() => setActiveSection("create-group")}
          />
        </section>

        <section className={`section${activeSection === "create-group" ? " active" : ""}`}>
          <CreateGroup groupConfig={groupConfig} onSave={saveConfig} />
        </section>

        <section className={`section${activeSection === "members" ? " active" : ""}`}>
          <Members members={members} onInvite={() => setInviteModal(true)} />
        </section>

        <section className={`section${activeSection === "payouts" ? " active" : ""}`}>
          <Payouts members={members} groupConfig={groupConfig} onReorder={setMembers} />
        </section>

        <section className={`section${activeSection === "meetings" ? " active" : ""}`}>
          <Meetings meetings={meetings} onAddMeeting={() => setMeetingModal(true)} />
        </section>
      </main>

      {/* Invite Modal */}
      <Modal
        open={inviteModal}
        onClose={() => setInviteModal(false)}
        title="Invite a Member"
        actions={[
          <button key="send" className="btn-primary" onClick={sendInvite}>Send Invite</button>,
          <button key="cancel" className="btn-ghost" onClick={() => setInviteModal(false)}>Cancel</button>,
        ]}
      >
        <Field label="Full Name">
          <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Zanele Dlamini" />
        </Field>
        <Field label="Phone / Email">
          <input value={inviteContact} onChange={(e) => setInviteContact(e.target.value)} placeholder="e.g. 082 000 0000" />
        </Field>
      </Modal>

      {/* Meeting Modal */}
      <Modal
        open={meetingModal}
        onClose={() => setMeetingModal(false)}
        title="Add Meeting"
        actions={[
          <button key="add" className="btn-primary" onClick={addMeeting}>Add Meeting</button>,
          <button key="cancel" className="btn-ghost" onClick={() => setMeetingModal(false)}>Cancel</button>,
        ]}
      >
        <Field label="Date">
          <input type="date" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} />
        </Field>
        <Field label="Time">
          <input type="time" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} />
        </Field>
        <Field label="Venue">
          <input value={meetVenue} onChange={(e) => setMeetVenue(e.target.value)} placeholder="e.g. Community Hall / Zoom" />
        </Field>
        <Field label="Notes">
          <input value={meetNotes} onChange={(e) => setMeetNotes(e.target.value)} placeholder="Optional agenda..." />
        </Field>
      </Modal>

      <Toast message={toast} />
    </>
  );
}