# Guia de Testes - Backend Metro SP

Este documento fornece um guia completo para testar todos os endpoints e funcionalidades da API.

## Pré-requisitos

1. **Banco de dados rodando**
   ```bash
   cd docker
   docker-compose up -d
   ```

2. **Variáveis de ambiente configuradas**
   ```bash
   cp .env.example .env
   # Edite o .env com suas configurações
   ```

3. **Dependências instaladas**
   ```bash
   npm install
   ```

4. **Prisma configurado**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Servidor rodando**
   ```bash
   npm run dev
   ```

## Ferramentas Recomendadas

- **Postman** ou **Insomnia** - Para requisições HTTP
- **curl** - Para testes via terminal
- **httpie** - Alternativa moderna ao curl

## Variáveis de Ambiente para Testes

Configure no seu `.env`:
```bash
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/metro_pipeline
UPLOADS_DIR=./src/shared/data/uploads
OUTPUTS_DIR=./src/shared/data/outputs
MAX_CONCURRENT_JOBS=3
```

## 1. Health Check

### Teste Básico

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

**Status:** ✅ Deve retornar 200 OK

---

## 2. Criação de Projetos

### 2.1 Criar Projeto (Endpoint Tradicional)

```bash
curl -X POST http://localhost:3000/api/projects \
  -F "name=Teste Estação Morumbi" \
  -F "description=Projeto de teste" \
  -F "modeloBim=@./test-files/modelo.ifc"
```

**Resposta esperada:**
```json
{
  "id": 1,
  "name": "Teste Estação Morumbi",
  "description": "Projeto de teste",
  "bimPath": "projects/1/modelo.ifc",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Status:** ✅ Deve retornar 201 Created

**Validações a testar:**
- ✅ Criar projeto sem arquivo BIM → Deve retornar 400
- ✅ Criar projeto sem nome → Deve retornar 400
- ✅ Criar projeto com arquivo inválido (.txt) → Deve retornar 400
- ✅ Criar projeto com arquivo muito grande → Deve retornar 400

### 2.2 Criar Projeto (Endpoint Novo - Alias)

```bash
curl -X POST http://localhost:3000/api/construction \
  -F "name=Teste Estação Pinheiros" \
  -F "modeloBim=@./test-files/modelo.ifc"
