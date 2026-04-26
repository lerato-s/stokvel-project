import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./g.css";




function PuserDashboard({ onSaveGroup }) {
  // `showForm` tracks whether we're on the welcome prompt or the actual form.
  const [showForm, setShowForm] = useState(false);
   const navigate = useNavigate();
 
  if (showForm) {
    return <CreateGroup groupConfig={{}} onSave={onSaveGroup} />;
  }
 
  // ── Welcome / onboarding screen ──
  return (
    <div style={{ maxWidth: "560px", margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
      <div style={{
        width: "80px", height: "80px", borderRadius: "50%",
        background: "rgba(212,175,55,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "36px", margin: "0 auto 28px"
      }}>◈</div>
 
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "28px", marginBottom: "14px" }}>
        Welcome to Stokvel
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.7, marginBottom: "36px" }}>
        You're not part of a group yet. Create your own stokvel and you'll
        automatically become the <strong>Group Admin</strong> — giving you
        full control to invite members, schedule meetings, and manage payouts.
      </p>
 
      {/* What happens after you create */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "20px 24px", marginBottom: "32px", textAlign: "left"
      }}>
        {[
          ["✦", "Create your group",       "Set contribution amount, cycle, and meeting schedule."],
          ["⬡", "Invite members via email", "They receive an Accept / Decline link in their inbox."],
          ["◎", "Manage everything",        "Confirm payments, run meetings, and track payouts."],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ display: "flex", gap: "14px", marginBottom: "16px" }}>
            <span style={{ fontSize: "18px", paddingTop: "2px", color: "var(--gold)" }}>{icon}</span>
            <div>
              <strong style={{ display: "block", fontSize: "14px", marginBottom: "2px" }}>{title}</strong>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{desc}</span>
            </div>
          </div>
        ))}
      </div>
 
      <button
       
        className="btn-primary"
        style={{ width: "100%", maxWidth: "320px", padding: "14px", fontSize: "15px" }}
        onClick={() => navigate("/group")}
      >
        ✦ Configure Your Stokvel
        
      </button>
      <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "12px" }}>
        You'll be upgraded to Admin the moment your group is created.
      </p>
    </div>
  );
}

export default PuserDashboard;