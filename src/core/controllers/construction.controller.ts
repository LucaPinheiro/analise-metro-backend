import { Request, Response } from "express";
import { PipelineManager } from "@services/pipeline.manager";
import prisma from "@database/db";
import path from "path";
import fs from "fs";
import moverArquivo from "@functions/moverArquivo";
import {
    validarArquivosImagem,
    obterCaminhoRegistros,
    validarArquivoPLY
} from "@functions/validarArquivo";
import { criarDiretorioOutput, obterCaminhoRelativoOutput } from "@functions/moverArquivo";
import { IProcessamentoParams } from "@interfaces/IProcessamentoParams";

export class ConstructionController {
    private pipelineManager: PipelineManager;

    constructor() {
        this.pipelineManager = new PipelineManager();
    }

    /**
     * POST /api/construction
     * Alias para criar projeto (compatibilidade com diagramas)
     */
    async criarConstruction(req: Request, res: Response): Promise<void> {
        // Redireciona para ProjectController
        const projectController = await import("@controllers/project.controller");
        const controller = new projectController.ProjectController();
        await controller.criarProjeto(req, res);
    }

    /**
     * POST /api/:constructionId/photo-processing-full
     * Upload de fotos + processamento automático completo (3DGS + C2C)
     */
    async photoProcessingFull(req: Request, res: Response): Promise<void> {
        try {
            const { constructionId } = req.params;
            const { name, parametros } = req.body;
            const files = req.files as Express.Multer.File[];

            // Validações
            if (!files || files.length === 0) {
                res.status(400).json({
                    error: 'Nenhum arquivo de "fotos" enviado.'
                });
                return;
            }

            const validacao = validarArquivosImagem(files);
            if (!validacao.valido) {
                res.status(400).json({ error: validacao.erro });
                return;
            }

            if (!name) {
                res.status(400).json({
                    error: 'O campo "name" é obrigatório.'
                });
                return;
            }

            const projectId = parseInt(constructionId);
            const project = await prisma.project.findUnique({
                where: { id: projectId }
            });

            if (!project) {
                res.status(404).json({ error: "Projeto não encontrado" });
                return;
            }

            // Criar registro
            const registro = await prisma.record.create({
                data: {
                    name: name,
                    projectId: projectId
                }
            });

            // Salvar fotos na nova estrutura
            const caminhoRegistros = obterCaminhoRegistros(projectId);
            const caminhosFotos = files.map((file) => {
                return moverArquivo(
                    file,
                    path.join(caminhoRegistros, registro.id.toString())
                );
            });

            await prisma.record.update({
                where: { id: registro.id },
                data: {
                    uploadedFilesPaths: caminhosFotos as any
                }
            });

            // Criar análise e iniciar processamento completo
            const analise = await prisma.analysis.create({
                data: {
                    projectId: projectId,
                    recordId: registro.id,
                    status: "pending"
                }
            });

            const params: IProcessamentoParams = parametros
                ? JSON.parse(parametros)
                : {};

            this.pipelineManager
                .iniciarProcessamentoAnalise(analise.id, params)
                .catch((error) => {
                    console.error(`Erro fatal no job ${analise.id}:`, error);
                    this.pipelineManager.atualizarStatusJob(analise.id, {
                        status: "failed",
                        error: error.message
                    });
                });

            res.status(202).json({
                analysisId: analise.id,
                recordId: registro.id,
                status: "pending",
                message: "Processamento completo iniciado",
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Erro ao processar fotos:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ 
                error: "Erro interno do servidor",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            });
        }
    }

    /**
     * POST /api/:constructionId/analysis-full
     * Análise usando modelos já armazenados (apenas C2C)
     */
    async analysisFull(req: Request, res: Response): Promise<void> {
        try {
            const { constructionId } = req.params;
            const { recordId, parametros } = req.body;

            const projectId = parseInt(constructionId);
            const project = await prisma.project.findUnique({
                where: { id: projectId }
            });

            if (!project) {
                res.status(404).json({ error: "Projeto não encontrado" });
                return;
            }

            // Criar análise
            const recordIdNum = recordId ? parseInt(recordId) : undefined;
            let record: any;

            if (recordIdNum) {
                record = await prisma.record.findUnique({
                    where: { id: recordIdNum, projectId: projectId }
                });
                if (!record) {
                    res.status(404).json({
                        error: "Registro não encontrado neste projeto"
                    });
                    return;
                }
            } else {
                // Buscar registro mais recente com reconstrução
                record = await prisma.record.findFirst({
                    where: {
                        projectId: projectId,
                        recordPath: { not: null }
                    },
                    orderBy: { createdAt: "desc" }
                });

                if (!record) {
                    res.status(404).json({
                        error: "Nenhuma reconstrução 3D encontrada. Execute photo-processing-full primeiro."
                    });
                    return;
                }
            }

            const analise = await prisma.analysis.create({
                data: {
                    projectId: projectId,
                    recordId: record.id,
                    status: "pending"
                }
            });

            this.pipelineManager
                .executarApenasC2C(analise.id, projectId, record.id)
                .catch((error) => {
                    console.error(`Erro fatal no job ${analise.id}:`, error);
                    this.pipelineManager.atualizarStatusJob(analise.id, {
                        status: "failed",
                        error: error.message
                    });
                });

            res.status(202).json({
                analysisId: analise.id,
                status: "pending",
                message: "Análise C2C iniciada usando modelos existentes",
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Erro ao iniciar análise:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ 
                error: "Erro interno do servidor",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            });
        }
    }

