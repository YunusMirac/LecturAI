import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#777777] dark:text-zinc-400">
        404
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-[#333333] dark:text-zinc-100">
        Seite nicht verfügbar
      </h1>
      <p className="mt-3 max-w-md text-sm text-[#666666] dark:text-zinc-400">
        Diese Seite existiert nicht oder du hast keinen Zugriff darauf.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex rounded-xl bg-[#2a9d8f] px-5 py-3 text-sm font-bold text-white transition hover:brightness-110"
      >
        Zum Dashboard
      </Link>
    </div>
  );
}
