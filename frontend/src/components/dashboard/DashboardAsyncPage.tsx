import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { PageUnavailable } from "@/components/dashboard/PageUnavailable";

type DashboardAsyncPageProps = {
  loading: boolean;
  loadingLabel: string;
  notFound?: boolean;
  error?: string | null;
  hasData?: boolean;
  children: ReactNode;
};

export function DashboardAsyncPage({
  loading,
  loadingLabel,
  notFound = false,
  error = null,
  hasData = true,
  children,
}: DashboardAsyncPageProps) {
  if (loading && !hasData) {
    return (
      <div className="flex items-center gap-3 text-[#666666] dark:text-zinc-300">
        <Loader2 className="h-6 w-6 animate-spin text-[#2a9d8f]" />
        {loadingLabel}
      </div>
    );
  }
  if (notFound) return <PageUnavailable />;
  if (error) return <p className="text-red-600 dark:text-red-300">{error}</p>;
  return <>{children}</>;
}
