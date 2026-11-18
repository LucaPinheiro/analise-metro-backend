import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pipelineRouter } from "./core/routes/pipeline.routes";

// Carregar variáveis de ambiente
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rotas
app.use("/api", pipelineRouter);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
});

export default app;
