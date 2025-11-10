# 🚇 Metrô SP - Backend Pipeline de Processamento

Backend para gerenciamento de pipeline de processamento de imagens e comparação BIM para monitoramento de canteiros de obras do Metrô de São Paulo.

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 20.x ou superior
- npm ou yarn

### Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de exemplo de variáveis de ambiente
cp .env.example .env

# Editar .env com suas configurações
```

### Executar em Desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

### Build para Produção

```bash
npm run build
npm start
```

## 📡 Endpoints da API

### Health Check
```bash
GET /health
```

### Processar Fotos
```bash
POST /api/processar-fotos
Content-Type: multipart/form-data

Body:
- fotos: arquivo(s) de imagem
- modeloBim: caminho para modelo BIM (opcional)
- parametros: JSON string com parâmetros (opcional)
```

**Exemplo com cURL:**
```bash
curl -X POST http://localhost:3000/api/processar-fotos \
  -F "fotos=@foto1.jpg" \
  -F "fotos=@foto2.jpg" \
  -F "modeloBim=./modelos/projeto.ifc" \
  -F 'parametros={"threshold": 0.8, "outputFormat": "json"}'
```

**Resposta:**
```json
{
  "jobId": "uuid-do-job",
  "status": "processing",
  "message": "Processamento iniciado",
  "fotosRecebidas": 2,
  "timestamp": "2025-01-XX..."
}
```

### Consultar Status do Job
```bash
GET /api/jobs/:jobId
```

**Resposta:**
```json
{
  "jobId": "uuid-do-job",
  "status": "processing",
  "progress": 65,
  "logs": [
    "🚀 Iniciando processamento...",
    "📸 Etapa 1/3: Processando imagens...",
    "🏗️ Etapa 2/3: Comparando com modelo BIM..."
  ],
  "outputPaths": {
    "imagensProcessadas": ["path1", "path2"],
    "comparacaoBim": "path/to/comparacao.json",
    "relatorio": "path/to/relatorio.json"
  },
  "createdAt": "2025-01-XX...",
  "updatedAt": "2025-01-XX..."
}
```

### Listar Todos os Jobs
```bash
GET /api/jobs
```

### Cancelar Job
```bash
DELETE /api/jobs/:jobId
```

## 🔧 Configuração

Edite o arquivo `.env` para configurar:

- Porta do servidor
- Diretórios de trabalho (uploads, outputs, logs)
- Limite de jobs concorrentes
- Timeout por job
- Caminhos para ferramentas CLI externas

## 📚 Documentação

Consulte `TECH.md` para detalhes sobre as tecnologias utilizadas.

## 🏗️ Estrutura do Projeto

```
src/
├── index.ts                    # Servidor principal
├── routes/
│   └── pipeline.routes.ts      # Rotas da API
├── controllers/
│   └── pipeline.controller.ts  # Controllers
└── services/
    └── pipeline.manager.ts     # Gerenciamento de jobs e CLIs
```

## 🔌 Integração com Ferramentas CLI

O backend executa ferramentas CLI externas para processamento. Configure os caminhos no `.env`:

```bash
IMAGE_PROCESSING_CLI=./tools/image-processor
BIM_COMPARISON_CLI=./tools/bim-comparison
```

As ferramentas devem seguir o padrão de argumentos descrito em `TECH.md`.