    /**
     * GET /api/:constructionId/:fileType/:fileId
     * Retorna arquivo para visualização (Three.js)
     */
    async getFile(req: Request, res: Response): Promise<void> {
        try {
            const { constructionId, fileType, fileId } = req.params;
            const projectId = parseInt(constructionId);

            let filePath: string;
            const uploadDir = process.env.UPLOADS_DIR || "./src/shared/data/uploads";
            const outputDir = process.env.OUTPUTS_DIR || "./src/shared/data/outputs";

            switch (fileType) {
                case "bim":
                    const project = await prisma.project.findUnique({
                        where: { id: projectId }
                    });
                    if (!project) {
                        res.status(404).json({ error: "Projeto não encontrado" });
                        return;
                    }
                    filePath = path.resolve(uploadDir, project.bimPath);
                    break;

                case "registro":
                    const record = await prisma.record.findUnique({
                        where: { id: parseInt(fileId), projectId: projectId }
                    });
                    if (!record || !record.recordPath) {
                        res.status(404).json({
                            error: "Registro não encontrado ou sem reconstrução"
                        });
                        return;
                    }
                    filePath = path.resolve(outputDir, record.recordPath);
                    break;

                case "analise":
                    const analysis = await prisma.analysis.findUnique({
                        where: { id: parseInt(fileId), projectId: projectId }
                    });
                    if (!analysis || !analysis.resultPath) {
                        res.status(404).json({
                            error: "Análise não encontrada ou sem resultado"
                        });
                        return;
                    }
                    filePath = path.resolve(outputDir, analysis.resultPath);
                    break;

                default:
                    res.status(400).json({
                        error: `Tipo de arquivo inválido: ${fileType}. Tipos válidos: bim, registro, analise`
                    });
                    return;
            }

            if (!fs.existsSync(filePath)) {
                res.status(404).json({ error: "Arquivo não encontrado" });
                return;
            }

            // Retornar arquivo
            const ext = path.extname(filePath).toLowerCase();
            const contentType =
                ext === ".ply"
                    ? "application/octet-stream"
                    : ext === ".ifc"
                      ? "application/octet-stream"
                      : ext === ".dwg"
                        ? "application/acad"
                        : "application/octet-stream";

            res.setHeader("Content-Type", contentType);
            res.setHeader(
                "Content-Disposition",
                `inline; filename="${path.basename(filePath)}"`
            );
            res.sendFile(path.resolve(filePath));
        } catch (error) {
            console.error("Erro ao buscar arquivo:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ 
                error: "Erro interno do servidor",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            });
        }
    }

    /**
     * GET /api/constructions
     * Alias para listar projetos
     */
    async listarConstructions(_req: Request, res: Response): Promise<void> {
        const projectController = await import("@controllers/project.controller");
        const controller = new projectController.ProjectController();
        await controller.listarProjetos(_req, res);
    }

    /**
     * GET /api/:constructionId/analyses
     * Lista análises filtradas por projeto
     */
    async listarAnalysesPorProjeto(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const { constructionId } = req.params;
            const projectId = parseInt(constructionId);

            const analyses = await this.pipelineManager.listarAnalyses(
                projectId
            );

            res.json({ analyses });
        } catch (error) {
            console.error("Erro ao listar análises:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ 
                error: "Erro interno do servidor",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            });
        }
    }

    /**
     * POST /api/:constructionId/records/import-ply
     * Importa arquivo PLY existente como registro (sem processamento 3DGS)
     */
    async importPLY(req: Request, res: Response): Promise<void> {
        try {
            const { constructionId } = req.params;
            const { name } = req.body;
            const file = req.file as Express.Multer.File;

            // Validações
            if (!file) {
                res.status(400).json({
                    error: 'Nenhum arquivo PLY enviado.'
                });
                return;
            }

            const validacao = validarArquivoPLY(file);
            if (!validacao.valido) {
                res.status(400).json({ error: validacao.erro });
                return;
            }

            if (!name) {
                res.status(400).json({
                    error: 'O campo "name" é obrigatório.'
                });
                return;
            }

            const projectId = parseInt(constructionId);
            const project = await prisma.project.findUnique({
                where: { id: projectId }
            });

            if (!project) {
                res.status(404).json({ error: "Projeto não encontrado" });
                return;
            }

            // Criar registro
            const registro = await prisma.record.create({
                data: {
                    name: name,
                    projectId: projectId
                }
            });

            // Criar diretório de output para registros
            const outputDir = criarDiretorioOutput(projectId, "registros");
            const registroDir = path.join(outputDir, registro.id.toString());
            
            if (!fs.existsSync(registroDir)) {
                fs.mkdirSync(registroDir, { recursive: true });
            }

            // Mover arquivo PLY para estrutura de output
            const nomeArquivo = `reconstrucao_${registro.id}.ply`;
            const caminhoFinal = path.join(registroDir, nomeArquivo);
            fs.renameSync(file.path, caminhoFinal);

            // Obter caminho relativo para salvar no banco
            const caminhoRelativo = obterCaminhoRelativoOutput(caminhoFinal);

            // Atualizar registro com caminho do PLY
            const registroAtualizado = await prisma.record.update({
                where: { id: registro.id },
                data: {
                    recordPath: caminhoRelativo
                }
            });

            res.status(201).json({
                ...registroAtualizado,
                message: "Arquivo PLY importado com sucesso. Use analysis-full para comparar com BIM.",
                filePath: caminhoRelativo
            });
        } catch (error) {
            console.error("Erro ao importar PLY:", error);
            res.status(500).json({ 
                error: "Erro interno do servidor",
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
}

