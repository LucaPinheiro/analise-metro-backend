import { ChildProcess, spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import prisma from "@database/db";
import { IProcessamentoParams } from "@interfaces/IProcessamentoParams";
import { Analysis, Project, Record } from "@prisma/client";
import {
    criarDiretorioOutput,
    obterCaminhoRelativoOutput
} from "@functions/moverArquivo";

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
                logs: [
                    "═══════════════════════════════════════════════════════════",
                    "  🚀 PIPELINE DE PROCESSAMENTO INICIADA",
                    "═══════════════════════════════════════════════════════════",
                    "",
                    "📋 Etapas do processamento:",
                    "   1️⃣  Reconstrução 3D (3DGS) - Gerar nuvem de pontos a partir de fotos",
                    "   2️⃣  Comparação C2C - Comparar reconstrução com modelo BIM",
                    "",
                    "⏱️  Tempo estimado: ~2-5 minutos (simulação mock)",
                    ""
                ],
                progress: 0
            });

            // Usar nova estrutura de diretórios
            const registrosDir = criarDiretorioOutput(project.id, "registros");
            const analisesDir = criarDiretorioOutput(project.id, "analises");
            const jobOutputDir = path.join(analisesDir, `analysis_${analysisId}`);
            if (!fs.existsSync(jobOutputDir)) {
                fs.mkdirSync(jobOutputDir, { recursive: true });
            }

            // Verificar se já existe reconstrução para este registro
            const pular3DGS = !!record.recordPath;

            await this.executarPipeline(
                analysisId,
                project,
                record,
                parametros,
                jobOutputDir,
                pular3DGS
            );

            await this.atualizarStatusJob(analysisId, {
                status: "completed",
                progress: 100,
                completedAt: new Date().toISOString(),
                logs: [
                    "",
                    "═══════════════════════════════════════════════════════════",
                    "  ✅ PIPELINE CONCLUÍDA COM SUCESSO!",
                    "═══════════════════════════════════════════════════════════",
                    "",
                    "📊 Resumo da execução:",
                    "   ✅ Reconstrução 3D gerada",
                    "   ✅ Comparação C2C executada",
                    "   ✅ Arquivos de saída disponíveis",
                    "",
                    "📁 Arquivos gerados disponíveis para download e visualização",
                    "🎉 Processamento completo!"
                ]
            });
        } catch (error) {
            await this.handleFailure(analysisId, error as Error | string);
        } finally {
            this.processos.delete(analysisId);
        }
    }

    /**
     * Lógica principal do pipeline (3DGS -> CloudCompare)
     * Detecta se reconstrução já existe e pula etapa 3DGS se necessário
     */
    private async executarPipeline(
        analysisId: number,
        project: Project,
        record: Record,
        parametros: IProcessamentoParams,
        outputDir: string,
        pular3DGS: boolean = false
    ): Promise<void> {
        const uploadDir = process.env.UPLOADS_DIR || "./shared/data/uploads";
        const bimPath = path.resolve(uploadDir, project.bimPath);
        let modelo3dGerado: string;
        let modelo3dPath: string;
        let recordPathRelativo: string;

        // Verificar se já existe reconstrução 3DGS
        if (pular3DGS && record.recordPath) {
            const outputBase = process.env.OUTPUTS_DIR || "./shared/data/outputs";
            const caminhoExistente = path.resolve(outputBase, record.recordPath);
            if (fs.existsSync(caminhoExistente)) {
                await this.atualizarStatusJob(analysisId, {
                    logs: [
                        "📸 Reconstrução 3D já existe, reutilizando...",
                        `Caminho: ${record.recordPath}`
                    ],
                    progress: 20
                });
                modelo3dGerado = caminhoExistente;
                recordPathRelativo = record.recordPath;
            } else {
                // Arquivo não encontrado, precisa reprocessar
                pular3DGS = false;
            }
        }

        // ====================================================================
        // ETAPA 1: RECONSTRUÇÃO 3D (3DGS) - Processamento de Imagens
        // ====================================================================
        // Esta etapa processa as fotos enviadas e gera uma nuvem de pontos 3D
        // usando técnicas de reconstrução fotogramétrica (3D Gaussian Splatting).
        // O resultado é um arquivo PLY contendo a geometria 3D do canteiro.
        if (!pular3DGS) {
            const caminhosFotos: string[] = (
                (record.uploadedFilesPaths as string[]) || []
            ).map((p: string) => path.resolve(uploadDir, p));

            await this.atualizarStatusJob(analysisId, {
                logs: [
                    "",
                    "═══════════════════════════════════════════════════════════",
                    "  📸 ETAPA 1/2: RECONSTRUÇÃO 3D (3DGS)",
                    "═══════════════════════════════════════════════════════════",
                    "",
                    "🎯 Objetivo: Gerar nuvem de pontos 3D a partir das fotos",
                    "",
                    `📷 Imagens a processar: ${caminhosFotos.length} foto(s)`,
                    "🔧 Processo:",
                    "   1. Detecção de features (pontos de interesse)",
                    "   2. Correspondência entre imagens",
                    "   3. Triangulação estéreo",
                    "   4. Densificação da nuvem de pontos",
                    "   5. Geração do arquivo PLY",
                    "",
                    "⏳ Iniciando processamento..."
                ],
                progress: 10
            });

            // Salvar reconstrução em /:constructionId/registros
            const registrosDir = criarDiretorioOutput(project.id, "registros");
            modelo3dPath = path.join(
                registrosDir,
                `registro_${record.id}_${Date.now()}.ply`
            );
            modelo3dGerado = await this.processarImagens(
                analysisId,
                caminhosFotos,
                modelo3dPath,
                parametros
            );

            recordPathRelativo = obterCaminhoRelativoOutput(modelo3dGerado);

            await prisma.record.update({
                where: { id: record.id },
                data: { recordPath: recordPathRelativo }
            });

            await this.atualizarStatusJob(analysisId, {
                logs: [
                    "",
                    "✅ Reconstrução 3D concluída!",
                    `   📁 Arquivo gerado: ${recordPathRelativo}`,
                    "   → Próximo passo: Comparação com modelo BIM"
                ],
                progress: 50,
                outputPaths: { modelo3d: recordPathRelativo }
            });
        } else {
            await this.atualizarStatusJob(analysisId, {
                logs: [
                    "",
                    "✅ Reconstrução 3D já disponível",
                    `   📁 Arquivo: ${recordPathRelativo}`,
                    "   → Próximo passo: Comparação com modelo BIM"
                ],
                progress: 50,
                outputPaths: { modelo3d: recordPathRelativo }
            });
        }

        // ====================================================================
        // ETAPA 2: COMPARAÇÃO CLOUD-TO-CLOUD (C2C)
        // ====================================================================
        // Esta etapa compara a reconstrução 3D (as-built) com o modelo BIM
        // (as-planned) usando algoritmo Cloud-to-Cloud do CloudCompare.
        // O resultado mostra as diferenças entre o que foi construído e o planejado.
        await this.atualizarStatusJob(analysisId, {
            logs: [
                "",
                "═══════════════════════════════════════════════════════════",
                "  🏗️  ETAPA 2/2: COMPARAÇÃO CLOUD-TO-CLOUD (C2C)",
                "═══════════════════════════════════════════════════════════",
                "",
                "🎯 Objetivo: Comparar reconstrução 3D (as-built) com BIM (as-planned)",
                "",
                "📊 Modelos a comparar:",
                `   • Modelo BIM: ${path.basename(bimPath)}`,
                `   • Reconstrução 3D: ${path.basename(modelo3dGerado)}`,
                "",
                "🔧 Processo:",
                "   1. Alinhamento ICP (Iterative Closest Point)",
                "   2. Cálculo de distâncias ponto-a-ponto",
                "   3. Aplicação de cores por distância",
                "   4. Geração de métricas estatísticas",
                "",
                "⏳ Iniciando comparação..."
            ],
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

        const comparacaoPathRelativo = obterCaminhoRelativoOutput(
            comparacaoGerada
        );
        
        // Buscar arquivo JSON de métricas se existir
        const summaryJsonPath = path.join(
            path.dirname(comparacaoGerada),
            "summary_c2c.json"
        );
        let summaryJsonRelativo: string | null = null;
        if (fs.existsSync(summaryJsonPath)) {
            summaryJsonRelativo = obterCaminhoRelativoOutput(summaryJsonPath);
        }
        
        await this.atualizarStatusJob(analysisId, {
            logs: [
                "",
                "✅ Comparação C2C concluída!",
                `   📁 Arquivo de comparação: ${comparacaoPathRelativo}`,
                summaryJsonRelativo ? `   📊 Métricas: ${summaryJsonRelativo}` : "",
                "",
                "📈 Resultados:",
                "   • Arquivo PLY com distâncias coloridas gerado",
                "   • Métricas estatísticas calculadas",
                "   • Pronto para visualização e análise"
            ],
            progress: 90,
            resultPath: comparacaoPathRelativo,
            summaryJsonPath: summaryJsonRelativo,
            outputPaths: {
                modelo3d: recordPathRelativo,
                comparacaoBim: comparacaoPathRelativo,
                ...(summaryJsonRelativo && { summaryJson: summaryJsonRelativo })
            }
        });
    }

    /**
     * Executa apenas comparação C2C usando modelos já armazenados
     */
    async executarApenasC2C(
        analysisId: number,
        projectId: number,
        recordId?: number
    ): Promise<void> {
        try {
            const project = await prisma.project.findUnique({
                where: { id: projectId }
            });

            if (!project) {
                await this.handleFailure(
                    analysisId,
                    `Projeto ${projectId} não encontrado.`
                );
                return;
            }

            // Buscar registro mais recente com reconstrução ou usar o especificado
            let record: Record | null;
            if (recordId) {
                record = await prisma.record.findUnique({
                    where: { id: recordId }
                });
            } else {
                record = await prisma.record.findFirst({
                    where: {
                        projectId: projectId,
                        recordPath: { not: null }
                    },
                    orderBy: { createdAt: "desc" }
                });
            }

            if (!record || !record.recordPath) {
                await this.handleFailure(
                    analysisId,
                    "Nenhuma reconstrução 3D encontrada. Execute photo-processing-full ou import-ply primeiro."
                );
                return;
            }

            // Validar que o arquivo PLY realmente existe
            const outputBase = process.env.OUTPUTS_DIR || "./src/shared/data/outputs";
            const caminhoPLY = path.resolve(outputBase, record.recordPath);
            
            if (!fs.existsSync(caminhoPLY)) {
                await this.handleFailure(
                    analysisId,
                    `Arquivo PLY não encontrado: ${record.recordPath}. O arquivo pode ter sido removido.`
                );
                return;
            }

            await this.atualizarStatusJob(analysisId, {
                logs: [
                    `✅ Arquivo PLY encontrado: ${record.recordPath}`,
                    "Iniciando comparação C2C..."
                ],
                progress: 10
            });

            const outputDir = criarDiretorioOutput(projectId, "analises");
            const analysisOutputDir = path.join(
                outputDir,
                `analysis_${analysisId}`
            );
            if (!fs.existsSync(analysisOutputDir)) {
                fs.mkdirSync(analysisOutputDir, { recursive: true });
            }

            await this.executarPipeline(
                analysisId,
                project,
                record,
                {},
                analysisOutputDir,
                true // Pular 3DGS
            );
        } catch (error) {
            await this.handleFailure(analysisId, error as Error | string);
        }
    }

    private async processarImagens(
        analysisId: number,
        caminhosFotos: string[],
        outputPath: string,
        parametros: IProcessamentoParams
    ): Promise<string> {
        // Configurar caminho da ferramenta 3DGS
        // Em desenvolvimento, usar script mock automaticamente se ferramenta real não estiver disponível
        let cliPath = process.env.IMAGE_PROCESSING_CLI || "./tools/image-processor";
        
        // Se não especificado ou não existe, tentar usar script mock
        if (!fs.existsSync(cliPath) || cliPath === "./tools/image-processor") {
            // Detectar plataforma e usar script apropriado
            const isWindows = os.platform() === "win32";
            const mockExtension = isWindows ? ".bat" : ".sh";
            const mockPath = path.resolve(process.cwd(), `tools/fake_3dgs${mockExtension}`);
            
            if (fs.existsSync(mockPath)) {
                await this.atualizarStatusJob(analysisId, {
                    logs: [
                        `   ℹ️  Usando script mock 3DGS para desenvolvimento (${isWindows ? "Windows" : "Unix"})`
                    ]
                });
                cliPath = mockPath;
            }
        }
        
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
        let cliPath = process.env.BIM_COMPARISON_CLI || "CloudCompare";
        
        // Se o caminho começa com ./tools/, resolver para caminho absoluto
        if (cliPath.startsWith("./tools/") || cliPath.startsWith("tools/")) {
            cliPath = path.resolve(process.cwd(), cliPath.replace(/^\.\//, ""));
        }
        
        // Verificar se a ferramenta existe
        const toolExists = fs.existsSync(cliPath);
        const isCloudCompare = cliPath === "CloudCompare" || cliPath.includes("CloudCompare");
        
        // Detectar plataforma para usar script mock correto
        const isWindows = os.platform() === "win32";
        const mockExtension = isWindows ? ".bat" : ".sh";
        
        // Se não existe e não é CloudCompare padrão, usar mock em desenvolvimento
        if (!toolExists && !isCloudCompare) {
            const mockPath = path.resolve(process.cwd(), `tools/bim-comparison${mockExtension}`);
            if (fs.existsSync(mockPath)) {
                await this.atualizarStatusJob(analysisId, {
                    logs: [
                        `⚠️ Ferramenta ${cliPath} não encontrada`,
                        `🔄 Usando script mock para desenvolvimento (${isWindows ? "Windows" : "Unix"})`
                    ]
                });
                cliPath = mockPath;
            } else {
                // Tentar CloudCompare padrão do sistema como último recurso
                await this.atualizarStatusJob(analysisId, {
                    logs: [
                        `⚠️ Ferramenta ${cliPath} não encontrada e mock não disponível`,
                        `🔄 Tentando CloudCompare padrão do sistema`
                    ]
                });
                cliPath = "CloudCompare";
            }
        } else if (!toolExists && isCloudCompare) {
            // CloudCompare não encontrado, tentar usar mock
            const mockPath = path.resolve(process.cwd(), `tools/bim-comparison${mockExtension}`);
            if (fs.existsSync(mockPath)) {
                await this.atualizarStatusJob(analysisId, {
                    logs: [
                        `⚠️ CloudCompare não encontrado no sistema`,
                        `🔄 Usando script mock para desenvolvimento (${isWindows ? "Windows" : "Unix"})`
                    ]
                });
                cliPath = mockPath;
            }
        }
        
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
            const isWindows = os.platform() === "win32";
            let spawnCommand: string;
            let spawnArgs: string[] = [];
            
            // Detectar tipo de script e configurar comando apropriado
            if (cliPath.endsWith(".sh")) {
                // Script bash - usar bash explicitamente
                spawnCommand = "bash";
                spawnArgs = [cliPath, ...args];
            } else if (cliPath.endsWith(".bat")) {
                // Script batch Windows - usar cmd
                spawnCommand = "cmd";
                spawnArgs = ["/c", cliPath, ...args];
            } else {
                // Comando direto
                spawnCommand = cliPath;
                spawnArgs = args;
            }
            
            const commandString = spawnArgs.length > 0 
                ? `${spawnCommand} ${spawnArgs.join(" ")}`
                : spawnCommand;
            
            this.atualizarStatusJob(analysisId, {
                logs: [`[${etapa}] 🔧 Executando: ${commandString}`]
            });
            
            const processo = spawn(spawnCommand, spawnArgs, {
                stdio: ["ignore", "pipe", "pipe"],
                shell: false // Não usar shell para melhor controle
            });
            
            this.processos.set(analysisId, processo);
            let stdout = "";
            let stderr = "";
            
            processo.stdout?.on("data", (data) => {
                const output = data.toString();
                stdout += output;
                // Atualizar logs em tempo real para scripts mock
                const lines = output.split("\n").filter(Boolean);
                if (lines.length > 0) {
                    this.atualizarStatusJob(analysisId, {
                        logs: lines.map((line: string) => `[${etapa}] ${line.trim()}`)
                    });
                }
            });
            
            processo.stderr?.on("data", (data) => {
                const output = data.toString();
                stderr += output;
                // Logs de erro também aparecem em stderr nos scripts mock
                const lines = output.split("\n").filter(Boolean);
                if (lines.length > 0) {
                    this.atualizarStatusJob(analysisId, {
                        logs: lines.map((line: string) => `[${etapa}] ${line.trim()}`)
                    });
                }
            });
            
            // Timeout de segurança (5 minutos)
            const timeout = setTimeout(() => {
                if (this.processos.has(analysisId)) {
                    processo.kill("SIGTERM");
                    this.processos.delete(analysisId);
                    reject(new Error(`Timeout: ${etapa} demorou mais de 5 minutos`));
                }
            }, 5 * 60 * 1000);
            
            processo.on("close", (code) => {
                clearTimeout(timeout);
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
                let errorMsg = `Erro ao executar CLI: ${error.message}`;
                
                // Mensagens mais específicas para erros comuns
                if (error.message.includes("ENOENT") || error.message.includes("No such file")) {
                    errorMsg = `Ferramenta não encontrada: ${cliPath}. ` +
                        `Configure BIM_COMPARISON_CLI no .env ou instale CloudCompare. ` +
                        `Em desenvolvimento, o script mock será usado automaticamente.`;
                }
                
                this.atualizarStatusJob(analysisId, {
                    logs: [`❌ ${errorMsg}`],
                    error: errorMsg
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

    async listarAnalyses(projectId?: number): Promise<Analysis[]> {
        const where = projectId ? { projectId } : {};
        return prisma.analysis.findMany({
            where,
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
