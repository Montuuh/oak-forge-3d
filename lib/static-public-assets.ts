import fs from "fs";
import path from "path";

/** Solo assets estaticos del repo (estudio, placeholder). No fotos de producto. */
export function publicPathExists(webPath: string): boolean {
    if (!webPath.startsWith("/")) return false;
    const diskPath = path.join(process.cwd(), "public", webPath.replace(/^\//, ""));
    return fs.existsSync(diskPath);
}
