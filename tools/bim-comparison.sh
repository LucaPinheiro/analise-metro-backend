#!/bin/bash

# Script mock para simular CloudCompare em ambiente de desenvolvimento
# Este script simula comparação Cloud-to-Cloud (C2C) entre modelo BIM e reconstrução 3D
# Para apresentação MVP - gera arquivo PLY com distâncias e arquivo JSON com métricas

set -e

echo "═══════════════════════════════════════════════════════════" >&2
echo "  🏗️  [MOCK CloudCompare] Simulação de Comparação C2C" >&2
echo "═══════════════════════════════════════════════════════════" >&2
echo "" >&2

# Extrair caminhos dos argumentos
BIM_PATH=""
RECONSTRUCTION_PATH=""
OUTPUT_PATH=""
SUMMARY_JSON_PATH=""

ARGS_ARRAY=("$@")
for i in "${!ARGS_ARRAY[@]}"; do
    arg="${ARGS_ARRAY[$i]}"
    next_arg="${ARGS_ARRAY[$i+1]}"
    
    case "$arg" in
        -O)
            if [ -z "$BIM_PATH" ]; then
                BIM_PATH="$next_arg"
            elif [ -z "$RECONSTRUCTION_PATH" ]; then
                RECONSTRUCTION_PATH="$next_arg"
            fi
            ;;
        FILE)
            if [ -n "$next_arg" ]; then
                OUTPUT_PATH="$next_arg"
            fi
            ;;
    esac
done

# Se não encontrou FILE, procurar por último argumento que parece ser um caminho
if [ -z "$OUTPUT_PATH" ]; then
    for arg in "$@"; do
        if [[ "$arg" == *"comparacao"* ]] || [[ "$arg" == *"c2c"* ]] || [[ "$arg" == *".ply" ]]; then
            OUTPUT_PATH="$arg"
        fi
    done
fi

echo "📋 [MOCK CloudCompare] Etapa 1/5: Carregando modelos..." >&2
if [ -n "$BIM_PATH" ] && [ -f "$BIM_PATH" ]; then
    BIM_SIZE=$(stat -f%z "$BIM_PATH" 2>/dev/null || stat -c%s "$BIM_PATH" 2>/dev/null || echo "0")
    echo "   ✓ Modelo BIM carregado: $(basename "$BIM_PATH") ($(numfmt --to=iec-i --suffix=B $BIM_SIZE 2>/dev/null || echo "${BIM_SIZE}B"))" >&2
else
    echo "   ⚠️  Modelo BIM não encontrado, usando simulação" >&2
fi

if [ -n "$RECONSTRUCTION_PATH" ] && [ -f "$RECONSTRUCTION_PATH" ]; then
    RECON_SIZE=$(stat -f%z "$RECONSTRUCTION_PATH" 2>/dev/null || stat -c%s "$RECONSTRUCTION_PATH" 2>/dev/null || echo "0")
    echo "   ✓ Reconstrução 3D carregada: $(basename "$RECONSTRUCTION_PATH") ($(numfmt --to=iec-i --suffix=B $RECON_SIZE 2>/dev/null || echo "${RECON_SIZE}B"))" >&2
else
    echo "   ⚠️  Reconstrução 3D não encontrada, usando simulação" >&2
fi

sleep 1

echo "" >&2
echo "🔄 [MOCK CloudCompare] Etapa 2/5: Alinhando modelos (ICP)..." >&2
echo "   ✓ Aplicando algoritmo ICP (Iterative Closest Point)" >&2
echo "   ✓ Iteração 1/10: Erro médio inicial: 15.2mm" >&2
echo "   ✓ Iteração 5/10: Erro médio: 8.7mm" >&2
echo "   ✓ Iteração 10/10: Erro médio final: 2.3mm" >&2
echo "   ✅ Alinhamento concluído com sucesso" >&2

sleep 1

echo "" >&2
echo "📏 [MOCK CloudCompare] Etapa 3/5: Calculando distâncias C2C..." >&2
echo "   ✓ Comparando ~50.000 pontos do BIM com ~50.000 pontos da reconstrução" >&2
echo "   ✓ Calculando distância euclidiana para cada ponto" >&2
echo "   ✓ Aplicando filtros de outliers" >&2

# Simular métricas realistas
MEAN_DISTANCE=$(echo "scale=2; 2.3 + ($RANDOM % 100) / 100" | bc 2>/dev/null || echo "2.45")
STD_DEVIATION=$(echo "scale=2; 1.8 + ($RANDOM % 50) / 100" | bc 2>/dev/null || echo "2.12")
MAX_DISTANCE=$(echo "scale=2; $MEAN_DISTANCE + $STD_DEVIATION * 3" | bc 2>/dev/null || echo "8.81")
MIN_DISTANCE=$(echo "scale=2; $MEAN_DISTANCE - $STD_DEVIATION" | bc 2>/dev/null || echo "0.33")

echo "   ✓ Distância média calculada: ${MEAN_DISTANCE}mm" >&2
echo "   ✓ Desvio padrão: ${STD_DEVIATION}mm" >&2
echo "   ✓ Distância máxima: ${MAX_DISTANCE}mm" >&2
echo "   ✓ Distância mínima: ${MIN_DISTANCE}mm" >&2

sleep 1

echo "" >&2
echo "🎨 [MOCK CloudCompare] Etapa 4/5: Aplicando cores por distância..." >&2
echo "   ✓ Mapeando distâncias para escala de cores RGB" >&2
echo "   ✓ Verde: diferenças < 5mm (conformidade)" >&2
echo "   ✓ Amarelo: diferenças 5-10mm (atenção)" >&2
echo "   ✓ Vermelho: diferenças > 10mm (não conformidade)" >&2

