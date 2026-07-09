import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSignup = vi.fn();
vi.mock("@/lib/auth", () => ({ signup: (...args: unknown[]) => mockSignup(...args) }));

import { SignupForm } from "./SignupForm";

describe("SignupForm", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockSignup.mockReset();
  });

  it("submits the entered name, email and password", async () => {
    mockSignup.mockResolvedValue({ status: "ok" });
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/^name/i), "Alice");
    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "correct-horse");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(mockSignup).toHaveBeenCalledWith("alice@example.com", "Alice", "correct-horse"),
    );
  });

  it("redirects to /boards on success", async () => {
    mockSignup.mockResolvedValue({ status: "ok" });
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/^name/i), "Alice");
    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "correct-horse");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/boards"));
  });

  it("shows a clear error message and does not redirect when the email is taken", async () => {
    mockSignup.mockResolvedValue({
      status: "error",
      message: "An account with that email already exists.",
    });
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/^name/i), "Alice");
    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "correct-horse");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account with that email already exists.",
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
