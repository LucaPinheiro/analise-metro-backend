# Scripts de Teste - Pipeline MVP

Este diretório contém scripts para testar a pipeline completa end-to-end usando ferramentas mockadas.

## Scripts Disponíveis

### `test-pipeline-mvp.sh`

Script completo que executa toda a pipeline de ponta a ponta:

1. ✅ Cria projeto (upload BIM)
2. ✅ Envia fotos
3. ✅ Processa reconstrução 3D (3DGS mock)
4. ✅ Executa comparação C2C (CloudCompare mock)
5. ✅ Gera relatório final

## Como Usar

### Pré-requisitos

1. Servidor rodando:
   ```bash
   npm run dev
   ```

2. Banco de dados ativo:
   ```bash
   cd docker
   docker-compose up -d
   ```

### Executar Teste Completo

```bash
# Da raiz do projeto
./scripts/test-pipeline-mvp.sh
```

O script irá:
- Verificar se o servidor está respondendo
- Criar um projeto com modelo BIM mock
- Enviar 5 fotos mock
- Iniciar processamento completo
- Aguardar conclusão (monitora progresso)
- Exibir relatório final com métricas

## Ferramentas Mock

### `tools/fake_3dgs.sh`
- Simula processamento 3DGS
- Gera arquivo PLY com ~50.000 pontos
- Logs detalhados de cada etapa

### `tools/bim-comparison.sh`
- Simula CloudCompare
- Gera comparação C2C com métricas
- Cria arquivo PLY colorido por distância
- Gera arquivo JSON com métricas estatísticas

## Endpoints Úteis

Após executar o teste:

```bash
# Ver status da análise
curl http://localhost:3000/api/analyses/{ANALYSIS_ID}

# Ver relatório detalhado
curl http://localhost:3000/api/analyses/{ANALYSIS_ID}/report

# Visualizar arquivo gerado
curl http://localhost:3000/api/{PROJECT_ID}/analise/{ANALYSIS_ID}
```

## Logs da Pipeline

A pipeline gera logs detalhados em cada etapa:

- **Etapa 0**: Verificação de reconstruções existentes
- **Etapa 1**: Reconstrução 3D (3DGS)
- **Etapa 2**: Comparação Cloud-to-Cloud (C2C)
- **Finalização**: Resumo e arquivos gerados

Todos os logs são salvos no campo `logs` da análise e podem ser visualizados via API.

## Resultados Esperados

Ao final da execução, você terá:

- ✅ Projeto criado no banco
- ✅ Registro com fotos salvas
- ✅ Arquivo PLY de reconstrução 3D
- ✅ Arquivo PLY de comparação C2C
- ✅ Arquivo JSON com métricas
- ✅ Status: `completed`
- ✅ Progresso: `100%`

## Troubleshooting

### Script não executa
```bash
chmod +x scripts/test-pipeline-mvp.sh
```

### Servidor não responde
Verifique se está rodando:
```bash
curl http://localhost:3000/health
```

### Banco de dados não conecta
```bash
cd docker
docker-compose ps
docker-compose up -d
```

