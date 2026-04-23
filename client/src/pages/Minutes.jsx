import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../pages/group.css";

const API = import.meta.env.VITE_API_URL;

function authHeader() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = user.token || user.accessToken || user.user?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MeetingMinutes() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [members, setMembers] = useState([]);

  const [summary, setSummary] = useState("");
  const [decisions, setDecisions] = useState([""]);
  const [actions, setActions] = useState([""]);
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    async function load() {
      const [meetingRes] = await Promise.all([
        axios.get(`${API}/api/meetings/${meetingId}`, { headers: authHeader() }),
      ]);

      const m = meetingRes.data;
      setMeeting(m);

      // load members for same group
      const membersRes = await axios.get(
        `${API}/api/members?groupId=${m.group}`,
        { headers: authHeader() }
      );

      setMembers(membersRes.data);

      // init attendance
      const init = {};
      membersRes.data.forEach((mem) => {
        init[mem._id] = "present";
      });
      setAttendance(init);
    }

    load();
  }, [meetingId]);

  function setMemberAttendance(memberId, status) {
    setAttendance((prev) => ({ ...prev, [memberId]: status }));
  }

  function addDecision() {
    setDecisions((d) => [...d, ""]);
  }

  function addAction() {
    setActions((a) => [...a, ""]);
  }

  function updateDecision(i, v) {
    setDecisions((d) => d.map((x, idx) => (idx === i ? v : x)));
  }

  function updateAction(i, v) {
    setActions((a) => a.map((x, idx) => (idx === i ? v : x)));
  }

  async function handleSave() {
    const cleanDecisions = decisions.filter((d) => d.trim());
    const cleanActions = actions.filter((a) => a.trim());

    await axios.patch(
      `${API}/api/meetings/${meetingId}`,
      {
        minutes: {
          summary,
          decisions: cleanDecisions,
          actions: cleanActions,
          attendance,
        },
        status: "completed",
      },
      { headers: authHeader() }
    );

    navigate(-1); // go back
  }

  if (!meeting) return <p>Loading meeting...</p>;

  const present = members.filter((m) => attendance[m._id] === "present");
  const absent = members.filter((m) => attendance[m._id] === "absent");
  const late = members.filter((m) => attendance[m._id] === "late");

  return (
    <div className="minutes-page">
      <div className="minutes-topbar">
  <button className="btn-back" onClick={() => navigate(-1)}>
    ← Back
  </button>

  <h2 className="minutes-title">Meeting Minutes</h2>
</div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <p><strong>Date:</strong> {formatDate(meeting.date)}</p>
        <p><strong>Time:</strong> {meeting.time || "—"}</p>
        <p><strong>Venue:</strong> {meeting.venue || "—"}</p>
      </div>

      {/* SUMMARY */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3>Summary</h3>
        <textarea
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Meeting summary..."
          style={{ width: "100%" }}
        />
      </div>

      {/* DECISIONS */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3>Decisions</h3>
        {decisions.map((d, i) => (
          <input
            key={i}
            value={d}
            onChange={(e) => updateDecision(i, e.target.value)}
            placeholder="Decision..."
            style={{ display: "block", width: "100%", marginBottom: 10 }}
          />
        ))}
        <button onClick={addDecision}>+ Add Decision</button>
      </div>

      {/* ACTIONS */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3>Action Items</h3>
        {actions.map((a, i) => (
          <input
            key={i}
            value={a}
            onChange={(e) => updateAction(i, e.target.value)}
            placeholder="Action item..."
            style={{ display: "block", width: "100%", marginBottom: 10 }}
          />
        ))}
        <button onClick={addAction}>+ Add Action</button>
      </div>

      {/* ATTENDANCE */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3>Attendance</h3>

        {members.map((m) => (
          <div key={m._id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>{m.name}</span>

            <div>
              {["present", "absent", "late"].map((s) => (
                <button
                  key={s}
                  onClick={() => setMemberAttendance(m._id, s)}
                  style={{
                    marginLeft: 5,
                    fontWeight: attendance[m._id] === s ? "bold" : "normal",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}

        <p style={{ marginTop: 10 }}>
          Present: {present.length} | Absent: {absent.length} | Late: {late.length}
        </p>
      </div>

      <button className="btn-primary" onClick={handleSave}>
        Save & Complete Meeting
      </button>
    </div>
  );
}