```

**Status:** ✅ Deve funcionar igual ao endpoint `/api/projects`

### 2.3 Listar Projetos

```bash
curl http://localhost:3000/api/projects
```

**Resposta esperada:**
```json
[
  {
    "id": 1,
    "name": "Teste Estação Morumbi",
    "description": "Projeto de teste",
    "bimPath": "projects/1/modelo.ifc",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
]
```

**Status:** ✅ Deve retornar 200 OK com array de projetos

### 2.4 Obter Projeto Específico

```bash
curl http://localhost:3000/api/projects/1
```

**Status:** ✅ Deve retornar 200 OK com dados do projeto

**Validações:**
- ✅ Projeto inexistente → Deve retornar 404

---

## 3. Registros de Fotos

### 3.1 Adicionar Registro (Endpoint Tradicional)

```bash
curl -X POST http://localhost:3000/api/projects/1/records \
  -F "name=Semana 5 - Fachada Leste" \
  -F "fotos=@./test-files/foto1.jpg" \
  -F "fotos=@./test-files/foto2.jpg" \
  -F "fotos=@./test-files/foto3.jpg"
```

**Resposta esperada:**
```json
{
  "id": 1,
  "name": "Semana 5 - Fachada Leste",
  "uploadedFilesPaths": [
    "projects/1/records/1/foto1.jpg",
    "projects/1/records/1/foto2.jpg",
    "projects/1/records/1/foto3.jpg"
  ],
  "recordPath": null,
  "projectId": 1,
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Status:** ✅ Deve retornar 201 Created

**Validações a testar:**
- ✅ Sem fotos → Deve retornar 400
- ✅ Menos de 3 fotos → Deve retornar 400
- ✅ Foto com tipo inválido (.pdf) → Deve retornar 400
- ✅ Foto muito pequena (< 100KB) → Deve retornar 400
- ✅ Foto muito grande (> 100MB) → Deve retornar 400
- ✅ Sem nome → Deve retornar 400
- ✅ Projeto inexistente → Deve retornar 404

### 3.2 Listar Registros

```bash
curl http://localhost:3000/api/projects/1/records
```

**Resposta esperada:**
```json
[
  {
    "id": 1,
    "name": "Semana 5 - Fachada Leste",
    "uploadedFilesPaths": [...],
    "recordPath": null,
    "projectId": 1,
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
]
```

**Status:** ✅ Deve retornar 200 OK

---

## 4. Processamento Completo (Novos Endpoints)

### 4.1 Photo Processing Full

Este endpoint faz upload de fotos + processamento completo automático (3DGS + C2C).

```bash
curl -X POST http://localhost:3000/api/1/photo-processing-full \
  -F "name=Registro Completo Semana 5" \
  -F "fotos=@./test-files/foto1.jpg" \
  -F "fotos=@./test-files/foto2.jpg" \
  -F "fotos=@./test-files/foto3.jpg" \
  -F "parametros={\"threshold\": 0.8}"
```

**Resposta esperada:**
```json
{
  "analysisId": 1,
  "recordId": 1,
  "status": "pending",
  "message": "Processamento completo iniciado",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Status:** ✅ Deve retornar 202 Accepted

**Validações:**
- ✅ Projeto inexistente → Deve retornar 404
- ✅ Sem fotos → Deve retornar 400
- ✅ Menos de 3 fotos → Deve retornar 400

**Após iniciar, verificar status:**
```bash
curl http://localhost:3000/api/analyses/1
```

**Resposta esperada (durante processamento):**
```json
{
  "id": 1,
  "status": "processing",
  "progress": 45,
  "logs": [
    "🚀 Iniciando processamento...",
    "📸 Etapa 1/2: Iniciando reconstrução 3D (3DGS)...",
    "[Reconstrução 3D] Processando imagens..."
  ],
  "projectId": 1,
  "recordId": 1,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "startedAt": "2024-01-01T12:00:01.000Z"
}
```

**Resposta esperada (concluído):**
```json
{
  "id": 1,
  "status": "completed",
  "progress": 100,
  "logs": [
    "🚀 Iniciando processamento...",
    "📸 Etapa 1/2: Iniciando reconstrução 3D (3DGS)...",
    "✅ Reconstrução 3D concluída com sucesso",
    "🏗️ Etapa 2/2: Iniciando comparação C2C (CloudCompare)...",
    "✅ Comparação C2C concluída com sucesso",
    "✅ Processamento concluído com sucesso!"
  ],
  "outputPaths": {
    "modelo3d": "1/registros/registro_1_1234567890.ply",
    "comparacaoBim": "1/analises/analysis_1/comparacao_c2c.ply"
  },
  "resultPath": "1/analises/analysis_1/comparacao_c2c.ply",
  "completedAt": "2024-01-01T12:05:00.000Z"
}
```

### 4.2 Analysis Full (Reanálise com Modelos Existentes)

Este endpoint executa apenas C2C usando reconstrução já existente.

```bash
curl -X POST http://localhost:3000/api/1/analysis-full \
  -H "Content-Type: application/json" \
  -d '{
    "parametros": {
      "threshold": 0.9
    }
  }'
```

**Resposta esperada:**
```json
{
  "analysisId": 2,
  "status": "pending",
  "message": "Análise C2C iniciada usando modelos existentes",
  "timestamp": "2024-01-01T12:10:00.000Z"
}
```

**Status:** ✅ Deve retornar 202 Accepted

**Validações:**
- ✅ Projeto sem reconstruções → Deve retornar 404
- ✅ Projeto inexistente → Deve retornar 404

**Com recordId específico:**
```bash
curl -X POST http://localhost:3000/api/1/analysis-full \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": 1,
    "parametros": {
      "threshold": 0.9
    }
  }'
```

---

## 5. Análises (Endpoints Tradicionais)

### 5.1 Iniciar Análise

```bash
curl -X POST http://localhost:3000/api/analyses \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "recordId": 1,
    "parametros": {
      "threshold": 0.8
    }
  }'
