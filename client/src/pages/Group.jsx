// Group.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import GroupForm from "../components/GroupForm";
import "./g.css";
import ComplianceReport from '../components/ComplianceReport';

const API = import.meta.env.VITE_API_URL;

function authHeader() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = user.token || user.accessToken || user.user?.token;
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

// ── Role-based nav ────────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { id: "groups",        icon: "⌂", label: "My Groups" },
  { id: "members",       icon: "⬡", label: "Members" },
  { id: "payouts",       icon: "◎", label: "Payout Order" },
  { id: "meetings",      icon: "◷", label: "Meetings" },
  { id: "contributions", icon: "₴", label: "Contributions" },
  { id: "disbursements", icon: "◈", label: "Disbursements" },
];

const TREASURER_NAV = [
  { id: "groups",          icon: "⌂", label: "My Groups" },
  { id: "dashboard",       icon: "◎", label: "Overview" },
  { id: "t-members",       icon: "⬡", label: "Members" },
  { id: "t-contributions", icon: "₴", label: "Contributions" },
  { id: "t-meetings",      icon: "◷", label: "Meetings" },
  { id: "disbursements",   icon: "◈", label: "Disbursements" },
  //{ id: "compliance",      icon: "", label: "Compliance" },   // ✅ add this
];

const MEMBER_NAV = [
  { id: "groups",          icon: "⌂", label: "My Groups" },
  { id: "dashboard",       icon: "◎", label: "Overview" },
  { id: "m-contributions", icon: "₴", label: "My Contributions" },
  { id: "m-meetings",      icon: "◷", label: "Meetings" },
];

