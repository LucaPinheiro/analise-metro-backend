#!/usr/bin/env tsx
/**
 * Script para criar projeto manualmente no banco de dados
 * 
 * Uso:
 *   npx tsx scripts/create-project-manual.ts
 *   ou
 *   npm run create-project
 * 
 * Opções:
 *   --name "Nome do Projeto"
 *   --description "Descrição"
 *   --bim-path "caminho/para/arquivo.ifc" (opcional, cria placeholder se não fornecido)
 *   --copy-bim "caminho/para/arquivo.ifc" (copia arquivo real)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CreateProjectOptions {
    name: string;
    description?: string;
    bimPath?: string;
    copyBimFrom?: string;
    createRecords?: boolean;
    createAnalysis?: boolean;
}

/**
 * Criar estrutura de diretórios para um projeto
 */
function criarEstruturaDiretorios(projectId: number) {
    const uploadsDir = process.env.UPLOADS_DIR || './src/shared/data/uploads';
    const outputsDir = process.env.OUTPUTS_DIR || './src/shared/data/outputs';
    
    const projectUploadDir = path.join(uploadsDir, 'projects', projectId.toString());
    const projectOutputDir = path.join(outputsDir, projectId.toString());
    
    // Criar diretórios
    fs.mkdirSync(projectUploadDir, { recursive: true });
    fs.mkdirSync(projectOutputDir, { recursive: true });
    fs.mkdirSync(path.join(projectOutputDir, 'registros'), { recursive: true });
    fs.mkdirSync(path.join(projectOutputDir, 'analises'), { recursive: true });
    
    console.log(`✅ Estrutura de diretórios criada para projeto ${projectId}`);
}

/**
 * Copiar ou criar arquivo BIM
 */
function prepararArquivoBim(projectId: number, bimPath: string, copyFrom?: string): string {
    const uploadsDir = process.env.UPLOADS_DIR || './src/shared/data/uploads';
    const fullBimPath = path.join(uploadsDir, bimPath);
    const dir = path.dirname(fullBimPath);
    
    // Criar diretório se não existir
    fs.mkdirSync(dir, { recursive: true });
    
    if (copyFrom && fs.existsSync(copyFrom)) {
        // Copiar arquivo real
        fs.copyFileSync(copyFrom, fullBimPath);
        console.log(`✅ Arquivo BIM copiado de: ${copyFrom}`);
        console.log(`   Para: ${fullBimPath}`);
    } else {
        // Criar placeholder
        const content = `# Mock BIM file
# Project ID: ${projectId}
# Created: ${new Date().toISOString()}
# This is a placeholder file created by create-project-manual script
`;
        fs.writeFileSync(fullBimPath, content);
        console.log(`✅ Arquivo BIM placeholder criado: ${fullBimPath}`);
    }
    
    return bimPath;
}

/**
 * Criar projeto manualmente
 */
async function criarProjetoManual(options: CreateProjectOptions) {
    try {
        console.log('🚀 Criando projeto manualmente...\n');
        
        // Validar nome
        if (!options.name || options.name.trim() === '') {
            throw new Error('Nome do projeto é obrigatório');
        }
        
        // Determinar caminho BIM
        let bimPath: string;
        if (options.bimPath) {
            // Usar caminho fornecido
            bimPath = options.bimPath;
        } else {
            // Gerar caminho padrão
            const timestamp = Date.now();
            const ext = options.copyBimFrom 
                ? path.extname(options.copyBimFrom) 
                : '.ifc';
            bimPath = `projects/manual/projeto_${timestamp}${ext}`;
        }
        
        // Verificar se já existe projeto com este bimPath
        const existente = await prisma.project.findUnique({
            where: { bimPath }
        });
        
        if (existente) {
            console.log(`⚠️  Projeto com bimPath "${bimPath}" já existe (ID: ${existente.id})`);
            console.log('   Usando projeto existente...\n');
            return existente;
        }
        
        // Criar projeto no banco
        const projeto = await prisma.project.create({
            data: {
                name: options.name.trim(),
                description: options.description?.trim() || null,
                bimPath: bimPath
            }
        });
        
        console.log(`✅ Projeto criado no banco:`);
        console.log(`   ID: ${projeto.id}`);
        console.log(`   Nome: ${projeto.name}`);
        console.log(`   BIM Path: ${projeto.bimPath}\n`);
        
        // Criar estrutura de diretórios
        criarEstruturaDiretorios(projeto.id);
        
        // Preparar arquivo BIM
        prepararArquivoBim(projeto.id, projeto.bimPath, options.copyBimFrom);
        
        // Criar registros opcionais
        if (options.createRecords) {
            console.log('\n📝 Criando registros mock...');
            const record = await prisma.record.create({
                data: {
                    name: `Registro Manual - ${projeto.name}`,
                    projectId: projeto.id,
                    uploadedFilesPaths: [
                        `projects/${projeto.id}/records/1/foto1.jpg`,
                        `projects/${projeto.id}/records/1/foto2.jpg`,
                        `projects/${projeto.id}/records/1/foto3.jpg`
                    ]
                }
            });
            console.log(`   ✅ Registro criado (ID: ${record.id})`);
            
            // Criar análise opcional
            if (options.createAnalysis) {
                console.log('\n📊 Criando análise mock...');
                const analysis = await prisma.analysis.create({
                    data: {
                        projectId: projeto.id,
                        recordId: record.id,
                        status: 'completed',
                        progress: 100,
                        logs: [
                            '═══════════════════════════════════════════════════════════',
                            '  🚀 ANÁLISE MANUAL CRIADA',
                            '═══════════════════════════════════════════════════════════',
                            '',
                            `📦 Projeto: ${projeto.name} (ID: ${projeto.id})`,
                            `📝 Registro: ${record.name} (ID: ${record.id})`,
                            '',
                            '✅ Análise criada manualmente via script'
                        ],
                        outputPaths: {
                            modelo3d: `${projeto.id}/registros/${record.id}/reconstrucao_${record.id}.ply`
                        },
                        resultPath: `${projeto.id}/analises/analysis_1/comparacao_c2c.ply`,
                        summaryJsonPath: `${projeto.id}/analises/analysis_1/summary_c2c.json`,
                        meanDistance: 2.5,
                        stdDeviation: 1.8,
                        startedAt: new Date(),
                        completedAt: new Date()
                    }
                });
                console.log(`   ✅ Análise criada (ID: ${analysis.id}, Status: ${analysis.status})`);
            }
        }
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ Projeto criado com sucesso!');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        console.log('📋 Resumo:');
        console.log(`   • ID: ${projeto.id}`);
        console.log(`   • Nome: ${projeto.name}`);
        console.log(`   • BIM Path: ${projeto.bimPath}`);
        console.log(`   • Criado em: ${projeto.createdAt.toISOString()}\n`);
        
        console.log('💡 Próximos passos:');
        console.log(`   1. Verificar projeto: curl http://localhost:3000/api/projects/${projeto.id}`);
        console.log(`   2. Listar projetos: curl http://localhost:3000/api/projects`);
        console.log(`   3. Visualizar BIM: curl http://localhost:3000/api/${projeto.id}/bim/0\n`);
        
        return projeto;
        
    } catch (error: any) {
        console.error('❌ Erro ao criar projeto:', error.message);
        
        if (error.code === 'P2002') {
            console.error('   ⚠️  Um projeto com este caminho BIM já existe.');
        }
        
        throw error;
    }
}

