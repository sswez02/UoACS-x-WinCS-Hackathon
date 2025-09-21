export default function Page2() {
  return (
    <div>
      <h2>Page 2</h2>
      <p>More placeholder content. This could be step two of a wizard.</p>

      <section style={{ marginTop: 16 }}>
        <h3>Preferences</h3>
        <label style={{ display: "block", marginBottom: 8 }}>
          <input type="checkbox" /> Receive updates
        </label>
        <label style={{ display: "block", marginBottom: 8 }}>
          Theme:
          <select style={{ marginLeft: 8 }}>
            <option>System</option>
            <option>Light</option>
            <option>Dark</option>
          </select>
        </label>
      </section>

      <small style={{ display: "block", marginTop: 16, color: "#666" }}>
        Use “← Back” to return to Page 1, or “Next →” to continue.
      </small>
    </div>
  );
}
