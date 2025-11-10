import { Request, Response } from 'express';
import { PipelineManager } from '../services/pipeline.manager';
import { v4 as uuidv4 } from 'uuid';

export class PipelineController {
  private pipelineManager: PipelineManager;

  constructor() {
    this.pipelineManager = new PipelineManager();
  }

  /**
   * Processa fotos do canteiro de obras
   */
  async processarFotos(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({ 
          error: 'Nenhuma foto foi enviada' 
        });
        return;
      }

      const modeloBim = req.body.modeloBim || null;
      const parametros = req.body.parametros 
        ? JSON.parse(req.body.parametros) 
        : {};

      // Criar job de processamento
      const jobId = uuidv4();
      const caminhosFotos = files.map(file => file.path);

      // Iniciar processamento assíncrono
      this.pipelineManager.processarFotos(
        jobId,
        caminhosFotos,
        modeloBim,
        parametros
      ).catch(error => {
        console.error(`Erro no job ${jobId}:`, error);
      });

      // Retornar resposta imediata com jobId
      res.status(202).json({
        jobId,
        status: 'processing',
        message: 'Processamento iniciado',
        fotosRecebidas: files.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao processar fotos:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Obtém o status de um job
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const status = await this.pipelineManager.getJobStatus(jobId);

      if (!status) {
        res.status(404).json({ 
          error: 'Job não encontrado' 
        });
        return;
      }

      res.json(status);
    } catch (error) {
      console.error('Erro ao obter status do job:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista todos os jobs
   */
  async listarJobs(req: Request, res: Response): Promise<void> {
    try {
      const jobs = await this.pipelineManager.listarJobs();
      res.json({ jobs });
    } catch (error) {
      console.error('Erro ao listar jobs:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Cancela um job
   */
  async cancelarJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const sucesso = await this.pipelineManager.cancelarJob(jobId);

      if (!sucesso) {
        res.status(404).json({ 
          error: 'Job não encontrado ou já finalizado' 
        });
        return;
      }

      res.json({ 
        message: 'Job cancelado com sucesso',
        jobId 
      });
    } catch (error) {
      console.error('Erro ao cancelar job:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

