import type { JWTInput } from "google-auth-library";

/**
 * Credenciales GCP para Vertex en servidor (Vercel, etc.).
 * No uses gcloud ADC en producción: pega el JSON de la service account en env.
 */
export function loadGcpServiceAccountCredentials(): JWTInput | undefined {
    const raw =
        process.env.GCP_SERVICE_ACCOUNT_JSON?.trim() ||
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

    if (!raw) {
        return undefined;
    }

    let parsed: JWTInput;
    try {
        parsed = JSON.parse(raw) as JWTInput;
    } catch {
        throw new Error(
            "GCP_SERVICE_ACCOUNT_JSON no es JSON valido. Pega el archivo .json completo de la service account.",
        );
    }

    if (!parsed.client_email || !parsed.private_key) {
        throw new Error(
            "El JSON de service account debe incluir client_email y private_key.",
        );
    }

    if (typeof parsed.private_key === "string") {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }

    return parsed;
}

export function hasGcpServiceAccountEnv(): boolean {
    return Boolean(
        process.env.GCP_SERVICE_ACCOUNT_JSON?.trim() ||
            process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim(),
    );
}