sleep 1

echo "" >&2
echo "💾 [MOCK CloudCompare] Etapa 5/5: Salvando resultados..." >&2

# Criar diretório de saída se não existir
if [ -n "$OUTPUT_PATH" ]; then
    OUTPUT_DIR=$(dirname "$OUTPUT_PATH")
    if [ ! -d "$OUTPUT_DIR" ]; then
        mkdir -p "$OUTPUT_DIR"
        echo "   ✓ Diretório criado: $OUTPUT_DIR" >&2
    fi
    
    # Criar arquivo PLY com distâncias simuladas
    cat > "$OUTPUT_PATH" << PLYEOF
ply
format ascii 1.0
comment Cloud-to-Cloud comparison result - Mock for MVP demonstration
comment Mean distance: ${MEAN_DISTANCE}mm, Std deviation: ${STD_DEVIATION}mm
element vertex 50000
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
property float distance
end_header
PLYEOF

    # Gerar pontos com distâncias simuladas
    for i in $(seq 1 50000); do
        # Coordenadas
        X=$(echo "scale=6; ($RANDOM / 32767.0 - 0.5) * 10" | bc 2>/dev/null || echo "0")
        Y=$(echo "scale=6; ($RANDOM / 32767.0 - 0.5) * 10" | bc 2>/dev/null || echo "0")
        Z=$(echo "scale=6; ($RANDOM / 32767.0 - 0.5) * 10" | bc 2>/dev/null || echo "0")
        
        # Distância simulada (normalmente distribuída)
        DIST=$(echo "scale=2; $MEAN_DISTANCE + ($RANDOM / 32767.0 - 0.5) * $STD_DEVIATION * 2" | bc 2>/dev/null || echo "$MEAN_DISTANCE")
        if (( $(echo "$DIST < 0" | bc -l 2>/dev/null || echo "0") )); then
            DIST="0.00"
        fi
        
        # Cores baseadas na distância
        if (( $(echo "$DIST < 5" | bc -l 2>/dev/null || echo "1") )); then
            # Verde (conformidade)
            R=0
            G=255
            B=0
        elif (( $(echo "$DIST < 10" | bc -l 2>/dev/null || echo "0") )); then
            # Amarelo (atenção)
            R=255
            G=255
            B=0
        else
            # Vermelho (não conformidade)
            R=255
            G=0
            B=0
        fi
        
        echo "$X $Y $Z $R $G $B $DIST" >> "$OUTPUT_PATH"
    done
    
    FILE_SIZE=$(stat -f%z "$OUTPUT_PATH" 2>/dev/null || stat -c%s "$OUTPUT_PATH" 2>/dev/null || echo "0")
    FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc 2>/dev/null || echo "0")
    
    echo "   ✓ Arquivo PLY gerado: $(basename "$OUTPUT_PATH")" >&2
    echo "   ✓ Tamanho: ${FILE_SIZE_MB} MB" >&2
    
    # Criar arquivo JSON com métricas
    SUMMARY_JSON_PATH="${OUTPUT_DIR}/summary_c2c.json"
    cat > "$SUMMARY_JSON_PATH" << JSONEOF
{
  "comparison_type": "cloud_to_cloud",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "metrics": {
    "mean_distance_mm": ${MEAN_DISTANCE},
    "std_deviation_mm": ${STD_DEVIATION},
    "max_distance_mm": ${MAX_DISTANCE},
    "min_distance_mm": ${MIN_DISTANCE},
    "total_points": 50000,
    "points_within_tolerance": 42500,
    "tolerance_threshold_mm": 5.0,
    "conformity_percentage": 85.0
  },
  "files": {
    "bim_model": "$(basename "$BIM_PATH" 2>/dev/null || echo "unknown")",
    "reconstruction": "$(basename "$RECONSTRUCTION_PATH" 2>/dev/null || echo "unknown")",
    "output_ply": "$(basename "$OUTPUT_PATH")",
    "summary_json": "$(basename "$SUMMARY_JSON_PATH")"
  },
  "status": "completed",
  "message": "Comparação C2C concluída com sucesso. 85% dos pontos estão dentro da tolerância de 5mm."
}
JSONEOF
    
    echo "   ✓ Arquivo JSON de métricas gerado: $(basename "$SUMMARY_JSON_PATH")" >&2
else
    echo "   ⚠️  Caminho de saída não encontrado, criando arquivo padrão..." >&2
    DEFAULT_OUTPUT="./comparacao_c2c_mock.ply"
    cat > "$DEFAULT_OUTPUT" << 'EOF'
ply
format ascii 1.0
comment Mock C2C comparison file
element vertex 3
property float x
property float y
property float z
end_header
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
EOF
    echo "   ✓ Arquivo criado: $DEFAULT_OUTPUT" >&2
fi

echo "" >&2
echo "═══════════════════════════════════════════════════════════" >&2
echo "  ✅ [MOCK CloudCompare] Comparação C2C concluída!" >&2
echo "═══════════════════════════════════════════════════════════" >&2
echo "" >&2
echo "📊 Resumo da análise:" >&2
echo "   • Distância média: ${MEAN_DISTANCE}mm" >&2
echo "   • Desvio padrão: ${STD_DEVIATION}mm" >&2
echo "   • Conformidade: 85% (dentro de 5mm)" >&2
echo "   • Status: ✅ Análise concluída com sucesso" >&2
echo "" >&2

exit 0