/**
 * Função principal - pode ser chamada via CLI ou importada
 */
async function main() {
    // Ler argumentos da linha de comando
    const args = process.argv.slice(2);
    const options: CreateProjectOptions = {
        name: '',
        createRecords: false,
        createAnalysis: false
    };
    
    // Parse argumentos simples
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--name' && args[i + 1]) {
            options.name = args[i + 1];
            i++;
        } else if (arg === '--description' && args[i + 1]) {
            options.description = args[i + 1];
            i++;
        } else if (arg === '--bim-path' && args[i + 1]) {
            options.bimPath = args[i + 1];
            i++;
        } else if (arg === '--copy-bim' && args[i + 1]) {
            options.copyBimFrom = args[i + 1];
            i++;
        } else if (arg === '--with-records') {
            options.createRecords = true;
        } else if (arg === '--with-analysis') {
            options.createRecords = true;
            options.createAnalysis = true;
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
📝 Script para Criar Projeto Manualmente

Uso:
  npx tsx scripts/create-project-manual.ts [opções]

Opções:
  --name "Nome do Projeto"          (obrigatório)
  --description "Descrição"         (opcional)
  --bim-path "caminho/arquivo.ifc"  (opcional, caminho relativo ao UPLOADS_DIR)
  --copy-bim "caminho/arquivo.ifc"  (opcional, copia arquivo real do sistema)
  --with-records                    (cria registros mock também)
  --with-analysis                   (cria registros e análise mock também)
  --help, -h                        (mostra esta ajuda)

Exemplos:

  # Criar projeto simples
  npx tsx scripts/create-project-manual.ts --name "Meu Projeto"

  # Criar projeto com descrição
  npx tsx scripts/create-project-manual.ts \\
    --name "Estação Teste" \\
    --description "Projeto de teste"

  # Criar projeto copiando arquivo BIM real
  npx tsx scripts/create-project-manual.ts \\
    --name "Projeto com BIM Real" \\
    --copy-bim "./modelos/estacao.ifc"

  # Criar projeto com caminho BIM customizado
  npx tsx scripts/create-project-manual.ts \\
    --name "Projeto Customizado" \\
    --bim-path "projects/custom/meu_modelo.obj"

  # Criar projeto completo (com registros e análise)
  npx tsx scripts/create-project-manual.ts \\
    --name "Projeto Completo" \\
    --with-analysis

Variáveis de Ambiente:
  UPLOADS_DIR - Diretório de uploads (padrão: ./src/shared/data/uploads)
  OUTPUTS_DIR - Diretório de outputs (padrão: ./src/shared/data/outputs)
            `);
            process.exit(0);
        }
    }
    
    // Se não tem nome, tentar modo interativo
    if (!options.name) {
        console.log('📝 Modo Interativo - Criar Projeto Manual\n');
        console.log('Pressione Ctrl+C para cancelar\n');
        
        // Em modo interativo, pedir informações
        // Por enquanto, apenas mostrar ajuda
        console.log('💡 Use argumentos da linha de comando ou edite o script diretamente.\n');
        console.log('Exemplo mínimo:');
        console.log('  npx tsx scripts/create-project-manual.ts --name "Meu Projeto"\n');
        process.exit(1);
    }
    
    try {
        await criarProjetoManual(options);
    } catch (error) {
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Executar se chamado diretamente
main().catch(console.error);

// Exportar para uso como módulo
export { criarProjetoManual, CreateProjectOptions };

