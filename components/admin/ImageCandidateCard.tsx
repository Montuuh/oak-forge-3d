import { AdminImageActions } from "@/components/admin/AdminImageActions";
import { ImageReferenceToggle } from "@/components/admin/ImageReferenceToggle";
import { getAdminImageDisplayUrl } from "@/lib/admin-image-url";
import { isValidStoredImagePath } from "@/lib/catalog-image";
import { isN3dProtectedImagePath } from "@/lib/n3d-product-image";

type ImageRow = {
    id: string;
    status: "candidate" | "approved" | "rejected";
    origin?: string;
    imagePath: string;
    useAsReference?: boolean;
    sourceModel: string | null;
    promptVersion: string | null;
    createdAt: Date;
    notes: string | null;
};

type ImageCandidateCardProps = {
    image: ImageRow;
    productId: string;
    productSlug: string;
    originLabel?: string;
    fileOnDisk?: boolean | null;
};

const STATUS_LABEL: Record<ImageRow["status"], string> = {
    candidate: "Candidato",
    approved: "Aprobada",
    rejected: "Rechazada",
};

export function ImageCandidateCard({
    image,
    productId,
    productSlug,
    originLabel,
    fileOnDisk = null,
}: ImageCandidateCardProps) {
    const isN3dProtected =
        image.origin === "real_photo" && isN3dProtectedImagePath(productSlug, image.imagePath);
    const isBroken = !isValidStoredImagePath(image.imagePath);
    const missingFile = !isBroken && fileOnDisk === false;
    const displayUrl = getAdminImageDisplayUrl(image);
    const badgeLabel =
        originLabel ||
        image.sourceModel ||
        (image.origin === "real_photo" ? "Foto local" : "Google AI");

    return (
        <div
            className={`rounded-xl border p-3 ${
                isBroken || missingFile
                    ? "border-amber-500/40 bg-amber-950/20"
                    : "border-white/10 bg-zinc-900/40"
            }`}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        image.status === "approved"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : image.status === "rejected"
                              ? "bg-red-500/20 text-red-200"
                              : "bg-amber-500/20 text-amber-100"
                    }`}
                >
                    {STATUS_LABEL[image.status]}
                </span>
                <span className="text-xs text-zinc-500">{badgeLabel}</span>
            </div>

            {isBroken ? (
                <div className="mb-2 flex aspect-square w-full items-center justify-center rounded-lg bg-zinc-900 text-center text-sm text-red-200">
                    Registro incompleto
                    <br />
                    <span className="text-xs text-zinc-500">({image.imagePath})</span>
                </div>
            ) : missingFile ? (
                <div className="mb-2 flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg bg-zinc-900 p-3 text-center text-sm text-amber-100">
                    <span>Archivo no encontrado en public/</span>
                    <span className="break-all text-xs text-zinc-500">{image.imagePath}</span>
                </div>
            ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                    src={displayUrl}
                    alt="Candidato de producto"
                    className="mb-2 aspect-square w-full rounded-lg object-cover bg-zinc-800"
                />
            )}

            <p className="mb-2 line-clamp-2 text-xs text-zinc-500">
                {image.promptVersion || "sin version"} ·{" "}
                {new Date(image.createdAt).toLocaleString("es-ES")}
            </p>

            {image.notes && <p className="mb-2 text-xs text-zinc-400">{image.notes}</p>}

            {image.origin === "real_photo" && !isBroken && (
                <ImageReferenceToggle
                    imageId={image.id}
                    checked={image.useAsReference === true}
                    disabled={missingFile}
                />
            )}

            {isN3dProtected && (
                <p className="mb-2 text-xs text-sky-200/80">Imagen N3D protegida — no se puede eliminar.</p>
            )}

            <AdminImageActions
                productId={productId}
                imageId={image.id}
                status={image.status}
                imageBroken={isBroken}
                canDelete={!isN3dProtected}
            />
        </div>
    );
}
