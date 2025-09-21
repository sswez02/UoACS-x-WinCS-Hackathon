import React from "react";

const Page1 = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>
        Your <span style={styles.highlight}>Personal</span> Gym
        <br />
        Plan, Built for <span style={styles.highlight}>You</span>.
      </h1>
      <button style={styles.button}>Start Here</button>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#2e2e2e",
    color: "#f1f1f1",
    height: "80vh",
    width: "80vw",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "sans-serif",
    boxSizing: "border-box",
    overflow: "hidden",
    padding: "1rem",
    textAlign: "center",
  },
  heading: {
    fontSize: "2.5rem",
    fontWeight: "700",
    marginBottom: "2rem",
    lineHeight: 1.3,
    maxWidth: "90vw", // Prevents horizontal overflow
  },
  highlight: {
    color: "#f0e85a",
  },
  button: {
    backgroundColor: "#d0cb5a",
    border: "2px solid #111",
    color: "#2e2e2e",
    padding: "1rem 2rem",
    fontSize: "1.2rem",
    fontWeight: "bold",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

export default Page1;
