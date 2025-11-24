#!/bin/bash

# Script de teste end-to-end completo da pipeline MVP
# Executa todo o fluxo: Upload BIM → Upload Fotos → Processamento 3DGS → Comparação C2C
# Tudo usando scripts mock para demonstração

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚇 PIPELINE END-TO-END - TESTE COMPLETO MVP${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Este script executa a pipeline completa de ponta a ponta:${NC}"
echo -e "  1️⃣  Criar projeto (upload BIM)"
echo -e "  2️⃣  Upload de fotos"
echo -e "  3️⃣  Processamento 3DGS (reconstrução 3D)"
echo -e "  4️⃣  Comparação C2C (Cloud-to-Cloud)"
echo -e "  5️⃣  Relatório final"
echo ""

# Função auxiliar para extrair campo JSON
extract_field() {
    echo "$1" | grep -o "\"$2\":[^,}]*" | grep -o '[0-9]*' | head -1
}

# Função para aguardar análise completar
wait_for_analysis() {
    local ANALYSIS_ID=$1
    local MAX_WAIT=300  # 5 minutos máximo
    local ELAPSED=0
    local STATUS="pending"
    
    echo -e "${YELLOW}⏳ Aguardando conclusão da análise (máximo ${MAX_WAIT}s)...${NC}"
    
    while [ "$STATUS" != "completed" ] && [ "$STATUS" != "failed" ] && [ $ELAPSED -lt $MAX_WAIT ]; do
        sleep 3
        ELAPSED=$((ELAPSED + 3))
        
        STATUS_RESPONSE=$(curl -s "$BASE_URL/api/analyses/$ANALYSIS_ID" 2>/dev/null)
        STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | grep -o ':"[^"]*"' | grep -o '"[^"]*"' | tr -d '"')
        PROGRESS=$(extract_field "$STATUS_RESPONSE" "progress")
        
        if [ -n "$STATUS" ]; then
            echo -e "   Status: ${BLUE}$STATUS${NC} | Progresso: ${GREEN}${PROGRESS}%${NC} | Tempo: ${ELAPSED}s"
            
            # Mostrar últimos logs
            LOGS=$(echo "$STATUS_RESPONSE" | grep -o '"logs":\[.*\]' | head -c 200)
            if [ -n "$LOGS" ]; then
                echo -e "   ${CYAN}Últimos logs:${NC} ${LOGS:0:100}..."
            fi
        fi
    done
    
    if [ "$STATUS" = "completed" ]; then
        echo -e "${GREEN}✅ Análise concluída!${NC}"
        return 0
    elif [ "$STATUS" = "failed" ]; then
        echo -e "${RED}❌ Análise falhou${NC}"
        return 1
    else
        echo -e "${YELLOW}⚠️  Timeout aguardando análise${NC}"
        return 1
    fi
}

# ====================================================================
# ETAPA 1: VERIFICAR SERVIDOR
# ====================================================================
echo -e "${YELLOW}[1/5]${NC} Verificando servidor..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✅ Servidor respondendo${NC}"
else
    echo -e "  ${RED}❌ Servidor não está respondendo (HTTP $HTTP_CODE)${NC}"
    echo -e "  ${YELLOW}Certifique-se de que o servidor está rodando: npm run dev${NC}"
    exit 1
fi

# ====================================================================
# ETAPA 2: CRIAR PROJETO (UPLOAD BIM)
# ====================================================================
echo ""
echo -e "${YELLOW}[2/5]${NC} Criando projeto com modelo BIM..."

# Verificar arquivo BIM
BIM_FILE=""
if [ -f "./test-files/tinker.obj" ]; then
    BIM_FILE="./test-files/tinker.obj"
elif [ -f "./tinker.obj" ]; then
    BIM_FILE="./tinker.obj"
else
    echo -e "  ${RED}❌ Arquivo tinker.obj não encontrado${NC}"
    echo -e "  ${YELLOW}Criando arquivo mock temporário...${NC}"
    # Criar arquivo OBJ mock simples
    cat > /tmp/tinker_mock.obj << 'OBJEOF'
# Mock OBJ file for MVP testing
v 0.0 0.0 0.0
v 1.0 0.0 0.0
v 0.0 1.0 0.0
v 0.0 0.0 1.0
f 1 2 3
f 1 2 4
OBJEOF
    BIM_FILE="/tmp/tinker_mock.obj"
fi

PROJECT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/projects" \
    -F "name=Projeto MVP - Teste Pipeline Completa" \
    -F "description=Teste end-to-end da pipeline completa com mocks" \
    -F "modeloBim=@$BIM_FILE")

