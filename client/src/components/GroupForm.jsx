import { useState } from "react";


const FREQ_OPTIONS = ["Monthly", "Weekly", "Bi-weekly"];
const CYCLE_OPTIONS = ["6 Months", "12 Months", "18 Months", "24 Months"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const PAYOUT_METHODS = ["Fixed Order (First In First Out)"];

const EMPTY_FORM = {
  name: "",
  amount: "",
  freq: "",
  cycle: "",
  max: "",
  payoutMethod: "",
  rules: "",
};

export default function GroupForm({ initialValues = {}, onSave, onCancel, isSaving = false, error = "" }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initialValues });

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const setDirect = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(e) {
    e.preventDefault();

    const requiredFields = [
      "name",
      "amount",
      "freq",
      "cycle",
      "max",
      "payoutMethod",
      "rules",
    ];

    const hasEmptyField = requiredFields.some(
      (field) => !String(form[field]).trim()
    );

    if (hasEmptyField) {
      alert("Please fill in all fields before saving.");
      return;
    }

    onSave({
      ...form,
      amount: Number(form.amount),
      max: Number(form.max),
    });
  }

  function handleReset() {
    setForm(EMPTY_FORM);
  }

  return (
    <section className="form-page" aria-labelledby="form-heading">
      <header className="form-intro">
        <h2 id="form-heading">Configure Your Stokvel</h2>
        <p>Set up the rules of your group. These will be visible to all members.</p>
      </header>

      {error && (
        <p style={{ color: "red", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      <form className="stokvel-form" onSubmit={handleSubmit} noValidate>
        <fieldset>
          <legend>Group Identity</legend>

          <div className="field full">
            <label htmlFor="group-name">Group Name</label>
            <input
              id="group-name"
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Mzansi Savers"
              required
              aria-required="true"
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>Contributions</legend>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="contribution-amount">Amount (ZAR)</label>
              <input
                id="contribution-amount"
                type="number"
                value={form.amount}
                onChange={set("amount")}
                placeholder="e.g. 500"
                min="1"
              />
            </div>

            <div className="field">
              <label htmlFor="contribution-freq">Frequency</label>
              <select id="contribution-freq" value={form.freq} onChange={set("freq")}>
                <option value="">— Select —</option>
                {FREQ_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="cycle-duration">Cycle Duration</label>
              <select id="cycle-duration" value={form.cycle} onChange={set("cycle")}>
                <option value="">— Select —</option>
                {CYCLE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="max-members">Max Members</label>
              <input
                id="max-members"
                type="number"
                value={form.max}
                onChange={set("max")}
                placeholder="e.g. 12"
                min="2"
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Meeting Schedule</legend>

          <div className="form-grid">

            <div className="field">
              <label htmlFor="meet-day">Meeting Day</label>
              <select id="meet-day" value={form.meetDay} onChange={set("meetDay")}>
                <option value="">— Select —</option>
                {DAYS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Payout Method</legend>

          <div className="radio-group" role="radiogroup" aria-label="Payout method">
            {PAYOUT_METHODS.map((v) => (
              <label
                key={v}
                className={`radio-option${form.payoutMethod === v ? " selected" : ""}`}
              >
                <input
                  type="radio"
                  name="payout"
                  value={v}
                  checked={form.payoutMethod === v}
                  onChange={() => setDirect("payoutMethod", v)}
                />
                {v}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Rules &amp; Notes</legend>

          <div className="field full">
            <label htmlFor="group-rules">Group Rules / Notes</label>
            <textarea
              id="group-rules"
              rows="3"
              value={form.rules}
              onChange={set("rules")}
              placeholder="e.g. Late payments will incur a R50 penalty..."
            />
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>

          <button type="button" className="btn-ghost" onClick={handleReset} disabled={isSaving}>
            Reset
          </button>

          {onCancel && (
            <button type="button" className="btn-ghost" onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}