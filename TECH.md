# 🛠️ Tecnologias Utilizadas - Backend Pipeline MVP

Este documento descreve as tecnologias e ferramentas utilizadas no backend de
gerenciamento de pipeline para o projeto de monitoramento de canteiros de obras
do Metrô SP.

## 📦 Stack Principal

### **Node.js**

- **Versão**: 20.x ou superior
- **Propósito**: Runtime JavaScript assíncrono e orientado a eventos
- **Por que usar**: Excelente para I/O assíncrono, gerenciamento de processos
  filhos e APIs REST

### **TypeScript**

- **Versão**: 5.3+
- **Propósito**: Superset tipado do JavaScript
- **Por que usar**:
    - Type safety para reduzir erros em tempo de desenvolvimento
    - Melhor autocomplete e IntelliSense
    - Facilita manutenção e refatoração do código

### **Express.js**

- **Versão**: 4.18+
- **Propósito**: Framework web minimalista para Node.js
- **Por que usar**:
    - Padrão de mercado para APIs REST em Node.js
    - Middleware flexível e extensível
    - Grande comunidade e documentação

### **PostgreSQL**

- **Versão**: 16 (via Docker)
- **Propósito**: Banco de dados relacional para persistir o estado de projetos,
  registros e análises.

### **Docker & Docker Compose**

- **Propósito**: Gerenciamento de container para o banco de dados PostgreSQL,
  garantindo um ambiente de desenvolvimento e produção consistente.

## 🔧 Dependências Principais

### **`pg` (node-postgres)**

- **Propósito**: Driver non-blocking para conexão com o banco de dados
  PostgreSQL.

### **cors**

- **Versão**: 2.8+
- **Propósito**: Middleware para habilitar CORS (Cross-Origin Resource Sharing)
- **Por que usar**: Permite que o frontend (web/mobile) faça requisições ao
  backend

### **multer**

- **Versão**: 1.4+
- **Propósito**: Middleware para upload de arquivos multipart/form-data
- **Por que usar**: Necessário para receber fotos do canteiro de obras via HTTP

### **dotenv**

- **Versão**: 16.3+
- **Propósito**: Carregamento de variáveis de ambiente a partir de arquivo
  `.env`
- **Por que usar**: Gerenciamento seguro de configurações (portas, caminhos,
  credenciais)

### **uuid**

- **Versão**: 9.0+
- **Propósito**: Geração de identificadores únicos universais (UUID)
- **Por que usar**: Criar IDs únicos para jobs de processamento

## 🚀 Módulos Nativos do Node.js Utilizados

### **child_process**

- **Módulo nativo**
- **Propósito**: Executar processos filhos (ferramentas CLI externas)
- **Funções utilizadas**:
    - `spawn()`: Executa comandos CLI e monitora stdout/stderr em tempo real
    - Permite capturar logs e progresso das ferramentas de processamento

### **fs (File System)**

- **Módulo nativo**
- **Propósito**: Operações de sistema de arquivos
- **Funções utilizadas**:
    - Criação de diretórios para uploads, outputs e logs
    - Leitura/escrita de arquivos de relatório
    - Verificação de existência de arquivos

### **path**

- **Módulo nativo**
- **Propósito**: Manipulação de caminhos de arquivos
- **Por que usar**: Garantir compatibilidade cross-platform (Windows/Mac/Linux)

## 🏗️ Estrutura do Projeto

```
analise-metro-backend/
├── docker/
│   ├── init.sql                 # Script de inicialização do banco de dados
│   ├── docker-compose.yml       # Define o serviço do PostgreSQL
│   └── pgdata/                  # Diretório de presistência de dados do PostgreSQL (gitignored)
├── src/
│   ├── core/
│   │   ├── controllers/           # Controladores responsáveis por lidar com as requisições HTTP
│   │   ├── routes/                # Definição das rotas da aplicação
│   │   └── services/              # Camada de lógica e regras de negócio
│   ├── shared/
│   │   ├── data/                  # Dados brutos, uploads e outputs (gitignored)
│   │   ├── database/              # Conexão e configuração do banco de dados
│   │   ├── functions/             # Funções utilitárias e helpers globais
│   │   ├── interfaces/            # Definições de interfaces TypeScript
│   │   └── types/                 # Tipos globais usados na aplicação
│   └── index.ts                   # Ponto de entrada do servidor
├── dist/                        # Código compilado (TypeScript → JavaScript)
├── logs/                        # Logs de execução (gitignored)
├── package.json
├── tsconfig.json
└── TECH.md                      # Este arquivo
```

## 🔄 Fluxo de Processamento (Stateful)

O sistema agora é "stateful" (armazena estado) e depende do banco de dados:

1.  **Criação do Projeto**: Usuário faz `POST /api/projects` com um arquivo BIM.
    O backend salva o arquivo em `data/uploads/projects/<id>` e cria uma entrada
    na tabela `project`.
2.  **Criação do Registro**: Usuário faz `POST /api/projects/<id>/records` com
    fotos. O backend salva os arquivos em
    `data/uploads/projects/<id>/records/<id>` e cria uma entrada na tabela
    `record`.
