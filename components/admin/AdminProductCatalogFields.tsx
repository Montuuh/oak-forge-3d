"use client";

import { PRODUCT_STATUS_OPTIONS } from "@/lib/admin-product-constants";
import { useEffect, useState } from "react";

const fieldClass =
    "w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100";

type AdminProductCatalogFieldsProps = {
    defaultVisible: boolean;
    defaultStatus: string;
};

export function AdminProductCatalogFields({
    defaultVisible,
    defaultStatus,
}: AdminProductCatalogFieldsProps) {
    const [visible, setVisible] = useState(defaultVisible);
    const [status, setStatus] = useState(defaultStatus);

    useEffect(() => {
        if (visible) {
            setStatus("published");
        }
    }, [visible]);

    return (
        <>
            <label className="text-sm">
                <span className="mb-1 block text-zinc-400">Estado</span>
                <select
                    name="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={fieldClass}
                >
                    {PRODUCT_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                    type="checkbox"
                    name="isVisibleInCatalog"
                    checked={visible}
                    onChange={(e) => setVisible(e.target.checked)}
                    className="rounded"
                />
                <span className="text-zinc-300">
                    Visible en catálogo público
                    {visible && (
                        <span className="ml-1 text-zinc-500">(estado → published al guardar)</span>
                    )}
                </span>
            </label>
        </>
    );
}
