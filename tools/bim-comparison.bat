@echo off
REM Script mock para simular CloudCompare no Windows
REM Este script simula comparação Cloud-to-Cloud (C2C) entre modelo BIM e reconstrução 3D
REM Para apresentação MVP - gera arquivo PLY com distâncias e arquivo JSON com métricas

setlocal enabledelayedexpansion

echo ===============================================================
echo   [MOCK CloudCompare] Simulacao de Comparacao C2C
echo ===============================================================
echo.

REM Extrair caminhos dos argumentos
set BIM_PATH=
set RECONSTRUCTION_PATH=
set OUTPUT_PATH=
set ARG_COUNT=0
set LAST_ARG=

:parse_args
if "%~1"=="" goto :args_done
set /a ARG_COUNT+=1
if /i "%~1"=="-O" (
    if "!BIM_PATH!"=="" (
        set BIM_PATH=%~2
    ) else (
        set RECONSTRUCTION_PATH=%~2
    )
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="FILE" (
    set OUTPUT_PATH=%~2
    shift
    shift
    goto :parse_args
)
set LAST_ARG=%~1
shift
goto :parse_args

:args_done

REM Se não encontrou FILE, usar último argumento que parece ser caminho
if "%OUTPUT_PATH%"=="" (
    if not "%LAST_ARG%"=="" (
        echo %LAST_ARG% | findstr /i "comparacao c2c .ply" >nul
        if !errorlevel!==0 set OUTPUT_PATH=%LAST_ARG%
    )
)

echo [MOCK CloudCompare] Etapa 1/5: Carregando modelos... >&2
if not "%BIM_PATH%"=="" if exist "%BIM_PATH%" (
    for %%F in ("%BIM_PATH%") do echo    ✓ Modelo BIM carregado: %%~nxF >&2
) else (
    echo    ⚠️  Modelo BIM nao encontrado, usando simulacao >&2
)

if not "%RECONSTRUCTION_PATH%"=="" if exist "%RECONSTRUCTION_PATH%" (
    for %%F in ("%RECONSTRUCTION_PATH%") do echo    ✓ Reconstrucao 3D carregada: %%~nxF >&2
) else (
    echo    ⚠️  Reconstrucao 3D nao encontrada, usando simulacao >&2
)

timeout /t 1 /nobreak >nul 2>&1

echo. >&2
echo [MOCK CloudCompare] Etapa 2/5: Alinhando modelos (ICP)... >&2
echo    ✓ Aplicando algoritmo ICP (Iterative Closest Point) >&2
echo    ✓ Iteracao 1/10: Erro medio inicial: 15.2mm >&2
echo    ✓ Iteracao 5/10: Erro medio: 8.7mm >&2
echo    ✓ Iteracao 10/10: Erro medio final: 2.3mm >&2
echo    ✅ Alinhamento concluido com sucesso >&2

timeout /t 1 /nobreak >nul 2>&1

echo. >&2
echo [MOCK CloudCompare] Etapa 3/5: Calculando distancias C2C... >&2
echo    ✓ Comparando ~50.000 pontos do BIM com ~50.000 pontos da reconstrucao >&2
echo    ✓ Calculando distancia euclidiana para cada ponto >&2
echo    ✓ Aplicando filtros de outliers >&2

REM Simular métricas realistas
set /a MEAN_DISTANCE=230 + %RANDOM% %% 100
set /a STD_DEVIATION=180 + %RANDOM% %% 50
set /a MAX_DISTANCE=%MEAN_DISTANCE% + %STD_DEVIATION% * 3
set /a MIN_DISTANCE=%MEAN_DISTANCE% - %STD_DEVIATION%

echo    ✓ Distancia media calculada: %MEAN_DISTANCE%mm >&2
echo    ✓ Desvio padrao: %STD_DEVIATION%mm >&2
echo    ✓ Distancia maxima: %MAX_DISTANCE%mm >&2
echo    ✓ Distancia minima: %MIN_DISTANCE%mm >&2

timeout /t 1 /nobreak >nul 2>&1

echo. >&2
echo [MOCK CloudCompare] Etapa 4/5: Aplicando cores por distancia... >&2
echo    ✓ Mapeando distancias para escala de cores RGB >&2
echo    ✓ Verde: diferencas ^< 5mm (conformidade) >&2
echo    ✓ Amarelo: diferencas 5-10mm (atencao) >&2
echo    ✓ Vermelho: diferencas ^> 10mm (nao conformidade) >&2

timeout /t 1 /nobreak >nul 2>&1

echo. >&2
echo [MOCK CloudCompare] Etapa 5/5: Salvando resultados... >&2

if not "%OUTPUT_PATH%"=="" (
    REM Criar diretório de saída se não existir
    for %%F in ("%OUTPUT_PATH%") do set OUTPUT_DIR=%%~dpF
    if not exist "%OUTPUT_DIR%" (
        mkdir "%OUTPUT_DIR%"
        echo    ✓ Diretorio criado: %OUTPUT_DIR% >&2
    )
    
    REM Gerar arquivo PLY mock usando PowerShell
    set POINT_COUNT=1000
    (
    echo ply
    echo format ascii 1.0
    echo comment Cloud-to-Cloud comparison result - Mock for MVP demonstration
    echo comment Mean distance: %MEAN_DISTANCE%mm, Std deviation: %STD_DEVIATION%mm
    echo element vertex %POINT_COUNT%
    echo property float x
    echo property float y
    echo property float z
    echo property uchar red
    echo property uchar green
    echo property uchar blue
    echo property float distance
    echo end_header
    ) > "%OUTPUT_PATH%"
    
    REM Gerar pontos com distâncias simuladas usando PowerShell
    powershell -Command "$r = New-Object Random; $mean = %MEAN_DISTANCE% / 100.0; $std = %STD_DEVIATION% / 100.0; 1..%POINT_COUNT% | ForEach-Object { $x = ($r.NextDouble() - 0.5) * 10; $y = ($r.NextDouble() - 0.5) * 10; $z = ($r.NextDouble() - 0.5) * 10; $dist = $mean + ($r.NextDouble() - 0.5) * $std * 2; if ($dist -lt 0) { $dist = 0 }; if ($dist -lt 0.05) { $r=0; $g=255; $b=0 } elseif ($dist -lt 0.10) { $r=255; $g=255; $b=0 } else { $r=255; $g=0; $b=0 }; '{0:F6} {1:F6} {2:F6} {3} {4} {5} {6:F6}' -f $x, $y, $z, $r, $g, $b, $dist }" >> "%OUTPUT_PATH%"
    
    for %%F in ("%OUTPUT_PATH%") do echo    ✓ Arquivo PLY gerado: %%~nxF >&2
    
    REM Criar arquivo JSON com métricas
    set SUMMARY_JSON=%OUTPUT_DIR%summary_c2c.json
    (
    echo {
    echo   "comparison_type": "cloud_to_cloud",
    echo   "timestamp": "%date% %time%",
    echo   "metrics": {
    echo     "mean_distance_mm": %MEAN_DISTANCE%,
    echo     "std_deviation_mm": %STD_DEVIATION%,
    echo     "max_distance_mm": %MAX_DISTANCE%,
    echo     "min_distance_mm": %MIN_DISTANCE%,
    echo     "total_points": %POINT_COUNT%,
    echo     "points_within_tolerance": 850,
    echo     "tolerance_threshold_mm": 5.0,
    echo     "conformity_percentage": 85.0
    echo   },
    echo   "status": "completed",
    echo   "message": "Comparacao C2C concluida com sucesso. 85%% dos pontos estao dentro da tolerancia de 5mm."
    echo }
    ) > "%SUMMARY_JSON%"
    
    echo    ✓ Arquivo JSON de metricas gerado: summary_c2c.json >&2
) else (
    echo    ⚠️  Caminho de saida nao encontrado, criando arquivo padrao... >&2
    set DEFAULT_OUTPUT=comparacao_c2c_mock.ply
    echo ply > "%DEFAULT_OUTPUT%"
    echo format ascii 1.0 >> "%DEFAULT_OUTPUT%"
    echo element vertex 3 >> "%DEFAULT_OUTPUT%"
    echo property float x >> "%DEFAULT_OUTPUT%"
    echo property float y >> "%DEFAULT_OUTPUT%"
    echo property float z >> "%DEFAULT_OUTPUT%"
    echo end_header >> "%DEFAULT_OUTPUT%"
    echo 0.0 0.0 0.0 >> "%DEFAULT_OUTPUT%"
    echo 1.0 0.0 0.0 >> "%DEFAULT_OUTPUT%"
    echo 0.0 1.0 0.0 >> "%DEFAULT_OUTPUT%"
    echo    ✓ Arquivo criado: %DEFAULT_OUTPUT% >&2
)

echo. >&2
echo ===============================================================
echo   [MOCK CloudCompare] Comparacao C2C concluida!
echo ===============================================================
echo. >&2
echo [MOCK CloudCompare] Resumo da analise: >&2
echo    • Distancia media: %MEAN_DISTANCE%mm >&2
echo    • Desvio padrao: %STD_DEVIATION%mm >&2
echo    • Conformidade: 85%% (dentro de 5mm) >&2
echo    • Status: ✅ Analise concluida com sucesso >&2
echo. >&2

exit /b 0

