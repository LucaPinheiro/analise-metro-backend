#!/usr/bin/env tsx
/**
 * Script para limpar completamente o banco de dados e arquivos
 * 
 * Uso:
 *   npm run clear-db
 *   ou
 *   npx tsx scripts/clear-db.ts
 * 
 * Opções:
 *   --force          Não pedir confirmação
 *   --db-only        Limpar apenas banco de dados
 *   --files-only     Limpar apenas arquivos (uploads/outputs)
 *   --reset          Reset completo do banco (migrate reset)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

interface ClearOptions {
    force?: boolean;
    dbOnly?: boolean;
    filesOnly?: boolean;
    reset?: boolean;
}

/**
 * Limpar banco de dados
 */
async function limparBanco(reset: boolean = false) {
    console.log('🗑️  Limpando banco de dados...\n');
    
    if (reset) {
        console.log('   ⚠️  Usando Prisma migrate reset (reset completo)...');
        try {
            execSync('npx prisma migrate reset --force', { 
                stdio: 'inherit',
                cwd: process.cwd()
            });
            console.log('   ✅ Banco resetado completamente\n');
        } catch (error) {
            console.error('   ❌ Erro ao resetar banco:', error);
            throw error;
        }
    } else {
        // Deletar em ordem (respeitando foreign keys)
        console.log('   📊 Deletando análises...');
        const analysesDeleted = await prisma.analysis.deleteMany({});
        console.log(`      ✓ ${analysesDeleted.count} análises deletadas`);
        
        console.log('   📝 Deletando registros...');
        const recordsDeleted = await prisma.record.deleteMany({});
        console.log(`      ✓ ${recordsDeleted.count} registros deletados`);
        
        console.log('   📦 Deletando projetos...');
        const projectsDeleted = await prisma.project.deleteMany({});
        console.log(`      ✓ ${projectsDeleted.count} projetos deletados`);
        
        console.log('   ✅ Banco de dados limpo\n');
    }
}

/**
 * Limpar arquivos de uploads e outputs
 */
function limparArquivos() {
    console.log('🗑️  Limpando arquivos...\n');
    
    const uploadsDir = process.env.UPLOADS_DIR || './src/shared/data/uploads';
    const outputsDir = process.env.OUTPUTS_DIR || './src/shared/data/outputs';
    
    let filesDeleted = 0;
    let dirsDeleted = 0;
    
    // Limpar uploads
    if (fs.existsSync(uploadsDir)) {
        console.log(`   📁 Limpando uploads: ${uploadsDir}`);
        try {
            const stats = deletarDiretorio(uploadsDir, true); // Manter diretório raiz
            filesDeleted += stats.files;
            dirsDeleted += stats.dirs;
            console.log(`      ✓ ${stats.files} arquivos e ${stats.dirs} diretórios removidos`);
        } catch (error: any) {
            console.error(`      ⚠️  Erro ao limpar uploads: ${error.message}`);
        }
    } else {
        console.log(`   ⚠️  Diretório de uploads não existe: ${uploadsDir}`);
    }
    
    // Limpar outputs
    if (fs.existsSync(outputsDir)) {
        console.log(`   📁 Limpando outputs: ${outputsDir}`);
        try {
            const stats = deletarDiretorio(outputsDir, true); // Manter diretório raiz
            filesDeleted += stats.files;
            dirsDeleted += stats.dirs;
            console.log(`      ✓ ${stats.files} arquivos e ${stats.dirs} diretórios removidos`);
        } catch (error: any) {
            console.error(`      ⚠️  Erro ao limpar outputs: ${error.message}`);
        }
    } else {
        console.log(`   ⚠️  Diretório de outputs não existe: ${outputsDir}`);
    }
    
    console.log(`\n   ✅ Limpeza de arquivos concluída`);
    console.log(`      • Total de arquivos removidos: ${filesDeleted}`);
    console.log(`      • Total de diretórios removidos: ${dirsDeleted}\n`);
}

/**
 * Deletar diretório recursivamente
 */
function deletarDiretorio(dirPath: string, manterRaiz: boolean = false): { files: number; dirs: number } {
    let filesCount = 0;
    let dirsCount = 0;
    
    if (!fs.existsSync(dirPath)) {
        return { files: 0, dirs: 0 };
    }
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
            const stats = deletarDiretorio(fullPath, false);
            filesCount += stats.files;
            dirsCount += stats.dirs;
            fs.rmdirSync(fullPath);
            dirsCount++;
        } else {
            fs.unlinkSync(fullPath);
            filesCount++;
        }
    }
    
    return { files: filesCount, dirs: dirsCount };
}

