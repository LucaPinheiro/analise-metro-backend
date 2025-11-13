import { Request, Response } from "express";
import prisma from "@database/db";
import { Prisma } from "@prisma/client";
import path from "path";
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
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async listarProjetos(_req: Request, res: Response): Promise<void> {
        try {
            const projetos = await prisma.project.findMany({
                orderBy: { createdAt: "desc" }
            });
            res.json(projetos);
        } catch (error) {
            res.status(500).json({ error: "Erro interno do servidor" });
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
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }
}
