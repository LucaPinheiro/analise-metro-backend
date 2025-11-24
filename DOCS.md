# Documentação Técnica - Backend Metro SP

## Visão Geral

Sistema backend para gerenciamento de pipeline de processamento de imagens e comparação BIM para monitoramento de canteiros de obras do Metrô de São Paulo.

## Arquitetura

### Stack Tecnológica

- **Node.js 20+** com **TypeScript 5.3+**
- **Express.js 4.18+** para API REST
- **PostgreSQL 16** com **Prisma ORM**
- **Multer** para upload de arquivos
- **child_process** para execução de ferramentas CLI externas

### Estrutura de Diretórios

```
src/
├── core/
│   ├── controllers/     # Controladores HTTP
│   ├── routes/          # Definição de rotas
│   └── services/        # Lógica de negócio (PipelineManager)
├── shared/
│   ├── database/        # Conexão Prisma
│   ├── functions/       # Funções utilitárias
│   ├── interfaces/      # Interfaces TypeScript
│   └── types/           # Extensões de tipos
```

### Estrutura de Armazenamento

```
uploads/
└── :constructionId/
    └── modelo.ifc

outputs/
└── :constructionId/
    ├── registros/
    │   └── registro_*.ply
    └── analises/
        └── analysis_*/
            └── comparacao_c2c.ply
```

## Endpoints da API

### Health Check

**GET** `/health`

Retorna status do servidor.

### Projetos/Constructions

#### Criar Projeto

**POST** `/api/projects` ou `/api/construction`

- **Content-Type**: `multipart/form-data`
- **Body**:
  - `modeloBim`: Arquivo BIM (.ifc, .dwg, .obj) - até 5GB
  - `name`: Nome do projeto (obrigatório)
  - `description`: Descrição (opcional)

#### Listar Projetos

**GET** `/api/projects` ou `/api/constructions`

Retorna lista de todos os projetos.

#### Obter Projeto

**GET** `/api/projects/:id`

Retorna detalhes de um projeto específico.

#### Deletar Projeto

**DELETE** `/api/projects/:id`

Deleta um projeto e todos os dados relacionados.

**Comportamento:**
- Deleta projeto do banco de dados
- Deleta automaticamente todos os registros relacionados (cascade)
- Deleta automaticamente todas as análises relacionadas (cascade)
- Remove arquivo BIM do sistema de arquivos
- Remove todas as fotos dos registros
- Remove todos os arquivos de output (reconstruções e análises)

**Resposta**: `200 OK`
```json
{
  "message": "Projeto deletado com sucesso",
  "projectId": 1,
  "deletedFiles": {
    "bim": true,
    "records": 2,
    "analyses": 3
  }
}
```

### Registros

#### Adicionar Registro

**POST** `/api/projects/:id/records`

- **Content-Type**: `multipart/form-data`
- **Body**:
  - `fotos`: Array de arquivos de imagem (mínimo 3, máximo 20)
  - `name`: Nome do registro (obrigatório)

**Validações**:
- Tipos permitidos: .jpg, .jpeg, .png
- Tamanho mínimo: 100KB por imagem
- Tamanho máximo: 100MB por imagem
- Número mínimo: 3 fotos

#### Listar Registros

**GET** `/api/projects/:id/records`

Retorna lista de registros de um projeto.

### Processamento Completo

#### Photo Processing Full

**POST** `/api/:constructionId/photo-processing-full`

Upload de fotos + processamento automático completo (3DGS + C2C).

- **Content-Type**: `multipart/form-data`
- **Body**:
  - `fotos`: Array de arquivos de imagem (mínimo 3)
  - `name`: Nome do registro (obrigatório)
  - `parametros`: JSON string com parâmetros (opcional)

**Resposta**: `202 Accepted` com `analysisId` e `recordId`

**Fluxo**:
1. Salva fotos
2. Cria registro
3. Executa reconstrução 3D (3DGS)
4. Executa comparação C2C automaticamente
5. Retorna análise completa

#### Analysis Full

**POST** `/api/:constructionId/analysis-full`

Análise usando modelos já armazenados (apenas C2C, pula 3DGS).

- **Content-Type**: `application/json`
- **Body**:
  - `recordId`: ID do registro específico (opcional, usa o mais recente)
  - `parametros`: JSON com parâmetros (opcional)

**Resposta**: `202 Accepted` com `analysisId`

**Fluxo**:
1. Busca BIM mais recente do projeto
2. Busca reconstrução 3DGS mais recente (ou do recordId especificado)
3. Executa apenas comparação C2C
4. Retorna nova análise

### Análises

#### Iniciar Análise (Tradicional)

**POST** `/api/analyses`

- **Content-Type**: `application/json`
- **Body**:
  - `projectId`: ID do projeto (obrigatório)
  - `recordId`: ID do registro (obrigatório)
  - `parametros`: JSON com parâmetros (opcional)

#### Consultar Status

**GET** `/api/analyses/:id`

Retorna status completo da análise:
- `status`: pending | processing | completed | failed | cancelled
- `progress`: 0-100
- `logs`: Array de logs
- `outputPaths`: Caminhos dos arquivos gerados
- `meanDistance`: Distância média (se disponível)
- `stdDeviation`: Desvio padrão (se disponível)

