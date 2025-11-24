# 🚇 Metrô SP - Backend Pipeline de Processamento

Backend para gerenciamento de pipeline de processamento de imagens e comparação BIM para monitoramento de canteiros de obras do Metrô de São Paulo.

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 20.x ou superior
- npm ou yarn
- Docker Desktop (para banco de dados PostgreSQL)

### Instalação

```bash
# Instalar dependências
npm install

# Configurar banco de dados
cd docker
docker-compose up -d
cd ..

# Configurar Prisma
npx prisma generate
npx prisma db push

# Copiar arquivo de exemplo de variáveis de ambiente
cp .env.example .env  # Se existir
```

### Executar em Desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

### Build para Produção

```bash
npm run build
npm start
```

## 📡 Endpoints da API

### Health Check

```bash
GET /health
```

### Projetos

#### Criar Projeto
```bash
POST /api/projects
Content-Type: multipart/form-data
  - modeloBim: Arquivo (.ifc, .dwg, .obj, .ply) até 5GB
  - name: Nome do projeto (obrigatório)
  - description: Descrição (opcional)

curl -X POST http://localhost:3000/api/projects \
  -F "name=Projeto Estação Morumbi" \
  -F "description=Bloco A da estação" \
  -F "modeloBim=@./modelo.ifc"
```

#### Listar Projetos
```bash
GET /api/projects
```

#### Obter Projeto
```bash
GET /api/projects/:id
```

#### Deletar Projeto
```bash
DELETE /api/projects/:id

curl -X DELETE http://localhost:3000/api/projects/1
```

**Nota:** Deleta o projeto e todos os registros/análises relacionados, além de remover arquivos físicos.

### Registros

#### Criar Registro
```bash
POST /api/projects/:id/records
Content-Type: multipart/form-data
  - fotos: Array de arquivos de imagem (mínimo 3, máximo 20)
  - name: Nome do registro (obrigatório)

curl -X POST http://localhost:3000/api/projects/1/records \
  -F "name=Semana 5 - Fachada Leste" \
  -F "fotos=@./foto1.jpg" \
  -F "fotos=@./foto2.jpg" \
  -F "fotos=@./foto3.jpg"
```

#### Listar Registros
```bash
GET /api/projects/:id/records
```

#### Importar PLY Existente
```bash
POST /api/:constructionId/records/import-ply
Content-Type: multipart/form-data
  - plyFile: Arquivo PLY (.ply) até 10GB
  - name: Nome do registro (obrigatório)

curl -X POST http://localhost:3000/api/2/records/import-ply \
  -F "name=Registro 3DGS Importado" \
  -F "plyFile=@./3dgs.ply"
```

### Processamento Completo

#### Photo Processing Full (Upload + 3DGS + C2C)
```bash
POST /api/:constructionId/photo-processing-full
Content-Type: multipart/form-data
  - fotos: Array de arquivos de imagem (mínimo 3)
  - name: Nome do registro (obrigatório)
  - parametros: JSON string com parâmetros (opcional)

curl -X POST http://localhost:3000/api/1/photo-processing-full \
  -F "name=Registro Completo" \
  -F "fotos=@./foto1.jpg" \
  -F "fotos=@./foto2.jpg" \
  -F "fotos=@./foto3.jpg"
```

**Resposta:** `202 Accepted` com `analysisId` e `recordId`

#### Analysis Full (Apenas C2C)
```bash
POST /api/:constructionId/analysis-full
Content-Type: application/json
  - recordId: ID do registro específico (opcional, usa o mais recente)
  - parametros: JSON com parâmetros (opcional)

curl -X POST http://localhost:3000/api/1/analysis-full \
  -H "Content-Type: application/json" \
  -d '{"recordId": 1}'
```

### Análises

#### Iniciar Análise (Tradicional)
```bash
POST /api/analyses
Content-Type: application/json
  - projectId: ID do projeto (obrigatório)
  - recordId: ID do registro (obrigatório)
  - parametros: JSON com parâmetros (opcional)

curl -X POST http://localhost:3000/api/analyses \
  -H "Content-Type: application/json" \
  -d '{"projectId": 1, "recordId": 1}'
```

#### Consultar Status
```bash
GET /api/analyses/:id

curl http://localhost:3000/api/analyses/1
```

#### Relatório de Execução
```bash
GET /api/analyses/:id/report

curl http://localhost:3000/api/analyses/1/report | jq
```

