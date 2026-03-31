import React from "react";

function SprintGoal() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Sprint Goal</h2>
        <p><strong>01</strong> Build a functional dashboard for monitoring API traffic in real time.</p>
        <p><strong>02</strong> Deliver a working frontend connected to backend metrics endpoint.</p>
        <p><strong>03</strong> Ensure full JIRA traceability for sprint work.</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f4f6f8"
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
    width: "500px"
  }
};

export default SprintGoal;