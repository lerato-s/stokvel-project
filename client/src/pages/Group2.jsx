// Group.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import GroupForm from "../components/GroupForm";
import "./group.css";

const API = import.meta.env.VITE_API_URL;

function authHeader() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.token ? { Authorization: `Bearer ${user.token}` } : {};
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function getInitials(name) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  return (
    <output role="status" aria-live="polite" className={`toast${message ? " show" : ""}`}>
      {message}
    </output>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, actions }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <article className="modal">
        <header className="modal-header">
          <h3 id="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="modal-body">{children}</div>
        <footer className="modal-actions">{actions}</footer>
      </article>
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

// ── Groups list (home screen) ─────────────────────────────────────────────────
function GroupsList({ groups, loading, onSelect, onNew }) {
  return (
    <section className="groups-list-page" aria-labelledby="groups-heading">
      <header className="groups-list-header">
        <h2 id="groups-heading">My Stokvels</h2>
        <button className="btn-primary" onClick={onNew}>+ New Group</button>
      </header>

      {loading ? (
        <p className="empty-state">Loading groups…</p>
      ) : groups.length === 0 ? (
        <div className="empty-groups">
          <p>You haven't created any stokvels yet.</p>
          <button className="btn-primary" onClick={onNew}>Create your first group</button>
        </div>
      ) : (
        <ul className="groups-cards" aria-label="Your stokvel groups">
          {groups.map((g) => (
            <li key={g._id}>
              <button className="group-card-btn" onClick={() => onSelect(g)}>
                <div className="group-card-avatar">{getInitials(g.name)}</div>
                <div className="group-card-info">
                  <strong>{g.name}</strong>
                  <span>{g.freq ? `R${g.amount} · ${g.freq}` : "Not fully configured"}</span>
                </div>
                <span className="group-card-arrow">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Dashboard (single group detail) ──────────────────────────────────────────
function Dashboard({ group, members, meetings, onBack }) {
  const pool =
    group.amount && members.length
      ? `R ${(Number(group.amount) * members.length).toLocaleString()}`
      : "—";

  const upcoming = meetings
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const stats = [
    { label: "Total Members", value: members.length },
    { label: "Monthly Pool",  value: pool },
    { label: "Next Payout",   value: members.length ? "Slot 1" : "—" },
    { label: "Next Meeting",  value: upcoming.length ? formatDate(upcoming[0].date) : "—" },
  ];

  const details = [
    ["Contribution",  group.amount && group.freq ? `R${group.amount} / ${group.freq}` : "—"],
    ["Meeting",       group.meetWeek && group.meetDay ? `Every ${group.meetWeek} ${group.meetDay}` : "—"],
    ["Cycle",         group.cycle || "—"],
    ["Payout Method", group.payoutMethod || "—"],
    ["Max Members",   group.max || "—"],
  ];

  const now = new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
  const activity = [
    ...members.slice().reverse().slice(0, 4).map((m) => `${m.name} invited as ${m.role}`),
    ...meetings.slice().reverse().slice(0, 3).map((m) => `Meeting scheduled for ${formatDate(m.date)}`),
  ];

  return (
    <>
      <div className="section-header-bar">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>{group.name}</h2>
        <span className="badge active">Active</span>
      </div>

      <ul className="stats-row" aria-label="Group statistics">
        {stats.map(({ label, value }) => (
          <li key={label} className="stat-card">
            <span className="stat-label">{label}</span>
            <strong className="stat-value">{value}</strong>
          </li>
        ))}
      </ul>

      <div className="dashboard-grid">
        <article className="card group-summary">
          <header className="card-header">
            <h3>Group Details</h3>
          </header>
          <dl className="group-details">
            {details.map(([label, val]) => (
              <div className="group-detail" key={label}>
                <dt>{label}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
          {group.rules && (
            <div className="group-rules">
              <strong>Rules</strong>
              <p>{group.rules}</p>
            </div>
          )}
        </article>

        <article className="card recent-activity">
          <h3 className="card-title">Recent Activity</h3>
          {activity.length === 0 ? (
            <p style={{ color: "var(--text-dim)" }}>No activity yet.</p>
          ) : (
            <ul className="activity-list">
              {activity.map((text, i) => (
                <li key={i}>
                  <span className="dot blue" aria-hidden="true" />
                  {text} — <time>{now}</time>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </>
  );
}

// ── Members ───────────────────────────────────────────────────────────────────
function Members({ members, onInvite }) {
  return (
    <section aria-labelledby="members-heading">
      <header className="section-header-bar">
        <h2 id="members-heading">Members</h2>
        <button className="btn-invite" onClick={onInvite}>+ Invite New Member</button>
      </header>
      {members.length === 0 ? (
        <p className="empty-state">No members yet. Invite someone to get started.</p>
      ) : (
        <ul className="members-grid">
          {members.map((m) => (
            <li key={m._id} className="member-card">
              <div className={`member-avatar ${m.status}`}>{m.initials}</div>
              <div className="member-info">
                <strong>{m.name}</strong>
                <span className="member-role">{m.role}</span>
              </div>
              <span className={`status-badge ${m.status}`}>{m.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Payouts ───────────────────────────────────────────────────────────────────
function Payouts({ members, group, onReorder }) {
  const dragRef = useRef(null);
  const pool =
    group?.amount && members.length
      ? `R ${(Number(group.amount) * members.length).toLocaleString()}`
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
    <section aria-labelledby="payouts-heading">
      <header className="section-header-bar">
        <h2 id="payouts-heading">Payout Roster</h2>
        <span className="hint">Drag to reorder</span>
      </header>
      {members.length === 0 ? (
        <p className="empty-state">No members added yet.</p>
      ) : (
        <ol className="payout-list">
          {members.map((m, i) => (
            <li
              key={m._id}
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
              <span className="drag-handle" aria-hidden="true">⠿</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ── Meetings ──────────────────────────────────────────────────────────────────
function Meetings({ meetings, onAddMeeting }) {
  return (
    <section aria-labelledby="meetings-heading">
      <header className="section-header-bar">
        <h2 id="meetings-heading">Meeting Schedule</h2>
        <button className="btn-invite" onClick={onAddMeeting}>+ Add Meeting</button>
      </header>
      <div className="meetings-table-wrap">
        <table className="meetings-table">
          <caption className="sr-only">Scheduled meetings</caption>
          <thead>
            <tr>
              {["#","Date","Time","Venue","Status","Notes"].map((h) => (
                <th key={h} scope="col">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 ? (
              <tr><td colSpan={6} className="empty-state">No meetings scheduled yet.</td></tr>
            ) : (
              meetings.map((m, i) => (
                <tr key={m._id}>
                  <td>{i + 1}</td>
                  <td><time dateTime={m.date}>{formatDate(m.date)}</time></td>
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
    </section>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "groups",    icon: "⌂", label: "My Groups" },
  { id: "members",   icon: "⬡", label: "Members" },
  { id: "payouts",   icon: "◎", label: "Payout Order" },
  { id: "meetings",  icon: "◷", label: "Meetings" },
];

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Group() {
  const [activeSection,  setActiveSection]  = useState("groups");
  const [groups,         setGroups]         = useState([]);
  const [selectedGroup,  setSelectedGroup]  = useState(null);
  const [members,        setMembers]        = useState([]);
  const [meetings,       setMeetings]       = useState([]);
  const [loadingGroups,  setLoadingGroups]  = useState(true);
  const [showGroupForm,  setShowGroupForm]  = useState(false);
  const [toast,          setToast]          = useState("");
  const [inviteModal,    setInviteModal]    = useState(false);
  const [meetingModal,   setMeetingModal]   = useState(false);

  const [inviteName,    setInviteName]    = useState("");
  const [inviteContact, setInviteContact] = useState("");
  const [meetDate,      setMeetDate]      = useState("");
  const [meetTime,      setMeetTime]      = useState("");
  const [meetVenue,     setMeetVenue]     = useState("");
  const [meetNotes,     setMeetNotes]     = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // Load all groups on mount
  useEffect(() => {
    axios.get(`${API}/api/groups`, { headers: authHeader() })
      .then((r) => setGroups(r.data))
      .catch(() => showToast("Failed to load groups"))
      .finally(() => setLoadingGroups(false));
  }, []);

  // Load members + meetings when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;
    const h = { headers: authHeader() };
    Promise.all([
      axios.get(`${API}/api/members?groupId=${selectedGroup._id}`, h),
      axios.get(`${API}/api/meetings?groupId=${selectedGroup._id}`, h),
    ])
      .then(([mRes, mtRes]) => {
        setMembers(mRes.data);
        setMeetings(mtRes.data);
      })
      .catch(() => showToast("Failed to load group data"));
  }, [selectedGroup]);

  function handleSelectGroup(g) {
    setSelectedGroup(g);
    setActiveSection("dashboard");
  }

  function handleBack() {
    setSelectedGroup(null);
    setMembers([]);
    setMeetings([]);
    setActiveSection("groups");
  }

  async function saveGroup(form) {
    try {
      const { data } = await axios.post(`${API}/api/group`, form, { headers: authHeader() });
      setGroups((prev) => [data, ...prev]);
      setShowGroupForm(false);
      showToast(`✓ "${data.name}" created`);
    } catch (err) {
      showToast("Failed to save: " + (err.response?.data?.error || err.message));
    }
  }

  async function sendInvite() {
    if (!inviteName.trim() || !inviteContact.trim()) {
      showToast("Please fill in all fields"); return;
    }
    try {
      const { data } = await axios.post(
        `${API}/api/members`,
        { name: inviteName, contact: inviteContact, groupId: selectedGroup._id },
        { headers: authHeader() }
      );
      setMembers((prev) => [...prev, data]);
      setInviteName(""); setInviteContact("");
      setInviteModal(false);
      showToast(`✓ Invite sent to ${inviteName.trim()}`);
    } catch (err) {
      showToast("Failed: " + (err.response?.data?.error || err.message));
    }
  }

  async function addMeeting() {
    if (!meetDate || !meetVenue.trim()) {
      showToast("Please add date and venue"); return;
    }
    try {
      const { data } = await axios.post(
        `${API}/api/meetings`,
        { date: meetDate, time: meetTime, venue: meetVenue, notes: meetNotes, groupId: selectedGroup._id },
        { headers: authHeader() }
      );
      setMeetings((prev) => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setMeetDate(""); setMeetTime(""); setMeetVenue(""); setMeetNotes("");
      setMeetingModal(false);
      showToast("✓ Meeting added");
    } catch (err) {
      showToast("Failed: " + (err.response?.data?.error || err.message));
    }
  }

  async function handleReorder(reordered) {
    setMembers(reordered);
    try {
      await axios.put(
        `${API}/api/members/reorder`,
        { order: reordered.map((m, i) => ({ id: m._id, slot: i + 1 })) },
        { headers: authHeader() }
      );
    } catch {
      showToast("Failed to save order");
    }
  }

  const topbarTitle =
    activeSection === "groups"    ? "My Stokvels" :
    activeSection === "dashboard" ? selectedGroup?.name :
    NAV_ITEMS.find((n) => n.id === activeSection)?.label || "";

  // Show create group form fullscreen
  if (showGroupForm) {
    return (
      <div className="app-layout">
        <aside className="sidebar" aria-label="Navigation">
          <div className="sidebar-logo" aria-hidden="true">
            <span className="logo-icon">◈</span>
            <span className="logo-text">Stokvel</span>
          </div>
        </aside>
        <div className="main">
          <header className="topbar">
            <button className="btn-back" onClick={() => setShowGroupForm(false)}>← Back</button>
            <h1 className="topbar-title">New Group</h1>
          </header>
          <main>
            <GroupForm onSave={saveGroup} onCancel={() => setShowGroupForm(false)} />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">

      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-logo" aria-hidden="true">
          <span className="logo-icon">◈</span>
          <span className="logo-text">Stokvel</span>
        </div>

        <nav aria-label="Sections">
          <ul className="sidebar-nav">
            {/* Always show My Groups; only show group-specific nav if a group is selected */}
            {NAV_ITEMS.filter((n) => n.id === "groups" || selectedGroup).map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`nav-item${activeSection === item.id || (item.id === "groups" && activeSection === "dashboard") ? " active" : ""}`}
                  aria-current={activeSection === item.id ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.id === "groups") handleBack();
                    else setActiveSection(item.id);
                  }}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="sidebar-footer">
          <span className="admin-badge">ADMIN</span>
        </footer>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1 className="topbar-title">{topbarTitle}</h1>
          {selectedGroup && activeSection === "members" && (
            <button className="btn-invite" onClick={() => setInviteModal(true)}>
              + Invite Member
            </button>
          )}
        </header>

        <main id="main-content">
          <div hidden={activeSection !== "groups"}>
            <GroupsList
              groups={groups}
              loading={loadingGroups}
              onSelect={handleSelectGroup}
              onNew={() => setShowGroupForm(true)}
            />
          </div>

          <div hidden={activeSection !== "dashboard"}>
            {selectedGroup && (
              <Dashboard
                group={selectedGroup}
                members={members}
                meetings={meetings}
                onBack={handleBack}
              />
            )}
          </div>

          <div hidden={activeSection !== "members"}>
            <Members members={members} onInvite={() => setInviteModal(true)} />
          </div>

          <div hidden={activeSection !== "payouts"}>
            <Payouts members={members} group={selectedGroup} onReorder={handleReorder} />
          </div>

          <div hidden={activeSection !== "meetings"}>
            <Meetings meetings={meetings} onAddMeeting={() => setMeetingModal(true)} />
          </div>
        </main>
      </div>

      {/* Invite Modal */}
      <Modal
        open={inviteModal}
        onClose={() => setInviteModal(false)}
        title="Invite a Member"
        actions={[
          <button key="send"   className="btn-primary" onClick={sendInvite}>Send Invite</button>,
          <button key="cancel" className="btn-ghost"   onClick={() => setInviteModal(false)}>Cancel</button>,
        ]}
      >
        <Field label="Full Name" htmlFor="invite-name">
          <input id="invite-name" type="text" value={inviteName}
            onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Zanele Dlamini" />
        </Field>
        <Field label="Phone / Email" htmlFor="invite-contact">
          <input id="invite-contact" type="text" value={inviteContact}
            onChange={(e) => setInviteContact(e.target.value)} placeholder="e.g. 082 000 0000" />
        </Field>
      </Modal>

      {/* Meeting Modal */}
      <Modal
        open={meetingModal}
        onClose={() => setMeetingModal(false)}
        title="Add Meeting"
        actions={[
          <button key="add"    className="btn-primary" onClick={addMeeting}>Add Meeting</button>,
          <button key="cancel" className="btn-ghost"   onClick={() => setMeetingModal(false)}>Cancel</button>,
        ]}
      >
        <Field label="Date" htmlFor="meet-date">
          <input id="meet-date" type="date" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} />
        </Field>
        <Field label="Time" htmlFor="meet-time">
          <input id="meet-time" type="time" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} />
        </Field>
        <Field label="Venue" htmlFor="meet-venue">
          <input id="meet-venue" type="text" value={meetVenue}
            onChange={(e) => setMeetVenue(e.target.value)} placeholder="e.g. Community Hall / Zoom" />
        </Field>
        <Field label="Notes" htmlFor="meet-notes">
          <input id="meet-notes" type="text" value={meetNotes}
            onChange={(e) => setMeetNotes(e.target.value)} placeholder="Optional agenda..." />
        </Field>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
