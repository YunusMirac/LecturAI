import Link from "next/link";

type DashboardBackLinkProps = {
  href: string;
  label?: string;
};

export function DashboardBackLink({ href, label = "← Zurück" }: DashboardBackLinkProps) {
  return (
    <Link
      href={href}
      className="mb-6 inline-block text-sm font-semibold text-[#2a9d8f] hover:underline"
    >
      {label}
    </Link>
  );
}
