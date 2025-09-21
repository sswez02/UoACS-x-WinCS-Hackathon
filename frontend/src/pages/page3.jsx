import React, { useState } from "react";

const Page3 = () => {
  const [diet, setDiet] = useState("");

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Page number */}
        <div style={styles.pageNumber}>2/7</div>

        {/* Heading */}
        <h1 style={styles.heading}>What’s Your Diet?</h1>

        {/* Input */}
        <input
          type="text"
          placeholder="Vegetarian, Keto etc."
          value={diet}
          onChange={(e) => setDiet(e.target.value)}
          style={styles.input}
        />
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827", // gray-900
    color: "#f3f4f6", // gray-100
  },
  card: {
    position: "relative",
    width: "600px",
    padding: "2rem",
    borderRadius: "1rem",
    backgroundColor: "#1f2937", // gray-800
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
    textAlign: "center",
  },
  pageNumber: {
    position: "absolute",
    top: "1rem",
    right: "1.5rem",
    fontSize: "0.9rem",
    color: "#d1d5db",
  },
  heading: {
    fontSize: "2.5rem",
    fontWeight: "900",
    marginBottom: "2rem",
  },
  input: {
    width: "100%",
    padding: "1rem",
    borderRadius: "0.5rem",
    border: "1px solid #000",
    backgroundColor: "#d0cb5a", // yellowish box
    color: "#000",
    fontSize: "1.1rem",
    fontWeight: "600",
    outline: "none",
  },
};

export default Page3;
