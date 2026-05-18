// src/pages/Group/sections/Disbursements/DisbursmentsPage.jsx
import React from "react";
import { formatMonth, formatDateTime, currentMonth, getInitials } from "../../utils/helpers";

export function Disbursements({ disbursements, members, group, contributions, onDisburse, onMarkPaid, loading }) {
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