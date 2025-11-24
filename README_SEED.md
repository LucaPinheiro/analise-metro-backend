# 🌱 Script de Seed - Popular Banco com Dados Mock

Script para popular o banco de dados com dados mock para desenvolvimento e testes.

## 🚀 Como Usar

### Executar Seed

```bash
npm run seed
```

ou

```bash
npx tsx prisma/seed.ts
```

### Resetar e Popular Novamente

Se quiser limpar o banco antes de popular:

```bash
# Edite prisma/seed.ts e descomente as linhas de limpeza
# Ou execute manualmente:
npx prisma migrate reset
npm run seed
```

## 📊 O que o Seed Cria

### Projetos (5 projetos)
- Estação Morumbi - Bloco A
- Estação Butantã - Plataforma Central
- Estação Pinheiros - Acesso Norte
- Estação Fradique Coutinho - Estrutura
- Estação Faria Lima - Bloco Sul

### Registros (2-4 por projeto)
- Cada projeto recebe 2-4 registros aleatórios
- Alguns registros têm reconstrução 3D (recordPath)
- Caminhos de fotos mock gerados

### Análises (1-2 por registro)
- Status distribuídos: `pending`, `processing`, `completed`, `failed`
- Análises completadas têm métricas (meanDistance, stdDeviation)
- Logs detalhados para cada análise
- Arquivos de saída mockados

## 📁 Estrutura Criada

```
src/shared/data/
├── uploads/
│   └── projects/
│       ├── seed/              # Arquivos BIM mock
│       └── {id}/              # Por projeto
│           └── records/{id}/  # Fotos mock
└── outputs/
    └── {id}/                  # Por projeto
        ├── registros/{id}/    # Reconstruções mock
        └── analises/          # Análises mock
```

## 🔧 Personalização

### Modificar Dados Mock

Edite `prisma/seed.ts`:

```typescript
// Adicionar mais projetos
const mockProjects = [
    // ... seus projetos aqui
];

// Modificar nomes de registros
const mockRecordNames = [
    // ... seus nomes aqui
];
```

### Limpar Banco Antes de Seed

Descomente no início da função `main()`:

```typescript
console.log('🗑️  Limpando banco de dados...');
await prisma.analysis.deleteMany();
await prisma.record.deleteMany();
await prisma.project.deleteMany();
```

## 📝 Exemplos de Uso

### Verificar Dados Criados

```bash
# Listar projetos
curl http://localhost:3000/api/projects | jq

# Listar análises
curl http://localhost:3000/api/analyses | jq

# Ver análise específica
curl http://localhost:3000/api/analyses/1 | jq
```

### Testar com Dados Mock

```bash
# Criar novo registro em projeto existente
curl -X POST http://localhost:3000/api/projects/1/records \
  -F "name=Novo Registro" \
  -F "fotos=@foto1.jpg" \
  -F "fotos=@foto2.jpg" \
  -F "fotos=@foto3.jpg"

# Iniciar análise
curl -X POST http://localhost:3000/api/1/analysis-full \
  -H "Content-Type: application/json" \
  -d '{"recordId": 1}'
```

## ⚠️ Notas Importantes

1. **Arquivos Mock**: Os arquivos BIM e fotos são apenas placeholders (arquivos vazios pequenos)
2. **Caminhos**: Os caminhos são gerados mas os arquivos físicos não são criados completamente
3. **Produção**: Não execute seed em produção sem revisar os dados
4. **Reset**: Use `npx prisma migrate reset` para resetar completamente o banco

## 🐛 Troubleshooting

### Erro: "Project with this bimPath already exists"

O projeto já existe no banco. Opções:
1. Limpar banco primeiro: `npx prisma migrate reset`
2. Modificar `bimPath` no seed para valores únicos
3. O script já trata isso e usa o projeto existente

### Erro: "Cannot find module '@prisma/client'"

Execute:
```bash
npx prisma generate
npm install
```

### Erro de conexão com banco

Verifique se o Docker está rodando:
```bash
cd docker
docker-compose ps
docker-compose up -d
```

## 📚 Próximos Passos

Após executar o seed:

1. ✅ Verifique os dados: `curl http://localhost:3000/api/projects`
2. ✅ Teste endpoints com dados mock
3. ✅ Desenvolva frontend usando dados mock
4. ✅ Teste visualizações com análises completadas

---

**Última atualização:** 2024-01-15

