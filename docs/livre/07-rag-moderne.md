# Chapitre 7 : RAG — Votre Code, Pas les Hallucinations

---

## 1. Le Problème

Vous demandez "Comment fonctionne `processPayment` ?". L'agent répond avec une intégration Stripe détaillée. Problème : vous utilisez Adyen, et votre fonction s'appelle `submitTransaction`.

**L'erreur classique** : Le LLM ne connaît pas votre code. Il hallucine une réponse plausible basée sur son entraînement (des millions de repos GitHub). Quand vous dites "payment", il répond Stripe parce que c'est ce qu'il a vu le plus souvent.

```typescript
// Ce que vous avez
async function submitTransaction(order: Order): Promise<AdyenResponse> { ... }

// Ce que le LLM invente
async function processPayment(intent: PaymentIntent): Promise<StripeResponse> { ... }
// 100% fiction, 0% votre code
```

---

## 2. La Solution Rapide : Pipeline RAG Minimal

```typescript
// 1. INDEXER votre codebase (une fois)
async function indexCodebase(directory: string): Promise<VectorStore> {
  const files = await glob(`${directory}/**/*.{ts,js,py}`);
  const chunks: Chunk[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    // Découper en morceaux de ~500 tokens
    const fileChunks = chunkByFunction(content, file);
    chunks.push(...fileChunks);
  }

  // Générer les embeddings
  const embeddings = await Promise.all(
    chunks.map(chunk => embed(chunk.content))
  );

  return new VectorStore(chunks, embeddings);
}

// 2. RETRIEVER les morceaux pertinents
async function retrieve(query: string, store: VectorStore, k = 5): Promise<Chunk[]> {
  const queryEmbedding = await embed(query);
  return store.similaritySearch(queryEmbedding, k);
}

// 3. AUGMENTER le prompt
async function ragQuery(question: string, store: VectorStore): Promise<string> {
  // Récupérer le contexte pertinent
  const relevantChunks = await retrieve(question, store);

  // Injecter dans le prompt
  const response = await llm.chat(`
    ## Contexte (extrait de la codebase)
    ${relevantChunks.map(c => `### ${c.file}\n${c.content}`).join('\n\n')}

    ## Question
    ${question}

    ## Instructions
    Réponds en te basant UNIQUEMENT sur le contexte ci-dessus.
    Si l'information n'est pas dans le contexte, dis "Je ne trouve pas cette information".
  `);

  return response;
}
```

---

## 3. Deep Dive : Les 3 Phases du RAG

### 3.1 Chunking — Découper intelligemment

**Mauvais chunking** = mauvais résultats. Deux approches :

```typescript
// ❌ Chunking naïf : couper tous les 500 caractères
const chunks = content.match(/.{1,500}/g);
// Problème : coupe au milieu des fonctions

// ✅ Chunking AST : respecter les frontières sémantiques
function chunkByFunction(content: string, file: string): Chunk[] {
  const ast = parse(content);  // Parser TypeScript/Python
  const chunks: Chunk[] = [];

  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
      chunks.push({
        content: content.slice(node.start, node.end),
        file,
        type: node.type,
        name: node.id?.name
      });
    }
  }

  return chunks;
}
```

| Méthode | Précision retrieval | Complexité |
|---------|---------------------|------------|
| Caractères fixes | 60% | Triviale |
| Lignes fixes | 65% | Triviale |
| AST (fonctions) | 85% | Moyenne |
| AST + contexte | 92% | Haute |

### 3.2 Embeddings — Représenter le sens

```typescript
// Deux textes similaires = vecteurs proches
const embed1 = await embed("function calculateTotal()");
const embed2 = await embed("function computeSum()");
const similarity = cosineSimilarity(embed1, embed2);  // ~0.85

// Similarité cosinus
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

| Modèle | Dimensions | Coût | Performance code |
|--------|------------|------|------------------|
| all-MiniLM-L6-v2 | 384 | Gratuit (local) | ⭐⭐⭐ |
| text-embedding-3-small | 1536 | $0.02/1M tokens | ⭐⭐⭐⭐ |
| CodeBERT | 768 | Gratuit (local) | ⭐⭐⭐⭐⭐ |

### 3.3 Retrieval Hybride — Le meilleur des deux mondes

```typescript
// Sémantique seule : "paiement" trouve "transaction" mais rate "PaymentService"
// Keywords seul : "PaymentService" exact mais rate les synonymes

