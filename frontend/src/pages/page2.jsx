import React, { useState } from "react";

const PageForm = () => {
  const [name, setName] = useState("");
  const [sex, setSex] = useState("");
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(170);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Page number */}
        <div style={styles.pageNumber}>1/7</div>

        {/* Form */}
        <div style={styles.formFields}>
          {/* Name */}
          <div>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Sex */}
          <div>
            <label style={styles.label}>Sex</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              style={styles.input}
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Age */}
          <div>
            <label style={styles.label}>Age</label>
            <div style={styles.rangeWrapper}>
              <input
                type="range"
                min="0"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                style={styles.range}
              />
              <span>{age}</span>
            </div>
          </div>

          {/* Height */}
          <div>
            <label style={styles.label}>Height</label>
            <div style={styles.rangeWrapper}>
              <input
                type="range"
                min="50"
                max="220"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                style={styles.range}
              />
              <span>{height} cm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    width: "80vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827", // gray-900
    color: "#f3f4f6", // gray-100
  },
  card: {
    position: "relative",
    width: "400px",
    padding: "1.5rem",
    borderRadius: "1rem",
    backgroundColor: "#1f2937", // gray-800
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  pageNumber: {
    position: "absolute",
    top: "0.75rem",
    right: "1rem",
    fontSize: "0.875rem",
    color: "#9ca3af", // gray-400
  },
  formFields: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  label: {
    fontWeight: "bold",
    display: "block",
    marginBottom: "0.5rem",
  },
  input: {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.375rem",
    border: "1px solid #000",
    backgroundColor: "rgba(250, 204, 21, 0.6)", // yellow-400/60
    color: "#000",
    outline: "none",
  },
  rangeWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  range: {
    flex: 1,
    accentColor: "#facc15", // yellow-400
  },
};

export default PageForm;
