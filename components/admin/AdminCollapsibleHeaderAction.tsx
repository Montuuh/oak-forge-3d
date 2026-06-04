"use client";

import type { ReactNode } from "react";

/** Evita que un clic en la acción abra/cierre el details del summary. */
export function AdminCollapsibleHeaderAction({ children }: { children: ReactNode }) {
    return (
        <span
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            {children}
        </span>
    );
}
