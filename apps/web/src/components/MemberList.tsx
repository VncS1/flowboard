"use client";

import { useState, type FormEvent } from "react";

import type { BoardMemberSummary } from "@/lib/api";
import { inviteMember, removeMember } from "@/lib/boardActions";
import { colorForUserId, initials } from "@/lib/memberColor";

import { UsersIcon, XIcon } from "./icons";

function MemberAvatar({ member, onRemove }: { member: BoardMemberSummary; onRemove?: () => void }) {
  return (
    <div className="group relative">
      <div
        title={member.name}
        style={{ backgroundColor: colorForUserId(member.id) }}
        className="border-bg flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold text-white"
      >
        {initials(member.name)}
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${member.name}`}
          className="bg-danger absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full text-white group-hover:flex"
        >
          <XIcon className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </div>
  );
}

function InviteMemberForm({
  boardId,
  onInvited,
  onCancel,
  onError,
}: {
  boardId: string;
  onInvited: (member: BoardMemberSummary) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const result = await inviteMember(boardId, email);

    setSubmitting(false);

    if (result.status === "error") {
      onError(result.message);
      return;
    }

    onInvited(result.member);
    setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label htmlFor="invite-email" className="sr-only">
        Email to invite
      </label>
      <input
        id="invite-email"
        type="email"
        required
        placeholder="teammate@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="border-border bg-bg text-ink rounded-md border px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="bg-primary text-on-primary rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50"
      >
        {submitting ? "Inviting…" : "Invite"}
      </button>
      <button type="button" onClick={onCancel} className="text-muted hover:text-ink text-xs">
        Cancel
      </button>
    </form>
  );
}

export function MemberList({
  boardId,
  initialMembers,
  currentUserId,
  isOwner,
}: {
  boardId: string;
  initialMembers: BoardMemberSummary[];
  currentUserId?: string;
  isOwner: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(member: BoardMemberSummary) {
    setError(null);
    const result = await removeMember(boardId, member.id);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    setMembers((current) => current.filter((m) => m.id !== member.id));
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {members.map((member) => (
            <MemberAvatar
              key={member.id}
              member={member}
              onRemove={
                isOwner && member.id !== currentUserId ? () => handleRemove(member) : undefined
              }
            />
          ))}
        </div>
        {isOwner ? (
          inviting ? (
            <InviteMemberForm
              boardId={boardId}
              onInvited={(member) => {
                setMembers((current) => [...current, member]);
                setInviting(false);
                setError(null);
              }}
              onCancel={() => setInviting(false)}
              onError={setError}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setInviting(true);
              }}
              aria-label="Invite member"
              className="text-muted hover:text-ink flex items-center gap-1 text-xs"
            >
              <UsersIcon className="h-3.5 w-3.5" />
              Invite
            </button>
          )
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
