"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ImageReferenceToggleProps = {
    imageId: string;
    checked: boolean;
    disabled?: boolean;
};

export function ImageReferenceToggle({
    imageId,
    checked,
    disabled = false,
}: ImageReferenceToggleProps) {
    const router = useRouter();
    const [isChecked, setIsChecked] = useState(checked);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setIsChecked(checked);
    }, [checked, imageId]);

    async function onChange(next: boolean) {
        setError(null);
        setSaved(false);
        const previous = isChecked;
        setIsChecked(next);
        setLoading(true);
        try {
            const response = await fetch("/api/admin/images/reference", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ imageId, useAsReference: next }),
            });
            const payload = (await response.json()) as { error?: string; ok?: boolean };
            if (!response.ok) {
                throw new Error(payload.error || `Error ${response.status}`);
            }
            setSaved(true);
            router.refresh();
        } catch (err) {
            setIsChecked(previous);
            setError(err instanceof Error ? err.message : "Error al guardar.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                    type="checkbox"
                    className="size-4 rounded border-white/20 bg-zinc-900 accent-sky-500"
                    checked={isChecked}
                    disabled={disabled || loading}
                    onChange={(e) => void onChange(e.target.checked)}
                />
                <span>
                    {loading
                        ? "Guardando…"
                        : saved
                          ? "Referencia guardada"
                          : "Usar como referencia"}
                </span>
            </label>
            {error && (
                <p className="mt-1 text-xs text-red-300" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
