export type BacklogStatus = "pending" | "in_progress" | "done" | "cancelled";

export type BacklogPriority = "low" | "medium" | "high";

export type BacklogItem = {
    id: string;
    title: string;
    description?: string;
    category: string;
    status: BacklogStatus;
    priority: BacklogPriority;
    createdAt: string;
    updatedAt: string;
};

export type BacklogSortField =
    | "priority"
    | "status"
    | "category"
    | "title"
    | "createdAt"
    | "updatedAt";

export type BacklogSortOrder = "asc" | "desc";

export type BacklogListQuery = {
    status?: BacklogStatus | "all";
    priority?: BacklogPriority | "all";
    category?: string;
    q?: string;
    sort?: BacklogSortField;
    order?: BacklogSortOrder;
};

export const BACKLOG_SORT_LABEL: Record<BacklogSortField, string> = {
    priority: "Prioridad",
    status: "Estado",
    category: "Categoría",
    title: "Título",
    createdAt: "Creación",
    updatedAt: "Actualización",
};

export const BACKLOG_STATUS_LABEL: Record<BacklogStatus, string> = {
    pending: "Pendiente",
    in_progress: "En curso",
    done: "Hecho",
    cancelled: "Cancelado",
};

export const BACKLOG_PRIORITY_LABEL: Record<BacklogPriority, string> = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
};
