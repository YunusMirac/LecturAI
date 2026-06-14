export type InvitationPreview = {
  email: string;
  role: "teacher" | "student";
  expires_at: string;
};

export type InvitationPreviewRow = {
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

export function buildInvitationPreview(
  inv: InvitationPreviewRow | null,
): { ok: true; preview: InvitationPreview } | { ok: false; status: 400 | 404 } {
  if (!inv) {
    return { ok: false, status: 404 };
  }
  if (inv.status !== "pending") {
    return { ok: false, status: 400 };
  }
  if (new Date(inv.expires_at) < new Date()) {
    return { ok: false, status: 400 };
  }
  if (inv.role !== "teacher" && inv.role !== "student") {
    return { ok: false, status: 400 };
  }

  return {
    ok: true,
    preview: {
      email: inv.email.trim().toLowerCase(),
      role: inv.role,
      expires_at: inv.expires_at,
    },
  };
}
