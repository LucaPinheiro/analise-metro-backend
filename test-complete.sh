#!/bin/bash

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🧪 Teste Completo do Backend Metro SP${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Função auxiliar para extrair JSON
extract_json() {
    echo "$1" | grep -o '{.*}' | head -1
}

# Função auxiliar para extrair valor de campo
extract_field() {
    echo "$1" | grep -o "\"$2\":[^,}]*" | grep -o '[0-9]*' | head -1
}

# 1. Health Check
echo -e "${YELLOW}[1/8]${NC} Verificando saúde do servidor..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] && echo "$HEALTH_BODY" | grep -q "ok"; then
  echo -e "  ${GREEN}✅ Servidor respondendo${NC}"
else
  echo -e "  ${RED}❌ Servidor não está respondendo (HTTP $HTTP_CODE)${NC}"
  echo "  Resposta: $HEALTH_BODY"
  exit 1
fi

# 2. Criar Projeto
echo -e "\n${YELLOW}[2/8]${NC} Criando projeto com modelo BIM..."

# Verificar onde está o arquivo BIM
BIM_FILE=""
if [ -f "./test-files/tinker.obj" ]; then
  BIM_FILE="./test-files/tinker.obj"
elif [ -f "./tinker.obj" ]; then
  BIM_FILE="./tinker.obj"
else
  echo -e "  ${RED}❌ Arquivo tinker.obj não encontrado${NC}"
  echo "  Procurando em: ./test-files/tinker.obj ou ./tinker.obj"
  exit 1
fi

PROJECT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/projects" \
  -F "name=Projeto Teste Completo" \
  -F "description=Teste com arquivos PLY existentes" \
  -F "modeloBim=@$BIM_FILE")

HTTP_CODE=$(echo "$PROJECT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PROJECT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  PROJECT_ID=$(extract_field "$RESPONSE_BODY" "id")
  if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
    echo -e "  ${GREEN}✅ Projeto criado (ID: $PROJECT_ID)${NC}"
  else
    echo -e "  ${RED}❌ Falha ao extrair ID do projeto${NC}"
    echo "  Resposta: $RESPONSE_BODY"
    exit 1
  fi
else
  echo -e "  ${RED}❌ Falha ao criar projeto (HTTP $HTTP_CODE)${NC}"
  echo "  Resposta: $RESPONSE_BODY"
  exit 1
fi

# 3. Importar primeiro PLY
echo -e "\n${YELLOW}[3/8]${NC} Importando arquivo PLY (3dgs.ply)..."

PLY_FILE_1=""
if [ -f "./test-files/3dgs.ply" ]; then
  PLY_FILE_1="./test-files/3dgs.ply"
elif [ -f "./3dgs.ply" ]; then
  PLY_FILE_1="./3dgs.ply"
else
  echo -e "  ${YELLOW}⚠️  Arquivo 3dgs.ply não encontrado, pulando...${NC}"
  PLY_FILE_1=""
fi

RECORD_ID_1=""
if [ -n "$PLY_FILE_1" ] && [ -f "$PLY_FILE_1" ]; then
  PLY_RESPONSE_1=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/$PROJECT_ID/records/import-ply" \
    -F "name=Registro 3DGS" \
    -F "plyFile=@$PLY_FILE_1")
  
  HTTP_CODE_1=$(echo "$PLY_RESPONSE_1" | tail -n1)
  RESPONSE_BODY_1=$(echo "$PLY_RESPONSE_1" | sed '$d')
  
  if [ "$HTTP_CODE_1" = "201" ] || [ "$HTTP_CODE_1" = "200" ]; then
    RECORD_ID_1=$(extract_field "$RESPONSE_BODY_1" "id")
    echo -e "  ${GREEN}✅ PLY importado (Record ID: $RECORD_ID_1)${NC}"
  else
    echo -e "  ${RED}❌ Falha ao importar PLY (HTTP $HTTP_CODE_1)${NC}"
    echo "  Resposta: $RESPONSE_BODY_1"
  fi
fi

# 4. Importar segundo PLY
echo -e "\n${YELLOW}[4/8]${NC} Importando segundo arquivo PLY (cuboParc.ply)..."

PLY_FILE_2=""
if [ -f "./test-files/cuboParc.ply" ]; then
  PLY_FILE_2="./test-files/cuboParc.ply"
elif [ -f "./cuboParc.ply" ]; then
  PLY_FILE_2="./cuboParc.ply"
else
  echo -e "  ${YELLOW}⚠️  Arquivo cuboParc.ply não encontrado, pulando...${NC}"
  PLY_FILE_2=""
fi

RECORD_ID_2=""
if [ -n "$PLY_FILE_2" ] && [ -f "$PLY_FILE_2" ]; then
  PLY_RESPONSE_2=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/$PROJECT_ID/records/import-ply" \
    -F "name=Registro Cubo Parcial" \
    -F "plyFile=@$PLY_FILE_2")
  
  HTTP_CODE_2=$(echo "$PLY_RESPONSE_2" | tail -n1)
  RESPONSE_BODY_2=$(echo "$PLY_RESPONSE_2" | sed '$d')
  
  if [ "$HTTP_CODE_2" = "201" ] || [ "$HTTP_CODE_2" = "200" ]; then
    RECORD_ID_2=$(extract_field "$RESPONSE_BODY_2" "id")
    echo -e "  ${GREEN}✅ Segundo PLY importado (Record ID: $RECORD_ID_2)${NC}"
  else
    echo -e "  ${RED}❌ Falha ao importar segundo PLY (HTTP $HTTP_CODE_2)${NC}"
    echo "  Resposta: $RESPONSE_BODY_2"
  fi
fi

# 5. Listar Registros
echo -e "\n${YELLOW}[5/8]${NC} Listando registros do projeto..."
RECORDS_RESPONSE=$(curl -s "$BASE_URL/api/projects/$PROJECT_ID/records")
RECORDS_COUNT=$(echo "$RECORDS_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
if [ "$RECORDS_COUNT" -gt 0 ]; then
  echo -e "  ${GREEN}✅ $RECORDS_COUNT registro(s) encontrado(s)${NC}"
else
  echo -e "  ${YELLOW}⚠️  Nenhum registro encontrado${NC}"
fi

# 6. Iniciar Análise (usando primeiro registro ou mais recente)
echo -e "\n${YELLOW}[6/8]${NC} Iniciando análise C2C..."

USE_RECORD_ID=""
if [ -n "$RECORD_ID_1" ]; then
  USE_RECORD_ID="$RECORD_ID_1"
elif [ -n "$RECORD_ID_2" ]; then
  USE_RECORD_ID="$RECORD_ID_2"
fi

if [ -z "$USE_RECORD_ID" ]; then
  echo -e "  ${YELLOW}⚠️  Nenhum registro PLY disponível, pulando análise...${NC}"
else
  ANALYSIS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/$PROJECT_ID/analysis-full" \
    -H "Content-Type: application/json" \
    -d "{\"recordId\": $USE_RECORD_ID}")
  
  HTTP_CODE_A=$(echo "$ANALYSIS_RESPONSE" | tail -n1)
  RESPONSE_BODY_A=$(echo "$ANALYSIS_RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE_A" = "202" ] || [ "$HTTP_CODE_A" = "200" ]; then
    ANALYSIS_ID=$(extract_field "$RESPONSE_BODY_A" "analysisId")
    echo -e "  ${GREEN}✅ Análise iniciada (Analysis ID: $ANALYSIS_ID)${NC}"
    echo -e "  ${BLUE}   Status: pending (processamento em background)${NC}"
    
    # 7. Verificar status da análise
    echo -e "\n${YELLOW}[7/8]${NC} Verificando status da análise..."
    echo -e "  ${BLUE}   Aguardando 3 segundos...${NC}"
    sleep 3
    
    STATUS_RESPONSE=$(curl -s "$BASE_URL/api/analyses/$ANALYSIS_ID")
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | grep -o ':"[^"]*"' | grep -o '"[^"]*"' | tr -d '"')
    PROGRESS=$(extract_field "$STATUS_RESPONSE" "progress")
    
    if [ -n "$STATUS" ]; then
      echo -e "  ${GREEN}✅ Status: $STATUS (Progresso: ${PROGRESS}%)${NC}"
    else
      echo -e "  ${YELLOW}⚠️  Status não disponível ainda${NC}"
    fi
  else
    echo -e "  ${RED}❌ Falha ao iniciar análise (HTTP $HTTP_CODE_A)${NC}"
    echo "  Resposta: $RESPONSE_BODY_A"
  fi
fi

# 8. Listar Análises
echo -e "\n${YELLOW}[8/8]${NC} Listando análises do projeto..."
ANALYSES_RESPONSE=$(curl -s "$BASE_URL/api/$PROJECT_ID/analyses")
ANALYSES_COUNT=$(echo "$ANALYSES_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
if [ "$ANALYSES_COUNT" -gt 0 ]; then
  echo -e "  ${GREEN}✅ $ANALYSES_COUNT análise(s) encontrada(s)${NC}"
else
  echo -e "  ${YELLOW}⚠️  Nenhuma análise encontrada${NC}"
fi

# Resumo Final
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Teste Completo Finalizado!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Resumo:${NC}"
echo -e "  • Projeto ID: ${BLUE}$PROJECT_ID${NC}"
if [ -n "$RECORD_ID_1" ]; then
  echo -e "  • Registro 1 (3DGS): ${BLUE}$RECORD_ID_1${NC}"
fi
if [ -n "$RECORD_ID_2" ]; then
  echo -e "  • Registro 2 (Cubo Parcial): ${BLUE}$RECORD_ID_2${NC}"
fi
if [ -n "$ANALYSIS_ID" ]; then
  echo -e "  • Análise ID: ${BLUE}$ANALYSIS_ID${NC}"
fi

echo -e "\n${YELLOW}Próximos passos:${NC}"
echo -e "  • Verificar status: ${BLUE}GET /api/analyses/$ANALYSIS_ID${NC}"
echo -e "  • Visualizar arquivo: ${BLUE}GET /api/$PROJECT_ID/registro/$RECORD_ID_1${NC}"
echo -e "  • Ver resultados: ${BLUE}GET /api/$PROJECT_ID/analise/$ANALYSIS_ID${NC}"

echo ""