3.  **Início da Análise**: Usuário faz `POST /api/analyses` com `projectId` e
    `recordId`. O backend cria uma entrada na tabela `analysis` com
    `status: 'pending'` e retorna um `jobId` (que é o `analysis.id`).
4.  **Processamento Assíncrono**: O `PipelineManager` (em background):
    - Busca os dados do `project` e `record` no DB.
    - Executa a **Etapa 1 (3DGS)** (ex: `IMAGE_PROCESSING_CLI`).
    - Salva o resultado (ex: `reconstrucao.ply`) em
      `data/outputs/analyses/<id>`.
    - Atualiza a tabela `record` com o `record_path`.
    - Executa a **Etapa 2 (CloudCompare)** (ex: `BIM_COMPARISON_CLI`).
    - Salva o resultado (ex: `comparacao.ply`) em `data/outputs/analyses/<id>`.
    - Atualiza a tabela `analysis` com `status: 'completed'` e os caminhos de
      resultado.
5.  **Monitoramento**: O frontend consulta o status via `GET /api/analyses/:id`
    repetidamente.

## 🎯 Endpoints da API

### `POST /api/processar-fotos`

- **Body**: `multipart/form-data`
    - `fotos`: arquivo(s) de imagem (máx. 10, 100MB cada)
    - `modeloBim`: caminho para modelo BIM (opcional)
    - `parametros`: JSON com configurações (opcional)
- **Resposta**: `202 Accepted` com `jobId`

### `GET /api/jobs/:jobId`

- **Resposta**: Status completo do job (progresso, logs, paths de saída)

### `GET /api/jobs`

- **Resposta**: Lista de todos os jobs

### `DELETE /api/jobs/:jobId`

- **Ação**: Cancela job em execução
- **Resposta**: Confirmação de cancelamento

## 🔌 Integração com Ferramentas CLI

O backend foi projetado para executar ferramentas CLI externas através do módulo
`child_process`. As ferramentas devem seguir o padrão:

### Variáveis de Ambiente (Configuração)

```bash
IMAGE_PROCESSING_CLI=./tools/image-processor
BIM_COMPARISON_CLI=./tools/bim-comparison
```

### Formato Esperado das CLIs

**Processamento de Imagens:**

```bash
./tools/image-processor \
  --input foto1.jpg,foto2.jpg \
  --output ./data/outputs/analyses/1/reconstrucao_3dgs.ply \
  --format ply
```

**Comparação BIM:**

```bash
CloudCompare -SILENT -AUTO_SAVE OFF \
  -O ./data/uploads/projects/1/modelo.ifc \
  -SAMPLE_MESH POINTS 1000000 \
  -C_EXPORT_FMT PLY \
  -O ./data/outputs/analyses/1/reconstrucao_3dgs.ply \
  -ICP \
  -C2C_DIST \
  -SF_CONVERT_TO_RGB FALSE \
  -C_EXPORT_FMT PLY \
  -SAVE_CLOUDS FILE ./data/outputs/analyses/1/comparacao_c2c.ply
```

### Saída Esperada

- **stdout**: Logs de progresso (uma linha por evento)
- **stderr**: Avisos e erros
- **Exit code**: 0 para sucesso, != 0 para falha

## ⚙️ Configurações (Variáveis de Ambiente)

| Variável               | Padrão                    | Descrição                          |
| ---------------------- | ------------------------- | ---------------------------------- |
| `PORT`                 | `3000`                    | Porta do servidor HTTP             |
| `UPLOAD_DIR`           | `./uploads`               | Diretório para fotos recebidas     |
| `OUTPUT_DIR`           | `./outputs`               | Diretório para resultados          |
| `LOGS_DIR`             | `./logs`                  | Diretório para logs                |
| `MAX_CONCURRENT_JOBS`  | `3`                       | Máximo de jobs simultâneos         |
| `JOB_TIMEOUT_MS`       | `3600000`                 | Timeout por job (1 hora)           |
| `IMAGE_PROCESSING_CLI` | `./tools/image-processor` | Caminho para CLI de imagens        |
| `BIM_COMPARISON_CLI`   | `./tools/bim-comparison`  | Caminho para CLI de comparação BIM |

## 🧪 Desenvolvimento

### Instalação

```bash
npm install
```

### Desenvolvimento (com hot-reload)

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Produção

```bash
npm start
```

## 📝 Próximos Passos (Melhorias Futuras)

- [ ] Sistema de fila de jobs (Bull/BullMQ) para gerenciar processamento
      assíncrono
- [ ] WebSockets para atualizações em tempo real do progresso
- [ ] Autenticação e autorização (JWT)
- [ ] Validação de arquivos (tipo, tamanho, formato)
- [ ] Compressão de imagens antes do processamento
- [ ] Cache de resultados
- [ ] Métricas e monitoramento (Prometheus)
- [ ] Testes unitários e de integração (Jest)
- [ ] Documentação OpenAPI/Swagger

## 🔗 Referências

- [Node.js Documentation](https://nodejs.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [child_process Documentation](https://nodejs.org/api/child_process.html)
