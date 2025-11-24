import { Request, Response } from "express";
import prisma from "@database/db";
import path from "path";
import moverArquivo from "@functions/moverArquivo";
import { validarArquivosImagem } from "@functions/validarArquivo";

export class RecordController {
    async adicionarRegistro(req: Request, res: Response): Promise<void> {
        try {
            const { id: projectId } = req.params;
            const { name } = req.body;
            const files = req.files as Express.Multer.File[];

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

            const registro = await prisma.record.create({
                data: {
                    name: name,
                    projectId: parseInt(projectId)
                }
            });

            const caminhosFotos = files.map((file) => {
                return moverArquivo(
                    file,
                    path.join(
                        "projects",
                        projectId,
                        "records",
                        registro.id.toString()
                    )
                );
            });

            const registroAtualizado = await prisma.record.update({
                where: { id: registro.id },
                data: {
                    uploadedFilesPaths: caminhosFotos as any
                }
            });

            res.status(201).json(registroAtualizado);
        } catch (error) {
            console.error("Erro ao adicionar registro:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ 
                error: "Erro interno do servidor",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            });
        }
    }

    async listarRegistros(req: Request, res: Response): Promise<void> {
        try {
            const { id: projectId } = req.params;
            const registros = await prisma.record.findMany({
                where: { projectId: parseInt(projectId) },
                orderBy: { createdAt: "desc" }
            });
            res.json(registros);
        } catch (error) {
            console.error("Erro ao listar registros:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({ 
                error: "Erro interno do servidor",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            });
        }
    }
}
