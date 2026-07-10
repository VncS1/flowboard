import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInviteMember = vi.fn();
const mockRemoveMember = vi.fn();
vi.mock("@/lib/boardActions", () => ({
  inviteMember: (...args: unknown[]) => mockInviteMember(...args),
  removeMember: (...args: unknown[]) => mockRemoveMember(...args),
}));

import { MemberList } from "./MemberList";

const owner = { id: "u1", name: "Ana Owner", email: "ana@example.com", role: "OWNER" as const };
const member = { id: "u2", name: "Bob Member", email: "bob@example.com", role: "MEMBER" as const };

describe("MemberList", () => {
  beforeEach(() => {
    mockInviteMember.mockReset();
    mockRemoveMember.mockReset();
  });

  it("renders an avatar with initials for each member", () => {
    render(<MemberList boardId="b1" initialMembers={[owner, member]} currentUserId="u1" isOwner />);

    expect(screen.getByTitle("Ana Owner")).toHaveTextContent("AO");
    expect(screen.getByTitle("Bob Member")).toHaveTextContent("BM");
  });

  it("shows an Invite control for the owner", () => {
    render(<MemberList boardId="b1" initialMembers={[owner]} currentUserId="u1" isOwner />);

    expect(screen.getByRole("button", { name: /invite member/i })).toBeInTheDocument();
  });

  it("hides the Invite control for a non-owner", () => {
    render(<MemberList boardId="b1" initialMembers={[owner]} currentUserId="u2" isOwner={false} />);

    expect(screen.queryByRole("button", { name: /invite member/i })).not.toBeInTheDocument();
  });

  it("invites a member and adds their avatar on success", async () => {
    mockInviteMember.mockResolvedValue({ status: "ok", member });
    const user = userEvent.setup();
    render(<MemberList boardId="b1" initialMembers={[owner]} currentUserId="u1" isOwner />);

    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(screen.getByLabelText(/email to invite/i), "bob@example.com");
    await user.click(screen.getByRole("button", { name: /^invite$/i }));

    await waitFor(() => expect(mockInviteMember).toHaveBeenCalledWith("b1", "bob@example.com"));
    expect(screen.getByTitle("Bob Member")).toBeInTheDocument();
  });

  it("shows a clear error message when inviting fails", async () => {
    mockInviteMember.mockResolvedValue({
      status: "error",
      message: "No account found with that email.",
    });
    const user = userEvent.setup();
    render(<MemberList boardId="b1" initialMembers={[owner]} currentUserId="u1" isOwner />);

    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(screen.getByLabelText(/email to invite/i), "nobody@example.com");
    await user.click(screen.getByRole("button", { name: /^invite$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No account found with that email.");
  });

  it("lets the owner remove a non-owner member", async () => {
    mockRemoveMember.mockResolvedValue({ status: "ok" });
    const user = userEvent.setup();
    render(<MemberList boardId="b1" initialMembers={[owner, member]} currentUserId="u1" isOwner />);

    await user.click(screen.getByRole("button", { name: /remove bob member/i }));

    await waitFor(() => expect(mockRemoveMember).toHaveBeenCalledWith("b1", "u2"));
    expect(screen.queryByTitle("Bob Member")).not.toBeInTheDocument();
  });

  it("does not show a remove control on the owner's own avatar", () => {
    render(<MemberList boardId="b1" initialMembers={[owner, member]} currentUserId="u1" isOwner />);

    expect(screen.queryByRole("button", { name: /remove ana owner/i })).not.toBeInTheDocument();
  });

  it("does not show remove controls for a non-owner viewer", () => {
    render(
      <MemberList
        boardId="b1"
        initialMembers={[owner, member]}
        currentUserId="u2"
        isOwner={false}
      />,
    );

    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("shows a clear error message when removing a member fails", async () => {
    mockRemoveMember.mockResolvedValue({
      status: "error",
      message: "Could not remove that member. Please try again.",
    });
    const user = userEvent.setup();
    render(<MemberList boardId="b1" initialMembers={[owner, member]} currentUserId="u1" isOwner />);

    await user.click(screen.getByRole("button", { name: /remove bob member/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not remove that member. Please try again.",
    );
    expect(screen.getByTitle("Bob Member")).toBeInTheDocument();
  });
});
