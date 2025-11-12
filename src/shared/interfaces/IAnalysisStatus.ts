export interface IAnalysisStatus {
    id: number;
    project_id: number;
    record_id: number;
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    progress: number;
    logs: string[];
    error?: string | null;
    output_paths?: {
        modelo3d?: string;
        comparacaoBim?: string;
        relatorio?: string;
    } | null;
    created_at: string;
    started_at?: string | null;
    updated_at?: string | null;
    completed_at?: string | null;
    result_path?: string | null;
    summary_json_path?: string | null;
    mean_distance?: number | null;
    std_deviation?: number | null;
}