#### Relatório de Execução

**GET** `/api/analyses/:id/report`

Retorna relatório detalhado da execução da pipeline. Veja exemplo completo em [TESTE_PRODUCAO.md](./TESTE_PRODUCAO.md).

#### Relatório de Execução

**GET** `/api/analyses/:id/report`

Retorna relatório detalhado da execução da pipeline incluindo:
- Informações da análise (status, progresso, duração)
- Informações do projeto e registro relacionados
- Etapas executadas e completadas
- Métricas calculadas (mean_distance, std_deviation)
- Arquivos gerados
- Logs completos

**Resposta**: `200 OK`
```json
{
  "analysis": {
    "id": 1,
    "status": "completed",
    "progress": 100,
    "durationSeconds": 125,
    "durationFormatted": "2m 5s"
  },
  "project": {
    "id": 1,
    "name": "Projeto Teste"
  },
  "record": {
    "id": 1,
    "name": "Registro Teste",
    "photosCount": 5
  },
  "etapas": {
    "inicializacao": true,
    "reconstrucao3d": true,
    "comparacaoC2C": true,
    "finalizacao": true,
    "totalEtapas": 4,
    "etapasCompletas": 4
  },
  "metrics": {
    "meanDistance": 2.45,
    "stdDeviation": 2.12,
    "hasMetrics": true
  },
  "outputs": {
    "resultPath": "1/analises/analysis_1/comparacao_c2c.ply",
    "summaryJsonPath": "1/analises/analysis_1/summary_c2c.json",
    "filesGenerated": [
      "Comparação C2C (PLY)",
      "Métricas (JSON)",
      "Reconstrução 3D (PLY)"
    ]
  }
}
```

#### Listar Análises

**GET** `/api/analyses` - Lista todas as análises

**GET** `/api/:constructionId/analyses` - Lista análises de um projeto

#### Cancelar Análise

**DELETE** `/api/analyses/:id`

Cancela uma análise em execução.

### Visualização de Arquivos

**GET** `/api/:constructionId/:fileType/:fileId`

Retorna arquivo para visualização (Three.js).

- `fileType`: `bim` | `registro` | `analise`
- `fileId`: ID do registro ou análise (não necessário para BIM, use `0`)

**Exemplos**:
- `/api/1/bim/0` - Retorna arquivo BIM do projeto 1
- `/api/1/registro/5` - Retorna reconstrução 3DGS do registro 5
- `/api/1/analise/10` - Retorna resultado da análise 10

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Servidor
PORT=3000

# Banco de Dados
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/metro_pipeline

# Diretórios
UPLOADS_DIR=./src/shared/data/uploads
OUTPUTS_DIR=./src/shared/data/outputs
LOGS_DIR=./logs

# Processamento
MAX_CONCURRENT_JOBS=3
JOB_TIMEOUT_MS=3600000

# Ferramentas CLI
IMAGE_PROCESSING_CLI=./tools/image-processor
BIM_COMPARISON_CLI=CloudCompare
```

### Ferramentas CLI

#### IMAGE_PROCESSING_CLI

Ferramenta para processamento de imagens (3DGS/COLMAP/Brush).

**Formato esperado**:
```bash
./image-processor \
  --input foto1.jpg,foto2.jpg,foto3.jpg \
  --output ./outputs/1/registros/reconstrucao.ply \
  --format ply \
  --threshold 0.8
```

#### BIM_COMPARISON_CLI

CloudCompare para comparação Cloud-to-Cloud (C2C).

**Formato esperado**:
```bash
CloudCompare -SILENT -AUTO_SAVE OFF \
  -O ./uploads/1/modelo.ifc \
  -SAMPLE_MESH POINTS 1000000 \
  -C_EXPORT_FMT PLY \
  -O ./outputs/1/registros/reconstrucao.ply \
  -ICP \
  -C2C_DIST \
  -SF_CONVERT_TO_RGB FALSE \
  -C_EXPORT_FMT PLY \
  -SELECT_ENTITIES -FIRST 1 \
  -SAVE_CLOUDS FILE ./outputs/1/analises/comparacao.ply
