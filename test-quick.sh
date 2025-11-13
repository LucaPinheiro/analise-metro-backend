#!/bin/bash

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧪 Teste Rápido do Backend Metro SP${NC}\n"

# 1. Health Check
echo -n "1. Health Check... "
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] && echo "$HEALTH_BODY" | grep -q "ok"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌ Servidor não está respondendo (HTTP $HTTP_CODE)${NC}"
  echo "Resposta: $HEALTH_BODY"
  exit 1
fi

# 2. Criar Projeto
echo -n "2. Criando projeto com tinker.obj... "

# Verificar onde está o arquivo
if [ -f "./test-files/tinker.obj" ]; then
  BIM_FILE="./test-files/tinker.obj"
elif [ -f "./tinker.obj" ]; then
  BIM_FILE="./tinker.obj"
else
  echo -e "${RED}❌ Arquivo tinker.obj não encontrado${NC}"
  echo "   Procurando em: ./test-files/tinker.obj ou ./tinker.obj"
  exit 1
fi

PROJECT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/projects" \
  -F "name=Cubo Mágico Teste" \
  -F "description=Teste automatizado" \
  -F "modeloBim=@$BIM_FILE")

HTTP_CODE=$(echo "$PROJECT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PROJECT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  PROJECT_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
  if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
    echo -e "${GREEN}✅ ID: $PROJECT_ID${NC}"
  else
    echo -e "${RED}❌ Falha ao extrair ID${NC}"
    echo "Resposta: $RESPONSE_BODY"
    exit 1
  fi
else
  echo -e "${RED}❌ Falha ao criar projeto (HTTP $HTTP_CODE)${NC}"
  echo "Resposta: $RESPONSE_BODY"
  exit 1
fi

# 3. Listar Projetos
echo -n "3. Listando projetos... "
PROJECTS_COUNT=$(curl -s "$BASE_URL/api/projects" | grep -o '"id"' | wc -l)
if [ "$PROJECTS_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ ($PROJECTS_COUNT projetos)${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# 4. Obter Projeto Específico
echo -n "4. Obtendo projeto $PROJECT_ID... "
if curl -s "$BASE_URL/api/projects/$PROJECT_ID" | grep -q "Cubo Mágico"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# 5. Visualizar BIM
echo -n "5. Testando visualização de BIM... "
if curl -s "$BASE_URL/api/$PROJECT_ID/bim/0" -o /tmp/modelo_test.obj 2>/dev/null && [ -f /tmp/modelo_test.obj ]; then
  FILE_SIZE=$(stat -f%z /tmp/modelo_test.obj 2>/dev/null || stat -c%s /tmp/modelo_test.obj 2>/dev/null)
  if [ "$FILE_SIZE" -gt 0 ]; then
    echo -e "${GREEN}✅ (${FILE_SIZE} bytes)${NC}"
    rm /tmp/modelo_test.obj
  else
    echo -e "${RED}❌ Arquivo vazio${NC}"
  fi
else
  echo -e "${RED}❌ Falha ao baixar${NC}"
fi

echo -e "\n${GREEN}✅ Testes básicos concluídos!${NC}"
echo -e "\n${YELLOW}Próximos passos:${NC}"
echo "  - Teste upload de fotos: POST /api/projects/$PROJECT_ID/records"
echo "  - Teste processamento: POST /api/$PROJECT_ID/photo-processing-full"
echo "  - Veja TESTING.md para mais detalhes"

