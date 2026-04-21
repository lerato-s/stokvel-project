// Group.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import GroupForm from "../components/GroupForm";
import "./group.css";

const API = import.meta.env.VITE_API_URL;

function authHeader() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = user.token || user.accessToken || (user.user?.token);
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
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
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function formatMonth(m) {
  if (!m) return "—";
  const [year, month] = m.split("-");
  return new Date(year, month - 1).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}
function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
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

// ── Groups list ───────────────────────────────────────────────────────────────
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

// ── Dashboard ─────────────────────────────────────────────────────────────────
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
    { label: "Payout Method", value: group.payoutMethod || "—" },
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
          <header className="card-header"><h3>Group Details</h3></header>
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
function Members({ members, onInvite, onRoleChange, currentUserEmail }) {
  const isAdmin = members.some(
    (m) => m.contact === currentUserEmail && m.role === "Admin"
  );

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
              {isAdmin && m.contact !== currentUserEmail && (
                <select
                  className="role-select"
                  value={m.role}
                  onChange={(e) => onRoleChange(m._id, e.target.value)}
                  aria-label={`Change role for ${m.name}`}
                >
                  <option value="Treasurer">Treasurer</option>
                  <option value="Member">Member</option>
                </select>
              )}
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
  const isFIFO  = group?.payoutMethod === "Fixed Order (Roster)";
  const pool    =
    group?.amount && members.length
      ? `R ${(Number(group.amount) * members.length).toLocaleString()}`
      : "—";

  const handleDragStart = (i) => { dragRef.current = i; };
  const handleDrop = (i) => {
    if (isFIFO) return; // block reordering for FIFO
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Payout method badge */}
          <span className="payout-method-badge">
            {group?.payoutMethod === "Fixed Order (Roster)" && "📋 Fixed Roster"}
            {group?.payoutMethod === "Lucky Draw"           && "🎲 Lucky Draw"}
            {group?.payoutMethod === "Need-Based (Vote)"   && "🗳️ Need-Based"}
            {!group?.payoutMethod                          && "—"}
          </span>
          {!isFIFO && <span className="hint">Drag to reorder</span>}
        </div>
      </header>

      {/* Payout method info box */}
      <div className="payout-method-info card" style={{ marginBottom: 20 }}>
        {group?.payoutMethod === "Fixed Order (Roster)" && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
            🔒 <strong>Fixed Roster (FIFO)</strong> — Members are paid in the order they joined.
            This order cannot be changed to keep things fair for everyone.
          </p>
        )}
        {group?.payoutMethod === "Lucky Draw" && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
            🎲 <strong>Lucky Draw</strong> — Drag to set a preferred order, or the winner will be
            drawn randomly each cycle. Contact your admin to confirm the draw process.
          </p>
        )}
        {group?.payoutMethod === "Need-Based (Vote)" && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
            🗳️ <strong>Need-Based (Vote)</strong> — The payout recipient is decided by group vote
            each cycle. Drag to suggest a preferred order. Final decision is made at the meeting.
          </p>
        )}
        {!group?.payoutMethod && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
            ⚠️ No payout method set. Please configure the group settings.
          </p>
        )}
      </div>

      {members.length === 0 ? (
        <p className="empty-state">No members added yet.</p>
      ) : (
        <ol className="payout-list">
          {members.map((m, i) => (
            <li
              key={m._id}
              className={`payout-row${isFIFO ? " fifo-locked" : ""}`}
              draggable={!isFIFO}
              onDragStart={() => !isFIFO && handleDragStart(i)}
              onDragOver={(e) => !isFIFO && e.preventDefault()}
              onDrop={() => !isFIFO && handleDrop(i)}
            >
              <span className="payout-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="payout-avatar">{m.initials}</div>
              <div className="payout-name">
                <strong>{m.name}</strong>
                <span>{m.role}</span>
              </div>
              <span className="payout-amount">{pool}</span>
              <span className="payout-status">
                {i === 0 ? (
                  <span className="status-badge active">Next Up</span>
                ) : (
                  <span className="status-badge pending">Pending</span>
                )}
              </span>
              {!isFIFO && <span className="drag-handle" aria-hidden="true">⠿</span>}
              {isFIFO  && <span className="fifo-lock-icon" aria-label="Locked — FIFO order">🔒</span>}
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
              {["#", "Date", "Time", "Venue", "Status", "Notes"].map((h) => (
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

// ── Contributions ─────────────────────────────────────────────────────────────
function Contributions({ contributions, members, group, onPay, loading, onFlagMissing }) {
  const month = currentMonth();
  const paidMemberIds = new Set(
    contributions
      .filter((c) => c.month === month && c.status === "paid")
      .map((c) => c.member?._id || c.member)
  );
  const totalExpected  = group.amount && members.length ? Number(group.amount) * members.length : 0;
  const totalCollected = contributions
    .filter((c) => c.month === month && c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);
  const progress = totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const hasTreasurer = members.some((m) => m.role === "Treasurer");

  return (
    <section aria-labelledby="contributions-heading">
      <header className="section-header-bar">
        <h2 id="contributions-heading">Contributions</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="month-label">{formatMonth(month)}</span>
          {hasTreasurer && (
            <button className="btn-secondary" onClick={onFlagMissing}>
              Flag Unpaid
            </button>
          )}
        </div>
      </header>

      <div className="contribution-summary card" style={{ marginBottom: 24 }}>
        <div className="contrib-summary-row">
          <div>
            <div className="stat-label">Collected This Month</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              R {totalCollected.toLocaleString()}
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400 }}>
                {" "}/ R {totalExpected.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="contrib-progress-wrap">
            <div className="contrib-progress-bar">
              <div
                className="contrib-progress-fill"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="contrib-progress-label">{progress}% collected</span>
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="empty-state">No members yet. Invite members first.</p>
      ) : (
        <ul className="contributions-list" aria-label="Member contribution status">
          {members.map((m) => {
            const hasPaid = paidMemberIds.has(m._id);
            const record  = contributions.find(
              (c) => (c.member?._id || c.member) === m._id && c.month === month && c.status === "paid"
            );
            return (
              <li key={m._id} className={`contribution-row${hasPaid ? " paid" : ""}`}>
                <div className="payout-avatar">{m.initials}</div>
                <div className="payout-name">
                  <strong>{m.name}</strong>
                  <span>{m.role}</span>
                </div>
                {hasPaid ? (
                  <div className="contrib-paid-info">
                    <span className="status-badge active">✓ Paid</span>
                    <span className="contrib-ref">{record?.reference}</span>
                    <span className="contrib-date">{formatDateTime(record?.paidAt)}</span>
                  </div>
                ) : (
                  <div className="contrib-actions">
                    <span className="status-badge pending">Unpaid</span>
                    <button className="btn-pay" onClick={() => onPay(m)} disabled={loading}>
                      Pay R{group.amount}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {contributions.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="card-title">Payment History</h3>
          <div className="meetings-table-wrap">
            <table className="meetings-table">
              <caption className="sr-only">Contribution history</caption>
              <thead>
                <tr>
                  {["Member", "Month", "Amount", "Reference", "Status", "Date"].map((h) => (
                    <th key={h} scope="col">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => (
                  <tr key={c._id}>
                    <td>{c.member?.name || "—"}</td>
                    <td>{formatMonth(c.month)}</td>
                    <td style={{ color: "var(--green)", fontWeight: 600 }}>R{c.amount}</td>
                    <td><code style={{ fontSize: 11, color: "var(--text-dim)" }}>{c.reference}</code></td>
                    <td><span className={`status-badge ${c.status}`}>{c.status}</span></td>
                    <td>{c.paidAt ? formatDateTime(c.paidAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Disbursements ─────────────────────────────────────────────────────────────
function Disbursements({ disbursements, members, group, contributions, onDisburse, onMarkPaid, loading }) {
  const month = currentMonth();
  const totalCollected = contributions
    .filter((c) => c.month === month && c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);
  const disbursedMemberIds = new Set(
    disbursements.map((d) => d.member?._id || d.member)
  );

  return (
    <section aria-labelledby="disbursements-heading">
      <header className="section-header-bar">
        <h2 id="disbursements-heading">Payout Disbursements</h2>
        <span className="month-label">{formatMonth(month)}</span>
      </header>

      <div className="card contribution-summary" style={{ marginBottom: 24 }}>
        <div className="contrib-summary-row">
          <div>
            <div className="stat-label">Available Pool</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              R {totalCollected.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              collected this month from{" "}
              {contributions.filter((c) => c.month === month && c.status === "paid").length} members
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="stat-label">Payout Method</div>
            <div style={{ color: "var(--gold-light)", fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {group.payoutMethod || "Not set"}
            </div>
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="empty-state">No members yet.</p>
      ) : (
        <ul className="contributions-list" aria-label="Disbursement roster">
          {members.map((m, i) => {
            const disbursed = disbursedMemberIds.has(m._id);
            const record    = disbursements.find((d) => (d.member?._id || d.member) === m._id);
            return (
              <li key={m._id} className={`contribution-row${disbursed ? " paid" : ""}`}>
                <span className="payout-num">{String(i + 1).padStart(2, "0")}</span>
                <div className="payout-avatar">{m.initials}</div>
                <div className="payout-name">
                  <strong>{m.name}</strong>
                  <span>{m.role}</span>
                </div>
                {disbursed ? (
                  <div className="contrib-paid-info">
                    <span className={`status-badge ${record.status}`}>{record.status}</span>
                    <span className="contrib-ref">R{record.amount?.toLocaleString()}</span>
                    {record.status === "pending" && (
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: "5px 12px" }}
                        onClick={() => onMarkPaid(record._id)}
                        disabled={loading}
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="contrib-actions">
                    <span className="status-badge pending">No Payout</span>
                    <button
                      className="btn-pay"
                      onClick={() => onDisburse(m)}
                      disabled={loading || totalCollected === 0}
                    >
                      Initiate Payout
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {disbursements.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 className="card-title">Disbursement History</h3>
          <div className="meetings-table-wrap">
            <table className="meetings-table">
              <caption className="sr-only">Disbursement history</caption>
              <thead>
                <tr>
                  {["Member", "Month", "Amount", "Reference", "Status", "Note"].map((h) => (
                    <th key={h} scope="col">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disbursements.map((d) => (
                  <tr key={d._id}>
                    <td>{d.member?.name || "—"}</td>
                    <td>{formatMonth(d.month)}</td>
                    <td style={{ color: "var(--gold-light)", fontWeight: 600 }}>R{d.amount?.toLocaleString()}</td>
                    <td><code style={{ fontSize: 11, color: "var(--text-dim)" }}>{d.reference}</code></td>
                    <td><span className={`status-badge ${d.status}`}>{d.status}</span></td>
                    <td style={{ fontSize: 12 }}>{d.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "groups",        icon: "⌂", label: "My Groups" },
  { id: "members",       icon: "⬡", label: "Members" },
  { id: "payouts",       icon: "◎", label: "Payout Order" },
  { id: "meetings",      icon: "◷", label: "Meetings" },
  { id: "contributions", icon: "₴", label: "Contributions" },
  { id: "disbursements", icon: "◈", label: "Disbursements" },
];

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Group() {
  const currentUser      = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserEmail = currentUser.email || currentUser.user?.email || "";
  const currentUsername  = currentUser.username || currentUser.user?.username || "";

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
  const [inviteName,     setInviteName]     = useState("");
  const [inviteContact,  setInviteContact]  = useState("");
  const [meetDate,       setMeetDate]       = useState("");
  const [meetTime,       setMeetTime]       = useState("");
  const [meetVenue,      setMeetVenue]      = useState("");
  const [meetNotes,      setMeetNotes]      = useState("");
  const [contributions,  setContributions]  = useState([]);
  const [disbursements,  setDisbursements]  = useState([]);
  const [payLoading,     setPayLoading]     = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  // Load groups on mount
  useEffect(() => {
    axios.get(`${API}/api/groups`, { headers: authHeader() })
      .then((r) => setGroups(r.data))
      .catch(() => showToast("Failed to load groups"))
      .finally(() => setLoadingGroups(false));
  }, []);

  // Load group data when selected
  useEffect(() => {
    if (!selectedGroup) return;
    const h = { headers: authHeader() };
    Promise.all([
      axios.get(`${API}/api/members?groupId=${selectedGroup._id}`, h),
      axios.get(`${API}/api/meetings?groupId=${selectedGroup._id}`, h),
      axios.get(`${API}/api/payfast/contributions?groupId=${selectedGroup._id}`, h),
      axios.get(`${API}/api/payfast/disbursements?groupId=${selectedGroup._id}`, h),
    ])
      .then(([mRes, mtRes, cRes, dRes]) => {
        setMembers(mRes.data);
        setMeetings(mtRes.data);
        setContributions(cRes.data);
        setDisbursements(dRes.data);
      })
      .catch(() => showToast("Failed to load group data"));
  }, [selectedGroup]);

  // Handle PayFast return
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const ref     = params.get("ref");

    if (payment === "success") {
      showToast(`✓ Payment successful! Ref: ${ref}`);
      window.history.replaceState({}, "", window.location.pathname);
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          if (selectedGroup) {
            const r = await axios.get(
              `${API}/api/payfast/contributions?groupId=${selectedGroup._id}`,
              { headers: authHeader() }
            );
            setContributions(r.data);
            const paid = r.data.find((c) => c.reference === ref && c.status === "paid");
            if (paid || attempts >= 5) clearInterval(interval);
          }
        } catch { clearInterval(interval); }
      }, 3000);
    } else if (payment === "cancelled") {
      showToast("Payment was cancelled");
      window.history.replaceState({}, "", window.location.pathname);
    }
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

  async function handleRoleChange(memberId, newRole) {
    try {
      const { data } = await axios.patch(
        `${API}/api/members/${memberId}/role`,
        { role: newRole },
        { headers: authHeader() }
      );
      setMembers((prev) => prev.map((m) => m._id === memberId ? { ...m, role: data.role } : m));
      showToast(`✓ Role updated to ${newRole}`);
    } catch (err) {
      showToast("Failed to update role: " + (err.response?.data?.error || err.message));
    }
  }

  async function handleFlagMissing() {
    try {
      const { data } = await axios.post(
        `${API}/api/flag-missing`,
        { groupId: selectedGroup._id, month: currentMonth() },
        { headers: authHeader() }
      );
      showToast(`✓ ${data.message}`);
    } catch (err) {
      showToast("Failed: " + (err.response?.data?.error || err.message));
    }
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
    } catch { showToast("Failed to save order"); }
  }

  async function handlePay(member) {
    setPayLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/api/payfast/contribute`,
        { groupId: selectedGroup._id, memberId: member._id },
        { headers: authHeader() }
      );
      window.location.href = data.paymentUrl;
    } catch (err) {
      showToast("Payment error: " + (err.response?.data?.error || err.message));
    } finally { setPayLoading(false); }
  }

  async function handleDisburse(member) {
    setPayLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/api/payfast/disburse`,
        { groupId: selectedGroup._id, memberId: member._id },
        { headers: authHeader() }
      );
      setDisbursements((prev) => [data.disbursement, ...prev]);
      showToast(data.message);
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    } finally { setPayLoading(false); }
  }

  async function handleMarkPaid(disbursementId) {
    try {
      const { data } = await axios.patch(
        `${API}/api/payfast/disburse/${disbursementId}`,
        {},
        { headers: authHeader() }
      );
      setDisbursements((prev) => prev.map((d) => d._id === disbursementId ? data : d));
      showToast("✓ Payout marked as paid");
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    }
  }

  const topbarTitle =
    activeSection === "groups"    ? "My Stokvels" :
    activeSection === "dashboard" ? selectedGroup?.name :
    NAV_ITEMS.find((n) => n.id === activeSection)?.label || "";

  // Get the current user's role in the selected group
  const myMemberRole = members.find((m) => m.contact === currentUserEmail)?.role || "Member";

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
            {NAV_ITEMS.filter((n) => n.id === "groups" || selectedGroup).map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`nav-item${
                    activeSection === item.id ||
                    (item.id === "groups" && activeSection === "dashboard")
                      ? " active" : ""
                  }`}
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

        {/* Sidebar footer — shows logged-in user */}
        <footer className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {getInitials(currentUsername || currentUserEmail || "U")}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {currentUsername || "User"}
              </span>
              <span className="sidebar-user-email">{currentUserEmail}</span>
            </div>
            <span className={`sidebar-role-badge ${myMemberRole.toLowerCase()}`}>
              {myMemberRole}
            </span>
          </div>
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
            <Members
              members={members}
              onInvite={() => setInviteModal(true)}
              onRoleChange={handleRoleChange}
              currentUserEmail={currentUserEmail}
            />
          </div>

          <div hidden={activeSection !== "payouts"}>
            <Payouts members={members} group={selectedGroup} onReorder={handleReorder} />
          </div>

          <div hidden={activeSection !== "meetings"}>
            <Meetings meetings={meetings} onAddMeeting={() => setMeetingModal(true)} />
          </div>

          <div hidden={activeSection !== "contributions"}>
            <Contributions
              contributions={contributions}
              members={members}
              group={selectedGroup || {}}
              onPay={handlePay}
              onFlagMissing={handleFlagMissing}
              loading={payLoading}
            />
          </div>

          <div hidden={activeSection !== "disbursements"}>
            <Disbursements
              disbursements={disbursements}
              members={members}
              group={selectedGroup || {}}
              contributions={contributions}
              onDisburse={handleDisburse}
              onMarkPaid={handleMarkPaid}
              loading={payLoading}
            />
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
        <Field label="Email Address" htmlFor="invite-contact">
          <input id="invite-contact" type="email" value={inviteContact}
            onChange={(e) => setInviteContact(e.target.value)} placeholder="e.g. zanele@email.com" />
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
