import { db } from "@/lib/db";

export async function recordProductN3dSync(productId: string): Promise<void> {
    await db.product.update({
        where: { id: productId },
        data: { n3dSyncedAt: new Date() },
    });
}

export function formatN3dSyncedAtLabel(value: Date | string | null | undefined): string {
    if (!value) {
        return "Nunca sincronizado con N3D.";
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Fecha de sincronización no válida.";
    }
    return `Última sincronización N3D: ${new Intl.DateTimeFormat("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date)}`;
}
