import path from "path";

const TIPOS_BIM_PERMITIDOS = [".ifc", ".dwg", ".obj", ".ply"];
const TIPOS_IMAGEM_PERMITIDOS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".JPG",
    ".JPEG",
    ".PNG"
];
const TIPOS_PLY_PERMITIDOS = [".ply", ".PLY"];
const TAMANHO_MAX_BIM = 5 * 1024 * 1024 * 1024; // 5GB
const TAMANHO_MAX_IMAGEM = 100 * 1024 * 1024; // 100MB
const TAMANHO_MIN_IMAGEM = 100 * 1024; // 100KB
const TAMANHO_MAX_PLY = 10 * 1024 * 1024 * 1024; // 10GB
const TAMANHO_MIN_PLY = 1024; // 1KB
const MIN_FOTOS_RECONSTRUCAO = 3;

export interface ValidacaoResultado {
    valido: boolean;
    erro?: string;
}

export function validarArquivoBIM(file: Express.Multer.File): ValidacaoResultado {
    if (!file) {
        return { valido: false, erro: "Arquivo BIM não fornecido" };
    }

    const extensao = path.extname(file.originalname).toLowerCase();
    if (!TIPOS_BIM_PERMITIDOS.includes(extensao)) {
        return {
            valido: false,
            erro: `Tipo de arquivo BIM não suportado. Tipos permitidos: ${TIPOS_BIM_PERMITIDOS.join(", ")}`
        };
    }

    if (file.size > TAMANHO_MAX_BIM) {
        return {
            valido: false,
            erro: `Arquivo BIM muito grande. Tamanho máximo: ${TAMANHO_MAX_BIM / (1024 * 1024 * 1024)}GB`
        };
    }

    return { valido: true };
}

export function validarArquivosImagem(
    files: Express.Multer.File[]
): ValidacaoResultado {
    if (!files || files.length === 0) {
        return { valido: false, erro: "Nenhuma imagem fornecida" };
    }

    if (files.length < MIN_FOTOS_RECONSTRUCAO) {
        return {
            valido: false,
            erro: `Número mínimo de fotos não atingido. Mínimo: ${MIN_FOTOS_RECONSTRUCAO}, fornecido: ${files.length}`
        };
    }

    for (const file of files) {
        const extensao = path.extname(file.originalname).toLowerCase();
        if (!TIPOS_IMAGEM_PERMITIDOS.includes(extensao)) {
            return {
                valido: false,
                erro: `Tipo de arquivo de imagem não suportado: ${file.originalname}. Tipos permitidos: ${TIPOS_IMAGEM_PERMITIDOS.join(", ")}`
            };
        }

        if (file.size < TAMANHO_MIN_IMAGEM) {
            return {
                valido: false,
                erro: `Imagem muito pequena: ${file.originalname}. Tamanho mínimo: ${TAMANHO_MIN_IMAGEM / 1024}KB`
            };
        }

        if (file.size > TAMANHO_MAX_IMAGEM) {
            return {
                valido: false,
                erro: `Imagem muito grande: ${file.originalname}. Tamanho máximo: ${TAMANHO_MAX_IMAGEM / (1024 * 1024)}MB`
            };
        }
    }

    return { valido: true };
}

export function obterCaminhoRegistros(constructionId: number): string {
    return `${constructionId}/registros`;
}

export function obterCaminhoAnalises(constructionId: number): string {
    return `${constructionId}/analises`;
}

export function obterCaminhoBIM(constructionId: number): string {
    return `${constructionId}`;
}

export function validarArquivoPLY(file: Express.Multer.File): ValidacaoResultado {
    if (!file) {
        return { valido: false, erro: "Arquivo PLY não fornecido" };
    }

    const extensao = path.extname(file.originalname).toLowerCase();
    if (!TIPOS_PLY_PERMITIDOS.includes(extensao)) {
        return {
            valido: false,
            erro: `Tipo de arquivo PLY não suportado. Tipos permitidos: ${TIPOS_PLY_PERMITIDOS.join(", ")}`
        };
    }

    if (file.size < TAMANHO_MIN_PLY) {
        return {
            valido: false,
            erro: `Arquivo PLY muito pequeno. Tamanho mínimo: ${TAMANHO_MIN_PLY / 1024}KB`
        };
    }

    if (file.size > TAMANHO_MAX_PLY) {
        return {
            valido: false,
            erro: `Arquivo PLY muito grande. Tamanho máximo: ${TAMANHO_MAX_PLY / (1024 * 1024 * 1024)}GB`
        };
    }

    // Validar se é realmente um arquivo PLY verificando cabeçalho
    // PLY geralmente começa com "ply" ou "PLY"
    // Nota: Esta validação básica pode ser melhorada lendo o arquivo
    return { valido: true };
}

