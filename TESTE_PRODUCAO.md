# 🧪 Guia de Testes em Produção

Guia completo para testar a aplicação em ambiente produtivo, validando todas as funcionalidades e garantindo que o sistema está funcionando corretamente.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Preparação do Ambiente](#preparação-do-ambiente)
3. [Checklist de Validação](#checklist-de-validação)
4. [Testes Funcionais](#testes-funcionais)
5. [Testes de Performance](#testes-de-performance)
6. [Testes de Integração](#testes-de-integração)
7. [Validação de Dados](#validação-de-dados)
8. [Monitoramento](#monitoramento)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### Ambiente de Produção

- ✅ Servidor Node.js 20+ configurado
- ✅ PostgreSQL 16 rodando e acessível
- ✅ Docker configurado (se usando container)
- ✅ Variáveis de ambiente configuradas
- ✅ Ferramentas CLI instaladas (CloudCompare, COLMAP/Brush)
- ✅ Espaço em disco suficiente (mínimo 50GB recomendado)
- ✅ Permissões de escrita nos diretórios de upload/output

### Ferramentas de Teste

- `curl` ou `httpie` para requisições HTTP
- `jq` para formatação JSON (recomendado)
- `postman` ou `insomnia` (opcional, para testes GUI)

---

## 🚀 Preparação do Ambiente

### 1. Verificar Configuração

```bash
# Verificar variáveis de ambiente
cat .env | grep -v PASSWORD

# Verificar conexão com banco
npx prisma db pull

# Verificar estrutura de diretórios
ls -la src/shared/data/
```

### 2. Iniciar Serviços

```bash
# Banco de dados
cd docker
docker-compose up -d
docker-compose ps

# Servidor (em produção, use PM2 ou similar)
npm run build
npm start

# Verificar saúde do servidor
curl http://localhost:3000/health
```

### 3. Validar Ferramentas CLI

```bash
# Verificar CloudCompare
which CloudCompare || echo "CloudCompare não encontrado"

# Verificar ferramenta 3DGS
which colmap || echo "COLMAP não encontrado"

# Testar scripts mock (se usando)
bash tools/fake_3dgs.sh --help 2>&1 | head -5
bash tools/bim-comparison.sh --help 2>&1 | head -5
```

---

## ✅ Checklist de Validação

### Infraestrutura

- [ ] Servidor respondendo em `/health`
- [ ] Banco de dados conectado e acessível
- [ ] Diretórios de upload/output criados e com permissões
- [ ] Variáveis de ambiente configuradas corretamente
- [ ] Ferramentas CLI disponíveis e funcionando

### Funcionalidades Básicas

- [ ] Criar projeto com BIM
- [ ] Listar projetos
- [ ] Obter projeto específico
- [ ] Deletar projeto
- [ ] Criar registro com fotos
- [ ] Importar PLY existente
- [ ] Iniciar processamento completo
- [ ] Consultar status de análise
- [ ] Visualizar arquivos gerados

---

## 🧪 Testes Funcionais

### Teste 1: Health Check

```bash
curl http://localhost:3000/health

# Esperado: {"status":"ok"}
```

### Teste 2: Criar Projeto

```bash
PROJECT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/projects \
  -F "name=Teste Produção $(date +%Y%m%d)" \
  -F "description=Teste funcional em produção" \
  -F "modeloBim=@./tinker.obj")

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.id')

echo "Projeto criado: ID $PROJECT_ID"
```

**Validações:**
- ✅ Status HTTP 201 ou 200
- ✅ ID retornado é numérico
- ✅ Arquivo BIM salvo no sistema de arquivos
- ✅ Projeto aparece na listagem

### Teste 3: Listar Projetos

```bash
curl http://localhost:3000/api/projects | jq '.[] | {id, name, createdAt}'
```

**Validações:**
- ✅ Retorna array de projetos
- ✅ Projeto criado aparece na lista
- ✅ Campos obrigatórios presentes

### Teste 4: Obter Projeto Específico

```bash
curl http://localhost:3000/api/projects/$PROJECT_ID | jq
```

**Validações:**
- ✅ Retorna projeto correto
- ✅ Todos os campos presentes
- ✅ `bimPath` aponta para arquivo existente

### Teste 5: Criar Registro com Fotos

```bash
# Criar 5 imagens mock para teste
for i in {1..5}; do
  convert -size 1920x1080 xc:gray +noise random "test_foto_$i.jpg" 2>/dev/null || \
  dd if=/dev/urandom of="test_foto_$i.jpg" bs=1024 count=100
done

RECORD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/projects/$PROJECT_ID/records \
  -F "name=Registro Teste $(date +%H%M%S)" \
  -F "fotos=@./test_foto_1.jpg" \
  -F "fotos=@./test_foto_2.jpg" \
  -F "fotos=@./test_foto_3.jpg" \
  -F "fotos=@./test_foto_4.jpg" \
  -F "fotos=@./test_foto_5.jpg")

RECORD_ID=$(echo $RECORD_RESPONSE | jq -r '.id')
echo "Registro criado: ID $RECORD_ID"
```

**Validações:**
- ✅ Status HTTP 201
- ✅ Fotos salvas no sistema de arquivos
- ✅ Registro aparece na listagem do projeto

### Teste 6: Processamento Completo (Photo Processing Full)

```bash
ANALYSIS_RESPONSE=$(curl -s -X POST http://localhost:3000/api/$PROJECT_ID/photo-processing-full \
  -F "name=Processamento Completo Teste" \
  -F "fotos=@./test_foto_1.jpg" \
  -F "fotos=@./test_foto_2.jpg" \
  -F "fotos=@./test_foto_3.jpg" \
  -F "fotos=@./test_foto_4.jpg" \
  -F "fotos=@./test_foto_5.jpg")

ANALYSIS_ID=$(echo $ANALYSIS_RESPONSE | jq -r '.analysisId')
echo "Análise iniciada: ID $ANALYSIS_ID"
```

**Validações:**
- ✅ Status HTTP 202 (Accepted)
- ✅ `analysisId` e `recordId` retornados
- ✅ Status inicial é "pending"

### Teste 7: Monitorar Progresso

```bash
# Aguardar processamento (ajustar tempo conforme necessário)
echo "Aguardando processamento..."
for i in {1..60}; do
  STATUS=$(curl -s http://localhost:3000/api/analyses/$ANALYSIS_ID | jq -r '.status')
  PROGRESS=$(curl -s http://localhost:3000/api/analyses/$ANALYSIS_ID | jq -r '.progress')
  
  echo "[$i/60] Status: $STATUS | Progresso: $PROGRESS%"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Processamento concluído!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Processamento falhou!"
    curl -s http://localhost:3000/api/analyses/$ANALYSIS_ID | jq '.error, .logs[-5:]'
    exit 1
  fi
  
  sleep 5
done
```

**Validações:**
- ✅ Status muda de "pending" → "processing" → "completed"
- ✅ Progresso aumenta de 0% para 100%
- ✅ Logs são atualizados em tempo real
- ✅ Arquivos de saída são gerados

### Teste 8: Verificar Arquivos Gerados

```bash
# Verificar reconstrução 3D
ANALYSIS_DATA=$(curl -s http://localhost:3000/api/analyses/$ANALYSIS_ID)
RECORD_PATH=$(echo $ANALYSIS_DATA | jq -r '.outputPaths.modelo3d // empty')
RESULT_PATH=$(echo $ANALYSIS_DATA | jq -r '.resultPath // empty')

if [ -n "$RECORD_PATH" ]; then
  echo "Reconstrução 3D: $RECORD_PATH"
  ls -lh "src/shared/data/outputs/$RECORD_PATH" 2>/dev/null || echo "Arquivo não encontrado"
fi

if [ -n "$RESULT_PATH" ]; then
  echo "Resultado C2C: $RESULT_PATH"
  ls -lh "src/shared/data/outputs/$RESULT_PATH" 2>/dev/null || echo "Arquivo não encontrado"
fi
```

**Validações:**
- ✅ Arquivo PLY de reconstrução existe
- ✅ Arquivo PLY de comparação existe
- ✅ Arquivo JSON de métricas existe (se gerado)
- ✅ Tamanhos dos arquivos são razoáveis (> 0 bytes)

### Teste 9: Relatório de Execução

```bash
curl http://localhost:3000/api/analyses/$ANALYSIS_ID/report | jq
```

**Validações:**
- ✅ Relatório completo retornado
- ✅ Métricas calculadas (mean_distance, std_deviation)
- ✅ Duração do processamento registrada
- ✅ Etapas executadas identificadas

### Teste 10: Visualizar Arquivos

```bash
# Visualizar BIM
curl -I http://localhost:3000/api/$PROJECT_ID/bim/0

# Visualizar reconstrução
curl -I http://localhost:3000/api/$PROJECT_ID/registro/$RECORD_ID

# Visualizar análise
curl -I http://localhost:3000/api/$PROJECT_ID/analise/$ANALYSIS_ID
```

**Validações:**
- ✅ Arquivos são servidos corretamente
- ✅ Content-Type apropriado
- ✅ Arquivos não estão vazios

### Teste 11: Importar PLY Existente

```bash
# Se você tem um arquivo PLY
if [ -f "./3dgs.ply" ]; then
  IMPORT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/$PROJECT_ID/records/import-ply \
    -F "name=PLY Importado Teste" \
    -F "plyFile=@./3dgs.ply")
  
  IMPORT_RECORD_ID=$(echo $IMPORT_RESPONSE | jq -r '.id')
  echo "PLY importado: Record ID $IMPORT_RECORD_ID"
fi
```

**Validações:**
- ✅ PLY importado com sucesso
- ✅ Arquivo copiado para estrutura correta
- ✅ `recordPath` preenchido no banco

### Teste 12: Análise com PLY Importado

```bash
if [ -n "$IMPORT_RECORD_ID" ]; then
  ANALYSIS2_RESPONSE=$(curl -s -X POST http://localhost:3000/api/$PROJECT_ID/analysis-full \
    -H "Content-Type: application/json" \
    -d "{\"recordId\": $IMPORT_RECORD_ID}")
  
  ANALYSIS2_ID=$(echo $ANALYSIS2_RESPONSE | jq -r '.analysisId')
  echo "Análise C2C iniciada: ID $ANALYSIS2_ID"
fi
```

**Validações:**
- ✅ Análise inicia sem erro
- ✅ Pula etapa 3DGS (usa PLY existente)
- ✅ Executa apenas comparação C2C

### Teste 13: Deletar Projeto

```bash
DELETE_RESPONSE=$(curl -s -X DELETE http://localhost:3000/api/projects/$PROJECT_ID)
echo $DELETE_RESPONSE | jq

# Verificar que foi deletado
curl http://localhost:3000/api/projects/$PROJECT_ID
# Esperado: 404 Not Found
```

**Validações:**
- ✅ Projeto deletado do banco
- ✅ Arquivos físicos removidos
- ✅ Registros e análises deletados (cascade)
- ✅ Não é possível acessar projeto deletado

---

## ⚡ Testes de Performance

### Teste de Carga Básico

```bash
# Criar múltiplos projetos rapidamente
for i in {1..10}; do
  curl -s -X POST http://localhost:3000/api/projects \
    -F "name=Projeto Load Test $i" \
    -F "modeloBim=@./tinker.obj" > /dev/null &
done
wait
echo "10 projetos criados"
```

### Teste de Upload Grande

```bash
# Criar arquivo grande (100MB)
dd if=/dev/zero of=large_bim.obj bs=1M count=100

# Testar upload
time curl -X POST http://localhost:3000/api/projects \
  -F "name=Projeto Arquivo Grande" \
  -F "modeloBim=@./large_bim.obj"

# Limpar
rm large_bim.obj
```

### Teste de Concorrência

```bash
# Iniciar múltiplas análises simultaneamente
for i in {1..5}; do
  curl -s -X POST http://localhost:3000/api/$PROJECT_ID/photo-processing-full \
    -F "name=Concorrente $i" \
    -F "fotos=@./test_foto_1.jpg" \
    -F "fotos=@./test_foto_2.jpg" \
    -F "fotos=@./test_foto_3.jpg" > /dev/null &
done
wait

# Verificar limite de concorrência (MAX_CONCURRENT_JOBS)
curl http://localhost:3000/api/analyses | jq '.jobs | length'
```

---

## 🔗 Testes de Integração

### Teste com Ferramentas Reais

Se você tem CloudCompare e COLMAP instalados:

```bash
# Configurar no .env
export IMAGE_PROCESSING_CLI="/caminho/para/colmap"
export BIM_COMPARISON_CLI="/caminho/para/CloudCompare"

# Reiniciar servidor
npm start

# Executar teste completo
./scripts/test-pipeline-mvp.sh
```

### Teste de Integração com Banco

```bash
# Conectar ao banco e verificar dados
docker exec -it metro-db psql -U postgres -d metro_pipeline -c "
SELECT 
  p.id, 
  p.name, 
  COUNT(DISTINCT r.id) as records_count,
  COUNT(DISTINCT a.id) as analyses_count
FROM project p
LEFT JOIN record r ON r.project_id = p.id
LEFT JOIN analysis a ON a.project_id = p.id
GROUP BY p.id, p.name
ORDER BY p.id DESC
LIMIT 10;
"
```

---

## 📊 Validação de Dados

### Verificar Integridade dos Dados

```bash
# Script de validação
cat > validate_data.sh << 'EOF'
#!/bin/bash

echo "=== Validação de Dados ==="

# Projetos sem BIM
echo "Projetos sem arquivo BIM:"
docker exec metro-db psql -U postgres -d metro_pipeline -t -c "
SELECT COUNT(*) FROM project p
WHERE NOT EXISTS (
  SELECT 1 FROM pg_ls_dir('$(pwd)/src/shared/data/uploads') f
  WHERE f = p.bim_path
);
"

# Registros sem fotos
echo "Registros sem fotos:"
docker exec metro-db psql -U postgres -d metro_pipeline -t -c "
SELECT COUNT(*) FROM record 
WHERE uploaded_files_paths IS NULL OR uploaded_files_paths = '[]'::jsonb;
"

# Análises órfãs
echo "Análises com projeto/registro inexistente:"
docker exec metro-db psql -U postgres -d metro_pipeline -t -c "
SELECT COUNT(*) FROM analysis a
WHERE NOT EXISTS (SELECT 1 FROM project p WHERE p.id = a.project_id)
   OR NOT EXISTS (SELECT 1 FROM record r WHERE r.id = a.record_id);
"
EOF

chmod +x validate_data.sh
./validate_data.sh
```

---

## 📈 Monitoramento

### Métricas Importantes

```bash
# Número de projetos
curl -s http://localhost:3000/api/projects | jq 'length'

# Número de análises por status
curl -s http://localhost:3000/api/analyses | jq '
  .jobs | group_by(.status) | map({status: .[0].status, count: length})
'

# Análises em processamento
curl -s http://localhost:3000/api/analyses | jq '
  .jobs | map(select(.status == "processing")) | length
'

# Espaço em disco usado
du -sh src/shared/data/uploads src/shared/data/outputs
```

### Logs do Servidor

```bash
# Se usando PM2
pm2 logs

# Se rodando diretamente
# Verificar saída do console para erros
```

---

## 🚨 Troubleshooting

### Problema: Análise não completa

**Sintomas:** Status fica em "processing" indefinidamente

**Soluções:**
1. Verificar logs da análise:
   ```bash
   curl http://localhost:3000/api/analyses/$ANALYSIS_ID | jq '.logs[-10:]'
   ```

2. Verificar se ferramenta CLI está funcionando:
   ```bash
   bash tools/fake_3dgs.sh --input test --output /tmp/test.ply
   ```

3. Verificar espaço em disco:
   ```bash
   df -h
   ```

4. Verificar processos travados:
   ```bash
   ps aux | grep node
   ```

### Problema: Upload falha

**Sintomas:** Erro 413 ou timeout

**Soluções:**
1. Verificar limite de tamanho no Multer (5GB padrão)
2. Verificar espaço em disco
3. Verificar timeout do servidor
4. Verificar tamanho do arquivo

### Problema: Banco de dados não conecta

**Sintomas:** Erro de conexão Prisma

**Soluções:**
1. Verificar se Docker está rodando:
   ```bash
   docker ps | grep metro-db
   ```

2. Verificar DATABASE_URL no .env
3. Testar conexão manual:
   ```bash
   docker exec -it metro-db psql -U postgres -d metro_pipeline -c "SELECT 1;"
   ```

---

## 📝 Checklist Final de Produção

Antes de considerar o sistema pronto para produção:

- [ ] Todos os testes funcionais passaram
- [ ] Performance aceitável (< 30s para processamento mock)
- [ ] Integridade de dados validada
- [ ] Logs configurados e monitorados
- [ ] Backup do banco configurado
- [ ] Variáveis de ambiente seguras
- [ ] Ferramentas CLI funcionando (se usando)
- [ ] Documentação atualizada
- [ ] Equipe treinada no uso

---

## 🎯 Próximos Passos

Após validar todos os testes:

1. Configurar monitoramento contínuo
2. Configurar alertas para falhas
3. Documentar procedimentos operacionais
4. Treinar equipe de suporte
5. Estabelecer rotina de backups

---

**Última atualização:** $(date +"%Y-%m-%d")

