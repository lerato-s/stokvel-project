// src/pages/Group/sections/Groups/GroupsPage.jsx
import React from "react";
import { getInitials } from "../../utils/helpers";

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

export function GroupsList({ groups, loading, onSelect, onNew, username }) {
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