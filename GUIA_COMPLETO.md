# 🚇 Guia Completo - Backend Metro SP

Guia completo para instalar, configurar, iniciar e testar o backend do sistema de análise BIM do Metrô de São Paulo.

---

## 📋 Índice

1. [Sobre o Projeto](#sobre-o-projeto)
2. [Pré-requisitos](#pré-requisitos)
3. [Instalação Passo a Passo](#instalação-passo-a-passo)
4. [Configuração](#configuração)
5. [Iniciando o Sistema](#iniciando-o-sistema)
6. [Testando a API](#testando-a-api)
7. [Endpoints Disponíveis](#endpoints-disponíveis)
8. [Troubleshooting](#troubleshooting)

---

## 📖 Sobre o Projeto

Este é um backend para gerenciamento de pipeline de processamento de imagens e comparação BIM para monitoramento de canteiros de obras do Metrô de São Paulo.

### Funcionalidades Principais

- ✅ Upload de modelos BIM (.ifc, .dwg, .obj, .ply)
- ✅ Upload de fotos de canteiro de obras
- ✅ **Importação de arquivos PLY já processados**
- ✅ **Deletar projetos** (com limpeza completa de arquivos)
- ✅ Processamento automático de reconstrução 3D (3DGS)
- ✅ Comparação Cloud-to-Cloud (C2C) entre BIM e reconstrução
- ✅ Monitoramento de progresso em tempo real
- ✅ **Relatório detalhado de execução**
- ✅ Visualização de arquivos gerados
- ✅ **Scripts mock para desenvolvimento e MVP**

### Tecnologias

- **Node.js 20+** com **TypeScript**
- **Express.js** - Framework web
- **PostgreSQL 16** - Banco de dados
- **Prisma** - ORM
- **Docker** - Containerização do banco
- **Multer** - Upload de arquivos

---

## 🔧 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

### Obrigatórios

1. **Node.js 20.x ou superior**
   ```bash
   node --version  # Deve mostrar v20.x ou superior
   ```

2. **npm** (vem com Node.js)
   ```bash
   npm --version
   ```

3. **Docker Desktop** (para banco de dados)
   - macOS: [Download](https://www.docker.com/products/docker-desktop)
   - Windows: [Download](https://www.docker.com/products/docker-desktop)
   - Linux: `sudo apt-get install docker.io docker-compose`

4. **Git** (opcional, para clonar repositório)

### Opcionais (para processamento real)

- **CloudCompare** - Para comparação C2C
- **COLMAP/Brush** - Para processamento 3DGS
- **jq** - Para formatar JSON no terminal (recomendado)

---

## 🚀 Instalação Passo a Passo

### Passo 1: Clonar/Baixar o Projeto

Se você já tem o projeto, pule para o Passo 2.

```bash
# Se for clonar de um repositório
git clone <url-do-repositorio>
cd analise-metro-backend

# Ou navegue até a pasta do projeto
cd /caminho/para/analise-metro-backend
```

### Passo 2: Instalar Dependências

```bash
# Instalar todas as dependências do Node.js
npm install
```

**Tempo estimado:** 1-2 minutos

**O que será instalado:**
- Express, Prisma, Multer, CORS, etc.
- TypeScript e ferramentas de desenvolvimento

### Passo 3: Configurar Banco de Dados com Docker

```bash
# 1. Navegar para pasta docker
cd docker

# 2. Verificar se porta 5432 está livre
lsof -i :5432

# Se estiver em uso, pare o PostgreSQL local:
# macOS: brew services stop postgresql
# Linux: sudo systemctl stop postgresql

# 3. Iniciar banco de dados PostgreSQL
docker-compose up -d

# 4. Aguardar inicialização (10-15 segundos)
sleep 10

# 5. Verificar se está rodando
docker-compose ps

# Você deve ver algo como:
# NAME       IMAGE              STATUS
# metro-db   postgres:16-alpine Up X seconds
```

**Se der erro de porta em uso:**
- Opção 1: Parar PostgreSQL local
- Opção 2: Mudar porta no `docker-compose.yml` (linha 10: `"5433:5432"`)

### Passo 4: Configurar Variáveis de Ambiente

```bash
# 1. Voltar para raiz do projeto
cd ..

# 2. Criar arquivo .env
cat > .env << 'EOF'
# Servidor
PORT=3000

# Banco de Dados PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/metro_pipeline

# Diretórios de Armazenamento
UPLOADS_DIR=./src/shared/data/uploads
OUTPUTS_DIR=./src/shared/data/outputs
LOGS_DIR=./logs

# Configurações de Processamento
MAX_CONCURRENT_JOBS=3
JOB_TIMEOUT_MS=3600000

# Ferramentas CLI (configure quando tiver as ferramentas instaladas)
IMAGE_PROCESSING_CLI=./tools/image-processor
BIM_COMPARISON_CLI=CloudCompare
EOF

# 3. Verificar se foi criado
cat .env
```

**Nota:** Se mudou a porta do Docker, atualize `DATABASE_URL`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/metro_pipeline
```

### Passo 5: Configurar Prisma

```bash
# 1. Gerar cliente Prisma
npx prisma generate

# 2. Sincronizar schema com banco (escolha uma opção):

# Opção A: Usar migrations (recomendado para primeira vez)
npx prisma migrate dev --name init

# Opção B: Usar db push (mais rápido, desenvolvimento)
npx prisma db push --accept-data-loss

# 3. Verificar se funcionou
npx prisma migrate status
# Ou
npx prisma db pull
```

**Se der erro "Drift detected":**
```bash
# Resetar banco (CUIDADO: apaga dados!)
cd docker
docker-compose down -v
rm -rf pgdata
docker-compose up -d
cd ..
npx prisma migrate dev --name init
```

### Passo 6: Criar Diretórios Necessários

```bash
# Criar diretórios para uploads e outputs
mkdir -p src/shared/data/uploads
mkdir -p src/shared/data/outputs
mkdir -p logs

# Verificar permissões
chmod -R 755 src/shared/data/
```

### Passo 7: Verificar Instalação

```bash
# Verificar se tudo está OK
npm run type-check

# Se não houver erros, está pronto!
```

---

## ⚙️ Configuração

### Arquivo .env

O arquivo `.env` contém todas as configurações. Principais variáveis:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3000` | Porta do servidor HTTP |
| `DATABASE_URL` | - | URL de conexão PostgreSQL |
| `UPLOADS_DIR` | `./src/shared/data/uploads` | Onde salvar arquivos enviados |
| `OUTPUTS_DIR` | `./src/shared/data/outputs` | Onde salvar resultados |
| `MAX_CONCURRENT_JOBS` | `3` | Máximo de processamentos simultâneos |
| `IMAGE_PROCESSING_CLI` | `./tools/image-processor` | Caminho para CLI 3DGS |
| `BIM_COMPARISON_CLI` | `CloudCompare` | Caminho para CloudCompare |

### Configurar Ferramentas CLI (Opcional)

Para processamento real, configure os caminhos:

**Windows:**
```bash
IMAGE_PROCESSING_CLI=C:\tools\image-processor.exe
BIM_COMPARISON_CLI="C:\Program Files\CloudCompare\CloudCompare.exe"
```

**Linux/Mac:**
```bash
IMAGE_PROCESSING_CLI=/usr/local/bin/image-processor
BIM_COMPARISON_CLI=/usr/bin/CloudCompare
```

---

## 🎬 Iniciando o Sistema

### 1. Verificar Banco de Dados

```bash
# Verificar se Docker está rodando
docker ps

# Verificar se container do banco está ativo
cd docker
docker-compose ps

# Se não estiver, iniciar
docker-compose up -d
cd ..
```

### 2. Iniciar Servidor

```bash
# Modo desenvolvimento (com hot-reload)
npm run dev
```

**Você deve ver:**
```
🚀 Servidor rodando na porta 3000
📡 Health check: http://localhost:3000/health
🔧 API: http://localhost:3000/api
```

### 3. Verificar se Está Funcionando

Em outro terminal:

```bash
# Testar health check
curl http://localhost:3000/health

# Deve retornar:
# {"status":"ok","timestamp":"2024-..."}
```

**Se funcionar, o sistema está pronto! ✅**

---

## 🧪 Testando a API

### Arquivos de Teste Disponíveis

Você tem arquivos de teste na raiz do projeto:
- `tinker.obj` - Modelo BIM do cubo mágico (241 KB)
- `3dgs.ply` - Reconstrução 3DGS completa (6,6 MB)
- `cuboParc.ply` - Reconstrução parcial (3,7 MB)

### Teste Rápido Automatizado

Execute o script de teste:

```bash
# Tornar executável (se necessário)
chmod +x test-quick.sh

# Executar
./test-quick.sh
```

Este script testa:
- ✅ Health check
- ✅ Criar projeto
- ✅ Listar projetos
- ✅ Obter projeto específico
- ✅ Visualizar arquivo BIM

### Testes Manuais Passo a Passo

#### Teste 1: Health Check

```bash
curl http://localhost:3000/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Teste 2: Criar Projeto

```bash
curl -X POST http://localhost:3000/api/projects \
  -F "name=Cubo Mágico Teste" \
  -F "description=Teste com cubo mágico" \
  -F "modeloBim=@./tinker.obj"
```

**Resposta esperada:**
```json
{
  "id": 1,
  "name": "Cubo Mágico Teste",
  "description": "Teste com cubo mágico",
  "bimPath": "projects/1/modelo.obj",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Anote o `id` retornado!** (exemplo: 1)

#### Teste 3: Listar Projetos

```bash
curl http://localhost:3000/api/projects
```

**Com formatação JSON:**
```bash
curl http://localhost:3000/api/projects | jq
```

#### Teste 4: Obter Projeto Específico

```bash
# Substitua 1 pelo ID do seu projeto
curl http://localhost:3000/api/projects/1
```

#### Teste 5: Visualizar Arquivo BIM

```bash
# Substitua 1 pelo ID do projeto
curl http://localhost:3000/api/1/bim/0 -o modelo_baixado.obj

# Verificar se baixou
ls -lh modelo_baixado.obj
```

#### Teste 6: Criar Construção (Alias)

```bash
curl -X POST http://localhost:3000/api/construction \
  -F "name=Cubo Mágico 2" \
  -F "modeloBim=@./tinker.obj"
```

#### Teste 7: Listar Construções

```bash
curl http://localhost:3000/api/constructions
```

### Testes de Validação

#### Teste: Criar projeto sem arquivo

```bash
curl -X POST http://localhost:3000/api/projects \
  -F "name=Teste Sem Arquivo"
```

**Esperado:** `400 Bad Request` com mensagem de erro

#### Teste: Criar projeto sem nome

```bash
curl -X POST http://localhost:3000/api/projects \
  -F "modeloBim=@./tinker.obj"
```

**Esperado:** `400 Bad Request`

#### Teste: Arquivo inválido

```bash
echo "teste" > test.txt
curl -X POST http://localhost:3000/api/projects \
  -F "name=Teste" \
  -F "modeloBim=@./test.txt"
```

**Esperado:** `400 Bad Request` - "Tipo de arquivo BIM não suportado"

### Testes com Arquivos PLY Existentes

Se você já tem arquivos PLY processados (ex: `3dgs.ply`, `cuboParc.ply`), pode importá-los diretamente:

#### Importar PLY como Registro

```bash
# Coloque seus arquivos PLY em test-files/ ou na raiz
curl -X POST http://localhost:3000/api/2/records/import-ply \
  -F "name=Registro 3DGS" \
  -F "plyFile=@./test-files/3dgs.ply"
```

**Resposta esperada:**
```json
{
  "id": 1,
  "name": "Registro 3DGS",
  "projectId": 2,
  "recordPath": "2/registros/1/reconstrucao_1.ply",
  "message": "Arquivo PLY importado com sucesso. Use analysis-full para comparar com BIM."
}
```

#### Executar Análise com PLY Importado

```bash
# Usar registro específico
curl -X POST http://localhost:3000/api/2/analysis-full \
  -H "Content-Type: application/json" \
  -d '{"recordId": 1}'

# Ou deixar o sistema buscar o mais recente automaticamente
curl -X POST http://localhost:3000/api/2/analysis-full \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Script de Teste Completo

Use o script `test-complete.sh` para testar todo o fluxo:

```bash
# Certifique-se de que os arquivos PLY estão disponíveis
# Em test-files/ ou na raiz do projeto
./test-complete.sh
```

Este script testa:
1. Health check
2. Criação de projeto
3. Importação de PLY (3dgs.ply)
4. Importação de segundo PLY (cuboParc.ply)
5. Listagem de registros
6. Início de análise C2C
7. Verificação de status
8. Listagem de análises

### Testes com Fotos (Requer Fotos Reais)

Para testar upload de fotos e processamento, você precisa de fotos reais (JPG/PNG).

#### Criar Registro com Fotos

```bash
curl -X POST http://localhost:3000/api/projects/1/records \
  -F "name=Registro Semana 1" \
  -F "fotos=@./foto1.jpg" \
  -F "fotos=@./foto2.jpg" \
  -F "fotos=@./foto3.jpg"
```

**Requisitos:**
- Mínimo 3 fotos
- Tipos: .jpg, .jpeg, .png
- Tamanho: 100KB - 100MB por foto

#### Processamento Completo

```bash
curl -X POST http://localhost:3000/api/1/photo-processing-full \
  -F "name=Registro Completo" \
  -F "fotos=@./foto1.jpg" \
  -F "fotos=@./foto2.jpg" \
  -F "fotos=@./foto3.jpg"
```

**Resposta:**
```json
{
  "analysisId": 1,
  "recordId": 1,
  "status": "pending",
  "message": "Processamento completo iniciado",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Monitorar Progresso

```bash
# Substitua 1 pelo analysisId retornado
curl http://localhost:3000/api/analyses/1

# Ou com formatação
curl http://localhost:3000/api/analyses/1 | jq
```

**Status possíveis:**
- `pending` - Aguardando processamento
- `processing` - Em processamento
- `completed` - Concluído
- `failed` - Falhou
- `cancelled` - Cancelado

#### Relatório de Execução

```bash
curl http://localhost:3000/api/analyses/1/report | jq
```

Retorna relatório completo com:
- Informações da análise (duração, progresso)
- Etapas executadas
- Métricas calculadas
- Arquivos gerados
- Logs completos

---

## 📡 Endpoints Disponíveis

### Health Check

```
GET /health
```

Retorna status do servidor.

### Projetos

#### Criar Projeto
```
POST /api/projects
Content-Type: multipart/form-data
Body:
  - name: string (obrigatório)
  - description: string (opcional)
  - modeloBim: file (obrigatório, .ifc/.dwg/.obj/.ply)
```

#### Listar Projetos
```
GET /api/projects
```

#### Obter Projeto
```
GET /api/projects/:id
```

#### Deletar Projeto
```
DELETE /api/projects/:id
```

**Descrição:** Deleta um projeto e todos os dados relacionados (registros, análises e arquivos físicos).

**Exemplo:**
```bash
curl -X DELETE http://localhost:3000/api/projects/1
```

**Resposta:**
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

**Atenção:** Esta operação é irreversível e remove:
- Projeto do banco de dados
- Todos os registros relacionados (cascade)
- Todas as análises relacionadas (cascade)
- Arquivo BIM do sistema de arquivos
- Todas as fotos dos registros
- Todos os arquivos de output (reconstruções e análises)

### Construções (Alias)

#### Criar Construção
```
POST /api/construction
```
Igual a criar projeto.

#### Listar Construções
```
GET /api/constructions
```

### Registros

#### Adicionar Registro
```
POST /api/projects/:id/records
Content-Type: multipart/form-data
Body:
  - name: string (obrigatório)
  - fotos: file[] (obrigatório, mínimo 3, .jpg/.jpeg/.png)
```

#### Listar Registros
```
GET /api/projects/:id/records
```

#### Importar PLY Existente
```
POST /api/:constructionId/records/import-ply
Content-Type: multipart/form-data
Body:
  - name: string (obrigatório)
  - plyFile: file (obrigatório, .ply)
```

**Descrição:** Importa um arquivo PLY já processado como registro, sem executar 3DGS. Útil quando você já tem uma reconstrução 3D pronta.

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/2/records/import-ply \
  -F "name=Registro 3DGS Importado" \
  -F "plyFile=@./test-files/3dgs.ply"
```

**Resposta:**
```json
{
  "id": 1,
  "name": "Registro 3DGS Importado",
  "projectId": 2,
  "recordPath": "2/registros/1/reconstrucao_1.ply",
  "message": "Arquivo PLY importado com sucesso. Use analysis-full para comparar com BIM.",
  "filePath": "2/registros/1/reconstrucao_1.ply"
}
```

**Validações:**
- Arquivo deve ser `.ply`
- Tamanho mínimo: 1KB
- Tamanho máximo: 10GB

### Processamento Completo

#### Photo Processing Full
```
POST /api/:constructionId/photo-processing-full
Content-Type: multipart/form-data
Body:
  - name: string (obrigatório)
  - fotos: file[] (obrigatório, mínimo 3)
  - parametros: string (opcional, JSON)
```

Executa: Upload → 3DGS → C2C automaticamente.

#### Analysis Full
```
POST /api/:constructionId/analysis-full
Content-Type: application/json
Body:
  - recordId: number (opcional)
  - parametros: object (opcional)
```

Executa apenas C2C usando reconstrução existente.

### Análises

#### Iniciar Análise
```
POST /api/analyses
Content-Type: application/json
Body:
  - projectId: number (obrigatório)
  - recordId: number (obrigatório)
  - parametros: object (opcional)
```

#### Consultar Status
```
GET /api/analyses/:id
```

#### Listar Análises
```
GET /api/analyses
```

#### Listar Análises por Projeto
```
GET /api/:constructionId/analyses
```

#### Cancelar Análise
```
DELETE /api/analyses/:id
```

### Visualização

#### Visualizar Arquivo
```
GET /api/:constructionId/:fileType/:fileId
```

**fileType:**
- `bim` - Arquivo BIM do projeto
- `registro` - Reconstrução 3DGS
- `analise` - Resultado da análise

**Exemplos:**
```
GET /api/1/bim/0
GET /api/1/registro/1
GET /api/1/analise/1
```

---

## 🔍 Troubleshooting

### Problema: Porta 5432 já está em uso

**Sintoma:**
```
Error: Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Solução:**
```bash
# 1. Verificar o que está usando
lsof -i :5432

# 2. Parar PostgreSQL local
# macOS:
brew services stop postgresql

# Linux:
sudo systemctl stop postgresql

# 3. Ou mudar porta no docker-compose.yml
# Edite docker/docker-compose.yml linha 10:
ports:
  - "5433:5432"
# E atualize DATABASE_URL no .env
```

### Problema: Drift detectado no Prisma

**Sintoma:**
```
Drift detected: Your database schema is not in sync
```

**Solução:**
```bash
# Opção 1: Reset completo (apaga dados!)
cd docker
docker-compose down -v
rm -rf pgdata
docker-compose up -d
cd ..
npx prisma migrate dev --name init

# Opção 2: Usar db push (desenvolvimento)
npx prisma db push --accept-data-loss
npx prisma generate
```

### Problema: Servidor não inicia

**Verificar:**
```bash
# 1. Verificar se porta 3000 está livre
lsof -i :3000

# 2. Verificar variáveis de ambiente
cat .env

# 3. Verificar se Prisma está configurado
npx prisma generate

# 4. Verificar logs de erro
npm run dev
```

### Problema: Erro 500 em todos os endpoints

**Solução:**
```bash
# 1. Verificar banco de dados
cd docker
docker-compose ps
docker-compose logs db

# 2. Verificar conexão
npx prisma db pull

# 3. Verificar DATABASE_URL no .env
cat .env | grep DATABASE_URL
```

### Problema: Arquivo não encontrado ao fazer upload

**Solução:**
```bash
# 1. Verificar se arquivo existe
ls -lh tinker.obj

# 2. Verificar caminho no comando curl
# Use caminho absoluto se necessário:
curl -X POST http://localhost:3000/api/projects \
  -F "name=Teste" \
  -F "modeloBim=@$(pwd)/tinker.obj"
```

### Problema: Processamento não inicia

**Verificar:**
```bash
# 1. Verificar se ferramentas CLI estão configuradas
cat .env | grep CLI

# 2. Verificar se MAX_CONCURRENT_JOBS não está no limite
curl http://localhost:3000/api/analyses | jq '.jobs[] | select(.status == "processing")'

# 3. Verificar logs da análise
curl http://localhost:3000/api/analyses/1 | jq '.logs, .error'
```

### Problema: Migration não aplica

**Solução:**
```bash
# 1. Verificar status
npx prisma migrate status

# 2. Aplicar migrations pendentes
npx prisma migrate deploy

# 3. Se houver conflitos
npx prisma migrate reset --force
```

---

## 📝 Checklist de Instalação

Use este checklist para garantir que tudo está configurado:

- [ ] Node.js 20+ instalado
- [ ] Docker instalado e rodando
- [ ] Dependências instaladas (`npm install`)
- [ ] Banco de dados rodando (`docker-compose ps`)
- [ ] Arquivo `.env` criado e configurado
- [ ] Prisma cliente gerado (`npx prisma generate`)
- [ ] Schema sincronizado (`npx prisma migrate dev` ou `db push`)
- [ ] Diretórios criados (`uploads`, `outputs`, `logs`)
- [ ] Servidor inicia sem erros (`npm run dev`)
- [ ] Health check funciona (`curl http://localhost:3000/health`)

---

## 🎯 Próximos Passos Após Instalação

1. **Testar endpoints básicos** - Use o `test-quick.sh`
2. **Configurar ferramentas CLI** - Para processamento real
3. **Testar com fotos reais** - Validar fluxo completo
4. **Integrar com frontend** - Se houver
5. **Configurar produção** - Quando estiver pronto

---

## 📚 Estrutura do Projeto

```
analise-metro-backend/
├── docker/                 # Configuração Docker
│   ├── docker-compose.yml  # Serviço PostgreSQL
│   ├── init.sql           # Script de inicialização
│   └── pgdata/            # Dados do banco (gitignored)
├── prisma/                # Schema e migrations
│   ├── schema.prisma      # Modelos do banco
│   └── migrations/        # Histórico de migrations
├── src/                   # Código fonte
│   ├── core/
│   │   ├── controllers/   # Controladores HTTP
│   │   ├── routes/        # Definição de rotas
│   │   └── services/       # Lógica de negócio
│   ├── shared/
│   │   ├── database/      # Conexão Prisma
│   │   ├── functions/     # Funções utilitárias
│   │   └── interfaces/    # Interfaces TypeScript
│   └── index.ts           # Ponto de entrada
├── test-files/            # Arquivos de teste
├── tools/                 # Ferramentas CLI
├── .env                   # Variáveis de ambiente (criar)
├── package.json           # Dependências
└── tsconfig.json          # Configuração TypeScript
```

---

## 💡 Dicas Úteis

### Usar jq para formatar JSON

```bash
# Instalar jq
# macOS: brew install jq
# Linux: sudo apt-get install jq

# Usar
curl http://localhost:3000/api/projects | jq
```

### Monitorar Logs do Servidor

Em outro terminal, monitore o console onde `npm run dev` está rodando.

### Verificar Banco de Dados

```bash
# Abrir Prisma Studio (interface visual)
npx prisma studio

# Ou conectar diretamente
psql postgresql://postgres:postgres@localhost:5432/metro_pipeline
```

### Testar com Postman/Insomnia

1. Importar coleção de endpoints
2. Configurar variável `base_url = http://localhost:3000`
3. Testar endpoints visualmente

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique a seção [Troubleshooting](#troubleshooting)
2. Verifique logs do servidor
3. Verifique logs do Docker: `docker-compose logs db`
4. Verifique status do Prisma: `npx prisma migrate status`

---

## ✅ Conclusão

Agora você tem um guia completo para:
- ✅ Instalar o projeto do zero
- ✅ Configurar tudo corretamente
- ✅ Iniciar o servidor
- ✅ Testar todas as funcionalidades
- ✅ Usar scripts mock para desenvolvimento
- ✅ Testar em ambiente produtivo

## 📚 Documentação Adicional

Para mais informações, consulte:

- **[README.md](./README.md)** - Guia de início rápido
- **[DOCS.md](./DOCS.md)** - Documentação técnica completa da API
- **[TESTE_PRODUCAO.md](./TESTE_PRODUCAO.md)** - Guia completo para testes em produção
- **[scripts/README.md](./scripts/README.md)** - Documentação dos scripts de teste
- ✅ Testar todos os endpoints
- ✅ Resolver problemas comuns

**Boa sorte com o projeto! 🚀**