```

**Resposta esperada:**
```json
{
  "jobId": 3,
  "status": "pending",
  "message": "Processamento de análise iniciado",
  "timestamp": "2024-01-01T12:15:00.000Z"
}
```

**Status:** ✅ Deve retornar 202 Accepted

**Validações:**
- ✅ Sem projectId → Deve retornar 400
- ✅ Sem recordId → Deve retornar 400
- ✅ ProjectId inexistente → Deve retornar erro no processamento
- ✅ RecordId inexistente → Deve retornar erro no processamento

### 5.2 Consultar Status de Análise

```bash
curl http://localhost:3000/api/analyses/1
```

**Status:** ✅ Deve retornar 200 OK com status completo

**Validações:**
- ✅ Análise inexistente → Deve retornar 404

### 5.3 Listar Todas as Análises

```bash
curl http://localhost:3000/api/analyses
```

**Resposta esperada:**
```json
{
  "jobs": [
    {
      "id": 1,
      "status": "completed",
      "progress": 100,
      ...
    },
    {
      "id": 2,
      "status": "processing",
      "progress": 50,
      ...
    }
  ]
}
```

**Status:** ✅ Deve retornar 200 OK

### 5.4 Listar Análises por Projeto

```bash
curl http://localhost:3000/api/1/analyses
```

**Resposta esperada:**
```json
{
  "analyses": [
    {
      "id": 1,
      "status": "completed",
      "projectId": 1,
      ...
    }
  ]
}
```

**Status:** ✅ Deve retornar 200 OK com análises filtradas

### 5.5 Cancelar Análise

```bash
curl -X DELETE http://localhost:3000/api/analyses/2
```

**Resposta esperada:**
```json
{
  "message": "Job cancelado com sucesso",
  "jobId": "2"
}
```

**Status:** ✅ Deve retornar 200 OK

**Validações:**
- ✅ Análise já concluída → Deve retornar 404
- ✅ Análise inexistente → Deve retornar 404

---

## 6. Visualização de Arquivos

### 6.1 Visualizar Arquivo BIM

```bash
curl http://localhost:3000/api/1/bim/0 -o modelo.ifc
```

**Status:** ✅ Deve retornar 200 OK com arquivo

**Validações:**
- ✅ Projeto inexistente → Deve retornar 404

### 6.2 Visualizar Reconstrução 3DGS

```bash
curl http://localhost:3000/api/1/registro/1 -o reconstrucao.ply
```

**Status:** ✅ Deve retornar 200 OK com arquivo PLY

**Validações:**
- ✅ Registro sem reconstrução → Deve retornar 404
- ✅ Registro inexistente → Deve retornar 404

### 6.3 Visualizar Resultado de Análise

```bash
curl http://localhost:3000/api/1/analise/1 -o comparacao.ply
```

**Status:** ✅ Deve retornar 200 OK com arquivo PLY

**Validações:**
- ✅ Análise sem resultado → Deve retornar 404
- ✅ Análise inexistente → Deve retornar 404
- ✅ Tipo de arquivo inválido → Deve retornar 400

---

## 7. Testes de Fluxo Completo

### Fluxo 1: Processamento Completo Simplificado

```bash
# 1. Criar projeto
PROJECT_ID=$(curl -s -X POST http://localhost:3000/api/construction \
  -F "name=Teste Completo" \
  -F "modeloBim=@./test-files/modelo.ifc" | jq -r '.id')

echo "Projeto criado: $PROJECT_ID"

# 2. Processar fotos completamente
ANALYSIS_ID=$(curl -s -X POST http://localhost:3000/api/$PROJECT_ID/photo-processing-full \
  -F "name=Registro Teste" \
  -F "fotos=@./test-files/foto1.jpg" \
  -F "fotos=@./test-files/foto2.jpg" \
  -F "fotos=@./test-files/foto3.jpg" | jq -r '.analysisId')

echo "Análise iniciada: $ANALYSIS_ID"

