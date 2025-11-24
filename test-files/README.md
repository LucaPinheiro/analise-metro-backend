# Arquivos de Teste

Esta pasta contém arquivos de teste para o sistema.

## Arquivos PLY

Coloque seus arquivos PLY aqui (ex: `3dgs.ply`, `cuboParc.ply`) para usar nos testes.

## Estrutura Recomendada

```
test-files/
├── README.md (este arquivo)
├── 3dgs.ply (arquivo de reconstrução 3DGS)
├── cuboParc.ply (arquivo de reconstrução parcial)
└── tinker.obj (modelo BIM de teste)
```

## Como Usar

1. Coloque seus arquivos PLY nesta pasta
2. Execute o script de teste completo: `./test-complete.sh`
3. Ou use manualmente via API:

```bash
# Importar PLY como registro
curl -X POST http://localhost:3000/api/2/records/import-ply \
  -F "name=Registro 3DGS" \
  -F "plyFile=@test-files/3dgs.ply"

# Executar análise
curl -X POST http://localhost:3000/api/2/analysis-full \
  -H "Content-Type: application/json" \
  -d '{"recordId": 1}'
```