```

## Banco de Dados

### Modelos Prisma

#### Project
- `id`: Int (PK)
- `name`: String
- `description`: String?
- `bimPath`: String (único)
- `createdAt`: DateTime

#### Record
- `id`: Int (PK)
- `name`: String
- `uploadedFilesPaths`: JSON?
- `recordPath`: String? (caminho da reconstrução 3DGS)
- `projectId`: Int (FK)
- `createdAt`: DateTime

#### Analysis
- `id`: Int (PK)
- `status`: String (pending | processing | completed | failed | cancelled)
- `progress`: Int (0-100)
- `logs`: String[]
- `error`: String?
- `outputPaths`: JSON?
- `resultPath`: String?
- `summaryJsonPath`: String?
- `meanDistance`: Float?
- `stdDeviation`: Float?
- `projectId`: Int (FK)
- `recordId`: Int (FK)
- `createdAt`: DateTime
- `startedAt`: DateTime?
- `updatedAt`: DateTime
- `completedAt`: DateTime?

## Processamento

### Pipeline Completo

1. **Upload de Fotos** → Salva em `uploads/:constructionId/registros/:recordId/`
2. **Reconstrução 3DGS** → Gera `.ply` em `outputs/:constructionId/registros/`
3. **Comparação C2C** → Gera `.ply` em `outputs/:constructionId/analises/:analysisId/`

### Otimizações

- Se `record.recordPath` já existe, pula etapa 3DGS
- Busca automaticamente modelos mais recentes quando não especificado
- Controle de concorrência (MAX_CONCURRENT_JOBS)

## Validações

### Arquivos BIM
- Tipos permitidos: `.ifc`, `.dwg`, `.obj`, `.ply`
- Tamanho máximo: 5GB

### Arquivos de Imagem
- Tipos permitidos: `.jpg`, `.jpeg`, `.png`
- Tamanho mínimo: 100KB
- Tamanho máximo: 100MB por imagem
- Número mínimo: 3 fotos para reconstrução

## Tratamento de Erros

### Códigos HTTP

- `200 OK`: Sucesso
- `201 Created`: Recurso criado
- `202 Accepted`: Processamento iniciado (assíncrono)
- `400 Bad Request`: Erro de validação
- `404 Not Found`: Recurso não encontrado
- `409 Conflict`: Conflito (ex: caminho BIM duplicado)
- `500 Internal Server Error`: Erro interno

### Formato de Erro

```json
{
  "error": "Mensagem de erro descritiva"
}
```

## Exemplos de Uso

### Exemplo 1: Fluxo Completo Simplificado

```bash
# 1. Criar projeto
curl -X POST http://localhost:3000/api/construction \
  -F "name=Estação Morumbi" \
  -F "modeloBim=@./modelo.ifc"

# Resposta: {"id": 1, ...}

# 2. Processar fotos (completo)
curl -X POST http://localhost:3000/api/1/photo-processing-full \
  -F "name=Semana 5" \
  -F "fotos=@./foto1.jpg" \
  -F "fotos=@./foto2.jpg" \
  -F "fotos=@./foto3.jpg"

# Resposta: {"analysisId": 1, "recordId": 1, "status": "pending", ...}

# 3. Consultar status
curl http://localhost:3000/api/analyses/1

# 4. Visualizar resultado
curl http://localhost:3000/api/1/analise/1 -o comparacao.ply
```

### Exemplo 2: Reanálise com Modelos Existentes

```bash
# Executar nova análise usando reconstrução existente
curl -X POST http://localhost:3000/api/1/analysis-full \
  -H "Content-Type: application/json" \
  -d '{"parametros": {"threshold": 0.9}}'

# Resposta: {"analysisId": 2, "status": "pending", ...}
```

## Recomendações Técnicas

### Captura de Imagens

- Mínimo de 3 fotos, recomendado 10-20 fotos
- Sobreposição de 60-80% entre fotos consecutivas
- Resolução mínima: 1920x1080
- Evitar movimento excessivo durante captura

### Processamento

- Densidade de pontos recomendada: 1.000.000 pontos
- Threshold padrão: 0.8 (ajustável via parâmetros)
- Tempo estimado por análise: 5-30 minutos (depende do hardware)

### Hardware Recomendado

- CPU: 8+ cores
- RAM: 16GB+ (32GB recomendado)
- GPU: NVIDIA com CUDA (opcional, acelera 3DGS)
- Armazenamento: SSD recomendado

## Troubleshooting

### Erro: "Nenhuma reconstrução 3D encontrada"

Execute `photo-processing-full` primeiro para gerar a reconstrução.

### Erro: "Job não encontrado ou já finalizado"

Verifique o status da análise. Apenas jobs `pending` ou `processing` podem ser cancelados.

### Erro: "Falha na execução (código X)"

Verifique os logs da análise para detalhes. Pode ser problema com:
- Caminho das ferramentas CLI
- Permissões de arquivo
- Espaço em disco insuficiente

### Processo travado

Use `DELETE /api/analyses/:id` para cancelar e reiniciar.

## Scripts Mock para Desenvolvimento

O sistema inclui scripts mock para desenvolvimento e demonstração MVP:

### `tools/fake_3dgs.sh`
Simula processamento 3DGS, gerando arquivo PLY com ~1.000 pontos. Usado automaticamente se `IMAGE_PROCESSING_CLI` não estiver configurado.

### `tools/bim-comparison.sh`
Simula CloudCompare, gerando comparação C2C com métricas simuladas. Usado automaticamente se `BIM_COMPARISON_CLI` não estiver configurado.

## Suporte

Para mais informações, consulte:
- **[README.md](./README.md)** - Guia de início rápido
- **[GUIA_COMPLETO.md](./GUIA_COMPLETO.md)** - Guia completo de instalação e uso
- **[TESTE_PRODUCAO.md](./TESTE_PRODUCAO.md)** - Guia completo para testes em produção
- **[scripts/README.md](./scripts/README.md)** - Documentação dos scripts de teste

