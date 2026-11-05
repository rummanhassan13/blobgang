import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getUser: vi.fn(), updateUser: vi.fn(),
  listener: undefined as undefined | ((event: string) => void),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  getUser: auth.getUser, updateUser: auth.updateUser,
  onAuthStateChange: (listener: (event: string) => void) => {
    auth.listener = listener;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  },
} } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/blob/Blob", () => ({ Blob: () => null }));
import { ResetPasswordPage } from "@/routes/reset-password";

describe("Password recovery", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/reset-password");
    vi.clearAllMocks();
    auth.getUser.mockResolvedValue({ data: { user: { id: "recovering-user" } }, error: null });
    auth.updateUser.mockResolvedValue({ error: null });
  });

  it("does not allow password changes from an ordinary signed-in visit", async () => {
    render(<ResetPasswordPage />);
    await screen.findByText(/reset link is missing/i);
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("rejects an invalid recovery session", async () => {
    window.location.hash = "type=recovery";
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("Expired") });
    render(<ResetPasswordPage />);
    await screen.findByText(/reset link is missing/i);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("rejects mismatching passwords and saves matching passwords without current_password", async () => {
    window.location.hash = "type=recovery";
    render(<ResetPasswordPage />);
    const password = await screen.findByLabelText("New password");
    const confirm = screen.getByLabelText("Confirm new password");
    fireEvent.change(password, { target: { value: "FreshPassword123" } });
    fireEvent.change(confirm, { target: { value: "DifferentPassword123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(auth.updateUser).not.toHaveBeenCalled();
    fireEvent.change(confirm, { target: { value: "FreshPassword123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledExactlyOnceWith({ password: "FreshPassword123" }));
    await screen.findByText("Password reset!");
  });

  it("accepts PASSWORD_RECOVERY when auth consumes the URL hash", async () => {
    render(<ResetPasswordPage />);
    await act(async () => { auth.listener?.("PASSWORD_RECOVERY"); });
    await screen.findByLabelText("New password");
  });
});