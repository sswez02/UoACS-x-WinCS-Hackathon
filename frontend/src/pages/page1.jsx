export default function Page1() {
  return (
    <div>
      <h2>Page 1</h2>
      <p>This is dummy content for Page 1. Put your intro or step-one form here.</p>

      <section style={{ marginTop: 16 }}>
        <h3>Basic Info</h3>
        <label style={{ display: "block", marginBottom: 8 }}>
          Name:
          <input type="text" placeholder="Jane Doe" style={{ marginLeft: 8 }} />
        </label>
        <label style={{ display: "block", marginBottom: 8 }}>
          Email:
          <input type="email" placeholder="jane@example.com" style={{ marginLeft: 8 }} />
        </label>
      </section>

      <small style={{ display: "block", marginTop: 16, color: "#666" }}>
        Tip: Click “Next →” below to see Page 2.
      </small>
    </div>
  );
}
