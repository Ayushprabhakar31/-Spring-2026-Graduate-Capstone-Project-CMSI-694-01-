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
  expect(await screen.findByRole("heading", { name: /Command Center/i })).toBeInTheDocument();
  expect(screen.getByText(/Control Suite/i)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /Quick Actions/i }).length).toBeGreaterThan(0);
});