#### Listar Análises
```bash
GET /api/analyses
```

#### Cancelar Análise
```bash
DELETE /api/analyses/:id

curl -X DELETE http://localhost:3000/api/analyses/1
```

### Visualização de Arquivos

```bash
GET /api/:constructionId/:fileType/:fileId
  - fileType: "bim", "registro" ou "analise"
  - fileId: ID do registro ou análise (não necessário para BIM)

# Visualizar BIM
curl http://localhost:3000/api/1/bim/0

# Visualizar reconstrução 3D
curl http://localhost:3000/api/1/registro/1

# Visualizar resultado da análise
curl http://localhost:3000/api/1/analise/1
```

### Construções (Alias)

```bash
# Criar construção (alias para criar projeto)
POST /api/construction

# Listar construções (alias para listar projetos)
GET /api/constructions

# Listar análises de um projeto
GET /api/:constructionId/analyses
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Servidor
PORT=3000
NODE_ENV=development

# Banco de Dados
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/metro_pipeline

# Diretórios
UPLOADS_DIR=./src/shared/data/uploads
OUTPUTS_DIR=./src/shared/data/outputs

# Processamento
MAX_CONCURRENT_JOBS=3

# Ferramentas CLI (opcional - usa mocks se não especificado)
IMAGE_PROCESSING_CLI=./tools/fake_3dgs.sh
BIM_COMPARISON_CLI=./tools/bim-comparison.sh

# Para produção, configure caminhos reais:
# IMAGE_PROCESSING_CLI=/caminho/para/colmap
# BIM_COMPARISON_CLI=/caminho/para/CloudCompare
```

## 🧪 Testes

### Teste Rápido

```bash
./test-quick.sh
```

### Teste Completo (com PLY)

```bash
./test-complete.sh
```

### Teste Pipeline MVP (Mock Completo)

```bash
./scripts/test-pipeline-mvp.sh
```

## 📚 Documentação Completa

- **[GUIA_COMPLETO.md](./GUIA_COMPLETO.md)** - Guia completo de instalação e uso
- **[DOCS.md](./DOCS.md)** - Documentação técnica da API
- **[API_FRONTEND.md](./API_FRONTEND.md)** - **Guia completo para integração frontend** ⭐
- **[TESTE_PRODUCAO.md](./TESTE_PRODUCAO.md)** - Guia para testes em produção
- **[scripts/README.md](./scripts/README.md)** - Documentação dos scripts de teste

## 🏗️ Arquitetura

### Fluxo de Processamento

1. **Upload BIM** → Criar projeto
2. **Upload Fotos** → Criar registro
3. **Processamento 3DGS** → Reconstrução 3D (gera arquivo PLY)
4. **Comparação C2C** → CloudCompare (compara BIM vs Reconstrução)
5. **Resultado** → Arquivo PLY com distâncias coloridas + métricas JSON

### Estrutura de Diretórios

```
src/shared/data/
├── uploads/
│   ├── projects/:id/          # Arquivos BIM
│   └── :constructionId/registros/:recordId/  # Fotos
└── outputs/
    ├── :constructionId/registros/:recordId/  # Reconstruções 3D
    └── :constructionId/analises/:analysisId/  # Resultados C2C
```

## 🔌 Integração com Ferramentas CLI

O sistema suporta duas formas de processamento:

### Modo Mock (Desenvolvimento)

Scripts mock estão disponíveis em `tools/`:
- `tools/fake_3dgs.sh` - Simula processamento 3DGS
- `tools/bim-comparison.sh` - Simula CloudCompare

São usados automaticamente se as ferramentas reais não estiverem configuradas.

### Modo Produção

Configure as ferramentas reais no `.env`:
- **3DGS**: COLMAP, Brush ou similar
- **CloudCompare**: CloudCompare CLI

## 🚨 Troubleshooting

### Banco de dados não conecta

```bash
cd docker
docker-compose ps
docker-compose up -d
```

### Porta 5432 já em uso

```bash
# Verificar processo
lsof -i :5432

# Ou alterar porta no docker-compose.yml
```

### Erro de Prisma drift

```bash
npx prisma migrate resolve --applied <migration_name>
# ou
npx prisma db push --accept-data-loss
```

## 📝 Licença

Este projeto é parte do sistema de monitoramento do Metrô de São Paulo.

## 👥 Contribuindo

Para contribuir com o projeto, consulte a documentação técnica em `DOCS.md`.
