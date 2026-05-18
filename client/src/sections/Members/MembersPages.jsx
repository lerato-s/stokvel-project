// src/pages/Group/sections/Members/MembersPages.jsx
import React from "react";

// ── Admin Members View ────────────────────────────────────────────────────────
export function Members({ members, onInvite, onRoleChange, currentUserEmail }) {
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

// ── Treasurer Members (read + payment status) ────────────────────────────────
export function TreasurerMembers({ members, contributions }) {
  const { currentMonth } = require("../../utils/helpers");
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

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(m) {
  if (!m) return "—";
  const [year, month] = m.split("-");
  return new Date(year, month - 1).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}