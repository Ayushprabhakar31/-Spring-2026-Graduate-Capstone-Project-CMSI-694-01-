import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders command center heading", async () => {
  window.localStorage.setItem(
    "pulseops_session",
    JSON.stringify({
      name: "Test Operator",
      email: "test@pulseops.ai",
      role: "Platform Operator",
    }),
  );
  render(<App />);
  expect(screen.getByText(/PulseOps Command Center/i)).toBeInTheDocument();
  expect((await screen.findAllByText(/Normal Ops/i)).length).toBeGreaterThan(0);
});