// ✅ Hybride : combine les deux
async function hybridSearch(query: string, store: VectorStore): Promise<Chunk[]> {
  // 1. Recherche sémantique (embeddings)
  const semanticResults = await store.similaritySearch(query, 10);

  // 2. Recherche par mots-clés (BM25)
  const keywordResults = await store.bm25Search(query, 10);

  // 3. Fusionner avec Reciprocal Rank Fusion
  return reciprocalRankFusion([semanticResults, keywordResults], k = 5);
}

function reciprocalRankFusion(resultSets: Chunk[][], k: number): Chunk[] {
  const scores = new Map<string, number>();

  for (const results of resultSets) {
    results.forEach((chunk, rank) => {
      const id = chunk.file + ':' + chunk.name;
      const current = scores.get(id) || 0;
      scores.set(id, current + 1 / (60 + rank));  // RRF formula
    });
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id]) => findChunk(id));
}
```

---

## 4. Edge Cases et Pièges

### Piège 1 : Le contexte qui noie l'essentiel

```typescript
// ❌ Injecter 20 fichiers = le LLM se perd
const chunks = await retrieve(query, store, 20);
// 50K tokens de contexte, réponse médiocre

// ✅ Reranker pour garder seulement le meilleur
const candidates = await retrieve(query, store, 20);
const reranked = await crossEncoderRerank(query, candidates);
const chunks = reranked.slice(0, 5);  // Top 5 après reranking
```

**Contournement** : Retriever large (20), reranker petit (5).

### Piège 2 : Les dépendances manquantes

```typescript
// ❌ Retriever trouve UserService mais pas AuthProvider qu'il importe
const chunks = await retrieve("UserService", store);
// Manque le contexte des dépendances

// ✅ Expansion par imports (voir Chapitre 8)
const chunks = await retrieveWithDependencies("UserService", store);
// Inclut UserService + AuthProvider + UserRepository
```

**Contournement** : Chapitre 8 détaille le Dependency-Aware RAG.

### Piège 3 : Embeddings obsolètes

```typescript
// ❌ Indexer une fois, utiliser pour toujours
const store = await loadStore('embeddings.db');  // Daté d'il y a 3 mois

// ✅ Réindexer les fichiers modifiés
async function incrementalIndex(store: VectorStore): Promise<void> {
  const modified = await getModifiedSince(store.lastIndexed);
  for (const file of modified) {
    await store.updateFile(file);
  }
}
```

**Contournement** : Réindexation incrémentale à chaque session.

---

## 5. Optimisation : Embeddings Locaux

Évitez les coûts API avec des embeddings locaux :

```typescript
import { pipeline } from '@xenova/transformers';

class LocalEmbedder {
  private model: any;

  async init(): Promise<void> {
    this.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.model(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }

  // Batch pour performance
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results = await Promise.all(texts.map(t => this.embed(t)));
    return results;
  }
}
```

| Aspect | API (OpenAI) | Local (MiniLM) |
|--------|--------------|----------------|
| Coût | $0.02/1M tokens | Gratuit |
| Latence | 100-500ms | 10-50ms |
| Qualité | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Privacy | Données envoyées | 100% local |

**Économie** : Pour un projet de 10K fichiers, passer de $2 à $0 d'indexation.

---

## Tableau Récapitulatif

| Composant | Recommandation | Alternative |
|-----------|----------------|-------------|
| **Chunking** | AST (fonctions/classes) | Lignes si pas de parser |
| **Embeddings** | CodeBERT (code) ou MiniLM (général) | OpenAI si budget |
| **Retrieval** | Hybride (sémantique + BM25) | Sémantique seul si simple |
| **Reranking** | Cross-encoder top 5 | Pas de rerank si < 10 résultats |

---

## Ce Qui Vient Ensuite

RAG trouve les fichiers pertinents, mais pas leurs **dépendances**. Le **Chapitre 8** introduit le Dependency-Aware RAG : construire un graphe AST pour récupérer automatiquement les imports et les types liés.

---

[⬅️ Chapitre 6](06-repair-reflexion.md) | [📚 Table des Matières](README.md) | [➡️ Chapitre 8](08-dependency-aware-rag.md)
