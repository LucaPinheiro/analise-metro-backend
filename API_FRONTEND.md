# 🔌 Guia de Integração Frontend - API Metro SP

Documentação completa para integração do frontend com a API do backend Metro SP.

---

## 📋 Índice

1. [Configuração Base](#configuração-base)
2. [Estrutura de Respostas](#estrutura-de-respostas)
3. [Endpoints Completos](#endpoints-completos)
4. [Tipos TypeScript](#tipos-typescript)
5. [Fluxos de UI](#fluxos-de-ui)
6. [Tratamento de Erros](#tratamento-de-erros)
7. [Exemplos de Código](#exemplos-de-código)
8. [Visualização de Arquivos](#visualização-de-arquivos)

---

## ⚙️ Configuração Base

### URL Base da API

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
```

### Headers Padrão

```typescript
const defaultHeaders = {
  'Content-Type': 'application/json',
};

// Para uploads (multipart/form-data), não definir Content-Type
// O navegador define automaticamente com boundary
```

### CORS

O backend deve estar configurado para aceitar requisições do frontend. Verifique se o CORS está habilitado no backend.

---

## 📦 Estrutura de Respostas

### Resposta de Sucesso Padrão

```typescript
// GET /api/projects/:id
{
  "id": 1,
  "name": "Estação Morumbi - Bloco A",
  "description": "Bloco A da estação",
  "bimPath": "projects/1/modelo.obj",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Resposta de Erro Padrão

```typescript
{
  "error": "Mensagem de erro descritiva",
  "details": "Detalhes adicionais (apenas em desenvolvimento)"
}
```

### Resposta de Processamento Assíncrono

```typescript
// POST /api/:constructionId/photo-processing-full
{
  "analysisId": 1,
  "recordId": 1,
  "status": "pending",
  "message": "Processamento completo iniciado",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔌 Endpoints Completos

### Health Check

**GET** `/health`

**Resposta:**
```typescript
{
  "status": "ok"
}
```

---

### Projetos

#### Criar Projeto

**POST** `/api/projects`

**Content-Type:** `multipart/form-data`

**Body:**
- `name`: string (obrigatório)
- `description`: string (opcional)
- `modeloBim`: File (obrigatório, .ifc/.dwg/.obj/.ply, até 5GB)

**Resposta 201:**
```typescript
{
  "id": 1,
  "name": "Estação Morumbi",
  "description": "Bloco A",
  "bimPath": "projects/1/modelo.obj",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Erros possíveis:**
- `400`: Validação falhou (arquivo inválido, nome faltando)
- `409`: Caminho BIM duplicado
- `500`: Erro interno

#### Listar Projetos

**GET** `/api/projects`

**Resposta 200:**
```typescript
[
  {
    "id": 1,
    "name": "Estação Morumbi",
    "description": "Bloco A",
    "bimPath": "projects/1/modelo.obj",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": 2,
    "name": "Estação Butantã",
    "description": null,
    "bimPath": "projects/2/modelo.ifc",
    "createdAt": "2024-01-16T14:20:00.000Z",
    "updatedAt": "2024-01-16T14:20:00.000Z"
  }
]
```

#### Obter Projeto

**GET** `/api/projects/:id`

**Resposta 200:**
```typescript
{
  "id": 1,
  "name": "Estação Morumbi",
  "description": "Bloco A",
  "bimPath": "projects/1/modelo.obj",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Erros possíveis:**
- `404`: Projeto não encontrado

#### Deletar Projeto

**DELETE** `/api/projects/:id`

**Resposta 200:**
```typescript
{
  "message": "Projeto deletado com sucesso",
  "projectId": 1,
  "deletedFiles": {
    "bim": true,
    "records": 2,
    "analyses": 3
  }
}
```

**Erros possíveis:**
- `404`: Projeto não encontrado
- `500`: Erro ao deletar arquivos

---

### Registros

#### Criar Registro

**POST** `/api/projects/:id/records`

**Content-Type:** `multipart/form-data`

**Body:**
- `name`: string (obrigatório)
- `fotos`: File[] (obrigatório, mínimo 3, máximo 20, .jpg/.jpeg/.png)

**Resposta 201:**
```typescript
{
  "id": 1,
  "name": "Semana 5 - Fachada Leste",
  "projectId": 1,
  "uploadedFilesPaths": [
    "projects/1/records/1/foto1.jpg",
    "projects/1/records/1/foto2.jpg",
    "projects/1/records/1/foto3.jpg"
  ],
  "recordPath": null,
  "createdAt": "2024-01-15T11:00:00.000Z"
}
```

**Erros possíveis:**
- `400`: Validação falhou (menos de 3 fotos, tipo inválido, tamanho inválido)
- `404`: Projeto não encontrado

#### Listar Registros

**GET** `/api/projects/:id/records`

**Resposta 200:**
```typescript
[
  {
    "id": 1,
    "name": "Semana 5 - Fachada Leste",
    "projectId": 1,
    "uploadedFilesPaths": ["projects/1/records/1/foto1.jpg", ...],
    "recordPath": "1/registros/1/reconstrucao_1.ply",
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
]
```

#### Importar PLY

**POST** `/api/:constructionId/records/import-ply`

**Content-Type:** `multipart/form-data`

**Body:**
- `name`: string (obrigatório)
- `plyFile`: File (obrigatório, .ply, até 10GB)

**Resposta 201:**
```typescript
{
  "id": 2,
  "name": "Registro 3DGS Importado",
  "projectId": 1,
  "uploadedFilesPaths": null,
  "recordPath": "1/registros/2/reconstrucao_2.ply",
  "message": "Arquivo PLY importado com sucesso. Use analysis-full para comparar com BIM.",
  "filePath": "1/registros/2/reconstrucao_2.ply",
  "createdAt": "2024-01-15T12:00:00.000Z"
}
```

---

### Processamento Completo

#### Photo Processing Full

**POST** `/api/:constructionId/photo-processing-full`

**Content-Type:** `multipart/form-data`

**Body:**
- `name`: string (obrigatório)
- `fotos`: File[] (obrigatório, mínimo 3)
- `parametros`: string (opcional, JSON string com parâmetros)

**Resposta 202:**
```typescript
{
  "analysisId": 1,
  "recordId": 1,
  "status": "pending",
  "message": "Processamento completo iniciado",
  "timestamp": "2024-01-15T12:30:00.000Z"
}
```

**Fluxo:**
1. Upload de fotos
2. Cria registro
3. Inicia análise (3DGS + C2C)
4. Retorna `analysisId` para monitoramento

#### Analysis Full

**POST** `/api/:constructionId/analysis-full`

**Content-Type:** `application/json`

**Body:**
```typescript
{
  "recordId": 1,  // opcional, usa o mais recente se não fornecido
  "parametros": {  // opcional
    "threshold": 0.9
  }
}
```

**Resposta 202:**
```typescript
{
  "analysisId": 2,
  "status": "pending",
  "message": "Análise iniciada",
  "timestamp": "2024-01-15T13:00:00.000Z"
}
```

---

### Análises

#### Consultar Status

**GET** `/api/analyses/:id`

**Resposta 200:**
```typescript
{
  "id": 1,
  "status": "processing",  // pending | processing | completed | failed | cancelled
  "progress": 45,  // 0-100
  "logs": [
    "═══════════════════════════════════════════════════════════",
    "  🚀 INICIANDO PIPELINE DE PROCESSAMENTO",
    "═══════════════════════════════════════════════════════════",
    "",
    "📦 Projeto: Estação Morumbi (ID: 1)",
    "📝 Registro: Semana 5 (ID: 1)",
    "📊 Análise: (ID: 1)",
    "",
    "[Reconstrução 3D] 🔧 Executando: bash tools/fake_3dgs.sh ...",
    "[Reconstrução 3D] ✅ Reconstrução 3D concluída com sucesso",
    "[Comparação C2C] 🔧 Executando: bash tools/bim-comparison.sh ..."
  ],
  "error": null,
  "outputPaths": {
    "modelo3d": "1/registros/1/reconstrucao_1.ply"
  },
  "resultPath": null,  // Será preenchido quando completed
  "summaryJsonPath": null,
  "meanDistance": null,  // Será preenchido quando completed
  "stdDeviation": null,
  "projectId": 1,
  "recordId": 1,
  "createdAt": "2024-01-15T12:30:00.000Z",
  "startedAt": "2024-01-15T12:30:05.000Z",
  "updatedAt": "2024-01-15T12:35:00.000Z",
  "completedAt": null
}
```

**Quando `status === "completed"`:**
```typescript
{
  "id": 1,
  "status": "completed",
  "progress": 100,
  "logs": [...],
  "error": null,
  "outputPaths": {
    "modelo3d": "1/registros/1/reconstrucao_1.ply"
  },
  "resultPath": "1/analises/analysis_1/comparacao_c2c.ply",
  "summaryJsonPath": "1/analises/analysis_1/summary_c2c.json",
  "meanDistance": 2.45,  // em mm
  "stdDeviation": 2.12,  // em mm
  "projectId": 1,
  "recordId": 1,
  "createdAt": "2024-01-15T12:30:00.000Z",
  "startedAt": "2024-01-15T12:30:05.000Z",
  "updatedAt": "2024-01-15T12:40:00.000Z",
  "completedAt": "2024-01-15T12:40:00.000Z"
}
```

**Quando `status === "failed"`:**
```typescript
{
  "id": 1,
  "status": "failed",
  "progress": 60,
  "logs": [...],
  "error": "Falha na execução (código 1): Erro ao processar imagens",
  "outputPaths": {
    "modelo3d": "1/registros/1/reconstrucao_1.ply"
  },
  "resultPath": null,
  "summaryJsonPath": null,
  "meanDistance": null,
  "stdDeviation": null,
  "projectId": 1,
  "recordId": 1,
  "createdAt": "2024-01-15T12:30:00.000Z",
  "startedAt": "2024-01-15T12:30:05.000Z",
  "updatedAt": "2024-01-15T12:35:00.000Z",
  "completedAt": null
}
```

#### Relatório de Execução

**GET** `/api/analyses/:id/report`

**Resposta 200:**
```typescript
{
  "analysis": {
    "id": 1,
    "status": "completed",
    "progress": 100,
    "durationSeconds": 125,
    "durationFormatted": "2m 5s"
  },
  "project": {
    "id": 1,
    "name": "Estação Morumbi"
  },
  "record": {
    "id": 1,
    "name": "Semana 5 - Fachada Leste",
    "photosCount": 5
  },
  "etapas": {
    "inicializacao": true,
    "reconstrucao3d": true,
    "comparacaoC2C": true,
    "finalizacao": true,
    "totalEtapas": 4,
    "etapasCompletas": 4
  },
  "metrics": {
    "meanDistance": 2.45,
    "stdDeviation": 2.12,
    "hasMetrics": true
  },
  "outputs": {
    "resultPath": "1/analises/analysis_1/comparacao_c2c.ply",
    "summaryJsonPath": "1/analises/analysis_1/summary_c2c.json",
    "filesGenerated": [
      "Comparação C2C (PLY)",
      "Métricas (JSON)",
      "Reconstrução 3D (PLY)"
    ]
  }
}
```

**Erros possíveis:**
- `404`: Análise não encontrada ou sem resultado

#### Listar Análises

**GET** `/api/analyses`

**Resposta 200:**
```typescript
{
  "jobs": [
    {
      "id": 1,
      "status": "completed",
      "progress": 100,
      "projectId": 1,
      "recordId": 1,
      "createdAt": "2024-01-15T12:30:00.000Z"
    },
    {
      "id": 2,
      "status": "processing",
      "progress": 45,
      "projectId": 1,
      "recordId": 2,
      "createdAt": "2024-01-15T13:00:00.000Z"
    }
  ]
}
```

#### Cancelar Análise

**DELETE** `/api/analyses/:id`

**Resposta 200:**
```typescript
{
  "message": "Análise cancelada com sucesso",
  "analysisId": 1
}
```

**Erros possíveis:**
- `404`: Análise não encontrada
- `400`: Análise já finalizada (completed/failed/cancelled)

---

### Visualização de Arquivos

#### Obter Arquivo

**GET** `/api/:constructionId/:fileType/:fileId`

**Parâmetros:**
- `constructionId`: number (ID do projeto)
- `fileType`: `"bim" | "registro" | "analise"`
- `fileId`: number (ID do registro ou análise, use `0` para BIM)

**Exemplos:**
- `/api/1/bim/0` - Retorna arquivo BIM do projeto 1
- `/api/1/registro/5` - Retorna reconstrução 3D do registro 5
- `/api/1/analise/10` - Retorna resultado da análise 10

**Resposta 200:**
- Content-Type: `application/octet-stream` ou tipo específico do arquivo
- Body: Arquivo binário (PLY, OBJ, IFC, etc.)

**Erros possíveis:**
- `404`: Arquivo não encontrado

---

## 📝 Tipos TypeScript

```typescript
// Tipos principais
interface Project {
  id: number;
  name: string;
  description: string | null;
  bimPath: string;
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}

interface Record {
  id: number;
  name: string;
  projectId: number;
  uploadedFilesPaths: string[] | null;
  recordPath: string | null;
  createdAt: string;
}

interface Analysis {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;  // 0-100
  logs: string[];
  error: string | null;
  outputPaths: {
    modelo3d?: string;
  } | null;
  resultPath: string | null;
  summaryJsonPath: string | null;
  meanDistance: number | null;  // em mm
  stdDeviation: number | null;  // em mm
  projectId: number;
  recordId: number;
  createdAt: string;
  startedAt: string | null;
  updatedAt: string;
  completedAt: string | null;
}

interface AnalysisReport {
  analysis: {
    id: number;
    status: string;
    progress: number;
    durationSeconds: number;
    durationFormatted: string;
  };
  project: {
    id: number;
    name: string;
  };
  record: {
    id: number;
    name: string;
    photosCount: number;
  };
  etapas: {
    inicializacao: boolean;
    reconstrucao3d: boolean;
    comparacaoC2C: boolean;
    finalizacao: boolean;
    totalEtapas: number;
    etapasCompletas: number;
  };
  metrics: {
    meanDistance: number;
    stdDeviation: number;
    hasMetrics: boolean;
  };
  outputs: {
    resultPath: string;
    summaryJsonPath: string;
    filesGenerated: string[];
  };
}

// Respostas de API
interface CreateProjectResponse extends Project {}
interface CreateRecordResponse extends Record {}
interface PhotoProcessingFullResponse {
  analysisId: number;
  recordId: number;
  status: string;
  message: string;
  timestamp: string;
}
interface AnalysisFullResponse {
  analysisId: number;
  status: string;
  message: string;
  timestamp: string;
}
```

---

## 🎨 Fluxos de UI

### Fluxo 1: Criar Projeto e Processar Fotos

```typescript
// 1. Criar projeto
const formData = new FormData();
formData.append('name', 'Estação Morumbi');
formData.append('description', 'Bloco A');
formData.append('modeloBim', bimFile);

const project = await fetch(`${API_BASE_URL}/api/projects`, {
  method: 'POST',
  body: formData,
}).then(r => r.json());

// 2. Processar fotos (upload + 3DGS + C2C)
const photosFormData = new FormData();
photosFormData.append('name', 'Semana 5 - Fachada Leste');
photos.forEach(photo => {
  photosFormData.append('fotos', photo);
});

const { analysisId } = await fetch(
  `${API_BASE_URL}/api/${project.id}/photo-processing-full`,
  {
    method: 'POST',
    body: photosFormData,
  }
).then(r => r.json());

// 3. Monitorar progresso (polling)
const pollStatus = async () => {
  const status = await fetch(
    `${API_BASE_URL}/api/analyses/${analysisId}`
  ).then(r => r.json());

  if (status.status === 'completed') {
    // Processamento concluído
    return status;
  } else if (status.status === 'failed') {
    throw new Error(status.error);
  } else {
    // Continuar polling
    await new Promise(resolve => setTimeout(resolve, 2000));
    return pollStatus();
  }
};

const result = await pollStatus();
```

### Fluxo 2: Reanálise com Modelos Existentes

```typescript
// Executar nova análise C2C usando reconstrução existente
const { analysisId } = await fetch(
  `${API_BASE_URL}/api/${projectId}/analysis-full`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recordId: recordId,  // opcional
      parametros: { threshold: 0.9 }
    }),
  }
).then(r => r.json());

// Monitorar (mesmo padrão do Fluxo 1)
```

### Fluxo 3: Visualizar Arquivos 3D

```typescript
// Obter URL do arquivo PLY
const fileUrl = `${API_BASE_URL}/api/${projectId}/analise/${analysisId}`;

// Usar biblioteca como Three.js ou Potree para visualizar
// Exemplo com Three.js:
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

const loader = new PLYLoader();
loader.load(fileUrl, (geometry) => {
  const material = new THREE.PointsMaterial({ size: 0.01 });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
});
```

---

## ⚠️ Tratamento de Erros

### Códigos HTTP

- `200 OK`: Sucesso
- `201 Created`: Recurso criado
- `202 Accepted`: Processamento iniciado (assíncrono)
- `400 Bad Request`: Erro de validação
- `404 Not Found`: Recurso não encontrado
- `409 Conflict`: Conflito (ex: caminho BIM duplicado)
- `500 Internal Server Error`: Erro interno

### Exemplo de Tratamento

```typescript
async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      // Erro de rede
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
    }
    throw error;
  }
}
```

---

## 💻 Exemplos de Código

### Hook React para Monitorar Análise

```typescript
import { useState, useEffect } from 'react';

function useAnalysisStatus(analysisId: number | null) {
  const [status, setStatus] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/analyses/${analysisId}`
        );
        const data = await response.json();
        setStatus(data);
        setLoading(false);

        // Parar polling se concluído ou falhou
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        clearInterval(pollInterval);
      }
    }, 2000);  // Poll a cada 2 segundos

    return () => clearInterval(pollInterval);
  }, [analysisId]);

  return { status, loading, error };
}
```

### Upload de Arquivo com Progresso

```typescript
async function uploadFile(
  url: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Erro de rede'));
    });

    const formData = new FormData();
    formData.append('file', file);
    
    xhr.open('POST', url);
    xhr.send(formData);
  });
}
```

---

## 🎯 Visualização de Arquivos

### URLs de Arquivos

```typescript
// BIM
const bimUrl = `${API_BASE_URL}/api/${projectId}/bim/0`;

// Reconstrução 3D
const reconstructionUrl = `${API_BASE_URL}/api/${projectId}/registro/${recordId}`;

// Resultado da Análise
const analysisUrl = `${API_BASE_URL}/api/${projectId}/analise/${analysisId}`;
```

### Bibliotecas Recomendadas

- **Three.js**: Para visualização básica de PLY/OBJ
- **Potree**: Para visualização avançada de nuvens de pontos
- **IFC.js**: Para visualização de arquivos IFC
- **Babylon.js**: Alternativa ao Three.js

### Exemplo com Three.js

```typescript
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

async function loadPLY(url: string): Promise<THREE.Points> {
  const loader = new PLYLoader();
  const geometry = await loader.loadAsync(url);
  
  // Aplicar cores se disponíveis
  const material = new THREE.PointsMaterial({
    size: 0.01,
    vertexColors: geometry.hasAttribute('color'),
  });
  
  return new THREE.Points(geometry, material);
}
```

---

## 📚 Recursos Adicionais

- **GUIA_COMPLETO.md**: Guia completo de instalação e uso do backend
- **DOCS.md**: Documentação técnica detalhada
- **TESTE_PRODUCAO.md**: Guia de testes em produção

---

**Última atualização:** 2024-01-15

