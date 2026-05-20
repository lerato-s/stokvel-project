// src/pages/Group/sections/Meetings/MeetingsPages.jsx
import React from "react";
import { formatDate, formatMonth } from "../../utils/helpers";

// ── Admin/Treasurer Meetings (manage) ──────────────────────────────────────────
export function Meetings({ meetings, onAddMeeting, onCompleteMeeting }) {
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

// ── Member Meetings (read-only) ───────────────────────────────────────────────
export function MemberMeetings({ meetings }) {
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