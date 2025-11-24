# 📝 Criar Projeto Manualmente

Script para criar projetos manualmente no banco de dados, garantindo que a estrutura de arquivos seja criada corretamente.

## 🚀 Uso Rápido

```bash
# Criar projeto simples
npm run create-project -- --name "Meu Projeto"

# Ou diretamente
npx tsx scripts/create-project-manual.ts --name "Meu Projeto"
```

## 📋 Opções Disponíveis

### Argumentos Obrigatórios

- `--name "Nome do Projeto"` - Nome do projeto (obrigatório)

### Argumentos Opcionais

- `--description "Descrição"` - Descrição do projeto
- `--bim-path "caminho/arquivo.ifc"` - Caminho relativo ao `UPLOADS_DIR` onde salvar o BIM
- `--copy-bim "caminho/arquivo.ifc"` - Copiar arquivo BIM real do sistema de arquivos
- `--with-records` - Criar registros mock também
- `--with-analysis` - Criar registros e análise mock também

## 💡 Exemplos de Uso

### Exemplo 1: Projeto Simples

```bash
npx tsx scripts/create-project-manual.ts \
  --name "Estação Morumbi - Teste"
```

**Resultado:**
- ✅ Projeto criado no banco
- ✅ Estrutura de diretórios criada
- ✅ Arquivo BIM placeholder criado

### Exemplo 2: Projeto com Descrição

```bash
npx tsx scripts/create-project-manual.ts \
  --name "Estação Butantã" \
  --description "Projeto de teste para desenvolvimento"
```

### Exemplo 3: Copiar Arquivo BIM Real

```bash
npx tsx scripts/create-project-manual.ts \
  --name "Projeto com BIM Real" \
  --copy-bim "./modelos/estacao_morumbi.ifc"
```

**O que acontece:**
- Copia o arquivo real para a estrutura de uploads
- Mantém a estrutura correta de diretórios
- Projeto fica pronto para uso

### Exemplo 4: Caminho BIM Customizado

```bash
npx tsx scripts/create-project-manual.ts \
  --name "Projeto Customizado" \
  --bim-path "projects/custom/meu_modelo.obj"
```

**Útil quando:**
- Você já tem arquivos organizados de uma forma específica
- Quer manter uma estrutura de pastas personalizada

### Exemplo 5: Projeto Completo (com Registros e Análise)

```bash
npx tsx scripts/create-project-manual.ts \
  --name "Projeto Completo" \
  --with-analysis
```

**Cria:**
- ✅ Projeto
- ✅ Registro mock com fotos
- ✅ Análise mock completa (status: completed)

## 📁 Estrutura Criada

Quando você cria um projeto, o script automaticamente cria:

```
src/shared/data/
├── uploads/
│   └── projects/
│       └── {projectId}/
│           └── (arquivo BIM aqui)
└── outputs/
    └── {projectId}/
        ├── registros/
        └── analises/
```

## 🔧 Uso Programático

Você também pode importar e usar o script em outros arquivos:

```typescript
import { criarProjetoManual } from './scripts/create-project-manual';

const projeto = await criarProjetoManual({
    name: 'Meu Projeto',
    description: 'Descrição do projeto',
    copyBimFrom: './modelos/estacao.ifc',
    createRecords: true,
    createAnalysis: true
});
```

## ⚙️ Variáveis de Ambiente

O script respeita as variáveis de ambiente:

- `UPLOADS_DIR` - Diretório de uploads (padrão: `./src/shared/data/uploads`)
- `OUTPUTS_DIR` - Diretório de outputs (padrão: `./src/shared/data/outputs`)

## ✅ Verificação

Após criar o projeto, verifique:

```bash
# Ver projeto criado
curl http://localhost:3000/api/projects/{ID} | jq

# Listar todos os projetos
curl http://localhost:3000/api/projects | jq

# Verificar estrutura de arquivos
ls -la src/shared/data/uploads/projects/{ID}/
ls -la src/shared/data/outputs/{ID}/
```

## 🐛 Troubleshooting

### Erro: "Um projeto com este caminho BIM já existe"

O `bimPath` deve ser único. Opções:
1. Use `--bim-path` para especificar um caminho diferente
2. O script detecta e usa o projeto existente

### Erro: "Arquivo não encontrado" ao usar --copy-bim

Verifique:
- Caminho está correto (relativo ao diretório atual)
- Arquivo existe
- Você tem permissão de leitura

### Arquivos não aparecem no sistema de arquivos

Verifique:
- Variável `UPLOADS_DIR` está configurada corretamente
- Permissões de escrita no diretório
- Caminho relativo está correto

## 📚 Relacionado

- **[README_SEED.md](../README_SEED.md)** - Seed automático com múltiplos projetos
- **[GUIA_COMPLETO.md](../GUIA_COMPLETO.md)** - Guia completo de uso

---


