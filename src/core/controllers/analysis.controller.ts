import { Request, Response } from "express";
import { PipelineManager } from "@services/pipeline.manager";
import prisma from "@database/db";

export class AnalysisController {
    private pipelineManager: PipelineManager;
    constructor() {
        this.pipelineManager = new PipelineManager();
    }

    async iniciarAnalise(req: Request, res: Response): Promise<void> {
        try {
            const { projectId, recordId, parametros } = req.body;

            if (!projectId || !recordId) {
                res.status(400).json({
                    error: "projectId e recordId são obrigatórios."
                });
                return;
            }

            const analise = await prisma.analysis.create({
                data: {
                    projectId: projectId,
                    recordId: recordId,
                    status: "pending"
                }
            });

            this.pipelineManager
                .iniciarProcessamentoAnalise(analise.id, parametros || {})
                .catch((error) => {
                    console.error(`Erro fatal no job ${analise.id}:`, error);
                    this.pipelineManager.atualizarStatusJob(analise.id, {
                        status: "failed",
                        error: error.message
                    });
                });

            res.status(202).json({
                jobId: analise.id,
                status: "pending",
                message: "Processamento de análise iniciado",
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Erro ao iniciar análise:", error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async getAnalysisStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const status = await this.pipelineManager.getAnalysisStatus(
                parseInt(id)
            );
            if (!status) {
                res.status(404).json({ error: "Análise (Job) não encontrada" });
                return;
            }
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async listarAnalyses(_req: Request, res: Response): Promise<void> {
        try {
            const jobs = await this.pipelineManager.listarAnalyses();
            res.json({ jobs });
        } catch (error) {
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async cancelarAnalysis(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const sucesso = await this.pipelineManager.cancelarAnalysis(
                parseInt(id)
            );
            if (!sucesso) {
                res.status(404).json({
                    error: "Job não encontrado ou já finalizado"
                });
                return;
            }
            res.json({ message: "Job cancelado com sucesso", jobId: id });
        } catch (error) {
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    /**
     * GET /api/analyses/:id/report
     * Gera relatório detalhado da execução da pipeline
     */
    async getExecutionReport(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const analysisId = parseInt(id);
            
            const analysis = await this.pipelineManager.getAnalysisStatus(analysisId);
            if (!analysis) {
                res.status(404).json({ error: "Análise não encontrada" });
                return;
            }

            // Buscar projeto e registro relacionados
            const project = await prisma.project.findUnique({
                where: { id: analysis.projectId }
            });
            const record = await prisma.record.findUnique({
                where: { id: analysis.recordId }
            });

            // Calcular duração se disponível
            let durationSeconds: number | null = null;
            if (analysis.startedAt && analysis.completedAt) {
                const start = new Date(analysis.startedAt).getTime();
                const end = new Date(analysis.completedAt).getTime();
                durationSeconds = Math.round((end - start) / 1000);
            } else if (analysis.startedAt) {
                const start = new Date(analysis.startedAt).getTime();
                const now = Date.now();
                durationSeconds = Math.round((now - start) / 1000);
            }

            // Identificar etapas executadas baseado nos logs
            const etapas = {
                inicializacao: false,
                reconstrucao3d: false,
                comparacaoC2C: false,
                finalizacao: false
            };

            const logsStr = JSON.stringify(analysis.logs || []);
            if (logsStr.includes("ETAPA 1/2") || logsStr.includes("RECONSTRUÇÃO 3D")) {
                etapas.reconstrucao3d = true;
            }
            if (logsStr.includes("ETAPA 2/2") || logsStr.includes("COMPARAÇÃO C2C")) {
                etapas.comparacaoC2C = true;
            }
            if (logsStr.includes("PIPELINE CONCLUÍDA")) {
                etapas.finalizacao = true;
            }
            if (analysis.startedAt) {
                etapas.inicializacao = true;
            }

            const report = {
                analysis: {
                    id: analysis.id,
                    status: analysis.status,
                    progress: analysis.progress,
                    createdAt: analysis.createdAt,
                    startedAt: analysis.startedAt,
                    completedAt: analysis.completedAt,
                    durationSeconds: durationSeconds,
                    durationFormatted: durationSeconds 
                        ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
                        : null
                },
                project: project ? {
                    id: project.id,
                    name: project.name,
                    description: project.description
                } : null,
                record: record ? {
                    id: record.id,
                    name: record.name,
                    recordPath: record.recordPath,
                    photosCount: Array.isArray(record.uploadedFilesPaths) 
                        ? record.uploadedFilesPaths.length 
                        : 0
                } : null,
                etapas: {
                    ...etapas,
                    totalEtapas: 4,
                    etapasCompletas: Object.values(etapas).filter(Boolean).length
                },
                metrics: {
                    meanDistance: analysis.meanDistance,
                    stdDeviation: analysis.stdDeviation,
                    hasMetrics: !!(analysis.meanDistance || analysis.stdDeviation)
                },
                outputs: {
                    resultPath: analysis.resultPath,
                    summaryJsonPath: analysis.summaryJsonPath,
                    outputPaths: analysis.outputPaths,
                    filesGenerated: [
                        analysis.resultPath && "Comparação C2C (PLY)",
                        analysis.summaryJsonPath && "Métricas (JSON)",
                        record?.recordPath && "Reconstrução 3D (PLY)"
                    ].filter(Boolean)
                },
                logs: {
                    total: analysis.logs?.length || 0,
                    preview: analysis.logs?.slice(-10) || [], // Últimos 10 logs
                    all: analysis.logs || []
                },
                error: analysis.error || null,
                timestamp: new Date().toISOString()
            };

            res.json(report);
        } catch (error) {
            console.error("Erro ao gerar relatório:", error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }
}