# 3. Aguardar conclusão (polling)
while true; do
  STATUS=$(curl -s http://localhost:3000/api/analyses/$ANALYSIS_ID | jq -r '.status')
  PROGRESS=$(curl -s http://localhost:3000/api/analyses/$ANALYSIS_ID | jq -r '.progress')
  echo "Status: $STATUS - Progresso: $PROGRESS%"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  sleep 5
done

# 4. Verificar resultado
curl http://localhost:3000/api/analyses/$ANALYSIS_ID | jq
```

### Fluxo 2: Reanálise com Modelos Existentes

```bash
# 1. Criar nova análise usando reconstrução existente
ANALYSIS_ID=$(curl -s -X POST http://localhost:3000/api/1/analysis-full \
  -H "Content-Type: application/json" \
  -d '{"parametros": {"threshold": 0.9}}' | jq -r '.analysisId')

echo "Nova análise iniciada: $ANALYSIS_ID"

# 2. Verificar que pulou etapa 3DGS
curl http://localhost:3000/api/analyses/$ANALYSIS_ID | jq '.logs'
```

---

## 8. Testes de Validação

### 8.1 Validação de Arquivos BIM

```bash
# Arquivo inválido
curl -X POST http://localhost:3000/api/projects \
  -F "name=Teste" \
  -F "modeloBim=@./test-files/arquivo.txt"

# Deve retornar 400 com mensagem de erro
```

### 8.2 Validação de Imagens

```bash
# Menos de 3 fotos
curl -X POST http://localhost:3000/api/1/photo-processing-full \
  -F "name=Teste" \
  -F "fotos=@./test-files/foto1.jpg" \
  -F "fotos=@./test-files/foto2.jpg"

# Deve retornar 400
```

### 8.3 Validação de Tamanhos

```bash
# Criar arquivo muito grande (simulado)
# Teste manual necessário com arquivo real > 5GB para BIM
# Teste manual necessário com arquivo real > 100MB para imagem
```

---

## 9. Testes de Concorrência

### 9.1 Múltiplos Jobs Simultâneos

```bash
# Iniciar 5 análises simultaneamente
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/1/analysis-full \
    -H "Content-Type: application/json" \
    -d '{}' &
done
wait

# Verificar que apenas MAX_CONCURRENT_JOBS estão processando
curl http://localhost:3000/api/analyses | jq '.jobs[] | select(.status == "processing")'
```

---

## 10. Testes de Erros

### 10.1 Erro de Processamento

```bash
# Criar análise com projeto/registro inválido
curl -X POST http://localhost:3000/api/analyses \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 999,
    "recordId": 999
  }'

# Verificar que status muda para "failed"
curl http://localhost:3000/api/analyses/LAST_ID | jq '.status, .error'
```

### 10.2 Cancelamento de Job

```bash
# Iniciar análise longa
ANALYSIS_ID=$(curl -s -X POST http://localhost:3000/api/1/photo-processing-full \
  -F "name=Teste Cancelamento" \
  -F "fotos=@./test-files/foto1.jpg" \
  -F "fotos=@./test-files/foto2.jpg" \
  -F "fotos=@./test-files/foto3.jpg" | jq -r '.analysisId')

# Aguardar um pouco
sleep 2

# Cancelar
curl -X DELETE http://localhost:3000/api/analyses/$ANALYSIS_ID

# Verificar status
curl http://localhost:3000/api/analyses/$ANALYSIS_ID | jq '.status'
# Deve retornar "cancelled"
```

---

## 11. Checklist de Testes

### Endpoints Básicos
- [ ] GET /health
- [ ] POST /api/projects
- [ ] GET /api/projects
- [ ] GET /api/projects/:id
- [ ] POST /api/projects/:id/records
- [ ] GET /api/projects/:id/records

### Novos Endpoints
- [ ] POST /api/construction
- [ ] GET /api/constructions
- [ ] POST /api/:constructionId/photo-processing-full
- [ ] POST /api/:constructionId/analysis-full
- [ ] GET /api/:constructionId/analyses
- [ ] GET /api/:constructionId/:fileType/:fileId

### Análises
- [ ] POST /api/analyses
- [ ] GET /api/analyses/:id
- [ ] GET /api/analyses
- [ ] DELETE /api/analyses/:id

### Validações
- [ ] Validação de tipos de arquivo BIM
- [ ] Validação de tipos de imagem
- [ ] Validação de tamanhos
- [ ] Validação de número mínimo de fotos
- [ ] Validação de campos obrigatórios

### Funcionalidades
- [ ] Processamento completo (3DGS + C2C)
- [ ] Processamento parcial (apenas C2C)
- [ ] Detecção de reconstruções existentes
- [ ] Controle de concorrência
- [ ] Cancelamento de jobs
- [ ] Visualização de arquivos

### Tratamento de Erros
- [ ] Erros 400 (validação)
- [ ] Erros 404 (não encontrado)
- [ ] Erros 409 (conflito)
- [ ] Erros 500 (interno)
- [ ] Jobs falhados

---

## 12. Scripts de Teste Automatizados

### Script Bash Completo

Crie um arquivo `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🧪 Iniciando testes da API..."

# Health Check
echo -n "Testando health check... "
if curl -s "$BASE_URL/health" | grep -q "ok"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Criar projeto
echo -n "Criando projeto... "
PROJECT_ID=$(curl -s -X POST "$BASE_URL/api/projects" \
  -F "name=Teste Automatizado" \
  -F "modeloBim=@./test-files/modelo.ifc" | jq -r '.id')

if [ "$PROJECT_ID" != "null" ] && [ -n "$PROJECT_ID" ]; then
  echo -e "${GREEN}✅ ID: $PROJECT_ID${NC}"
else
  echo -e "${RED}❌${NC}"
  exit 1
fi

# Listar projetos
echo -n "Listando projetos... "
if curl -s "$BASE_URL/api/projects" | jq -e '. | length > 0' > /dev/null; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

echo "✅ Testes básicos concluídos!"
```

Torne executável:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 13. Monitoramento Durante Testes

### Verificar Logs do Servidor

```bash
# Em outro terminal, monitore os logs
tail -f logs/app.log  # Se houver arquivo de log
# Ou monitore o console do npm run dev
```

### Verificar Banco de Dados

```bash
# Conectar ao PostgreSQL
psql postgresql://postgres:postgres@localhost:5432/metro_pipeline

# Verificar projetos
SELECT * FROM project;

# Verificar registros
SELECT * FROM record;

# Verificar análises
SELECT id, status, progress, error FROM analysis;
```

---

## 14. Troubleshooting

### Problema: Erro de conexão com banco

**Solução:**
```bash
cd docker
docker-compose up -d
# Aguardar alguns segundos
docker-compose ps  # Verificar se está rodando
```

### Problema: Erro 500 em todos os endpoints

**Solução:**
- Verificar logs do servidor
- Verificar se Prisma está configurado: `npx prisma generate`
- Verificar variáveis de ambiente no `.env`

### Problema: Arquivos não encontrados

**Solução:**
- Verificar se diretórios existem: `ls -la src/shared/data/`
- Verificar permissões: `chmod -R 755 src/shared/data/`

### Problema: Processamento não inicia

**Solução:**
- Verificar se ferramentas CLI estão configuradas no `.env`
- Verificar se MAX_CONCURRENT_JOBS não está no limite
- Verificar logs da análise: `curl http://localhost:3000/api/analyses/:id`

---

## 15. Próximos Passos

Após validar todos os testes:

1. ✅ Integrar com ferramentas CLI reais (COLMAP, Brush, CloudCompare)
2. ✅ Configurar ambiente de produção
3. ✅ Implementar autenticação (se necessário)
4. ✅ Adicionar testes automatizados (Jest/Mocha)
5. ✅ Configurar CI/CD

---

## Notas Finais

- Todos os testes devem ser executados em ordem
- Certifique-se de ter arquivos de teste válidos na pasta `test-files/`
- Para testes com ferramentas CLI reais, configure `IMAGE_PROCESSING_CLI` e `BIM_COMPARISON_CLI` no `.env`
- O processamento pode levar vários minutos dependendo do hardware

**Boa sorte com os testes! 🚀**

