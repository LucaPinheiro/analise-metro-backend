import { ChildProcess, spawn } from "child_process";
import path from "path";
import fs from "fs";
import prisma from "@database/db";
import { IProcessamentoParams } from "@interfaces/IProcessamentoParams";
import { Analysis, Project, Record } from "@prisma/client";

export class PipelineManager {
    private processos: Map<number, ChildProcess> = new Map();
    private readonly outputDir: string;

    constructor() {
        this.outputDir = process.env.OUTPUTS_DIR || "./shared/data/outputs";
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async atualizarStatusJob(
        analysisId: number,
        updates: { [key: string]: any; logs?: string[] }
    ) {
        const { logs, ...fields } = updates;
        const data: any = { ...fields };
        if (logs && logs.length > 0) {
            data.logs = { push: logs };
        }

        try {
            await prisma.analysis.update({
                where: { id: analysisId },
                data: data
            });
        } catch (error) {
            console.error(`Erro ao atualizar job ${analysisId} no DB:`, error);
        }
    }

    async iniciarProcessamentoAnalise(
        analysisId: number,
        parametros: IProcessamentoParams = {}
    ): Promise<void> {
        let project: Project;
        let record: Record;

        try {
            const analysisData = await prisma.analysis.findUnique({
                where: { id: analysisId },
                include: {
                    project: true,
                    record: true
                }
            });
            if (!analysisData) {
                await this.handleFailure(
                    analysisId,
                    `Análise ${analysisId} não encontrada.`
                );
                return;
            }
            if (!analysisData.project) {
                await this.handleFailure(
                    analysisId,
                    `Projeto ${analysisData.projectId} não encontrado.`
                );
                return;
            }
            if (!analysisData.record) {
                await this.handleFailure(
                    analysisId,
                    `Registro ${analysisData.recordId} não encontrado.`
                );
                return;
            }
            project = analysisData.project;
            record = analysisData.record;

            const jobsAtivos = await prisma.analysis.count({
                where: { status: "processing" }
            });
            const maxJobs = parseInt(process.env.MAX_CONCURRENT_JOBS || "3");

            if (jobsAtivos >= maxJobs) {
                await this.atualizarStatusJob(analysisId, {
                    status: "pending",
                    logs: [
                        `⚠️ Aguardando vaga (${jobsAtivos}/${maxJobs} jobs ativos)`
                    ]
                });
                return;
            }

            await this.atualizarStatusJob(analysisId, {
                status: "processing",
                startedAt: new Date().toISOString(),
                logs: ["🚀 Iniciando processamento..."]
            });

            const jobOutputDir = path.join(
                this.outputDir,
                "analyses",
                analysisId.toString()
            );
            if (!fs.existsSync(jobOutputDir)) {
                fs.mkdirSync(jobOutputDir, { recursive: true });
            }

            await this.executarPipeline(
                analysisId,
                project,
                record,
                parametros,
                jobOutputDir
            );

            await this.atualizarStatusJob(analysisId, {
                status: "completed",
                progress: 100,
                completedAt: new Date().toISOString(),
                logs: ["✅ Processamento concluído com sucesso!"]
            });
        } catch (error) {
            await this.handleFailure(analysisId, error as Error | string);
        } finally {
            this.processos.delete(analysisId);
        }
    }

    /**
     * Lógica principal do pipeline (3DGS -> CloudCompare)
     */
    private async executarPipeline(
        analysisId: number,
        project: Project,
        record: Record,
        parametros: IProcessamentoParams,
        outputDir: string
    ): Promise<void> {
        const uploadDir = process.env.UPLOADS_DIR || "./shared/data/uploads";
        const bimPath = path.resolve(uploadDir, project.bimPath);
        const caminhosFotos: string[] = (
            (record.uploadedFilesPaths as string[]) || []
        ).map((p: string) => path.resolve(uploadDir, p));
        await this.atualizarStatusJob(analysisId, {
            logs: ["📸 Etapa 1/2: Iniciando reconstrução 3D (3DGS)..."],
            progress: 10
        });

        const modelo3dPath = path.join(outputDir, "reconstrucao_3dgs.ply");
        const modelo3dGerado = await this.processarImagens(
            analysisId,
            caminhosFotos,
            modelo3dPath,
            parametros
        );

        const recordPathRelativo = path.relative(
            process.env.OUTPUTS_DIR || "./shared/data/outputs",
            modelo3dGerado
        );

        await prisma.record.update({
            where: { id: record.id },
            data: { recordPath: recordPathRelativo }
        });

        await this.atualizarStatusJob(analysisId, {
            progress: 50,
            outputPaths: { modelo3d: recordPathRelativo }
        });
        await this.atualizarStatusJob(analysisId, {
            logs: ["🏗️ Etapa 2/2: Iniciando comparação C2C (CloudCompare)..."],
            progress: 60
        });

        const comparacaoPath = path.join(outputDir, "comparacao_c2c.ply");
        const comparacaoGerada = await this.compararComBim(
            analysisId,
            bimPath,
            modelo3dGerado,
            comparacaoPath,
            parametros
        );

        const comparacaoPathRelativo = path.relative(
            process.env.OUTPUTS_DIR || "./shared/data/outputs",
            comparacaoGerada
        );
        await this.atualizarStatusJob(analysisId, {
            progress: 90,
            resultPath: comparacaoPathRelativo,
            outputPaths: {
                modelo3d: recordPathRelativo,
                comparacaoBim: comparacaoPathRelativo
            }
        });
    }

    private async processarImagens(
        analysisId: number,
        caminhosFotos: string[],
        outputPath: string,
        parametros: IProcessamentoParams
    ): Promise<string> {
        const cliPath =
            process.env.IMAGE_PROCESSING_CLI || "./tools/image-processor";
        const args = [
            "--input",
            caminhosFotos.join(","),
            "--output",
            outputPath,
            "--format",
            "ply"
        ];
        if (parametros.threshold) {
            args.push("--threshold", parametros.threshold.toString());
        }
        await this.executarCLI(analysisId, cliPath, args, "Reconstrução 3D");
        return outputPath;
    }

    private async compararComBim(
        analysisId: number,
        caminhoBim: string,
        caminho3dgs: string,
        outputPath: string,
        _parametros: IProcessamentoParams
    ): Promise<string> {
        const cliPath = process.env.BIM_COMPARISON_CLI || "CloudCompare";
        const args = [
            "-SILENT",
            "-AUTO_SAVE",
            "OFF",
            "-O",
            caminhoBim,
            "-SAMPLE_MESH",
            "POINTS",
            "1000000",
            "-C_EXPORT_FMT",
            "PLY",
            "-O",
            caminho3dgs,
            "-ICP",
            "-C2C_DIST",
            "-SF_CONVERT_TO_RGB",
            "FALSE",
            "-C_EXPORT_FMT",
            "PLY",
            "-SELECT_ENTITIES",
            "-FIRST",
            "1",
            "-SAVE_CLOUDS",
            "FILE",
            outputPath
        ];
        await this.executarCLI(analysisId, cliPath, args, "Comparação C2C");
        return outputPath;
    }

    private async executarCLI(
        analysisId: number,
        cliPath: string,
        args: string[],
        etapa: string
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const quotedCliPath = cliPath.includes(" ") ? `"${cliPath}"` : cliPath;
            const commandString = `${quotedCliPath} ${args.join(" ")}`;
            this.atualizarStatusJob(analysisId, {
                logs: [`[${etapa}] 🔧 Executando: ${commandString}`]
            });
            const processo = spawn(commandString, [], {
                stdio: ["ignore", "pipe", "pipe"],
                shell: true
            });
            this.processos.set(analysisId, processo);
            let stdout = "";
            let stderr = "";
            processo.stdout?.on("data", (data) => {
                stdout += data.toString();
            });
            processo.stderr?.on("data", (data) => {
                stderr += data.toString();
            });
            processo.on("close", (code) => {
                this.processos.delete(analysisId);
                const logs = (stdout + stderr)
                    .split("\n")
                    .filter(Boolean)
                    .map((line) => `[${etapa}] ${line.trim()}`);
                if (code === 0) {
                    logs.push(`✅ ${etapa} concluída com sucesso`);
                    this.atualizarStatusJob(analysisId, { logs });
                    resolve(stdout);
                } else {
                    const error = `Falha na execução (código ${code})`;
                    logs.push(`❌ ${error}`);
                    this.atualizarStatusJob(analysisId, { logs });
                    reject(new Error(`${error}: ${stderr || stdout}`));
                }
            });
            processo.on("error", (error) => {
                this.processos.delete(analysisId);
                const errorMsg = `Erro ao executar CLI: ${error.message}`;
                this.atualizarStatusJob(analysisId, {
                    logs: [`❌ ${errorMsg}`]
                });
                reject(new Error(errorMsg));
            });
        });
    }

    async getAnalysisStatus(analysisId: number): Promise<Analysis | null> {
        return prisma.analysis.findUnique({
            where: { id: analysisId }
        });
    }

    async listarAnalyses(): Promise<Analysis[]> {
        return prisma.analysis.findMany({
            orderBy: { createdAt: "desc" }
        });
    }

    async cancelarAnalysis(analysisId: number): Promise<boolean> {
        const job = await this.getAnalysisStatus(analysisId);
        if (!job || (job.status !== "processing" && job.status !== "pending")) {
            return false;
        }
        const processo = this.processos.get(analysisId);
        if (processo) {
            processo.kill();
            this.processos.delete(analysisId);
        }
        await this.atualizarStatusJob(analysisId, {
            status: "cancelled",
            logs: ["🛑 Job cancelado pelo usuário"]
        });
        return true;
    }

    private async handleFailure(analysisId: number, error: Error | string) {
        const errorMsg = error instanceof Error ? error.message : error;
        console.error(`Erro no job ${analysisId}:`, error);
        await this.atualizarStatusJob(analysisId, {
            status: "failed",
            error: errorMsg,
            logs: [`❌ Erro: ${errorMsg}`]
        });
    }
}
