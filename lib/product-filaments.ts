import type { ProductFilament } from "@prisma/client";
import type { N3dFilament } from "@/lib/n3d-api";
import { db } from "@/lib/db";

export type FilamentLine = {
    n3dFilamentId: number | null;
    color: string;
    series: string;
    weightGrams: number;
    sortOrder?: number;
};

export function mapN3dFilamentsToLines(filaments: N3dFilament[] | undefined): FilamentLine[] {
    return (filaments ?? []).map((f, index) => ({
        n3dFilamentId: f.filament_id ?? null,
        color: f.color.trim(),
        series: f.series.trim(),
        weightGrams: f.weight_grams,
        sortOrder: index,
    }));
}

export function mapDbFilamentsToLines(rows: ProductFilament[]): FilamentLine[] {
    return rows.map((row) => ({
        n3dFilamentId: row.n3dFilamentId,
        color: row.color,
        series: row.series,
        weightGrams: row.weightGrams,
        sortOrder: row.sortOrder,
    }));
}

export function filamentsSignature(lines: FilamentLine[]): string {
    return [...lines]
        .sort((a, b) => {
            const c = a.color.localeCompare(b.color, "es");
            if (c !== 0) return c;
            return a.series.localeCompare(b.series, "es");
        })
        .map((l) => `${l.color}|${l.series}|${l.weightGrams}|${l.n3dFilamentId ?? ""}`)
        .join(";");
}

export function filamentsChanged(a: FilamentLine[], b: FilamentLine[]): boolean {
    return filamentsSignature(a) !== filamentsSignature(b);
}

export function formatFilamentLines(lines: FilamentLine[]): string {
    if (!lines.length) return "—";
    return lines
        .map((l) => `${l.color} · ${l.series} — ${l.weightGrams} g`)
        .join("\n");
}

export async function loadProductFilamentLines(productId: string): Promise<FilamentLine[]> {
    const rows = await db.productFilament.findMany({
        where: { productId },
        orderBy: { sortOrder: "asc" },
    });
    return mapDbFilamentsToLines(rows);
}

export async function replaceProductFilaments(
    productId: string,
    lines: FilamentLine[],
): Promise<void> {
    await db.$transaction([
        db.productFilament.deleteMany({ where: { productId } }),
        ...(lines.length
            ? [
                  db.productFilament.createMany({
                      data: lines.map((line, index) => ({
                          productId,
                          n3dFilamentId: line.n3dFilamentId,
                          color: line.color,
                          series: line.series,
                          weightGrams: line.weightGrams,
                          sortOrder: line.sortOrder ?? index,
                      })),
                  }),
              ]
            : []),
    ]);
}
