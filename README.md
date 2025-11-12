# 🚇 Metrô SP - Backend Pipeline de Processamento

Backend para gerenciamento de pipeline de processamento de imagens e comparação
BIM para monitoramento de canteiros de obras do Metrô de São Paulo.

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

### Iniciar o Prisma
```bash
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
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

# 📡 Endpoints da API (Fluxo de Trabalho)

### A API agora é RESTful e segue um fluxo lógico:

1. Crie um Projeto (enviando o BIM).

2. Adicione Registros (fotos) a esse projeto.

3. Inicie uma Análise para comparar o BIM e um registro.

## 📡 Endpoints da API

### Health Check

```bash
GET /health
```

### Projetos

```bash
POST /api/projects
Content-Type: multipart/form-data
  - modeloBim: O arquivo (.ifc, .dwg, .obj) de até 5GB.
  - name: Nome do projeto (ex: "Estação Morumbi - Bloco A").
  - description: Descrição (opcional).

Body:
- fotos: arquivo(s) de imagem
- modeloBim: caminho para modelo BIM (opcional)
- parametros: JSON string com parâmetros (opcional)

curl -X POST http://localhost:3000/api/projects \
  -F "name=Projeto Estação Morumbi" \
  -F "description=Bloco A da estação" \
  -F "modeloBim=@./meus_modelos/projeto_final.ifc"

GET /api/projects
  - Lista todos os projetos.

GET /api/projects/:id
  - Obtém detalhes de um projeto específico.
```

### Registro

```bash
POST /api/projects/:id/records
  - Adiciona um novo registro de fotos a um projeto existente.
Content-Type: multipart/form-data
  - fotos: Array de arquivos de imagem (ex: fotos=@foto1.jpg, fotos=@foto2.jpg).
  - name: Nome do registro (ex: "Semana 5 - Fachada Leste").

curl -X POST http://localhost:3000/api/projects/1/records \
  -F "name=Semana 5 - Fachada Leste" \
  -F "fotos=@./fotos/img_001.jpg" \
  -F "fotos=@./fotos/img_002.jpg"

GET /api/projects/:id/records
  - Lista todos os registros de fotos de um projeto específico.
```

### Análises (Jobs)

```bash
POST /api/analyses
  - Inicia uma nova análise (job), comparando um projectId com um recordId.
Content-Type: application/json
  - projectId: ID do projeto (BIM)
  - recordId: ID do registro (Fotos)
  - parametros: JSON com parâmetros (opcional, ex: {"threshold": 0.8})

curl -X POST http://localhost:3000/api/analyses \
  -H "Content-Type: application/json" \
  -d '{
        "projectId": 1,
        "recordId": 1,
        "parametros": {"threshold": 0.9}
      }'

GET /api/analyses/:id
  - Consulta o status de uma análise (job). O jobId retornado acima é o id da análise.

GET /api/analyses
  - Lista todas as análises do sistema.

DELETE /api/analyses/:id
Cancela uma análise em execução.
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

## 🔌 Integração com Ferramentas CLI

O backend executa ferramentas CLI externas para processamento. Configure os
caminhos no `.env`:

```bash
IMAGE_PROCESSING_CLI=./tools/image-processor
BIM_COMPARISON_CLI=./tools/bim-comparison
```

As ferramentas devem seguir o padrão de argumentos descrito em `TECH.md`.
