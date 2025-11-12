@echo off
set "ARQUIVO_PLY_ORIGEM=C:\Users\aless\Downloads\3dgs.ply"
echo [FAKE 3DGS] Copiando %ARQUIVO_PLY_ORIGEM% para %4
copy "%ARQUIVO_PLY_ORIGEM%" "%4"
exit /b 0