"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchAdminUsers, postInvitation, type AdminProfile } from "@/lib/api";
import { roleLabelDe } from "@/lib/auth";

import { inputClass } from "@/lib/ui/form-classes";

export function AdminPanel() {
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteLinkHint, setInviteLinkHint] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    const r = await fetchAdminUsers();
    if (r.ok) {
      setUsers(r.users);
    } else if (r.reason === "forbidden") {
      setUsersError("Keine Berechtigung für die Benutzerliste.");
      setUsers([]);
    } else {
      setUsersError("Benutzerliste konnte nicht geladen werden.");
      setUsers([]);
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadUsers();
    });
  }, [loadUsers]);

  async function onInviteTeacher(e: React.FormEvent) {
    e.preventDefault();
    setInviteErr(null);
    setInviteMsg(null);
    setInviteLinkHint(null);
    setInviting(true);
    const r = await postInvitation({
      email: inviteEmail.trim().toLowerCase(),
      role: "teacher",
    });
    setInviting(false);
    if (!r.ok) {
      setInviteErr(r.errorMessage);
      return;
    }
    if (r.emailSent) {
      setInviteMsg(`Einladung per E-Mail an ${inviteEmail.trim().toLowerCase()} gesendet.`);
    } else {
      setInviteMsg(
        "Einladung erstellt. E-Mail-Versand ist nicht konfiguriert — Link zum Weiterleiten:",
      );
      setInviteLinkHint(r.registerUrl);
    }
    setInviteEmail("");
    void loadUsers();
  }

  return (
    <section className="mb-10 space-y-8">
      <h2 className="text-lg font-bold tracking-tight text-[#333333] dark:text-zinc-100">
        Administration
      </h2>

      <div className="glass-panel rounded-2xl p-6 sm:p-8">
        <h3 className="mb-4 text-base font-semibold text-[#2a9d8f]">Lehrkraft einladen</h3>
        <form onSubmit={(e) => void onInviteTeacher(e)} className="flex max-w-xl flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="admin-invite-email" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
              E-Mail der Person
            </label>
            <input
              id="admin-invite-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className={inputClass}
              placeholder="name@hochschule.de"
            />
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="shrink-0 rounded-xl bg-[#2a9d8f] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {inviting ? "…" : "Einladung senden"}
          </button>
        </form>
        {inviteErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-300">{inviteErr}</p>
        ) : null}
        {inviteMsg ? (
          <div className="mt-4 rounded-xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-4 py-3 text-sm text-[#1a5c54] dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-200">
            <p>{inviteMsg}</p>
            {inviteLinkHint ? (
              <code className="mt-2 block break-all rounded-lg bg-black/5 px-2 py-2 text-xs dark:bg-white/10">
                {inviteLinkHint}
              </code>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-[#2a9d8f]">Alle registrierten Nutzer:innen</h3>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="rounded-lg border border-white/50 px-3 py-1.5 text-xs font-semibold text-[#444444] transition hover:border-[#2a9d8f]/40 dark:border-white/15 dark:text-zinc-300"
          >
            Aktualisieren
          </button>
        </div>
        {usersLoading ? (
          <p className="text-sm text-[#666666] dark:text-zinc-400">Lade Liste…</p>
        ) : usersError ? (
          <p className="text-sm text-red-600 dark:text-red-300">{usersError}</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-[#666666] dark:text-zinc-400">Noch keine Profile in der Datenbank.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-white/30 text-xs uppercase tracking-wide text-[#777777] dark:border-white/10 dark:text-zinc-500">
                  <th className="pb-2 pr-4 font-semibold">E-Mail</th>
                  <th className="pb-2 pr-4 font-semibold">Rolle</th>
                  <th className="pb-2 font-semibold">Profil-ID</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-white/15 last:border-0 dark:border-white/5"
                  >
                    <td className="py-2 pr-4 font-medium text-[#333333] dark:text-zinc-200">{u.email}</td>
                    <td className="py-2 pr-4 text-[#666666] dark:text-zinc-400">{roleLabelDe(u.role)}</td>
                    <td className="py-2 font-mono text-xs text-[#999999] dark:text-zinc-500">{u.id.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
