import type { ReactNode } from "react";

import { AdminCollapsibleHeaderAction } from "@/components/admin/AdminCollapsibleHeaderAction";

type AdminCollapsibleSectionProps = {
    title: string;
    subtitle?: string;
    defaultOpen?: boolean;
    /** Visible in the header row (e.g. submit linked via form=). */
    headerAction?: ReactNode;
    children: ReactNode;
};

export function AdminCollapsibleSection({
    title,
    subtitle,
    defaultOpen = false,
    headerAction,
    children,
}: AdminCollapsibleSectionProps) {
    return (
        <details
            className="glass group rounded-2xl border border-white/10 open:border-white/15"
            open={defaultOpen || undefined}
        >
            <summary className="cursor-pointer list-none px-4 py-4 md:px-6 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2">
                        <span
                            className="shrink-0 text-zinc-500 transition group-open:rotate-90"
                            aria-hidden
                        >
                            ▸
                        </span>
                        <span className="text-lg font-semibold text-zinc-100">{title}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                        {headerAction ? (
                            <AdminCollapsibleHeaderAction>{headerAction}</AdminCollapsibleHeaderAction>
                        ) : null}
                        {subtitle ? (
                            <span className="text-xs text-zinc-500 group-open:hidden">{subtitle}</span>
                        ) : null}
                    </span>
                </span>
            </summary>
            <div className="border-t border-white/10 px-4 pb-4 pt-2 md:px-6 md:pb-6">{children}</div>
        </details>
    );
}
