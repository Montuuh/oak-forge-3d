"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type AdminLocalImageUploadProps = {
    productId: string;
    disabled?: boolean;
};

export function AdminLocalImageUpload({ productId, disabled = false }: AdminLocalImageUploadProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleFile(file: File) {
        setError(null);
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("productId", productId);
            formData.append("file", file);

            const response = await fetch("/api/admin/images/upload", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as { error?: string };
            if (!response.ok) {
                throw new Error(payload.error || `Error ${response.status}`);
            }
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al subir.");
        } finally {
            setLoading(false);
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    }

    return (
        <div className="space-y-2">
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                }}
            />
            <button
                type="button"
                disabled={disabled || loading}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-600 disabled:opacity-50"
            >
                {loading ? "Subiendo…" : "Subir imagen local"}
            </button>
            {error && (
                <p className="text-sm text-red-300" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
