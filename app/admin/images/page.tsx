import { redirect } from "next/navigation";

/** Cola de imagenes integrada en la ficha de producto; redirige al listado filtrado. */
export default function AdminImagesRedirectPage() {
    redirect("/admin/products?image=needs_review&pilot=1");
}
