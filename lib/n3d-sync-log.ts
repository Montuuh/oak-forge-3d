export type N3dSyncLogLevel = "info" | "warn" | "error" | "success";

/** Misma forma que N3dBulkSyncResult (evita import circular). */
export type N3dBulkSyncResultSnapshot = {
    totalInN3d: number;
    processed: number;
    updated: number;
    created: number;
    skipped: number;
    errors: { slug: string; message: string }[];
};

export type N3dSyncLogLine = {
    at: number;
    level: N3dSyncLogLevel;
    message: string;
};

export type N3dSyncLogger = (
    message: string,
    level?: N3dSyncLogLevel,
) => void | Promise<void>;

export type N3dCatalogSyncMode = "overwrite-all" | "import-new";

export type N3dCatalogStreamEvent =
    | { type: "log"; at: number; level: N3dSyncLogLevel; message: string }
    | { type: "done"; mode: N3dCatalogSyncMode; result: N3dBulkSyncResultSnapshot }
    | { type: "error"; message: string };

export async function emitSyncLog(
    onLog: N3dSyncLogger | undefined,
    message: string,
    level: N3dSyncLogLevel = "info",
): Promise<void> {
    if (!onLog) return;
    await onLog(message, level);
}

function formatConsoleLine(level: N3dSyncLogLevel, message: string): string {
    const ts = new Date().toISOString().slice(11, 19);
    const tag =
        level === "error"
            ? "ERR"
            : level === "warn"
              ? "WRN"
              : level === "success"
                ? " OK"
                : "   ";
    return `[${ts}] ${tag} ${message}`;
}

export function createConsoleN3dSyncLogger(): N3dSyncLogger {
    return (message, level = "info") => {
        const line = formatConsoleLine(level, message);
        if (level === "error") console.error(line);
        else if (level === "warn") console.warn(line);
        else console.log(line);
    };
}

export function encodeN3dStreamEvent(event: N3dCatalogStreamEvent): Uint8Array {
    return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}
