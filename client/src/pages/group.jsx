import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import "./group.css";

const API = import.meta.env.VITE_API_URL;

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem("token"); }
function getUser()  {
  try { return JSON.parse(localStorage.getItem("user")) || {}; }
  catch { return {}; }
}
function authHeaders() { return { Authorization: `Bearer ${getToken()}` }; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  return <div className={`toast${message ? " show" : ""}`}>{message}</div>;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, actions }) {
  return (
    <div className={`modal-overlay${open ? " open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>{title}</h3>
        {children}
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

// ── Role Switcher (for testing) ───────────────────────────────────────────────
function RoleSwitcher({ currentRole, onSwitch }) {
  return (
    <div className="role-switcher">
      <span className="role-switcher-label">Testing:</span>
      {["member", "treasurer", "admin"].map((r) => (
        <button
          key={r}
          className={`role-btn${currentRole === r ? " active" : ""}`}
          onClick={() => onSwitch(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ── MEMBER DASHBOARD ──────────────────────────────────────────────────────────
function MemberDashboard({ user, group, contributions, meetings, onLogContribution }) {
  const myContributions = contributions.filter(
    (c) => c.userId?._id === user.id || c.userId === user.id
  );
  const upcoming = meetings
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const totalPaid = myContributions
    .filter((c) => c.status === "confirmed")
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const missed = myContributions.filter((c) => c.status === "missed").length;

  return (
    <>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">My Total Paid</div>
          <div className="stat-value">R {totalPaid.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Missed Payments</div>
          <div className="stat-value" style={{ color: missed > 0 ? "var(--red)" : "var(--green)" }}>
            {missed}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Group Pool</div>
          <div className="stat-value">
            {group?.amount && group?.members?.length
              ? `R ${(group.amount * group.members.length).toLocaleString()}`
              : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next Meeting</div>
          <div className="stat-value" style={{ fontSize: "16px", paddingTop: "6px" }}>
            {upcoming.length ? formatDate(upcoming[0].date) : "—"}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* My Contributions */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: "space-between" }}>
            <h3 className="card-title" style={{ margin: 0 }}>My Contributions</h3>
            <button className="btn-invite" onClick={onLogContribution}>+ Log Payment</button>
          </div>
          <table className="meetings-table" style={{ marginTop: "16px" }}>
            <thead>
              <tr>{["Date", "Amount", "Status"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {myContributions.length === 0 ? (
                <tr><td colSpan={3} className="empty-state">No contributions yet.</td></tr>
              ) : (
                myContributions.map((c, i) => (
                  <tr key={i}>
                    <td>{formatDate(c.date?.split("T")[0] || c.date)}</td>
                    <td>R {c.amount}</td>
                    <td><span className={`status-badge ${c.status}`}>{c.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Upcoming Meetings */}
        <div className="card">
          <h3 className="card-title">Upcoming Meetings</h3>
          {upcoming.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No upcoming meetings.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {upcoming.map((m, i) => (
                <div key={i} className="meeting-notification">
                  <div className="notif-dot" />
                  <div>
                    <strong>{formatDate(m.date)}</strong> at {m.time || "TBD"}
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      📍 {m.venue || "Venue TBD"}
                    </div>
                    {m.agenda && (
                      <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
                        Agenda: {m.agenda}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Group Info — read only */}
      {group?.name && (
        <div className="card" style={{ marginTop: "20px" }}>
          <div className="card-header">
            <h3 className="card-title" style={{ margin: 0 }}>{group.name}</h3>
            <span className="badge active">Active</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {[
              ["Contribution", group.amount && group.freq ? `R${group.amount} / ${group.freq}` : "—"],
              ["Cycle", group.cycle || "—"],
              ["Payout Method", group.payoutMethod || "—"],
              ["Meeting", group.meetWeek && group.meetDay ? `Every ${group.meetWeek} ${group.meetDay}` : "—"],
            ].map(([label, val]) => (
              <div className="group-detail" key={label}>
                <span>{label}</span><strong>{val}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── TREASURER DASHBOARD ───────────────────────────────────────────────────────
function TreasurerDashboard({
  user, group, contributions, meetings, members,
  onConfirmContribution, onFlagContribution,
  onAddMeeting, onUpdateMeeting, showToast
}) {
  const [minutesModal, setMinutesModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [minutes, setMinutes] = useState("");

  const pending   = contributions.filter((c) => c.status === "pending");
  const confirmed = contributions.filter((c) => c.status === "confirmed");
  const missed    = contributions.filter((c) => c.status === "missed");
  const totalPool = confirmed.reduce((sum, c) => sum + (c.amount || 0), 0);

  const handleRecordMinutes = async () => {
    await onUpdateMeeting(selectedMeeting._id, { minutes, status: "completed" });
    setMinutesModal(false);
    setMinutes("");
    showToast("✓ Minutes recorded");
  };

  return (
    <>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Confirmed Payments</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>{confirmed.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Payments</div>
          <div className="stat-value" style={{ color: "var(--yellow)" }}>{pending.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Missed Payments</div>
          <div className="stat-value" style={{ color: missed.length > 0 ? "var(--red)" : "var(--text-muted)" }}>
            {missed.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Collected</div>
          <div className="stat-value">R {totalPool.toLocaleString()}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Contributions management */}
        <div className="card">
          <h3 className="card-title">Contribution Management</h3>
          <table className="meetings-table">
            <thead>
              <tr>{["Member", "Amount", "Date", "Status", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {contributions.length === 0 ? (
                <tr><td colSpan={5} className="empty-state">No contributions logged.</td></tr>
              ) : (
                contributions.map((c, i) => (
                  <tr key={i}>
                    <td>{c.userId?.username || "—"}</td>
                    <td>R {c.amount}</td>
                    <td>{formatDate(c.date?.split("T")[0] || c.date)}</td>
                    <td><span className={`status-badge ${c.status}`}>{c.status}</span></td>
                    <td>
                      {c.status === "pending" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button className="btn-sm-green" onClick={() => onConfirmContribution(c._id)}>✓</button>
                          <button className="btn-sm-red" onClick={() => onFlagContribution(c._id)}>✗</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Meetings */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 className="card-title" style={{ margin: 0 }}>Meetings</h3>
            <button className="btn-invite" onClick={onAddMeeting}>+ Schedule</button>
          </div>
          {meetings.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No meetings yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {meetings.map((m, i) => (
                <div key={i} className="payout-row" style={{ cursor: "default" }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: "14px" }}>{formatDate(m.date)}</strong>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {m.time || "TBD"} · {m.venue || "Venue TBD"}
                    </div>
                    {m.agenda && (
                      <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                        📋 {m.agenda}
                      </div>
                    )}
                  </div>
                  <span className={`status-badge ${m.status}`}>{m.status}</span>
                  {m.status === "upcoming" && (
                    <button className="btn-sm-gold"
                      onClick={() => { setSelectedMeeting(m); setMinutesModal(true); }}>
                      Minutes
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payout Schedule */}
      <div className="card" style={{ marginTop: "20px" }}>
        <h3 className="card-title">Payout Schedule</h3>
        <div className="payout-list">
          {members.length === 0 ? (
            <p className="empty-state">No members yet.</p>
          ) : (
            members.map((m, i) => (
              <div key={i} className="payout-row" style={{ cursor: "default" }}>
                <span className="payout-num">{String(i + 1).padStart(2, "0")}</span>
                <div className="payout-avatar">{getInitials(m.username)}</div>
                <div className="payout-name">
                  <strong>{m.username}</strong>
                  <span>{m.role}</span>
                </div>
                <span className="payout-amount">
                  {group?.amount && members.length
                    ? `R ${(group.amount * members.length).toLocaleString()}` : "—"}
                </span>
                <span className="payout-status">Pending</span>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        open={minutesModal}
        onClose={() => setMinutesModal(false)}
        title="Record Meeting Minutes"
        actions={[
          <button key="save" className="btn-primary" onClick={handleRecordMinutes}>Save Minutes</button>,
          <button key="cancel" className="btn-ghost" onClick={() => setMinutesModal(false)}>Cancel</button>,
        ]}
      >
        <Field label="Minutes / Notes">
          <textarea rows="5" value={minutes} onChange={(e) => setMinutes(e.target.value)}
            placeholder="Record what was discussed..." />
        </Field>
      </Modal>
    </>
  );
}

// ── CREATE / EDIT GROUP ───────────────────────────────────────────────────────
function CreateGroup({ groupConfig, allUsers, currentMembers, onSave }) {
  const [form, setForm] = useState({
    name: "", amount: "", freq: "", cycle: "", max: "",
    meetFreq: "", meetDay: "", meetWeek: "", payoutMethod: "", rules: "",
    ...groupConfig,
  });
  const [selectedMembers, setSelectedMembers] = useState(
    currentMembers.map((m) => m._id || m)
  );
  const [treasurerId, setTreasurerId] = useState(groupConfig.treasurerId || "");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleMember = (id) =>
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form, selectedMembers, treasurerId);
  };

  return (
    <div className="form-page">
      <div className="form-intro">
        <h2>{groupConfig.name ? "Edit Group" : "Configure Your Stokvel"}</h2>
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
                <label key={v} className={`radio-option${form.payoutMethod === v ? " selected" : ""}`}>
                  <input type="radio" name="payout" value={v}
                    checked={form.payoutMethod === v}
                    onChange={() => setForm((f) => ({ ...f, payoutMethod: v }))} />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div className="field full">
            <label>Group Rules / Notes</label>
            <textarea rows="3" value={form.rules} onChange={set("rules")}
              placeholder="e.g. Late payments will incur a R50 penalty..." />
          </div>

          {/* Member Picker */}
          <div className="field full">
            <label>Invite Members to Group</label>
            <div className="member-picker">
              {allUsers.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No other users found.</p>
              ) : (
                allUsers.map((u) => (
                  <label key={u._id}
                    className={`member-pick-item${selectedMembers.includes(u._id) ? " selected" : ""}`}>
                    <input type="checkbox" checked={selectedMembers.includes(u._id)}
                      onChange={() => toggleMember(u._id)} />
                    <div className="member-pick-avatar">{getInitials(u.username)}</div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: "block", fontSize: "14px" }}>{u.username}</strong>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{u.email}</span>
                    </div>
                    <span className={`status-badge ${u.role}`}>{u.role}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Treasurer Picker */}
          <div className="field full">
            <label>Assign Treasurer</label>
            <select value={treasurerId} onChange={(e) => setTreasurerId(e.target.value)}>
              <option value="">— None —</option>
              {allUsers.filter((u) => selectedMembers.includes(u._id)).map((u) => (
                <option key={u._id} value={u._id}>{u.username} ({u.email})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {groupConfig.name ? "Save Changes" : "Create Group"}
          </button>
          <button type="button" className="btn-ghost"
            onClick={() => setForm({
              name: "", amount: "", freq: "", cycle: "", max: "",
              meetFreq: "", meetDay: "", meetWeek: "", payoutMethod: "", rules: ""
            })}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

// ── ADMIN MEMBERS ─────────────────────────────────────────────────────────────
function AdminMembers({ members, allUsers, onInviteMembers, onAssignTreasurer }) {
  const [selected, setSelected] = useState([]);
  const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <>
      <div className="section-header-bar">
        <h2>Members</h2>
        {selected.length > 0 && (
          <button className="btn-invite" onClick={() => { onInviteMembers(selected); setSelected([]); }}>
            + Add {selected.length} to Group
          </button>
        )}
      </div>

      <h4 style={{ color: "var(--text-muted)", fontSize: "12px", letterSpacing: "1px",
        textTransform: "uppercase", marginBottom: "12px" }}>
        Group Members
      </h4>
      <div className="members-grid" style={{ marginBottom: "28px" }}>
        {members.length === 0 ? (
          <p className="empty-state">No members yet.</p>
        ) : (
          members.map((m, i) => (
            <div className="member-card" key={i}>
              <div className={`member-avatar ${m.role}`}>{getInitials(m.username)}</div>
              <div className="member-info">
                <strong>{m.username}</strong>
                <span className="member-role">{m.email}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                <span className={`status-badge ${m.role}`}>{m.role}</span>
                {m.role === "member" && (
                  <button className="btn-sm-gold" onClick={() => onAssignTreasurer(m._id)}>
                    Make Treasurer
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <h4 style={{ color: "var(--text-muted)", fontSize: "12px", letterSpacing: "1px",
        textTransform: "uppercase", marginBottom: "12px" }}>
        All Users — tick to invite
      </h4>
      <div className="member-picker" style={{ background: "var(--surface)",
        borderRadius: "var(--radius-lg)", padding: "20px" }}>
        {allUsers.filter((u) => !members.find((m) => m._id === u._id)).length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            All users are already in the group.
          </p>
        ) : (
          allUsers.filter((u) => !members.find((m) => m._id === u._id)).map((u) => (
            <label key={u._id}
              className={`member-pick-item${selected.includes(u._id) ? " selected" : ""}`}>
              <input type="checkbox" checked={selected.includes(u._id)} onChange={() => toggle(u._id)} />
              <div className="member-pick-avatar">{getInitials(u.username)}</div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: "block", fontSize: "14px" }}>{u.username}</strong>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{u.email}</span>
              </div>
              <span className={`status-badge ${u.role}`}>{u.role}</span>
            </label>
          ))
        )}
      </div>
    </>
  );
}

// ── ADMIN PAYOUTS ─────────────────────────────────────────────────────────────
function AdminPayouts({ members, group }) {
  const [order, setOrder] = useState(members);
  const dragRef = useRef(null);

  useEffect(() => { setOrder(members); }, [members]);

  const pool = group?.amount && members.length
    ? `R ${(group.amount * members.length).toLocaleString()}` : "—";

  return (
    <>
      <div className="section-header-bar">
        <h2>Payout Roster</h2>
        <span className="hint">Drag to reorder</span>
      </div>
      <div className="payout-list">
        {order.length === 0 ? (
          <p className="empty-state">No members added yet.</p>
        ) : (
          order.map((m, i) => (
            <div key={m._id || i} className="payout-row" draggable
              onDragStart={() => { dragRef.current = i; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragRef.current === null || dragRef.current === i) return;
                const reordered = [...order];
                const [moved] = reordered.splice(dragRef.current, 1);
                reordered.splice(i, 0, moved);
                setOrder(reordered);
                dragRef.current = null;
              }}>
              <span className="payout-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="payout-avatar">{getInitials(m.username)}</div>
              <div className="payout-name">
                <strong>{m.username}</strong>
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

// ── ADMIN MEETINGS ────────────────────────────────────────────────────────────
function AdminMeetings({ meetings, onAddMeeting, onUpdateMeeting, showToast }) {
  const [modal, setModal] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [agenda, setAgenda] = useState("");

  const handleAdd = async () => {
    if (!date || !venue.trim()) { showToast("Please add date and venue"); return; }
    await onAddMeeting({ date, time, venue, agenda });
    setDate(""); setTime(""); setVenue(""); setAgenda("");
    setModal(false);
  };

  return (
    <>
      <div className="section-header-bar">
        <h2>Meeting Schedule</h2>
        <button className="btn-invite" onClick={() => setModal(true)}>+ Schedule Meeting</button>
      </div>
      <div className="meetings-table-wrap">
        <table className="meetings-table">
          <thead>
            <tr>
              {["#", "Date", "Time", "Venue", "Agenda", "Status", "Minutes"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 ? (
              <tr><td colSpan={7} className="empty-state">No meetings scheduled yet.</td></tr>
            ) : (
              meetings.map((m, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{formatDate(m.date)}</td>
                  <td>{m.time || "—"}</td>
                  <td>{m.venue}</td>
                  <td>{m.agenda || "—"}</td>
                  <td><span className={`status-badge ${m.status}`}>{m.status}</span></td>
                  <td style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "150px" }}>
                    {m.minutes || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Schedule Meeting"
        actions={[
          <button key="add" className="btn-primary" onClick={handleAdd}>Add Meeting</button>,
          <button key="cancel" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>,
        ]}>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Time"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Field label="Venue">
          <input value={venue} onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. Community Hall / Zoom" />
        </Field>
        <Field label="Agenda">
          <textarea rows="3" value={agenda} onChange={(e) => setAgenda(e.target.value)}
            placeholder="Meeting agenda..." />
        </Field>
      </Modal>
    </>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard({
  user, group, contributions, meetings, members, allUsers,
  onSaveGroup, onAddMeeting, onUpdateMeeting,
  onConfirmContribution, onFlagContribution,
  onAssignTreasurer, onInviteMembers,
  activeSection, setActiveSection, showToast
}) {
  const pool = group?.amount && members.length
    ? `R ${(group.amount * members.length).toLocaleString()}` : "—";
  const upcoming = meetings
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <>
      {activeSection === "dashboard" && (
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
              <div className="stat-value" style={{ fontSize: "16px", paddingTop: "6px" }}>
                {upcoming.length ? formatDate(upcoming[0].date) : "—"}
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="card group-summary">
              <div className="card-header">
                <h2>{group?.name || "No Group Yet"}</h2>
                <span className={`badge${group?.name ? " active" : ""}`}>
                  {group?.name ? "Active" : "Not Configured"}
                </span>
              </div>
              {[
                ["Contribution", group?.amount && group?.freq ? `R${group.amount} / ${group.freq}` : "—"],
                ["Meeting", group?.meetWeek && group?.meetDay ? `Every ${group.meetWeek} ${group.meetDay}` : "—"],
                ["Cycle", group?.cycle || "—"],
                ["Payout Method", group?.payoutMethod || "—"],
              ].map(([label, val]) => (
                <div className="group-detail" key={label}>
                  <span>{label}</span><strong>{val}</strong>
                </div>
              ))}
              <button className="btn-secondary" onClick={() => setActiveSection("create-group")}>
                {group?.name ? "Edit Group" : "Configure Group"}
              </button>
            </div>

            <div className="card recent-activity">
              <h3 className="card-title">Recent Activity</h3>
              <ul className="activity-list">
                {contributions.slice(-4).reverse().map((c, i) => (
                  <li key={i}>
                    <span className={`dot ${c.status === "confirmed" ? "green" : c.status === "missed" ? "red" : "yellow"}`} />
                    {c.userId?.username || "Member"} — R{c.amount} ({c.status})
                  </li>
                ))}
                {meetings.slice(-3).reverse().map((m, i) => (
                  <li key={"m" + i}>
                    <span className="dot blue" />
                    Meeting on {formatDate(m.date)}
                  </li>
                ))}
                {contributions.length === 0 && meetings.length === 0 && (
                  <li>
                    <span className="dot" style={{ background: "var(--text-dim)" }} />
                    <span style={{ color: "var(--text-dim)" }}>No activity yet.</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}

      {activeSection === "create-group" && (
        <CreateGroup
          groupConfig={group || {}}
          allUsers={allUsers}
          currentMembers={members}
          onSave={onSaveGroup}
        />
      )}

      {activeSection === "members" && (
        <AdminMembers
          members={members}
          allUsers={allUsers}
          onInviteMembers={onInviteMembers}
          onAssignTreasurer={onAssignTreasurer}
          showToast={showToast}
        />
      )}

      {activeSection === "payouts" && (
        <AdminPayouts members={members} group={group} />
      )}

      {activeSection === "meetings" && (
        <AdminMeetings
          meetings={meetings}
          onAddMeeting={onAddMeeting}
          onUpdateMeeting={onUpdateMeeting}
          showToast={showToast}
        />
      )}

      {activeSection === "contributions" && (
        <TreasurerDashboard
          user={user}
          group={group}
          contributions={contributions}
          meetings={meetings}
          members={members}
          onConfirmContribution={onConfirmContribution}
          onFlagContribution={onFlagContribution}
          onAddMeeting={onAddMeeting}
          onUpdateMeeting={onUpdateMeeting}
          showToast={showToast}
        />
      )}
    </>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function Group() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [role, setRole] = useState(() => getUser().role || "member");
  const [user] = useState(() => getUser());
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  // Contribution log modal
  const [contribModal, setContribModal] = useState(false);
  const [contribAmount, setContribAmount] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // ── Load data on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const headers = authHeaders();
        const usersRes = await axios.get(`${API}/users`, { headers });
        setAllUsers(usersRes.data.filter((u) => u._id !== user.id));

        if (user.groupId) {
          const [groupRes, contribRes, meetRes] = await Promise.all([
            axios.get(`${API}/groups/${user.groupId}`, { headers }),
            axios.get(`${API}/contributions/${user.groupId}`, { headers }),
            axios.get(`${API}/meetings/${user.groupId}`, { headers }),
          ]);
          setGroup(groupRes.data);
          setMembers(groupRes.data.members || []);
          setContributions(contribRes.data);
          setMeetings(meetRes.data);
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Save / create group ──
  const handleSaveGroup = async (form, selectedMemberIds, treasurerId) => {
    try {
      const headers = authHeaders();
      let savedGroup;

      if (group?._id) {
        const res = await axios.put(`${API}/groups/${group._id}`,
          { ...form, members: selectedMemberIds }, { headers });
        savedGroup = res.data;
        setGroup(savedGroup);
      } else {
        const res = await axios.post(`${API}/groups`,
          { ...form, members: selectedMemberIds }, { headers });
        savedGroup = res.data.group;
        setGroup(savedGroup);
        if (res.data.token) {
          localStorage.setItem("token", res.data.token);
          const updatedUser = { ...user, role: "admin", groupId: savedGroup._id };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setRole("admin");
        }
      }

      if (treasurerId) {
        await axios.put(`${API}/users/${treasurerId}/role`,
          { role: "treasurer" }, { headers });
      }

      const refreshed = await axios.get(`${API}/groups/${savedGroup._id}`, { headers });
      setMembers(refreshed.data.members || []);
      showToast("✓ Group saved successfully");
      setActiveSection("dashboard");
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleInviteMembers = async (memberIds) => {
    try {
      if (!group?._id) { showToast("Create a group first"); return; }
      await axios.put(`${API}/groups/${group._id}`,
        { members: [...members.map((m) => m._id), ...memberIds] },
        { headers: authHeaders() });
      const refreshed = await axios.get(`${API}/groups/${group._id}`, { headers: authHeaders() });
      setMembers(refreshed.data.members || []);
      showToast("✓ Members added");
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleAssignTreasurer = async (userId) => {
    try {
      await axios.put(`${API}/users/${userId}/role`,
        { role: "treasurer" }, { headers: authHeaders() });
      const refreshed = await axios.get(`${API}/groups/${group._id}`, { headers: authHeaders() });
      setMembers(refreshed.data.members || []);
      showToast("✓ Treasurer assigned");
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleLogContribution = async () => {
    if (!contribAmount || !group?._id) { showToast("Enter an amount"); return; }
    try {
      const res = await axios.post(`${API}/contributions`,
        { groupId: group._id, amount: Number(contribAmount) },
        { headers: authHeaders() });
      setContributions((prev) => [...prev, res.data]);
      setContribAmount("");
      setContribModal(false);
      showToast("✓ Contribution logged");
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleConfirmContribution = async (id) => {
    try {
      const res = await axios.put(`${API}/contributions/${id}`,
        { status: "confirmed" }, { headers: authHeaders() });
      setContributions((prev) => prev.map((c) => c._id === id ? res.data : c));
      showToast("✓ Payment confirmed");
    } catch (err) { showToast("Error: " + err.message); }
  };

  const handleFlagContribution = async (id) => {
    try {
      const res = await axios.put(`${API}/contributions/${id}`,
        { status: "missed" }, { headers: authHeaders() });
      setContributions((prev) => prev.map((c) => c._id === id ? res.data : c));
      showToast("✓ Payment flagged as missed");
    } catch (err) { showToast("Error: " + err.message); }
  };

  const handleAddMeeting = async (data) => {
    try {
      if (!group?._id) { showToast("Create a group first"); return; }
      const res = await axios.post(`${API}/meetings`,
        { ...data, groupId: group._id }, { headers: authHeaders() });
      setMeetings((prev) => [...prev, res.data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      showToast("✓ Meeting scheduled");
    } catch (err) {
      showToast("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateMeeting = async (id, data) => {
    try {
      const res = await axios.put(`${API}/meetings/${id}`, data, { headers: authHeaders() });
      setMeetings((prev) => prev.map((m) => m._id === id ? res.data : m));
    } catch (err) { showToast("Error: " + err.message); }
  };

  // ── Nav per role ──
  const navByRole = {
    member: [
      { id: "dashboard", icon: "⌂", label: "Dashboard" },
      { id: "meetings",  icon: "◷", label: "Meetings" },
    ],
    treasurer: [
      { id: "dashboard",     icon: "⌂", label: "Dashboard" },
      { id: "contributions", icon: "◈", label: "Contributions" },
      { id: "meetings",      icon: "◷", label: "Meetings" },
      { id: "payouts",       icon: "◎", label: "Payouts" },
    ],
    admin: [
      { id: "dashboard",     icon: "⌂", label: "Dashboard" },
      { id: "create-group",  icon: "✦", label: "Group Config" },
      { id: "members",       icon: "⬡", label: "Members" },
      { id: "payouts",       icon: "◎", label: "Payout Order" },
      { id: "meetings",      icon: "◷", label: "Meetings" },
      { id: "contributions", icon: "◈", label: "Contributions" },
    ],
  };

  const navItems = navByRole[role] || navByRole.member;
  const sectionTitle = navItems.find((n) => n.id === activeSection)?.label || "Dashboard";
  const roleBadgeColor = {
    admin: "var(--gold)",
    treasurer: "var(--green)",
    member: "var(--blue)",
  }[role];

  if (loading) {
    return (
      <div className="app-layout" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: "22px" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">Stokvel</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a key={item.id} href="#"
              className={`nav-item${activeSection === item.id ? " active" : ""}`}
              onClick={(e) => { e.preventDefault(); setActiveSection(item.id); }}>
              <span className="nav-icon">{item.icon}</span> {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="admin-badge"
            style={{ background: `${roleBadgeColor}22`, color: roleBadgeColor }}>
            {role.toUpperCase()}
          </div>
          <p className="admin-name">{user.username || user.email || "—"}</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-title">{sectionTitle}</div>
          <div className="topbar-actions">
            <RoleSwitcher currentRole={role}
              onSwitch={(r) => { setRole(r); setActiveSection("dashboard"); }} />
          </div>
        </header>

        {/* Member */}
        {role === "member" && (
          <section className="section active">
            {activeSection === "dashboard" && (
              <MemberDashboard
                user={user} group={group}
                contributions={contributions} meetings={meetings}
                onLogContribution={() => setContribModal(true)}
              />
            )}
            {activeSection === "meetings" && (
              <>
                <div className="section-header-bar"><h2>My Meetings</h2></div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {meetings.filter((m) => m.status === "upcoming").length === 0 ? (
                    <p className="empty-state">No upcoming meetings.</p>
                  ) : (
                    meetings
                      .filter((m) => m.status === "upcoming")
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((m, i) => (
                        <div key={i} className="meeting-notification" style={{ padding: "18px 22px" }}>
                          <div className="notif-dot" />
                          <div style={{ flex: 1 }}>
                            <strong>{formatDate(m.date)}</strong> at {m.time || "TBD"}
                            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                              📍 {m.venue || "Venue TBD"}
                            </div>
                            {m.agenda && (
                              <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "6px" }}>
                                📋 {m.agenda}
                              </div>
                            )}
                          </div>
                          <span className="status-badge upcoming">upcoming</span>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* Treasurer */}
        {role === "treasurer" && (
          <section className="section active">
            {(activeSection === "dashboard" || activeSection === "contributions") && (
              <TreasurerDashboard
                user={user} group={group} contributions={contributions}
                meetings={meetings} members={members}
                onConfirmContribution={handleConfirmContribution}
                onFlagContribution={handleFlagContribution}
                onAddMeeting={handleAddMeeting}
                onUpdateMeeting={handleUpdateMeeting}
                showToast={showToast}
              />
            )}
            {activeSection === "meetings" && (
              <AdminMeetings meetings={meetings} onAddMeeting={handleAddMeeting}
                onUpdateMeeting={handleUpdateMeeting} showToast={showToast} />
            )}
            {activeSection === "payouts" && (
              <AdminPayouts members={members} group={group} />
            )}
          </section>
        )}

        {/* Admin */}
        {role === "admin" && (
          <section className="section active">
            <AdminDashboard
              user={user} group={group} contributions={contributions}
              meetings={meetings} members={members} allUsers={allUsers}
              onSaveGroup={handleSaveGroup}
              onAddMeeting={handleAddMeeting}
              onUpdateMeeting={handleUpdateMeeting}
              onConfirmContribution={handleConfirmContribution}
              onFlagContribution={handleFlagContribution}
              onAssignTreasurer={handleAssignTreasurer}
              onInviteMembers={handleInviteMembers}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              showToast={showToast}
            />
          </section>
        )}
      </main>

      {/* Contribution Log Modal */}
      <Modal open={contribModal} onClose={() => setContribModal(false)} title="Log Contribution"
        actions={[
          <button key="log" className="btn-primary" onClick={handleLogContribution}>Submit</button>,
          <button key="cancel" className="btn-ghost" onClick={() => setContribModal(false)}>Cancel</button>,
        ]}>
        <Field label="Amount (ZAR)">
          <input type="number" value={contribAmount}
            onChange={(e) => setContribAmount(e.target.value)} placeholder="e.g. 500" min="1" />
        </Field>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}