HTTP_CODE=$(echo "$PROJECT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PROJECT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    PROJECT_ID=$(extract_field "$RESPONSE_BODY" "id")
    if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
        echo -e "  ${GREEN}✅ Projeto criado (ID: $PROJECT_ID)${NC}"
    else
        echo -e "  ${RED}❌ Falha ao extrair ID do projeto${NC}"
        exit 1
    fi
else
    echo -e "  ${RED}❌ Falha ao criar projeto (HTTP $HTTP_CODE)${NC}"
    echo "  Resposta: $RESPONSE_BODY"
    exit 1
fi

# ====================================================================
# ETAPA 3: UPLOAD DE FOTOS E PROCESSAMENTO COMPLETO
# ====================================================================
echo ""
echo -e "${YELLOW}[3/5]${NC} Enviando fotos e iniciando processamento completo..."

# Criar imagens mock temporárias se não existirem
MOCK_IMAGES=()
for i in {1..5}; do
    MOCK_IMG="/tmp/foto_mock_$i.jpg"
    if [ ! -f "$MOCK_IMG" ]; then
        # Criar imagem mock usando ImageMagick ou simplesmente tocar arquivo
        touch "$MOCK_IMG"
        # Adicionar conteúdo mínimo para passar validação (100KB)
        dd if=/dev/zero of="$MOCK_IMG" bs=1024 count=100 2>/dev/null || echo "mock image $i" > "$MOCK_IMG"
    fi
    MOCK_IMAGES+=("$MOCK_IMG")
done

# Preparar comando curl com múltiplas fotos
CURL_CMD="curl -s -w \"\n%{http_code}\" -X POST \"$BASE_URL/api/$PROJECT_ID/photo-processing-full\""
for img in "${MOCK_IMAGES[@]}"; do
    CURL_CMD="$CURL_CMD -F \"fotos=@$img\""
done
CURL_CMD="$CURL_CMD -F \"name=Registro MVP - Pipeline Completa\""

PHOTO_RESPONSE=$(eval $CURL_CMD)
HTTP_CODE_P=$(echo "$PHOTO_RESPONSE" | tail -n1)
RESPONSE_BODY_P=$(echo "$PHOTO_RESPONSE" | sed '$d')

if [ "$HTTP_CODE_P" = "202" ] || [ "$HTTP_CODE_P" = "200" ]; then
    ANALYSIS_ID=$(extract_field "$RESPONSE_BODY_P" "analysisId")
    RECORD_ID=$(extract_field "$RESPONSE_BODY_P" "recordId")
    
    if [ -n "$ANALYSIS_ID" ] && [ "$ANALYSIS_ID" != "null" ]; then
        echo -e "  ${GREEN}✅ Processamento iniciado${NC}"
        echo -e "     Analysis ID: ${BLUE}$ANALYSIS_ID${NC}"
        echo -e "     Record ID: ${BLUE}$RECORD_ID${NC}"
        
        # ====================================================================
        # ETAPA 4: AGUARDAR CONCLUSÃO
        # ====================================================================
        echo ""
        echo -e "${YELLOW}[4/5]${NC} Processando pipeline..."
        echo ""
        
        if wait_for_analysis "$ANALYSIS_ID"; then
            # ====================================================================
            # ETAPA 5: RELATÓRIO FINAL
            # ====================================================================
            echo ""
            echo -e "${YELLOW}[5/5]${NC} Gerando relatório final..."
            echo ""
            
            FINAL_STATUS=$(curl -s "$BASE_URL/api/analyses/$ANALYSIS_ID")
            
            echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
            echo -e "${GREEN}  ✅ PIPELINE CONCLUÍDA COM SUCESSO!${NC}"
            echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
            echo ""
            
            # Extrair informações do status
            MEAN_DIST=$(echo "$FINAL_STATUS" | grep -o '"mean_distance":[0-9.]*' | grep -o '[0-9.]*' | head -1)
            STD_DEV=$(echo "$FINAL_STATUS" | grep -o '"std_deviation":[0-9.]*' | grep -o '[0-9.]*' | head -1)
            RESULT_PATH=$(echo "$FINAL_STATUS" | grep -o '"result_path":"[^"]*"' | grep -o ':"[^"]*"' | grep -o '"[^"]*"' | tr -d '"')
            
            echo -e "${CYAN}📊 Resumo da Execução:${NC}"
            echo -e "   • Projeto ID: ${BLUE}$PROJECT_ID${NC}"
            echo -e "   • Registro ID: ${BLUE}$RECORD_ID${NC}"
            echo -e "   • Análise ID: ${BLUE}$ANALYSIS_ID${NC}"
            echo ""
            
            if [ -n "$MEAN_DIST" ]; then
                echo -e "${CYAN}📈 Métricas da Comparação C2C:${NC}"
                echo -e "   • Distância média: ${GREEN}${MEAN_DIST}mm${NC}"
                if [ -n "$STD_DEV" ]; then
                    echo -e "   • Desvio padrão: ${GREEN}${STD_DEV}mm${NC}"
                fi
                echo ""
            fi
            
            if [ -n "$RESULT_PATH" ]; then
                echo -e "${CYAN}📁 Arquivos Gerados:${NC}"
                echo -e "   • Comparação C2C: ${BLUE}$RESULT_PATH${NC}"
                echo ""
            fi
            
            echo -e "${CYAN}🔗 Endpoints para Visualização:${NC}"
            echo -e "   • Status da análise: ${BLUE}GET /api/analyses/$ANALYSIS_ID${NC}"
            echo -e "   • Visualizar resultado: ${BLUE}GET /api/$PROJECT_ID/analise/$ANALYSIS_ID${NC}"
            echo -e "   • Visualizar reconstrução: ${BLUE}GET /api/$PROJECT_ID/registro/$RECORD_ID${NC}"
            echo ""
            
            echo -e "${GREEN}🎉 Pipeline end-to-end executada com sucesso!${NC}"
            echo ""
        else
            echo -e "${RED}❌ Pipeline falhou durante execução${NC}"
            exit 1
        fi
    else
        echo -e "  ${RED}❌ Falha ao extrair Analysis ID${NC}"
        exit 1
    fi
else
    echo -e "  ${RED}❌ Falha ao iniciar processamento (HTTP $HTTP_CODE_P)${NC}"
    echo "  Resposta: $RESPONSE_BODY_P"
    exit 1
fi

# Limpar arquivos temporários
rm -f /tmp/tinker_mock.obj /tmp/foto_mock_*.jpg 2>/dev/null

echo ""

