import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  logs: string[];
  error?: string;
  outputPaths?: {
    imagensProcessadas?: string[];
    comparacaoBim?: string;
    relatorio?: string;
    modelo3d?: string;
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ProcessamentoParams {
  modeloBim?: string;
  threshold?: number;
  outputFormat?: 'json' | 'xml' | 'csv';
  [key: string]: any;
}

export class PipelineManager {
  private jobs: Map<string, JobStatus> = new Map();
  private processos: Map<string, ChildProcess> = new Map();
  private readonly maxConcurrentJobs: number;
  private readonly outputDir: string;
  private readonly logsDir: string;

  constructor() {
    this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS || '3');
    this.outputDir = process.env.OUTPUT_DIR || './outputs';
    this.logsDir = process.env.LOGS_DIR || './logs';

    // Criar diretórios se não existirem
    [this.outputDir, this.logsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Processa fotos do canteiro de obras
   */
  async processarFotos(
    jobId: string,
    caminhosFotos: string[],
    modeloBim?: string | null,
    parametros: ProcessamentoParams = {}
  ): Promise<void> {
    const job: JobStatus = {
      jobId,
      status: 'pending',
      progress: 0,
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.jobs.set(jobId, job);

    try {
      // Verificar limite de jobs concorrentes
      const jobsAtivos = Array.from(this.jobs.values())
        .filter(j => j.status === 'processing' || j.status === 'pending').length;

      if (jobsAtivos >= this.maxConcurrentJobs) {
        job.logs.push(`⚠️ Aguardando vaga (${jobsAtivos}/${this.maxConcurrentJobs} jobs ativos)`);
        // Em produção, implementar fila de jobs
      }

      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      job.logs.push('🚀 Iniciando processamento...');

      // Criar diretório de saída para este job
      const jobOutputDir = path.join(this.outputDir, jobId);
      if (!fs.existsSync(jobOutputDir)) {
        fs.mkdirSync(jobOutputDir, { recursive: true });
      }

      // Executar pipeline de processamento
      await this.executarPipeline(job, caminhosFotos, modeloBim, parametros, jobOutputDir);

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      job.logs.push('✅ Processamento concluído com sucesso!');

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Erro desconhecido';
      job.updatedAt = new Date().toISOString();
      job.logs.push(`❌ Erro: ${job.error}`);
      console.error(`Erro no job ${jobId}:`, error);
    } finally {
      // Limpar processo
      this.processos.delete(jobId);
    }
  }

  /**
   * Executa o pipeline de processamento chamando as ferramentas CLI
   */
  private async executarPipeline(
    job: JobStatus,
    caminhosFotos: string[],
    modeloBim: string | null | undefined,
    parametros: ProcessamentoParams,
    outputDir: string
  ): Promise<void> {
    const jobId = job.jobId;

    // Etapa 1: Processamento de imagens
    job.logs.push('📸 Etapa 1/3: Processando imagens...');
    job.progress = 10;
    job.updatedAt = new Date().toISOString();

    const imagensProcessadas = await this.processarImagens(
      job,
      caminhosFotos,
      outputDir,
      parametros
    );

    // Etapa 2: Comparação com BIM (se modelo fornecido)
    if (modeloBim && fs.existsSync(modeloBim)) {
      job.logs.push('🏗️ Etapa 2/3: Comparando com modelo BIM...');
      job.progress = 50;
      job.updatedAt = new Date().toISOString();

      const comparacaoPath = await this.compararComBim(
        job,
        imagensProcessadas,
        modeloBim,
        outputDir,
        parametros
      );

      job.outputPaths = {
        imagensProcessadas,
        comparacaoBim: comparacaoPath
      };
    } else {
      job.logs.push('⚠️ Modelo BIM não fornecido, pulando comparação...');
      job.outputPaths = {
        imagensProcessadas
      };
    }

    // Etapa 3: Geração de relatório
    job.logs.push('📊 Etapa 3/3: Gerando relatório...');
    job.progress = 80;
    job.updatedAt = new Date().toISOString();

    const relatorioPath = await this.gerarRelatorio(
      job,
      outputDir,
      parametros
    );

    if (job.outputPaths) {
      job.outputPaths.relatorio = relatorioPath;
    }

    job.progress = 100;
    job.updatedAt = new Date().toISOString();
  }

  /**
   * Processa imagens usando CLI externa
   */
  private async processarImagens(
    job: JobStatus,
    caminhosFotos: string[],
    outputDir: string,
    parametros: ProcessamentoParams
  ): Promise<string[]> {
    const cliPath = process.env.IMAGE_PROCESSING_CLI || './tools/image-processor';
    const imagensOutputDir = path.join(outputDir, 'imagens_processadas');

    if (!fs.existsSync(imagensOutputDir)) {
      fs.mkdirSync(imagensOutputDir, { recursive: true });
    }

    const args = [
      '--input', caminhosFotos.join(','),
      '--output', imagensOutputDir,
      '--format', parametros.outputFormat || 'json'
    ];

    if (parametros.threshold) {
      args.push('--threshold', parametros.threshold.toString());
    }

    return this.executarCLI(job, cliPath, args, 'Processamento de imagens');
  }

  /**
   * Compara imagens com modelo BIM usando CLI externa
   */
  private async compararComBim(
    job: JobStatus,
    imagensProcessadas: string[],
    modeloBim: string,
    outputDir: string,
    parametros: ProcessamentoParams
  ): Promise<string> {
    const cliPath = process.env.BIM_COMPARISON_CLI || './tools/bim-comparison';
    const comparacaoOutputPath = path.join(outputDir, 'comparacao_bim.json');

    const args = [
      '--imagens', imagensProcessadas.join(','),
      '--modelo-bim', modeloBim,
      '--output', comparacaoOutputPath
    ];

    if (parametros.threshold) {
      args.push('--threshold', parametros.threshold.toString());
    }

    await this.executarCLI(job, cliPath, args, 'Comparação BIM');

    return comparacaoOutputPath;
  }

  /**
   * Gera relatório final
   */
  private async gerarRelatorio(
    job: JobStatus,
    outputDir: string,
    parametros: ProcessamentoParams
  ): Promise<string> {
    const relatorioPath = path.join(outputDir, 'relatorio.json');
    
    const relatorio = {
      jobId: job.jobId,
      timestamp: new Date().toISOString(),
      status: job.status,
      progress: job.progress,
      outputPaths: job.outputPaths,
      parametros
    };

    fs.writeFileSync(relatorioPath, JSON.stringify(relatorio, null, 2));
    job.logs.push(`📄 Relatório salvo em: ${relatorioPath}`);

    return relatorioPath;
  }

  /**
   * Executa uma ferramenta CLI e monitora seu progresso
   */
  private async executarCLI(
    job: JobStatus,
    cliPath: string,
    args: string[],
    etapa: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      job.logs.push(`🔧 Executando: ${cliPath} ${args.join(' ')}`);

      const processo = spawn(cliPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      });

      this.processos.set(job.jobId, processo);

      let stdout = '';
      let stderr = '';

      processo.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        job.logs.push(`[${etapa}] ${output.trim()}`);
        job.updatedAt = new Date().toISOString();
      });

      processo.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        job.logs.push(`[${etapa}] ⚠️ ${output.trim()}`);
        job.updatedAt = new Date().toISOString();
      });

      processo.on('close', (code) => {
        this.processos.delete(job.jobId);

        if (code === 0) {
          job.logs.push(`✅ ${etapa} concluída com sucesso`);
          
          // Tentar parsear JSON da saída se possível
          try {
            const result = JSON.parse(stdout);
            resolve(result.outputPaths || []);
          } catch {
            // Se não for JSON, retornar caminhos baseados no padrão esperado
            resolve(stdout.trim().split('\n').filter(line => line.trim()));
          }
        } else {
          const error = `Falha na execução (código ${code}): ${stderr || stdout}`;
          job.logs.push(`❌ ${error}`);
          reject(new Error(error));
        }
      });

      processo.on('error', (error) => {
        this.processos.delete(job.jobId);
        const errorMsg = `Erro ao executar CLI: ${error.message}`;
        job.logs.push(`❌ ${errorMsg}`);
        reject(new Error(errorMsg));
      });

      // Timeout de segurança
      const timeout = parseInt(process.env.JOB_TIMEOUT_MS || '3600000');
      setTimeout(() => {
        if (processo.killed === false) {
          processo.kill();
          reject(new Error(`Timeout após ${timeout}ms`));
        }
      }, timeout);
    });
  }

  /**
   * Obtém o status de um job
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Lista todos os jobs
   */
  async listarJobs(): Promise<JobStatus[]> {
    return Array.from(this.jobs.values());
  }

  /**
   * Cancela um job
   */
  async cancelarJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || (job.status !== 'processing' && job.status !== 'pending')) {
      return false;
    }

    const processo = this.processos.get(jobId);
    if (processo) {
      processo.kill();
      this.processos.delete(jobId);
    }

    job.status = 'cancelled';
    job.updatedAt = new Date().toISOString();
    job.logs.push('🛑 Job cancelado pelo usuário');

    return true;
  }
}

