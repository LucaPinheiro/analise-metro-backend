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
}
