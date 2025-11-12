export interface IProcessamentoParams {
    threshold?: number;
    outputFormat?: "json" | "xml" | "csv";
    [key: string]: any;
}
