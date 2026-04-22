import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import GroupForm from "../components/GroupForm";
import "./Group.css";

const API = import.meta.env.VITE_API_URL;

function authHeader() {
  const token = localStorage.getItem("token");
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

// Format a date string
function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Build initials from a name
function getInitials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Current month in YYYY-MM format
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Format a month string
function formatMonth(m) {
  if (!m) return "—";
  const [year, month] = m.split("-");
  return new Date(year, month - 1).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });
}

// Format a datetime
function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Convert backend member shape to UI member shape
function normalizeMembers(groupMembers = []) {
  return groupMembers.map((m) => ({
    _id: m.userId,
    userId: m.userId,
    name: m.username,
    username: m.username,
    contact: m.email,
    email: m.email,
    role: m.role,
    initials: getInitials(m.username),
    status: m.isActive ? "active" : "inactive",
    joinedAt: m.joinedAt,
    isActive: m.isActive,
  }));
}

// Toast
function Toast({ message }) {
  return (
    <output role="status" aria-live="polite" className={`toast${message ? " show" : ""}`}>
      {message}
    </output>
  );
}

// Modal
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
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
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

// Groups list
function GroupsList({ groups, loading, onSelect, onNew }) {
  return (
    <section className="groups-list-page" aria-labelledby="groups-heading">
      <header className="groups-list-header">
        <h2 id="groups-heading">My Stokvels</h2>
        <button className="btn-primary" onClick={onNew}>
          + New Group
        </button>
      </header>

      {loading ? (
        <p className="empty-state">Loading groups…</p>
      ) : groups.length === 0 ? (
        <div className="empty-groups">
          <p>You haven't created any stokvels yet.</p>
          <button className="btn-primary" onClick={onNew}>
            Create your first group
          </button>
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

// Dashboard
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
    { label: "Monthly Pool", value: pool },
    { label: "Payout Method", value: group.payoutMethod || "—" },
    { label: "Next Meeting", value: upcoming.length ? formatDate(upcoming[0].date) : "—" },
  ];

  const details = [
    ["Contribution", group.amount && group.freq ? `R${group.amount} / ${group.freq}` : "—"],
    ["Meeting", group.meetWeek && group.meetDay ? `Every ${group.meetWeek} ${group.meetDay}` : "—"],
    ["Cycle", group.cycle || "—"],
    ["Payout Method", group.payoutMethod || "—"],
    ["Max Members", group.max || "—"],
  ];

  const now = new Date().toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
  });

  const activity = [
    ...members.slice().reverse().slice(0, 4).map((m) => `${m.name} joined as ${m.role}`),
    ...meetings.slice().reverse().slice(0, 3).map((m) => `Meeting scheduled for ${formatDate(m.date)}`),
  ];

  return (
    <>
      <div className="section-header-bar">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
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

// Members
function Members({ members, onInvite, onRoleChange, currentUserEmail }) {
  const isAdmin = members.some(
    (m) => m.contact === currentUserEmail && m.role === "admin"
  );

  return (
    <section aria-labelledby="members-heading">
      <header className="section-header-bar">
        <h2 id="members-heading">Members</h2>
        <button className="btn-invite" onClick={onInvite}>
          + Invite New Member
        </button>
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
                  onChange={(e) => onRoleChange(m.userId, e.target.value)}
                  aria-label={`Change role for ${m.name}`}
                >
                  <option value="member">member</option>
                  <option value="treasurer">treasurer</option>
                  <option value="admin">admin</option>
                </select>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Payouts
function Payouts({ members, group, onReorder }) {
  const dragRef = useRef(null);
  const isFIFO = group?.payoutMethod === "Fixed Order (First In First Out)";
  const pool =
    group?.amount && members.length
      ? `R ${(Number(group.amount) * members.length).toLocaleString()}`
      : "—";

  const handleDragStart = (i) => {
    dragRef.current = i;
  };

  const handleDrop = (i) => {
    if (isFIFO) return;
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
          <span className="payout-method-badge">
            {group?.payoutMethod === "Fixed Order (First In First Out)" && "Fixed Roster"}
            {!group?.payoutMethod && "—"}
          </span>
          {!isFIFO && <span className="hint">Drag to reorder</span>}
        </div>
      </header>

      <div className="payout-method-info card" style={{ marginBottom: 20 }}>
        {group?.payoutMethod === "Fixed Order (First In First Out)" ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
            <strong>Fixed Roster</strong> — Members are paid in the order they joined.
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
            No payout method set.
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
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// Meetings
function Meetings({ meetings, onAddMeeting }) {
  return (
    <section aria-labelledby="meetings-heading">
      <header className="section-header-bar">
        <h2 id="meetings-heading">Meeting Schedule</h2>
        <button className="btn-invite" onClick={onAddMeeting}>
          + Add Meeting
        </button>
      </header>

      <div className="meetings-table-wrap">
        <table className="meetings-table">
          <caption className="sr-only">Scheduled meetings</caption>
          <thead>
            <tr>
              {["#", "Date", "Time", "Venue", "Status", "Notes"].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  No meetings scheduled yet.
                </td>
              </tr>
            ) : (
              meetings.map((m, i) => (
                <tr key={m._id}>
                  <td>{i + 1}</td>
                  <td>
                    <time dateTime={m.date}>{formatDate(m.date)}</time>
                  </td>
                  <td>{m.time || "—"}</td>
                  <td>{m.venue}</td>
                  <td>
                    <span className={`status-badge ${m.status}`}>{m.status}</span>
                  </td>
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

// Contributions
function Contributions({ contributions, members, group, onPay, loading, onFlagMissing }) {
  const month = currentMonth();
  const paidMemberIds = new Set(
    contributions
      .filter((c) => c.month === month && c.status === "paid")
      .map((c) => c.member?._id || c.member)
  );

  const totalExpected =
    group.amount && members.length ? Number(group.amount) * members.length : 0;

  const totalCollected = contributions
    .filter((c) => c.month === month && c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);

  const progress = totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const hasTreasurer = members.some((m) => m.role === "treasurer");

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
            const record = contributions.find(
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
                    <span className="status-badge active">Paid</span>
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
    </section>
  );
}

// Disbursements
function Disbursements({
  disbursements,
  members,
  group,
  contributions,
  onDisburse,
  onMarkPaid,
  loading,
}) {
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
            const record = disbursements.find((d) => (d.member?._id || d.member) === m._id);

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
    </section>
  );
}

const NAV_ITEMS = [
  { id: "groups", icon: "⌂", label: "My Groups" },
  { id: "members", icon: "⬡", label: "Members" },
  { id: "payouts", icon: "◎", label: "Payout Order" },
  { id: "meetings", icon: "◷", label: "Meetings" },
  { id: "contributions", icon: "₴", label: "Contributions" },
  { id: "disbursements", icon: "◈", label: "Disbursements" },
];

export default function Group() {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserEmail = currentUser.email || currentUser.user?.email || "";
  const currentUsername = currentUser.username || currentUser.user?.username || "";

  const [activeSection, setActiveSection] = useState("groups");
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [toast, setToast] = useState("");
  const [inviteModal, setInviteModal] = useState(false);
  const [meetingModal, setMeetingModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteContact, setInviteContact] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [meetVenue, setMeetVenue] = useState("");
  const [meetNotes, setMeetNotes] = useState("");
  const [contributions, setContributions] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [payLoading, setPayLoading] = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  // Load groups on mount
  useEffect(() => {
    axios
      .get(`${API}/api/my-groups`, { headers: authHeader() })
      .then((r) => setGroups(r.data))
      .catch(() => showToast("Failed to load groups"))
      .finally(() => setLoadingGroups(false));
  }, [showToast]);

  // Load selected group data
  useEffect(() => {
    if (!selectedGroup) return;

    // Use embedded members directly from group document
    setMembers(normalizeMembers(selectedGroup.members || []));

    // Keep meetings/contributions/disbursements requests if those routes exist
    const h = { headers: authHeader() };

    Promise.allSettled([
      axios.get(`${API}/api/meetings?groupId=${selectedGroup._id}`, h),
      axios.get(`${API}/api/payfast/contributions?groupId=${selectedGroup._id}`, h),
      axios.get(`${API}/api/payfast/disbursements?groupId=${selectedGroup._id}`, h),
    ]).then(([mtRes, cRes, dRes]) => {
      if (mtRes.status === "fulfilled") setMeetings(mtRes.value.data);
      else setMeetings([]);

      if (cRes.status === "fulfilled") setContributions(cRes.value.data);
      else setContributions([]);

      if (dRes.status === "fulfilled") setDisbursements(dRes.value.data);
      else setDisbursements([]);
    });
  }, [selectedGroup]);

  // Handle PayFast return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const ref = params.get("ref");

    if (payment === "success") {
      showToast(`Payment successful. Ref: ${ref}`);
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
        } catch {
          clearInterval(interval);
        }
      }, 3000);
    } else if (payment === "cancelled") {
      showToast("Payment was cancelled");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [selectedGroup, showToast]);

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
      const { data } = await axios.put(
        `${API}/api/groups/${selectedGroup._id}/members/${memberId}/role`,
        { newRole },
        { headers: authHeader() }
      );

      setMembers(normalizeMembers(data.members));

      // Also update selected group state
      setSelectedGroup((prev) => ({
        ...prev,
        members: data.members,
        adminId: newRole === "admin" ? memberId : prev.adminId,
      }));

      showToast(`Role updated to ${newRole}`);
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
      showToast(data.message);
    } catch (err) {
      showToast("Failed: " + (err.response?.data?.error || err.message));
    }
  }

  async function saveGroup(form) {
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        max: Number(form.max),
      };

      const { data } = await axios.post(
        `${API}/api/groups`,
        payload,
        { headers: authHeader() }
      );

      setGroups((prev) => [data.group, ...prev]);
      setShowGroupForm(false);
      showToast(`"${data.group.name}" created`);
    } catch (err) {
      showToast("Failed to save: " + (err.response?.data?.error || err.message));
    }
  }

  async function sendInvite() {
    if (!inviteContact.trim()) {
      showToast("Please enter an email");
      return;
    }

    try {
      const { data } = await axios.post(
        `${API}/api/groups/${selectedGroup._id}/members`,
        {
          email: inviteContact,
          role: "member",
        },
        { headers: authHeader() }
      );

      setMembers(normalizeMembers(data.members));
      setSelectedGroup((prev) => ({
        ...prev,
        members: data.members,
      }));
      setInviteName("");
      setInviteContact("");
      setInviteModal(false);
      showToast("Member added successfully");
    } catch (err) {
      showToast("Failed: " + (err.response?.data?.error || err.message));
    }
  }

  async function addMeeting() {
    if (!meetDate || !meetVenue.trim()) {
      showToast("Please add date and venue");
      return;
    }

    try {
      const { data } = await axios.post(
        `${API}/api/meetings`,
        {
          date: meetDate,
          time: meetTime,
          venue: meetVenue,
          notes: meetNotes,
          groupId: selectedGroup._id,
        },
        { headers: authHeader() }
      );

      setMeetings((prev) => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setMeetDate("");
      setMeetTime("");
      setMeetVenue("");
      setMeetNotes("");
      setMeetingModal(false);
      showToast("Meeting added");
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
    } finally {
      setPayLoading(false);
    }
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
    } finally {
      setPayLoading(false);
    }
  }

  async function handleMarkPaid(disbursementId) {
    try {
      const { data } = await axios.patch(
        `${API}/api/payfast/disburse/${disbursementId}`,
        {},
        { headers: authHeader() }
      );
      setDisbursements((prev) => prev.map((d) => (d._id === disbursementId ? data : d)));
      showToast("Payout marked as paid");
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    }
  }

  const topbarTitle =
    activeSection === "groups"
      ? "My Stokvels"
      : activeSection === "dashboard"
      ? selectedGroup?.name
      : NAV_ITEMS.find((n) => n.id === activeSection)?.label || "";

  // Read role from current group members
  const myMemberRole =
    members.find((m) => m.contact === currentUserEmail)?.role || "member";

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
            <button className="btn-back" onClick={() => setShowGroupForm(false)}>
              ← Back
            </button>
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
                      ? " active"
                      : ""
                  }`}
                  aria-current={activeSection === item.id ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.id === "groups") handleBack();
                    else setActiveSection(item.id);
                  }}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {getInitials(currentUsername || currentUserEmail || "U")}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{currentUsername || "User"}</span>
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

      <Modal
        open={inviteModal}
        onClose={() => setInviteModal(false)}
        title="Invite a Member"
        actions={[
          <button key="send" className="btn-primary" onClick={sendInvite}>
            Send Invite
          </button>,
          <button key="cancel" className="btn-ghost" onClick={() => setInviteModal(false)}>
            Cancel
          </button>,
        ]}
      >
        <Field label="Full Name" htmlFor="invite-name">
          <input
            id="invite-name"
            type="text"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="e.g. Zanele Dlamini"
          />
        </Field>

        <Field label="Email Address" htmlFor="invite-contact">
          <input
            id="invite-contact"
            type="email"
            value={inviteContact}
            onChange={(e) => setInviteContact(e.target.value)}
            placeholder="e.g. zanele@email.com"
          />
        </Field>
      </Modal>

      <Modal
        open={meetingModal}
        onClose={() => setMeetingModal(false)}
        title="Add Meeting"
        actions={[
          <button key="add" className="btn-primary" onClick={addMeeting}>
            Add Meeting
          </button>,
          <button key="cancel" className="btn-ghost" onClick={() => setMeetingModal(false)}>
            Cancel
          </button>,
        ]}
      >
        <Field label="Date" htmlFor="meet-date">
          <input
            id="meet-date"
            type="date"
            value={meetDate}
            onChange={(e) => setMeetDate(e.target.value)}
          />
        </Field>

        <Field label="Time" htmlFor="meet-time">
          <input
            id="meet-time"
            type="time"
            value={meetTime}
            onChange={(e) => setMeetTime(e.target.value)}
          />
        </Field>

        <Field label="Venue" htmlFor="meet-venue">
          <input
            id="meet-venue"
            type="text"
            value={meetVenue}
            onChange={(e) => setMeetVenue(e.target.value)}
            placeholder="e.g. Community Hall / Zoom"
          />
        </Field>

        <Field label="Notes" htmlFor="meet-notes">
          <input
            id="meet-notes"
            type="text"
            value={meetNotes}
            onChange={(e) => setMeetNotes(e.target.value)}
            placeholder="Optional agenda..."
          />
        </Field>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}