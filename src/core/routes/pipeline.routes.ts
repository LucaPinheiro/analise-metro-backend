import { Router } from "express";
import { ProjectController } from "@controllers/project.controller";
import { RecordController } from "@controllers/record.controller";
import { AnalysisController } from "@controllers/analysis.controller";

import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const projectController = new ProjectController();
const recordController = new RecordController();
const analysisController = new AnalysisController();

const uploadDir = process.env.UPLOADS_DIR || "./shared/data/uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const tempUploadDir = path.join(uploadDir, "temp");
        if (!fs.existsSync(tempUploadDir)) {
            fs.mkdirSync(tempUploadDir, { recursive: true });
        }
        cb(null, tempUploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(
            null,
            file.fieldname +
                "-" +
                uniqueSuffix +
                path.extname(file.originalname)
        );
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB
});

router.post(
    "/projects",
    upload.single("modeloBim"),
    projectController.criarProjeto.bind(projectController)
);
router.get(
    "/projects",
    projectController.listarProjetos.bind(projectController)
);
router.get(
    "/projects/:id",
    projectController.getProjeto.bind(projectController)
);

router.post(
    "/projects/:id/records",
    upload.array("fotos", 20),
    recordController.adicionarRegistro.bind(recordController)
);
router.get(
    "/projects/:id/records",
    recordController.listarRegistros.bind(recordController)
);

router.post(
    "/analyses",
    analysisController.iniciarAnalise.bind(analysisController)
);
router.get(
    "/analyses/:id",
    analysisController.getAnalysisStatus.bind(analysisController)
);
router.get(
    "/analyses",
    analysisController.listarAnalyses.bind(analysisController)
);
router.delete(
    "/analyses/:id",
    analysisController.cancelarAnalysis.bind(analysisController)
);

export { router as pipelineRouter };
