/** Tipos compartidos cliente/servidor (sin Node fs). */

export type StudioSceneSource = "custom" | "default" | "env" | "missing";

export type StudioSceneStatus = {
    webPath: string | null;
    source: StudioSceneSource;
    label: string;
};