/**
 * Função principal
 */
async function main() {
    // Parse argumentos
    const args = process.argv.slice(2);
    const options: ClearOptions = {
        force: args.includes('--force'),
        dbOnly: args.includes('--db-only'),
        filesOnly: args.includes('--files-only'),
        reset: args.includes('--reset')
    };
    
    // Mostrar ajuda
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🗑️  Script para Limpar Banco de Dados e Arquivos

Uso:
  npm run clear-db [opções]
  ou
  npx tsx scripts/clear-db.ts [opções]

Opções:
  --force          Não pedir confirmação (perigoso!)
  --db-only        Limpar apenas banco de dados
  --files-only     Limpar apenas arquivos (uploads/outputs)
  --reset          Reset completo do banco (migrate reset)
  --help, -h       Mostrar esta ajuda

Exemplos:

  # Limpar tudo (com confirmação)
  npm run clear-db

  # Limpar tudo sem confirmação
  npm run clear-db -- --force

  # Limpar apenas banco de dados
  npm run clear-db -- --db-only

  # Limpar apenas arquivos
  npm run clear-db -- --files-only

  # Reset completo do banco
  npm run clear-db -- --reset

⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!
   Todos os dados serão perdidos permanentemente.
        `);
        process.exit(0);
    }
    
    // Aviso importante
    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚠️  ATENÇÃO: OPERAÇÃO DESTRUTIVA');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (!options.dbOnly && !options.filesOnly) {
        console.log('Esta operação irá:');
        if (!options.filesOnly) {
            console.log('  ❌ Deletar TODOS os projetos do banco');
            console.log('  ❌ Deletar TODOS os registros do banco');
            console.log('  ❌ Deletar TODAS as análises do banco');
        }
        if (!options.dbOnly) {
            console.log('  ❌ Remover TODOS os arquivos de uploads');
            console.log('  ❌ Remover TODOS os arquivos de outputs');
        }
    } else if (options.dbOnly) {
        console.log('Esta operação irá limpar apenas o banco de dados:');
        console.log('  ❌ Deletar TODOS os projetos');
        console.log('  ❌ Deletar TODOS os registros');
        console.log('  ❌ Deletar TODAS as análises');
    } else if (options.filesOnly) {
        console.log('Esta operação irá limpar apenas os arquivos:');
        console.log('  ❌ Remover TODOS os arquivos de uploads');
        console.log('  ❌ Remover TODOS os arquivos de outputs');
    }
    
    console.log('\n⚠️  Esta operação é IRREVERSÍVEL!\n');
    
    // Pedir confirmação (a menos que --force)
    if (!options.force) {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const resposta = await new Promise<string>((resolve) => {
            rl.question('Digite "SIM" para confirmar: ', (answer: string) => {
                rl.close();
                resolve(answer.trim().toUpperCase());
            });
        });
        
        if (resposta !== 'SIM') {
            console.log('\n❌ Operação cancelada pelo usuário.\n');
            process.exit(0);
        }
    }
    
    console.log('\n🚀 Iniciando limpeza...\n');
    
    try {
        // Limpar banco
        if (!options.filesOnly) {
            await limparBanco(options.reset);
        }
        
        // Limpar arquivos
        if (!options.dbOnly) {
            limparArquivos();
        }
        
        // Estatísticas finais
        console.log('═══════════════════════════════════════════════════════════');
        console.log('✅ Limpeza concluída com sucesso!');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        if (!options.filesOnly) {
            const totalProjects = await prisma.project.count();
            const totalRecords = await prisma.record.count();
            const totalAnalyses = await prisma.analysis.count();
            
            console.log('📊 Status do banco:');
            console.log(`   • Projetos: ${totalProjects}`);
            console.log(`   • Registros: ${totalRecords}`);
            console.log(`   • Análises: ${totalAnalyses}\n`);
        }
        
        console.log('💡 Próximos passos:');
        console.log('   1. Execute seed para popular com dados mock: npm run seed');
        console.log('   2. Ou crie projetos manualmente: npm run create-project\n');
        
    } catch (error: any) {
        console.error('\n❌ Erro durante limpeza:', error.message);
        console.error('\nDetalhes:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Executar
main().catch(console.error);

