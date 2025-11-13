import path from "path";
import fs from "fs";

export default function moverArquivo(
    file: Express.Multer.File,
    pastaDestino: string,
    novoNome?: string
): string {
    const pastaBase = process.env.UPLOADS_DIR || "./src/shared/data/uploads";
    const destinoFinalDir = path.join(pastaBase, pastaDestino);

    if (!fs.existsSync(destinoFinalDir)) {
        fs.mkdirSync(destinoFinalDir, { recursive: true });
    }

    const nomeFinal = novoNome || file.filename;
    const caminhoFinal = path.join(destinoFinalDir, nomeFinal);

    fs.renameSync(file.path, caminhoFinal);
    return path.join(pastaDestino, nomeFinal);
}

export function criarDiretorioOutput(
    constructionId: number,
    tipo: "registros" | "analises"
): string {
    const pastaBase = process.env.OUTPUTS_DIR || "./src/shared/data/outputs";
    const caminho = path.join(pastaBase, constructionId.toString(), tipo);
    
    if (!fs.existsSync(caminho)) {
        fs.mkdirSync(caminho, { recursive: true });
    }
    
    return caminho;
}

export function obterCaminhoRelativoOutput(
    caminhoAbsoluto: string
): string {
    const pastaBase = process.env.OUTPUTS_DIR || "./src/shared/data/outputs";
    return path.relative(pastaBase, caminhoAbsoluto);
}
