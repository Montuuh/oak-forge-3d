import type { ReactNode } from "react";

type AdminCollapsibleHelpProps = {
    children: ReactNode;
    title?: string;
};

export function AdminCollapsibleHelp({ children, title = "Descripción" }: AdminCollapsibleHelpProps) {
    return (
        <details className="group mb-4 rounded-lg border border-white/5 bg-black/20 open:border-white/10">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-zinc-400 transition hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                    <span
                        className="text-zinc-500 transition group-open:rotate-90"
                        aria-hidden
                    >
                        ▸
                    </span>
                    {title}
                </span>
            </summary>
            <div className="border-t border-white/5 px-3 py-2 text-sm leading-relaxed text-zinc-500">
                {children}
            </div>
        </details>
    );
}
