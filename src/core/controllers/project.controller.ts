import { Request, Response } from "express";
import prisma from "@database/db";
import { Prisma } from "@prisma/client";
import path from "path";
import fs from "fs";
import moverArquivo from "@functions/moverArquivo";
import { validarArquivoBIM } from "@functions/validarArquivo";

export class ProjectController {
    async criarProjeto(req: Request, res: Response): Promise<void> {
        try {
            const { name, description } = req.body;
            const file = req.file;

            if (!file) {
                res.status(400).json({
                    error: 'Arquivo "modeloBim" não enviado.'
                });
                return;
            }

            const validacao = validarArquivoBIM(file);
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

            const projeto = await prisma.project.create({
                data: {
                    name: name,
                    description: description || null,
                    bimPath: "temp_path"
                }
            });

            const bimPathFinal = moverArquivo(
                file,
                path.join("projects", projeto.id.toString()),
                "modelo" + path.extname(file.originalname)
            );

            const projetoAtualizado = await prisma.project.update({
                where: { id: projeto.id },
                data: { bimPath: bimPathFinal }
            });

            res.status(201).json(projetoAtualizado);
        } catch (error) {
            console.error("Erro ao criar projeto:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    res.status(409).json({
                        error: "Um projeto com este caminho BIM já existe."
                    });
                    return;
                }
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ 
                error: "Erro interno do servidor",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            });
        }
    }

    async listarProjetos(_req: Request, res: Response): Promise<void> {
        try {
            const projetos = await prisma.project.findMany({
                orderBy: { createdAt: "desc" }
            });
            res.json(projetos);
        } catch (error) {
            console.error("Erro ao listar projetos:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ 
                error: "Erro interno do servidor",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            });
        }
    }

    async getProjeto(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const projeto = await prisma.project.findUnique({
                where: { id: parseInt(id) }
            });

            if (!projeto) {
                res.status(404).json({ error: "Projeto não encontrado" });
                return;
            }
            res.json(projeto);
        } catch (error) {
            console.error("Erro ao buscar projeto:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ 
                error: "Erro interno do servidor",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            });
        }
    }

    async deletarProjeto(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const projectId = parseInt(id);

            // Verificar se projeto existe
            const projeto = await prisma.project.findUnique({
                where: { id: projectId },
                include: {
                    records: {
                        select: {
                            id: true,
                            uploadedFilesPaths: true,
                            recordPath: true
                        }
                    },
                    analyses: {
                        select: {
                            id: true,
                            resultPath: true,
                            summaryJsonPath: true,
                            outputPaths: true
                        }
                    }
                }
            });

            if (!projeto) {
                res.status(404).json({ error: "Projeto não encontrado" });
                return;
            }

            // Deletar arquivos físicos relacionados
            const uploadDir = process.env.UPLOADS_DIR || "./src/shared/data/uploads";
            const outputDir = process.env.OUTPUTS_DIR || "./src/shared/data/outputs";

            // Deletar arquivo BIM
            if (projeto.bimPath) {
                const bimPath = path.resolve(uploadDir, projeto.bimPath);
                if (fs.existsSync(bimPath)) {
                    try {
                        fs.unlinkSync(bimPath);
                        console.log(`Arquivo BIM deletado: ${bimPath}`);
                    } catch (error) {
                        console.warn(`Erro ao deletar arquivo BIM: ${bimPath}`, error);
                    }
                }
                // Deletar diretório do projeto em uploads
                const projectUploadDir = path.resolve(uploadDir, "projects", projectId.toString());
                if (fs.existsSync(projectUploadDir)) {
                    try {
                        fs.rmSync(projectUploadDir, { recursive: true, force: true });
                        console.log(`Diretório de uploads deletado: ${projectUploadDir}`);
                    } catch (error) {
                        console.warn(`Erro ao deletar diretório de uploads: ${projectUploadDir}`, error);
                    }
                }
            }

            // Deletar arquivos de registros (fotos)
            for (const record of projeto.records) {
                if (record.uploadedFilesPaths && Array.isArray(record.uploadedFilesPaths)) {
                    for (const filePath of record.uploadedFilesPaths) {
                        const fullPath = path.resolve(uploadDir, filePath as string);
                        if (fs.existsSync(fullPath)) {
                            try {
                                fs.unlinkSync(fullPath);
                            } catch (error) {
                                console.warn(`Erro ao deletar foto: ${fullPath}`, error);
                            }
                        }
                    }
                }
            }

            // Deletar arquivos de outputs (reconstruções e análises)
            const projectOutputDir = path.resolve(outputDir, projectId.toString());
            if (fs.existsSync(projectOutputDir)) {
                try {
                    fs.rmSync(projectOutputDir, { recursive: true, force: true });
                    console.log(`Diretório de outputs deletado: ${projectOutputDir}`);
                } catch (error) {
                    console.warn(`Erro ao deletar diretório de outputs: ${projectOutputDir}`, error);
                }
            }

            // Deletar projeto do banco (cascade deleta records e analyses automaticamente)
            await prisma.project.delete({
                where: { id: projectId }
            });

            res.status(200).json({
                message: "Projeto deletado com sucesso",
                projectId: projectId,
                deletedFiles: {
                    bim: !!projeto.bimPath,
                    records: projeto.records.length,
                    analyses: projeto.analyses.length
                }
            });
        } catch (error) {
            console.error("Erro ao deletar projeto:", error);
            
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2025") {
                    res.status(404).json({
                        error: "Projeto não encontrado"
                    });
                    return;
                }
            }
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ 
                error: "Erro interno do servidor ao deletar projeto",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            });
        }
    }
}