function getNavItems(role) {
  if (role === "Admin")     return ADMIN_NAV;
  if (role === "Treasurer") return TREASURER_NAV;
  return MEMBER_NAV;
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

// ── Platform landing () ─────────────────────────────────────────
function PlatformLanding({ username, onNew }) {
  return (
    <section className="platform-landing" aria-labelledby="welcome-heading">
      <div className="platform-welcome-card card">
        <div className="platform-welcome-top">
          <div className="platform-welcome-avatar">{getInitials(username || "U")}</div>
          <div>
            <h2 id="welcome-heading">Welcome, {username || "there"}!</h2>
            <p className="platform-welcome-sub">
              You're registered on Stokvel Manager. Create or join a group to get started.
            </p>
          </div>
        </div>
        <div className="platform-stats-row">
          <div className="platform-stat">
            <span className="stat-label">Account Status</span>
            <strong className="stat-value">Registered</strong>
            <span className="platform-stat-hint">Email verified</span>
          </div>
          <div className="platform-stat">
            <span className="stat-label">Groups</span>
            <strong className="stat-value">0</strong>
            <span className="platform-stat-hint">Not in any group yet</span>
          </div>
          <div className="platform-stat">
            <span className="stat-label">Member Since</span>
            <strong className="stat-value">
              {new Date().toLocaleDateString("en-ZA", { month: "short", year: "numeric" })}
            </strong>
            <span className="platform-stat-hint">New member</span>
          </div>
        </div>
        <div className="platform-actions">
          <button className="btn-primary platform-cta" onClick={onNew}>+ Create New Group</button>
        </div>
        <div className="platform-tip">
          Tip: Create your own stokvel group, or ask a friend to invite you to theirs.
        </div>
      </div>
    </section>
  );
}

// ── Groups list ───────────────────────────────────────────────────────────────
function GroupsList({ groups, loading, onSelect, onNew, username }) {
  return (
    <section className="groups-list-page" aria-labelledby="groups-heading">
      <header className="groups-list-header">
        <h2 id="groups-heading">My Stokvels</h2>
        <button className="btn-primary" onClick={onNew}>+ New Group</button>
      </header>
      {loading ? (
        <p className="empty-state">Loading groups…</p>
      ) : groups.length === 0 ? (
        <PlatformLanding username={username} onNew={onNew} />
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

// ── Admin Dashboard ───────────────────────────────────────────────────────────
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
    ["Meeting",       group.meetDay ? `Every ${group.meetDay}` : "—"],
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

// ── Treasurer Members (read + payment status) ────────────────────────────────
function  TreasurerMembers({ members, contributions }) {
  const month = currentMonth();
  const paidMemberIds = new Set(
    contributions
      .filter((c) => c.month === month && c.status === "paid")
      .map((c) => c.member?._id || c.member)
  );

  return (
    <section aria-labelledby="t-members-heading">
      <header className="section-header-bar">
        <h2 id="t-members-heading">Members</h2>
        <span className="month-label">{formatMonth(month)}</span>
      </header>

      {members.length === 0 ? (
        <p className="empty-state">No members yet.</p>
      ) : (
        <ul className="members-grid">
          {members.map((m) => {
            const hasPaid = paidMemberIds.has(m._id);
            return (
              <li key={m._id} className="member-card">
                <div className={`member-avatar ${m.status}`}>{m.initials}</div>
                <div className="member-info">
                  <strong>{m.name}</strong>
                  <span className="member-role">{m.role}</span>
                </div>
                <span className={`status-badge ${m.status}`}>{m.status}</span>
                <span className={`status-badge ${hasPaid ? "active" : "pending"}`}>
                  {hasPaid ? "✓ Paid" : "Unpaid"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Treasurer Dashboard Overview ──────────────────────────────────────────────
function TreasurerDashboard({ group, members, meetings, contributions, disbursements, onBack, onNavigate }) {
  const month = currentMonth();
  const paid = contributions.filter((c) => c.month === month && c.status === "paid");
  const unpaid = members.filter((m) => !paid.some((c) => (c.member?._id || c.member) === m._id));
  const totalExpected  = group.amount && members.length ? Number(group.amount) * members.length : 0;
  const totalCollected = paid.reduce((sum, c) => sum + c.amount, 0);
  const progress       = totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const [rates, setRates] = useState(null); // initial value
  useEffect(() => {
    fetch(`${API}/api/rates`).then(res => res.json()).then(data => setRates(data));
  }, []);


  const upcomingMeetings = meetings
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const pendingDisbursements = disbursements.filter((d) => d.status === "pending");

  return (
    <>
      <div className="section-header-bar">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>{group.name}</h2>
        <span className="badge" style={{ background: "rgba(255,180,0,0.15)", color: "#ffb400", border: "1px solid rgba(255,180,0,0.3)" }}>Treasurer</span>
      </div>

      <ul className="stats-row" aria-label="Treasurer overview">
        <li className="stat-card">
          <span className="stat-label">Members</span>
          <strong className="stat-value">{members.length}</strong>
        </li>
        <li className="stat-card">
          <span className="stat-label">Collected</span>
          <strong className="stat-value" style={{ color: "var(--green)" }}>R {totalCollected.toLocaleString()}</strong>
        </li>
        <li className="stat-card">
          <span className="stat-label">Outstanding</span>
          <strong className="stat-value" style={{ color: unpaid.length ? "#e05c5c" : "var(--green)" }}>
            {unpaid.length} unpaid
          </strong>
        </li>
        <li className="stat-card">
          <span className="stat-label">Next Meeting</span>
          <strong className="stat-value">{upcomingMeetings.length ? formatDate(upcomingMeetings[0].date) : "None"}</strong>
        </li>
        <li className="stat-card">
          <span className="stat-label">Repo Rate</span>
          <strong className="stat-value">{rates ? `${rates.repoRate}%` : "—"}</strong>
        </li>
        <li className="stat-card">
          <span className="stat-label">Prime Rate</span>
          <strong className="stat-value">{rates ? `${rates.primeRate}%` : "—"}</strong>
        </li> 
      </ul>

      <div className="dashboard-grid">
        {/* Collection progress */}
        <article className="card">
          <header className="card-header">
            <h3>This Month's Collection</h3>
            <span className="month-label">{formatMonth(month)}</span>
          </header>
          <div className="contrib-progress-wrap" style={{ margin: "16px 0" }}>
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
            <span className="contrib-progress-label">
              {progress}% — R{totalCollected.toLocaleString()} of R{totalExpected.toLocaleString()}
            </span>
          </div>
          {unpaid.length > 0 ? (
            <>
              <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 10 }}>
                Still unpaid ({unpaid.length}):
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {unpaid.map((m) => (
                  <li key={m._id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="payout-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{m.initials}</div>
                    <span style={{ fontSize: 13 }}>{m.name}</span>
                    <span className="status-badge pending" style={{ marginLeft: "auto" }}>Unpaid</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "var(--green)" }}>✓ All members have paid this month!</p>
          )}
          <button className="btn-secondary" style={{ marginTop: 16, width: "100%" }} onClick={() => onNavigate("t-contributions")}>
            Manage Contributions →
          </button>
        </article>

        {/* Upcoming meetings */}
        <article className="card">
          <header className="card-header"><h3>Upcoming Meetings</h3></header>
          {upcomingMeetings.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: 13 }}>No upcoming meetings scheduled.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
              {upcomingMeetings.slice(0, 3).map((m) => (
                <li key={m._id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    background: "var(--accent-subtle, rgba(155,127,212,0.15))",
                    borderRadius: 8, padding: "6px 10px", textAlign: "center", minWidth: 44, flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                      {new Date(m.date + "T00:00:00").toLocaleDateString("en-ZA", { month: "short" })}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent, #9b7fd4)", lineHeight: 1.1 }}>
                      {new Date(m.date + "T00:00:00").getDate()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.venue || "TBD"}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      {m.time || ""}{m.notes ? ` · ${m.notes}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button className="btn-secondary" style={{ marginTop: 16, width: "100%" }} onClick={() => onNavigate("t-meetings")}>
            Manage Meetings →
          </button>
        </article>

        {/* Pending payouts */}
        <article className="card">
          <header className="card-header"><h3>Pending Disbursements</h3></header>
          {pendingDisbursements.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: 13 }}>No pending payouts.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingDisbursements.map((d) => (
                <li key={d._id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="payout-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                    {getInitials(d.member?.name || "?")}
                  </div>
                  <span style={{ fontSize: 13 }}>{d.member?.name || "—"}</span>
                  <span style={{ color: "var(--gold-light)", fontWeight: 600, fontSize: 13, marginLeft: "auto" }}>
                    R{d.amount?.toLocaleString()}
                  </span>
                  <span className="status-badge pending">Pending</span>
                </li>
              ))}
            </ul>
          )}
          
          <button className="btn-secondary" style={{ marginTop: 16, width: "100%" }} onClick={() => onNavigate("disbursements")}>
            Manage Disbursements →
          </button>
        </article>
      </div>
    </>
  );
}

// ── Treasurer Contributions ───────────────────────────────────────────────────
function TreasurerContributions({ contributions, members, group, onConfirm, onFlagMissing, onFlagMissed , loading }) {
  const month = currentMonth();
  const paidMemberIds = new Set(
    contributions.filter((c) => c.month === month && c.status === "paid").map((c) => c.member?._id || c.member)
  );
  const totalExpected  = group.amount && members.length ? Number(group.amount) * members.length : 0;
  const totalCollected = contributions
    .filter((c) => c.month === month && c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);
  const progress = totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0;

  return (
    <section aria-labelledby="t-contributions-heading">
      <header className="section-header-bar">
        <h2 id="t-contributions-heading">Contributions</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="month-label">{formatMonth(month)}</span>
          <button className="btn-secondary" onClick={onFlagMissing}>🚩 Flag Unpaid</button>
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
              <div className="contrib-progress-fill" style={{ width: `${progress}%` }}
                role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
            </div>
            <span className="contrib-progress-label">{progress}% collected</span>
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="empty-state">No members yet.</p>
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
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span className="status-badge pending">Unpaid</span>
                          <button
                            className="btn-pay"
                            style={{ background: "var(--green, #3dba8c)", color: "#fff" }}
                            onClick={() => onConfirm(m)}
                            disabled={loading}
                          >
                            ✓ Confirm Payment
                          </button>
                          <button
                            className="btn-flag-missed"
                            style={{ background: "#dc2626", color: "#fff", padding: "5px 12px", borderRadius: "30px", border: "none", cursor: loading ? "not-allowed" : "pointer" }}
                            onClick={() => onFlagMissed(m)}
                            disabled={loading}
                          >
                            ⚠️ Flag Missed
                          </button>
                        </div>
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
                <tr>{["Member","Month","Amount","Reference","Status","Date"].map((h) => <th key={h} scope="col">{h}</th>)}</tr>
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

// ── Member Dashboard Overview ─────────────────────────────────────────────────
function MemberDashboard({ group, members, meetings, contributions, currentUserEmail, onBack, onNavigate }) {
  const month = currentMonth();
  const me = members.find((m) => m.contact === currentUserEmail);
  const myContributions = me ? contributions.filter((c) => (c.member?._id || c.member) === me._id) : [];
  const paidThisMonth   = myContributions.some((c) => c.month === month && c.status === "paid");
  const totalPaid       = myContributions.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);

  const upcomingMeetings = meetings.filter((m) => m.status === "upcoming").sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextMeeting      = upcomingMeetings[0];
  const myPosition       = me ? members.findIndex((m) => m._id === me._id) + 1 : null;
  const pool             = group.amount && members.length ? `R ${(Number(group.amount) * members.length).toLocaleString()}` : "—";

// rates
  const [rates, setRates] = useState(null); // initial value
  useEffect(() => {
    fetch(`${API}/api/rates`).then(res => res.json()).then(data => setRates(data));
  }, []);

//savings growth
  const [savingsGrowth, setSavingsGrowth] = useState(null);
  useEffect(()=> {
    const cycleMonths = parseInt(group.cycle);
    //console.log('group.freq:', group.freq, 'group.cycle:', group.cycle, 'group.amount:', group.amount);
    fetch(`${API}/api/savings?amount=${group.amount}&frequency=${group.freq}&cycle=${cycleMonths}`)
    .then(res => res.json()).then(data => setSavingsGrowth(data));
  }, []);


  return (
    <>
      <div className="section-header-bar">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>{group.name}</h2>
        <span className="badge" style={{ background: "rgba(61,186,140,0.15)", color: "#3dba8c", border: "1px solid rgba(61,186,140,0.3)" }}>Member</span>
      </div>

      <ul className="stats-row" aria-label="My overview">
        <li className="stat-card">
          <span className="stat-label">This Month</span>
          <strong className="stat-value" style={{ color: paidThisMonth ? "var(--green)" : "#e05c5c" }}>
            {paidThisMonth ? "✓ Paid" : "Unpaid"}
          </strong>
        </li>
        <li className="stat-card">
          <span className="stat-label">Total Contributed</span>
          <strong className="stat-value">R {totalPaid.toLocaleString()}</strong>
        </li>
        <li className="stat-card">
          <span className="stat-label">Payout Pool</span>
          <strong className="stat-value">{pool}</strong>
        </li>
        <li className="stat-card">
          <span className="stat-label">My Payout Position</span>
          <strong className="stat-value">{myPosition ? `#${myPosition} of ${members.length}` : "—"}</strong>
        </li>
        <li className="stat-card">
          <span className="stat-label">Repo Rate</span>
          <strong className="stat-value">{rates ? `${rates.repoRate}%` : "—"}</strong>
        </li>
        <li className="stat-card">
          <span className="stat-label">Prime Rate</span>
          <strong className="stat-value">{rates ? `${rates.primeRate}%` : "—"}</strong>
        </li>
      </ul>

      <div className="dashboard-grid">
        {/* Contribution status */}
        <article className="card">
          <header className="card-header"><h3>My Contribution</h3></header>
          <div style={{ padding: "12px 0" }}>
            {paidThisMonth ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", background: "rgba(61,186,140,0.1)",
                borderRadius: 10, border: "1px solid rgba(61,186,140,0.3)"
              }}>
                <span style={{ fontSize: 24 }}>✓</span>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--green)" }}>Paid for {formatMonth(month)}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>R{group.amount} contributed</div>
                </div>
              </div>
            ) : (
              <div style={{
                padding: "12px 16px", background: "rgba(224,92,92,0.08)",
                borderRadius: 10, border: "1px solid rgba(224,92,92,0.25)", marginBottom: 12
              }}>
                <div style={{ fontWeight: 600, color: "#e05c5c", marginBottom: 4 }}>
                  Payment Due — {formatMonth(month)}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Amount: R{group.amount || "—"}</div>
              </div>
            )}
          </div>
          <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={() => onNavigate("m-contributions")}>
            {paidThisMonth ? "View Contribution History" : "Make a Contribution →"}
          </button>
        </article>

        {/* Next meeting */}
        <article className="card">
          <header className="card-header"><h3>Next Meeting</h3></header>
          {!nextMeeting ? (
            <p style={{ color: "var(--text-dim)", fontSize: 13 }}>No upcoming meetings yet.</p>
          ) : (
            <div style={{ padding: "12px 0" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{
                  background: "var(--accent-subtle, rgba(155,127,212,0.15))",
                  borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 56, flexShrink: 0,
                }}>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {new Date(nextMeeting.date + "T00:00:00").toLocaleDateString("en-ZA", { month: "short" })}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent, #9b7fd4)", lineHeight: 1.1 }}>
                    {new Date(nextMeeting.date + "T00:00:00").getDate()}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{nextMeeting.venue || "TBD"}</div>
                  {nextMeeting.time && <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>🕐 {nextMeeting.time}</div>}
                  {nextMeeting.notes && <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>📋 {nextMeeting.notes}</div>}
                  {nextMeeting.link && (
                    <a href={nextMeeting.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>🔗 Join online</a>
                  )}
                </div>
              </div>
            </div>
          )}
          <button className="btn-secondary" style={{ width: "100%", marginTop: 12 }} onClick={() => onNavigate("m-meetings")}>
            View All Meetings →
          </button>
        </article>

        {/* Group info */}
        <article className="card">
          <header className="card-header"><h3>Group Details</h3></header>
          <dl className="group-details">
            {[
              ["Contribution", group.amount && group.freq ? `R${group.amount} / ${group.freq}` : "—"],
              ["Total Members", members.length],
              ["Payout Method", group.payoutMethod || "—"],
              ["Cycle", group.cycle || "—"],
            ].map(([label, val]) => (
              <div className="group-detail" key={label}>
                <dt>{label}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
        </article>

        {savingsGrowth && (
        <article className="card">
          <header className="card-header"><h3>Savings Growth</h3></header>
          <dl className="group-details">
            {[
              ["Total Contribution", `R${savingsGrowth.totalContribution}`],
              ["Projected Total", `R${savingsGrowth.projectedTotal}`],
              ["Interest Earned", `R${savingsGrowth.interestEarned}`],
            ].map(([label, val])=>(
              <div className="group-detail" key={label}>
                <dt>{label}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
        </article>
        )}
      </div>
    </>
  );
}

// ── Member Contributions (own view + online pay) ───────────────────────────────
function MemberContributions({ contributions, members, group, onPay, loading, currentUserEmail }) {
  const month = currentMonth();
  const me = members.find((m) => m.contact === currentUserEmail);
  const myContributions = me ? contributions.filter((c) => (c.member?._id || c.member) === me._id) : [];
  const paidThisMonth   = myContributions.some((c) => c.month === month && c.status === "paid");
  const totalPaid       = myContributions.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);

  return (
    <section aria-labelledby="m-contributions-heading">
      <header className="section-header-bar">
        <h2 id="m-contributions-heading">My Contributions</h2>
        <span className="month-label">{formatMonth(month)}</span>
      </header>

      <div className="contribution-summary card" style={{ marginBottom: 24 }}>
        <div className="contrib-summary-row">
          <div>
            <div className="stat-label">Total I've Contributed</div>
            <div className="stat-value" style={{ fontSize: 22 }}>R {totalPaid.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              across {myContributions.filter((c) => c.status === "paid").length} payment(s)
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="stat-label">This Month</div>
            <div style={{ marginTop: 6 }}>
              <span className={`status-badge ${paidThisMonth ? "active" : "pending"}`}>
                {paidThisMonth ? "✓ Paid" : "Unpaid"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {me && !paidThisMonth && (
        <div className="card" style={{ marginBottom: 24, padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Make Your Contribution</h3>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 16px" }}>
            Your contribution of <strong>R{group.amount}</strong> is due for {formatMonth(month)}.
          </p>
          <button className="btn-primary" onClick={() => onPay(me)} disabled={loading} style={{ minWidth: 160 }}>
            {loading ? "Processing…" : `Pay R${group.amount} Now`}
          </button>
        </div>
      )}

      <h3 className="card-title" style={{ marginBottom: 12 }}>Payment History</h3>
      {myContributions.length === 0 ? (
        <p className="empty-state">You haven't made any contributions yet.</p>
      ) : (
        <div className="meetings-table-wrap">
          <table className="meetings-table">
            <caption className="sr-only">My contribution history</caption>
            <thead>
              <tr>{["Month","Amount","Reference","Status","Date"].map((h) => <th key={h} scope="col">{h}</th>)}</tr>
            </thead>
            <tbody>
              {myContributions.map((c) => (
                <tr key={c._id}>
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
      )}
    </section>
  );
}

// ── Member Meetings (read-only) ───────────────────────────────────────────────
function MemberMeetings({ meetings }) {
  const upcoming = meetings.filter((m) => m.status === "upcoming").sort((a, b) => new Date(a.date) - new Date(b.date));
  const past     = meetings.filter((m) => m.status !== "upcoming").sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <section aria-labelledby="m-meetings-heading">
      <header className="section-header-bar">
        <h2 id="m-meetings-heading">Meetings</h2>
      </header>

      <h3 className="card-title" style={{ marginBottom: 12 }}>Upcoming</h3>
      {upcoming.length === 0 ? (
        <p className="empty-state" style={{ marginBottom: 28 }}>No upcoming meetings scheduled.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          {upcoming.map((m) => (
            <li key={m._id} className="card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{
                  background: "var(--accent-subtle, rgba(155,127,212,0.15))",
                  borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 52, flexShrink: 0,
                }}>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {new Date(m.date + "T00:00:00").toLocaleDateString("en-ZA", { month: "short" })}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent, #9b7fd4)", lineHeight: 1.1 }}>
                    {new Date(m.date + "T00:00:00").getDate()}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <strong style={{ fontSize: 15 }}>{m.venue || "TBD"}</strong>
                    {m.time && <span style={{ fontSize: 12, color: "var(--text-dim)" }}>@ {m.time}</span>}
                    <span className="status-badge active" style={{ marginLeft: "auto" }}>Upcoming</span>
                  </div>
                  {m.notes && (
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 6 }}>
                      <strong>Agenda:</strong> {m.notes}
                    </div>
                  )}
                  {m.link && (
                    <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                      🔗 Join online
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="card-title" style={{ marginBottom: 12 }}>Past Meetings</h3>
      {past.length === 0 ? (
        <p className="empty-state">No past meetings yet.</p>
      ) : (
        <div className="meetings-table-wrap">
          <table className="meetings-table">
            <caption className="sr-only">Past meetings</caption>
            <thead>
              <tr>{["#","Date","Time","Venue","Status","Notes"].map((h) => <th key={h} scope="col">{h}</th>)}</tr>
            </thead>
            <tbody>
              {past.map((m, i) => (
                <tr key={m._id}>
                  <td>{i + 1}</td>
                  <td><time dateTime={m.date}>{formatDate(m.date)}</time></td>
                  <td>{m.time || "—"}</td>
                  <td>{m.venue || "—"}</td>
                  <td><span className={`status-badge ${m.status}`}>{m.status}</span></td>
                  <td>{m.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Admin-only components (unchanged) ─────────────────────────────────────────
function Members({ members, onInvite, onRoleChange, currentUserEmail }) {
  const isAdmin = members.some((m) => m.contact === currentUserEmail && m.role === "Admin");
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
                <select className="role-select" value={m.role}
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

function Payouts({ members, group, onReorder }) {
  const dragRef = useRef(null);
  const isFIFO  = group?.payoutMethod === "Fixed Order (Roster)";
  const pool    = group?.amount && members.length ? `R ${(Number(group.amount) * members.length).toLocaleString()}` : "—";

  const handleDragStart = (i) => { dragRef.current = i; };
  const handleDrop = (i) => {
    if (isFIFO || dragRef.current === null || dragRef.current === i) return;
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
          <span className="payout-method-badge">
            {group?.payoutMethod === "Fixed Order (Roster)" && "📋 Fixed Roster"}
            {group?.payoutMethod === "Lucky Draw"           && "🎲 Lucky Draw"}
            {group?.payoutMethod === "Need-Based (Vote)"   && "🗳️ Need-Based"}
            {!group?.payoutMethod                          && "—"}
          </span>
          {!isFIFO && <span className="hint">Drag to reorder</span>}
        </div>
      </header>
      <div className="payout-method-info card" style={{ marginBottom: 20 }}>
        {group?.payoutMethod === "Fixed Order (Roster)" && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
            🔒 <strong>Fixed Roster (FIFO)</strong> — Members are paid in the order they joined.
          </p>
        )}
        {group?.payoutMethod === "Lucky Draw" && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
            🎲 <strong>Lucky Draw</strong> — Drag to set a preferred order, or draw randomly each cycle.
          </p>
        )}
        {group?.payoutMethod === "Need-Based (Vote)" && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
            🗳️ <strong>Need-Based (Vote)</strong> — Payout recipient decided by group vote each cycle.
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
            <li key={m._id} className={`payout-row${isFIFO ? " fifo-locked" : ""}`}
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
                {i === 0 ? <span className="status-badge active">Next Up</span> : <span className="status-badge pending">Pending</span>}
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

function Meetings({ meetings, onAddMeeting, onCompleteMeeting }) {
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
            <tr>{["#","Date","Time","Venue","Link","Status","Notes","Minutes"].map((h) => <th key={h} scope="col">{h}</th>)}</tr>
          </thead>
          <tbody>
            {meetings.length === 0 ? (
              <tr><td colSpan={8} className="empty-state">No meetings scheduled yet.</td></tr>
            ) : (
              meetings.map((m, i) => (
                <tr key={m._id} className="meeting-row" onClick={() => onCompleteMeeting(m)} style={{ cursor: "pointer" }}>
                  <td>{i + 1}</td>
                  <td><time dateTime={m.date}>{formatDate(m.date)}</time></td>
                  <td>{m.time || "—"}</td>
                  <td>{m.venue || "—"}</td>
                  <td>
                    {m.link
                      ? <a href={m.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{m.link}</a>
                      : "—"}
                  </td>
                  <td><span className={`status-badge ${m.status}`}>{m.status}</span></td>
                  <td>{m.notes || "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    {m.minutes?.summary || m.minutes?.decisions?.length > 0
                      ? <span title="Minutes recorded" style={{ fontSize: 16, cursor: "pointer" }}>📄</span>
                      : <span style={{ color: "var(--text-dim)", fontSize: 12 }}>—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Contributions({ contributions, members, group, onPay, loading, onFlagMissing }) {
  const month = currentMonth();
  const paidMemberIds = new Set(
    contributions.filter((c) => c.month === month && c.status === "paid").map((c) => c.member?._id || c.member)
  );
  const totalExpected  = group.amount && members.length ? Number(group.amount) * members.length : 0;
  const totalCollected = contributions
    .filter((c) => c.month === month && c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);
  const progress = totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0;

  return (
    <section aria-labelledby="contributions-heading">
      <header className="section-header-bar">
        <h2 id="contributions-heading">Contributions</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="month-label">{formatMonth(month)}</span>
          <button className="btn-secondary" onClick={onFlagMissing}>Flag Unpaid</button>
        </div>
      </header>
      <div className="contribution-summary card" style={{ marginBottom: 24 }}>
        <div className="contrib-summary-row">
          <div>
            <div className="stat-label">Collected This Month</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              R {totalCollected.toLocaleString()}
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400 }}> / R {totalExpected.toLocaleString()}</span>
            </div>
          </div>
          <div className="contrib-progress-wrap">
            <div className="contrib-progress-bar">
              <div className="contrib-progress-fill" style={{ width: `${progress}%` }}
                role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
            </div>
            <span className="contrib-progress-label">{progress}% collected</span>
          </div>
        </div>
      </div>
      {members.length === 0 ? (
        <p className="empty-state">No members yet.</p>
      ) : (
        <ul className="contributions-list">
          {members.map((m) => {
            const hasPaid = paidMemberIds.has(m._id);
            const record  = contributions.find(
              (c) => (c.member?._id || c.member) === m._id && c.month === month && c.status === "paid"
            );
            return (
              <li key={m._id} className={`contribution-row${hasPaid ? " paid" : ""}`}>
                <div className="payout-avatar">{m.initials}</div>
                <div className="payout-name"><strong>{m.name}</strong><span>{m.role}</span></div>
                {hasPaid ? (
                  <div className="contrib-paid-info">
                    <span className="status-badge active">✓ Paid</span>
                    <span className="contrib-ref">{record?.reference}</span>
                    <span className="contrib-date">{formatDateTime(record?.paidAt)}</span>
                  </div>
                ) : (
                  <div className="contrib-actions">
                    <span className="status-badge pending">Unpaid</span>
                    <button className="btn-pay" onClick={() => onPay(m)} disabled={loading}>Pay R{group.amount}</button>
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
              <thead><tr>{["Member","Month","Amount","Reference","Status","Date"].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
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

function Disbursements({ disbursements, members, group, contributions, onDisburse, onMarkPaid, loading }) {
  const month = currentMonth();
  const totalCollected = contributions
    .filter((c) => c.month === month && c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);
  const disbursedMemberIds = new Set(disbursements.map((d) => d.member?._id || d.member));

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
            <div className="stat-value" style={{ fontSize: 22 }}>R {totalCollected.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              from {contributions.filter((c) => c.month === month && c.status === "paid").length} members this month
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
                <div className="payout-name"><strong>{m.name}</strong><span>{m.role}</span></div>
                {disbursed ? (
                  <div className="contrib-paid-info">
                    <span className={`status-badge ${record.status}`}>{record.status}</span>
                    <span className="contrib-ref">R{record.amount?.toLocaleString()}</span>
                    {record.status === "pending" && (
                      <button className="btn-secondary" style={{ fontSize: 12, padding: "5px 12px" }}
                        onClick={() => onMarkPaid(record._id)} disabled={loading}>
                        Mark Paid
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="contrib-actions">
                    <span className="status-badge pending">No Payout</span>
                    <button className="btn-pay" onClick={() => onDisburse(m)} disabled={loading || totalCollected === 0}>
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
              <thead><tr>{["Member","Month","Amount","Reference","Status","Note"].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
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
  const [meetLink,       setMeetLink]       = useState("");
  const [meetNotes,      setMeetNotes]      = useState("");
  const [contributions,  setContributions]  = useState([]);
  const [disbursements,  setDisbursements]  = useState([]);
  const [payLoading,     setPayLoading]     = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);

  const navigate = useNavigate();

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  // Current user's role in the selected group
  const myMemberRole = members.find((m) => m.contact === currentUserEmail)?.role || "Member";
  const navItems     = getNavItems(selectedGroup ? myMemberRole : "Member");

  useEffect(() => {
    axios.get(`${API}/api/groups`, { headers: authHeader() })
      .then((r) => setGroups(r.data))
      .catch(() => showToast("Failed to load groups"))
      .finally(() => setLoadingGroups(false));
  }, []);

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
            const r = await axios.get(`${API}/api/payfast/contributions?groupId=${selectedGroup._id}`, { headers: authHeader() });
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
    setContributions([]);
    setDisbursements([]);
    setActiveSection("groups");
  }

  async function handleRoleChange(memberId, newRole) {
    try {
      const { data } = await axios.patch(`${API}/api/members/${memberId}/role`, { role: newRole }, { headers: authHeader() });
      setMembers((prev) => prev.map((m) => m._id === memberId ? { ...m, role: data.role } : m));
      showToast(`✓ Role updated to ${newRole}`);
    } catch (err) {
      showToast("Failed to update role: " + (err.response?.data?.error || err.message));
    }
  }

  async function handleFlagMissing() {
    try {
      const { data } = await axios.post(`${API}/api/flag-missing`, { groupId: selectedGroup._id, month: currentMonth() }, { headers: authHeader() });
      showToast(`✓ ${data.message}`);
    } catch (err) {
      showToast("Failed: " + (err.response?.data?.error || err.message));
    }
  }

  // Treasurer: confirm a manual/offline payment on behalf of a member
  async function handleConfirmPayment(member) {
    setPayLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/api/payfast/confirm`,
        { groupId: selectedGroup._id, memberId: member._id, month: currentMonth() },
        { headers: authHeader() }
      );
      setContributions((prev) => [data.contribution, ...prev]);
      showToast(`✓ Payment confirmed for ${member.name}`);
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    } finally { setPayLoading(false); }
  }

  //handleFlagMissed → individual action: marks a single member as missed (and moves them back in the FIFO queue if they are the current recipient
  async function handleFlagMissed(member) {
  if (!selectedGroup) return;
  setPayLoading(true);
  try {
    await axios.post(
      `${API}/api/groups/${selectedGroup._id}/flag-payment`,
      { memberId: member._id, status: 'missed' },
      { headers: authHeader() }
    );
    showToast(`✓ Payment flagged as missed for ${member.name}`);
    const { data: newContributions } = await axios.get(
      `${API}/api/payfast/contributions?groupId=${selectedGroup._id}`,
      { headers: authHeader() }
    );
    setContributions(newContributions);
  } catch (err) {
    showToast(`❌ Failed: ${err.response?.data?.error || err.message}`);
  } finally {
    setPayLoading(false);
  }
}


  async function saveGroup(form) {
    try {
      const { data } = await axios.post(`${API}/api/groups`, form, { headers: authHeader() });
      setGroups((prev) => [data, ...prev]);
      setShowGroupForm(false);
      showToast(`✓ "${data.name}" created`);
    } catch (err) {
      showToast("Failed to save: " + (err.response?.data?.error || err.message));
    }
  }

  async function sendInvite() {
    if (!inviteName.trim() || !inviteContact.trim()) { showToast("Please fill in all fields"); return; }
    try {
      const { data } = await axios.post(`${API}/api/members`, { name: inviteName, contact: inviteContact, groupId: selectedGroup._id }, { headers: authHeader() });
      setMembers((prev) => [...prev, data]);
      setInviteName(""); setInviteContact("");
      setInviteModal(false);
      showToast(`✓ Invite sent to ${inviteName.trim()}`);
    } catch (err) {
      showToast("Failed: " + (err.response?.data?.error || err.message));
    }
  }

  async function addMeeting() {
    if (!meetDate || !meetVenue.trim()) { showToast("Please add date and venue"); return; }
    try {
      const { data } = await axios.post(
        `${API}/api/meetings`,
        { date: meetDate, time: meetTime, venue: meetVenue, link: meetLink, notes: meetNotes, groupId: selectedGroup._id },
        { headers: authHeader() }
      );
      setMeetings((prev) => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setMeetDate(""); setMeetTime(""); setMeetVenue(""); setMeetNotes(""); setMeetLink("");
      setMeetingModal(false);
      showToast("✓ Meeting scheduled");
    } catch (err) {
      showToast("Failed: " + (err.response?.data?.error || err.message));
    }
  }

  async function handleReorder(reordered) {
    setMembers(reordered);
    try {
      await axios.put(`${API}/api/members/reorder`, { order: reordered.map((m, i) => ({ id: m._id, slot: i + 1 })) }, { headers: authHeader() });
    } catch { showToast("Failed to save order"); }
  }

  async function handlePay(member) {
    setPayLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/payfast/contribute`, { groupId: selectedGroup._id, memberId: member._id }, { headers: authHeader() });
      window.location.href = data.paymentUrl;
    } catch (err) {
      showToast("Payment error: " + (err.response?.data?.error || err.message));
    } finally { setPayLoading(false); }
  }

  async function handleDisburse(member) {
    setPayLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/payfast/disburse`, { groupId: selectedGroup._id, memberId: member._id }, { headers: authHeader() });
      setDisbursements((prev) => [data.disbursement, ...prev]);
      showToast(data.message);
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    } finally { setPayLoading(false); }
  }

  async function handleMarkPaid(disbursementId) {
    try {
      const { data } = await axios.patch(`${API}/api/payfast/disburse/${disbursementId}`, {}, { headers: authHeader() });
      setDisbursements((prev) => prev.map((d) => d._id === disbursementId ? data : d));
      showToast("✓ Payout marked as paid");
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    }
  }

  function handleCompleteMeeting(meeting) {
    navigate(`/meetings/${meeting._id}/minutes`);
  }

  const topbarTitle = activeSection === "groups" ? "" : selectedGroup?.name || "";

  if (showGroupForm) {
    return (
      <div style={{ minHeight: "100vh", color: "#f0eeff", display: "flex", flexDirection: "column", width: "100vw" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 40px", height: 64, background: "#131929", borderBottom: "1px solid #252d45", flexShrink: 0, width: "100%" }}>
          <button onClick={() => setShowGroupForm(false)} style={{ color: "#9b7fd4", background: "none", border: "none", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
            ‹ New Group
          </button>
        </header>
        <main style={{ padding: "40px", overflowY: "auto", flex: 1, width: "100%", boxSizing: "border-box" }}>
          <GroupForm onSave={saveGroup} onCancel={() => setShowGroupForm(false)} />
        </main>
      </div>
    );
  }

  // Can current user schedule meetings? (Admin or Treasurer)
  const canScheduleMeetings = myMemberRole === "Admin" || myMemberRole === "Treasurer";

  return (
    <div className="app-layout">
      <header className="topbar">
        <span className="logo-icon">◈</span>
        <span className="logo-text">Stokvel</span>
        {topbarTitle && <h1 className="topbar-title" style={{ marginLeft: 24 }}>{topbarTitle}</h1>}
      </header>

      <div className="app-body">
        <aside className="sidebar" aria-label="Main navigation">
          <nav aria-label="Sections">
            <ul className="sidebar-nav">
              {navItems
                .filter((n) => n.id === "groups" || selectedGroup)
                .map((item) => (
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
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">{getInitials(currentUsername || currentUserEmail || "U")}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{currentUsername || "User"}</span>
                <span className="sidebar-user-email">{currentUserEmail}</span>
              </div>
              <span className={`sidebar-role-badge ${myMemberRole.toLowerCase()}`}>{myMemberRole}</span>
            </div>
          </footer>
        </aside>

        <div className="main">
          <main id="main-content">

            {/* Groups list — all roles */}
            <div hidden={activeSection !== "groups"}>
              <GroupsList groups={groups} loading={loadingGroups} onSelect={handleSelectGroup} onNew={() => setShowGroupForm(true)} username={currentUsername} />
            </div>

            {/* Overview — routed by role */}
            <div hidden={activeSection !== "dashboard"}>
              {selectedGroup && myMemberRole === "Admin" && (
                <Dashboard group={selectedGroup} members={members} meetings={meetings} onBack={handleBack} />
              )}
              {selectedGroup && myMemberRole === "Treasurer" && (
                <TreasurerDashboard
                  group={selectedGroup} members={members} meetings={meetings}
                  contributions={contributions} disbursements={disbursements}
                  onBack={handleBack} onNavigate={setActiveSection}
                />
              )}
              {selectedGroup && myMemberRole === "Member" && (
                <MemberDashboard
                  group={selectedGroup} members={members} meetings={meetings}
                  contributions={contributions} currentUserEmail={currentUserEmail}
                  onBack={handleBack} onNavigate={setActiveSection}
                />
              )}
            </div>

            {/* Admin-only */}
            <div hidden={activeSection !== "members"}>
              <Members members={members} onInvite={() => setInviteModal(true)} onRoleChange={handleRoleChange} currentUserEmail={currentUserEmail} />
            </div>
            <div hidden={activeSection !== "payouts"}>
              <Payouts members={members} group={selectedGroup} onReorder={handleReorder} />
            </div>
            <div hidden={activeSection !== "meetings"}>
              <Meetings meetings={meetings} onAddMeeting={() => setMeetingModal(true)} onCompleteMeeting={handleCompleteMeeting} />
            </div>
            <div hidden={activeSection !== "contributions"}>
              <Contributions contributions={contributions} members={members} group={selectedGroup || {}} onPay={handlePay} onFlagMissing={handleFlagMissing} loading={payLoading} />
            </div>
            <div hidden={activeSection !== "disbursements"}>
              <Disbursements disbursements={disbursements} members={members} group={selectedGroup || {}} contributions={contributions} onDisburse={handleDisburse} onMarkPaid={handleMarkPaid} loading={payLoading} />
            </div>

            {/* Treasurer-only */}
            <div hidden={activeSection !== "t-members"}>
              <TreasurerMembers members={members} contributions={contributions} />
            </div>
            <div hidden={activeSection !== "t-contributions"}>
              <TreasurerContributions contributions={contributions} members={members} group={selectedGroup || {}} onConfirm={handleConfirmPayment} onFlagMissing={handleFlagMissing} onFlagMissed={handleFlagMissed} loading={payLoading} />
            </div>
            <div hidden={activeSection !== "t-meetings"}>
              <Meetings meetings={meetings} onAddMeeting={() => setMeetingModal(true)} onCompleteMeeting={handleCompleteMeeting} />
            </div>

            {/* Member-only */}
            <div hidden={activeSection !== "m-contributions"}>
              <MemberContributions contributions={contributions} members={members} group={selectedGroup || {}} onPay={handlePay} loading={payLoading} currentUserEmail={currentUserEmail} />
            </div>
            <div hidden={activeSection !== "m-meetings"}>
              <MemberMeetings meetings={meetings} />
            </div>
            <div hidden={activeSection !== "compliance"}><ComplianceReport groupId={selectedGroup?._id} /> </div>
          </main>
        </div>
      </div>

      {/* Invite modal — admin only */}
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite a Member"
        actions={[
          <button key="send" className="btn-primary" onClick={sendInvite}>Send Invite</button>,
          <button key="cancel" className="btn-ghost" onClick={() => setInviteModal(false)}>Cancel</button>,
        ]}
      >
        <Field label="Full Name" htmlFor="invite-name">
          <input id="invite-name" type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Zanele Dlamini" />
        </Field>
        <Field label="Email Address" htmlFor="invite-contact">
          <input id="invite-contact" type="email" value={inviteContact} onChange={(e) => setInviteContact(e.target.value)} placeholder="e.g. zanele@email.com" />
        </Field>
      </Modal>

      {/* Meeting modal — admin & treasurer */}
      <Modal open={meetingModal} onClose={() => setMeetingModal(false)} title="Schedule Meeting"
        actions={[
          <button key="add" className="btn-primary" onClick={addMeeting}>Schedule</button>,
          <button key="cancel" className="btn-ghost" onClick={() => setMeetingModal(false)}>Cancel</button>,
        ]}
      >
        <Field label="Date" htmlFor="meet-date">
          <input id="meet-date" type="date" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} />
        </Field>
        <Field label="Time" htmlFor="meet-time">
          <input id="meet-time" type="time" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} />
        </Field>
        <Field label="Venue" htmlFor="meet-venue">
          <input id="meet-venue" type="text" value={meetVenue} onChange={(e) => setMeetVenue(e.target.value)} placeholder="e.g. Community Hall / Zoom" />
        </Field>
        <Field label="Meeting Link (optional)" htmlFor="meet-link">
          <input id="meet-link" type="url" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="e.g. https://zoom.us/j/123456789" />
        </Field>
        <Field label="Agenda / Notes (optional)" htmlFor="meet-notes">
          <input id="meet-notes" type="text" value={meetNotes} onChange={(e) => setMeetNotes(e.target.value)} placeholder="e.g. Discuss payout schedule, review contributions..." />
        </Field>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}