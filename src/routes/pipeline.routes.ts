import { Router } from 'express';
import { PipelineController } from '../controllers/pipeline.controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const controller = new PipelineController();

// Configurar multer para upload de arquivos
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

/**
 * POST /api/processar-fotos
 * Processa fotos do canteiro de obras
 * 
 * Body (multipart/form-data):
 * - fotos: arquivo(s) de imagem
 * - modeloBim: caminho para o modelo BIM (opcional)
 * - parametros: JSON com parâmetros adicionais (opcional)
 */
router.post('/processar-fotos', upload.array('fotos', 10), controller.processarFotos.bind(controller));

/**
 * GET /api/jobs/:jobId
 * Obtém o status de um job de processamento
 */
router.get('/jobs/:jobId', controller.getJobStatus.bind(controller));

/**
 * GET /api/jobs
 * Lista todos os jobs
 */
router.get('/jobs', controller.listarJobs.bind(controller));

/**
 * DELETE /api/jobs/:jobId
 * Cancela um job em execução
 */
router.delete('/jobs/:jobId', controller.cancelarJob.bind(controller));

export { router as pipelineRouter };

