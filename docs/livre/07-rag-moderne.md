# Chapitre 7 — RAG Moderne 🔍

---

## 🎬 Scène d'ouverture

*Mercredi, 10h du matin. Lina teste son agent sur le projet réel de son équipe — un système de paiement en production.*

**Lina** : "Explique-moi comment fonctionne la fonction `processPayment`."

*L'agent répond immédiatement, avec assurance :*

```
La fonction processPayment utilise l'API Stripe pour traiter les paiements.
Elle prend un objet PaymentIntent, vérifie le montant, et appelle
stripe.paymentIntents.create() avec les paramètres appropriés...
```

*Lina se fige.*

**Lina** *(relisant lentement)* : "Stripe... PaymentIntent... stripe.paymentIntents.create..."

*Elle ouvre le vrai fichier payment-processor.ts dans son projet.*

**Lina** : "On n'utilise PAS Stripe. On utilise Adyen. Et la fonction s'appelle `submitTransaction`, pas `processPayment`."

*Elle se tourne vers Marc qui passe avec son café.*

**Lina** : "Il a tout inventé. Pas un seul mot de sa réponse n'est vrai."

**Marc** *(s'arrêtant)* : "Qu'est-ce que tu lui as demandé ?"

**Lina** : "D'expliquer notre fonction de paiement. Et il m'a décrit une intégration Stripe complète — avec des détails très convaincants. Sauf que c'est de la fiction."

**Marc** *(posant son café)* : "C'est normal. Le LLM ne connaît pas ton code."

**Lina** : "Mais il a accès au projet. Je suis dans le répertoire du projet."

**Marc** : "Non. Il a accès à son **entraînement** — des millions de repos GitHub, de la documentation, des tutoriels. Quand tu dis 'payment', il te donne ce qu'il a vu le plus souvent. Et c'est probablement Stripe."

*Lina réalise l'ampleur du problème.*

**Lina** : "Donc chaque fois qu'il parle de mon code... il invente ?"

**Marc** : "Il **extrapole** à partir de ce qu'il connaît. C'est ce qu'on appelle l'hallucination. Pas méchant — juste... ignorant de ton contexte."

**Lina** : "Alors comment les outils comme Cursor ou Copilot font ? Ils connaissent vraiment le code."

**Marc** *(s'asseyant)* : "Ils ne se contentent pas du LLM. Avant de poser la question au modèle, ils **cherchent** dans ton code les morceaux pertinents. Puis ils injectent ces morceaux dans le prompt."

**Lina** : "Donc le modèle voit mon vrai code ?"

**Marc** : "Exactement. C'est ce qu'on appelle **RAG** — Retrieval-Augmented Generation. Tu récupères d'abord, tu génères ensuite."

*Lina ouvre son carnet.*

**Lina** : "Montre-moi comment ça marche."

**Marc** : "C'est un rabbit hole. Embeddings, similarité cosinus, chunking, re-ranking... Tu veux vraiment plonger ?"

**Lina** *(souriant)* : "On a bien plongé dans MCTS. Ça ne peut pas être pire."

**Marc** : "Oh, tu serais surprise."

---

## 📋 Table des matières

| Section | Titre | Description |
|:-------:|-------|-------------|
| 7.1 | 🚫 Le Problème du Contexte | Pourquoi le LLM seul ne suffit pas |
| 7.2 | 🧮 Embeddings | La fondation mathématique du RAG |
| 7.3 | 🔄 Pipeline RAG | Les phases d'indexation et retrieval |
| 7.4 | 🔀 Retrieval Hybride | Combiner sémantique et keywords |
| 7.5 | 💉 Augmentation | Injecter le contexte dans le prompt |
| 7.6 | 🛠️ Implémentation | Le module RAG de Grok-CLI |
| 7.7 | 📊 Évaluation | Mesurer la qualité du retrieval |

---

## 7.1 🚫 Le Problème du Contexte

### 7.1.1 Les limites du LLM seul

Un LLM, aussi puissant soit-il, souffre de plusieurs limitations fondamentales lorsqu'il s'agit de travailler sur votre code. Ces limitations ne sont pas des bugs à corriger, mais des caractéristiques intrinsèques de la façon dont ces modèles fonctionnent.

**Premièrement, la connaissance est figée.** Le modèle a été entraîné sur des données jusqu'à une certaine date (le "cutoff"). Il ne connaît pas les nouvelles versions de frameworks, les CVE récentes, ou les changements d'API. Demandez-lui la dernière version de React, et il vous donnera peut-être une version datant d'un an.

**Deuxièmement, il n'a pas accès à votre code privé.** Votre `AuthService`, votre `PaymentProcessor`, vos conventions d'équipe — tout cela est invisible pour lui. Quand vous posez une question sur votre code, il ne peut qu'**halluciner** une réponse plausible basée sur ce qu'il a vu dans des projets similaires.

![Limites du LLM seul - généré par Nanobanana](images/llm_limits.svg)

### 7.1.2 La solution RAG

**RAG** (Retrieval-Augmented Generation) résout ces problèmes en ajoutant une étape de récupération avant la génération. L'idée est simple mais puissante : plutôt que de compter sur la mémoire du modèle, on va **chercher** les informations pertinentes et les **injecter** dans le contexte.

C'est comme la différence entre passer un examen à livre fermé (le LLM seul) et à livre ouvert (RAG). Dans le second cas, vous avez accès à vos notes — à condition de savoir où chercher.

![Architecture RAG générée par Nanobanana](images/rag_pipeline_detail.svg)

| Étape | Action | Résultat |
|:-----:|--------|----------|
| 1️⃣ **Retrieve** | Chercher dans la base de code | Documents pertinents |
| 2️⃣ **Augment** | Injecter dans le prompt | Contexte enrichi |
| 3️⃣ **Generate** | Générer la réponse | Réponse précise |

---

## 7.2 🧮 Embeddings : La Fondation du RAG

### 7.2.1 Qu'est-ce qu'un embedding ?

Pour rechercher du code sémantiquement (par le sens, pas juste par mots-clés), nous avons besoin de représenter le texte sous forme de nombres. C'est le rôle des **embeddings**.

Un embedding est un **vecteur de nombres** (typiquement 384 à 3072 dimensions) qui capture le "sens" d'un texte. Deux textes similaires auront des vecteurs proches dans cet espace à haute dimension.

![Embeddings Visualization - généré par Nanobanana](images/embeddings_viz.svg)

### 7.2.2 Similarité cosine

Pour comparer deux embeddings, on utilise la **similarité cosine**. Elle mesure l'angle entre deux vecteurs, indépendamment de leur magnitude.

![Similarité cosine](images/cosine-similarity.svg)

**Implémentation TypeScript :**

```typescript
// src/embeddings/similarity.ts

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Utilisation
const embeddingA = await embed("function calculateTotal()");
const embeddingB = await embed("function computeSum()");

const similarity = cosineSimilarity(embeddingA, embeddingB);
console.log(`Similarité: ${similarity}`);  // ~0.85
```

### 7.2.3 Modèles d'embedding

Le choix du modèle d'embedding impacte directement la qualité du retrieval. Voici les principaux :

| Modèle | Dimensions | Spécialisation | Coût | Performance |
|--------|:----------:|----------------|------|-------------|
| 🆓 all-MiniLM-L6-v2 | 384 | Général | Gratuit (local) | ⭐⭐⭐ |
| 💵 text-embedding-3-small | 1536 | Général | $0.02/1M tokens | ⭐⭐⭐⭐ |
| 💵 text-embedding-3-large | 3072 | Haute précision | $0.13/1M tokens | ⭐⭐⭐⭐⭐ |
| 🆓 CodeBERT | 768 | Code | Gratuit (local) | ⭐⭐⭐⭐ (code) |
| 🆓 StarCoder-embed | 1024 | Code | Gratuit (local) | ⭐⭐⭐⭐ (code) |

> 💡 **Conseil** : Pour le code, privilégiez un modèle spécialisé comme CodeBERT. Il comprend mieux les noms de variables, la syntaxe et les patterns de code.

### 7.2.4 Embedding local avec Transformers.js

Pour éviter les coûts API et les problèmes de latence, Grok-CLI utilise des embeddings locaux :

```typescript
// src/embeddings/local-embedder.ts
import { pipeline } from '@xenova/transformers';

export class LocalEmbedder {
  private model: any;
  private modelName = 'Xenova/all-MiniLM-L6-v2';
  private initialized = false;

  /**
   * Initialise le modèle d'embedding.
   * Cette opération télécharge le modèle si nécessaire (~90MB).
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔄 Chargement du modèle d\'embedding...');
    this.model = await pipeline('feature-extraction', this.modelName);
    this.initialized = true;
    console.log('✅ Modèle chargé');
  }

  /**
   * Génère l'embedding pour un texte.
   * @param text - Le texte à encoder
   * @returns Vecteur de 384 dimensions
   */
  async embed(text: string): Promise<number[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const output = await this.model(text, {
      pooling: 'mean',     // Moyenne des tokens
      normalize: true       // Normaliser pour cosine
    });

    return Array.from(output.data);
  }

  /**
   * Génère les embeddings pour plusieurs textes.
   * Plus efficace que d'appeler embed() en boucle.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    // Traitement par batch de 32 pour optimiser la mémoire
    const batchSize = 32;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.embed(text))
      );
      results.push(...batchResults);
    }

    return results;
  }
}
```

---

## 7.3 🔄 Pipeline RAG pour le Code

### 7.3.1 Vue d'ensemble

Le pipeline RAG pour le code se décompose en deux phases principales : l'**indexation** (offline, une seule fois) et le **retrieval** (online, à chaque requête).

![Pipeline RAG Code](images/rag-pipeline-code.svg)

| Phase | Étapes | Fréquence |
|-------|--------|-----------|
| 📦 **Indexation** | Parse → Chunk → Embed → Store | Une fois + incrémental |
| 🔎 **Retrieval** | Embed → Search → Rerank → Return | Chaque requête |

### 7.3.2 Chunking du code : l'art du découpage

Le **chunking** (découpage) est crucial. Un mauvais chunking produit de mauvais résultats, même avec le meilleur modèle d'embedding.

![Comparaison des stratégies de chunking](images/chunking-comparison.svg)

**Implémentation du chunker AST :**

```typescript
// src/context/chunker.ts
import * as parser from '@typescript-eslint/parser';

interface Chunk {
  id: string;
  type: 'function' | 'class' | 'method' | 'variable' | 'type';
  name: string;
  content: string;
  filePath: string;
  startLine: number;
  endLine: number;
  docstring?: string;
}

export class ASTChunker {
  /**
   * Découpe un fichier de code en chunks logiques via l'AST.
   * Chaque fonction, classe, méthode devient un chunk séparé.
   */
  chunk(code: string, filePath: string): Chunk[] {
    const ast = parser.parse(code, {
      sourceType: 'module',
      ecmaVersion: 'latest',
      range: true,
      loc: true
    });

    const chunks: Chunk[] = [];

    // Traverser l'AST à la recherche de nœuds "chunkables"
    for (const node of ast.body) {
      if (this.isChunkableNode(node)) {
        chunks.push(this.createChunk(node, code, filePath));
      }

      // Gérer les classes avec méthodes
      if (node.type === 'ClassDeclaration' && node.body) {
        for (const member of node.body.body) {
          if (member.type === 'MethodDefinition') {
            chunks.push(this.createChunk(member, code, filePath));
          }
        }
      }
    }

    return chunks;
  }

  private isChunkableNode(node: any): boolean {
    const chunkableTypes = [
      'FunctionDeclaration',
      'ClassDeclaration',
      'MethodDefinition',
      'ExportNamedDeclaration',
      'ExportDefaultDeclaration',
      'TSInterfaceDeclaration',
      'TSTypeAliasDeclaration'
    ];
    return chunkableTypes.includes(node.type);
  }

  private createChunk(node: any, code: string, filePath: string): Chunk {
    const content = code.slice(node.range[0], node.range[1]);

    return {
      id: `${filePath}:${node.loc.start.line}`,
      type: this.getNodeType(node),
      name: this.getNodeName(node),
      content,
      filePath,
      startLine: node.loc.start.line,
      endLine: node.loc.end.line,
      docstring: this.extractDocstring(code, node.range[0])
    };
  }

  private getNodeType(node: any): Chunk['type'] {
    switch (node.type) {
      case 'FunctionDeclaration': return 'function';
      case 'ClassDeclaration': return 'class';
      case 'MethodDefinition': return 'method';
      case 'TSInterfaceDeclaration':
      case 'TSTypeAliasDeclaration': return 'type';
      default: return 'variable';
    }
  }

  private getNodeName(node: any): string {
    if (node.id?.name) return node.id.name;
    if (node.key?.name) return node.key.name;
    if (node.declaration?.id?.name) return node.declaration.id.name;
    return 'anonymous';
  }

  private extractDocstring(code: string, nodeStart: number): string | undefined {
    // Chercher un commentaire JSDoc avant le nœud
    const beforeNode = code.slice(Math.max(0, nodeStart - 500), nodeStart);
    const jsdocMatch = beforeNode.match(/\/\*\*[\s\S]*?\*\/\s*$/);
    return jsdocMatch?.[0];
  }
}
```

### 7.3.3 Métadonnées enrichies

Chaque chunk stocke des métadonnées qui améliorent le retrieval et permettent l'expansion contextuelle :

```typescript
// src/context/types.ts

interface CodeChunk {
  // 🏷️ Identité
  id: string;              // Identifiant unique
  filePath: string;        // Chemin du fichier source
  name: string;            // Nom de la fonction/classe
  type: ChunkType;         // function | class | method | type

  // 📝 Contenu
  content: string;         // Code source complet
  docstring?: string;      // Documentation JSDoc
  signature?: string;      // Signature (pour fonctions)

  // 📍 Position
  startLine: number;       // Ligne de début
  endLine: number;         // Ligne de fin

  // 🔗 Relations (pour expansion)
  imports: string[];       // Modules importés
  exports: string[];       // Symbols exportés
  calls: string[];         // Fonctions appelées
  calledBy?: string[];     // Qui appelle cette fonction

  // 🧮 Embedding
  embedding: number[];     // Vecteur 384-3072 dimensions

  // 📊 Métriques
  complexity?: number;     // Complexité cyclomatique
  lastModified: Date;      // Date de modification
}

type ChunkType = 'function' | 'class' | 'method' | 'variable' | 'type';
```

| Catégorie | Champs | Utilité |
|-----------|--------|---------|
| 🏷️ **Identité** | id, filePath, name, type | Identifier et filtrer |
| 📝 **Contenu** | content, docstring, signature | Afficher et matcher |
| 📍 **Position** | startLine, endLine | Navigation dans l'IDE |
| 🔗 **Relations** | imports, calls, calledBy | Expansion contextuelle |
| 🧮 **Vector** | embedding | Recherche sémantique |
| 📊 **Métriques** | complexity, lastModified | Priorisation |

---

## 7.4 🔀 Retrieval Hybride

### 7.4.1 Les limites du retrieval sémantique seul

Le retrieval par embeddings seul présente des faiblesses importantes, particulièrement pour le code :

![Limites du retrieval semantique pur](images/semantic-retrieval-limits.svg)

### 7.4.2 Retrieval hybride : sémantique + keywords

La solution : combiner retrieval sémantique et par mots-clés avec une technique appelée **Reciprocal Rank Fusion (RRF)**.

![Hybrid Retrieval généré par Nanobanana](images/hybrid_retrieval.svg)

**Implémentation :**

```typescript
// src/context/hybrid-retriever.ts

interface RetrievedChunk extends CodeChunk {
  semanticScore?: number;
  keywordScore?: number;
  fusedScore?: number;
}

export class HybridRetriever {
  // Poids relatifs des deux méthodes
  private semanticWeight = 0.7;  // 70% sémantique
  private keywordWeight = 0.3;   // 30% keywords

  async retrieve(query: string, limit: number = 10): Promise<RetrievedChunk[]> {
    // 1. Retrieval sémantique (embeddings + cosine similarity)
    const semanticResults = await this.semanticSearch(query, limit * 2);

    // 2. Retrieval par keywords (BM25)
    const keywordResults = await this.keywordSearch(query, limit * 2);

    // 3. Fusion avec Reciprocal Rank Fusion
    const fused = this.fuseResults(semanticResults, keywordResults);

    // 4. Retourner les top K
    return fused.slice(0, limit);
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   * Score = Σ 1/(k + rank)
   * k = 60 est la valeur standard qui donne de bons résultats
   */
  private fuseResults(
    semantic: RetrievedChunk[],
    keyword: RetrievedChunk[]
  ): RetrievedChunk[] {
    const scores = new Map<string, number>();
    const k = 60; // Constante RRF standard

    // Ajouter les scores sémantiques
    semantic.forEach((chunk, rank) => {
      const current = scores.get(chunk.id) ?? 0;
      scores.set(chunk.id, current + this.semanticWeight / (k + rank));
    });

    // Ajouter les scores keywords
    keyword.forEach((chunk, rank) => {
      const current = scores.get(chunk.id) ?? 0;
      scores.set(chunk.id, current + this.keywordWeight / (k + rank));
    });

    // Construire la map de tous les chunks
    const allChunks = new Map<string, RetrievedChunk>();
    [...semantic, ...keyword].forEach(c => allChunks.set(c.id, c));

    // Trier par score fusionné décroissant
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => ({
        ...allChunks.get(id)!,
        fusedScore: score
      }));
  }

  private async semanticSearch(query: string, limit: number): Promise<RetrievedChunk[]> {
    const queryEmbedding = await this.embedder.embed(query);

    return this.db.query(`
      SELECT *, cosine_similarity(embedding, ?) as semanticScore
      FROM code_chunks
      ORDER BY semanticScore DESC
      LIMIT ?
    `, [queryEmbedding, limit]);
  }

  private async keywordSearch(query: string, limit: number): Promise<RetrievedChunk[]> {
    // Tokenizer adapté au code (camelCase, snake_case)
    const tokens = this.tokenizeCode(query);

    // BM25 via SQLite FTS5
    return this.db.query(`
      SELECT *, bm25(code_chunks_fts) as keywordScore
      FROM code_chunks_fts
      WHERE code_chunks_fts MATCH ?
      ORDER BY keywordScore DESC
      LIMIT ?
    `, [tokens.join(' OR '), limit]);
  }

  /**
   * Tokenizer spécialisé pour le code
   * "getUserById" → ["get", "user", "by", "id", "getuserbyid"]
   */
  private tokenizeCode(text: string): string[] {
    const tokens = new Set<string>();

    // Garder le terme original
    tokens.add(text.toLowerCase());

    // Splitter camelCase et snake_case
    const parts = text
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase
      .replace(/_/g, ' ')                     // snake_case
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2);

    parts.forEach(p => tokens.add(p));

    return Array.from(tokens);
  }
}
```

### 7.4.3 Reranking avec Cross-Encoder

Pour affiner davantage les résultats, on peut utiliser un **cross-encoder**. Contrairement aux embeddings (bi-encoder) qui encodent query et document séparément, le cross-encoder les compare directement ensemble.

![Reranking avec Cross-Encoder](images/cross-encoder-reranking.svg)

```typescript
// src/context/reranker.ts

export class CrossEncoderReranker {
  private model: any;  // cross-encoder model

  /**
   * Rerank les candidats avec un cross-encoder.
   * Plus lent mais plus précis que le bi-encoder.
   */
  async rerank(
    query: string,
    candidates: RetrievedChunk[],
    topK: number
  ): Promise<RetrievedChunk[]> {
    // Score chaque paire (query, document) directement
    const scored = await Promise.all(
      candidates.map(async chunk => {
        const score = await this.model.predict({
          text: query,
          text_pair: chunk.content
        });
        return { chunk, score };
      })
    );

    // Trier par score décroissant et retourner top K
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => ({ ...s.chunk, rerankScore: s.score }));
  }
}
```

| Méthode | Vitesse | Précision | Usage |
|---------|:-------:|:---------:|-------|
| Bi-Encoder | ⚡⚡⚡ | ⭐⭐⭐ | Recherche initiale (top 50) |
| Cross-Encoder | ⚡ | ⭐⭐⭐⭐⭐ | Reranking final (top 5) |

---

## 7.5 💉 Augmentation du Prompt

### 7.5.1 Injection de contexte

Une fois les documents récupérés, il faut les **injecter intelligemment** dans le prompt. L'ordre, le formatage et les instructions impactent directement la qualité de la réponse.

```typescript
// src/context/augmenter.ts

function buildAugmentedPrompt(
  query: string,
  retrievedChunks: RetrievedChunk[]
): string {
  // Formater chaque chunk avec ses métadonnées
  const contextSection = retrievedChunks.map((chunk, index) => `
### 📄 ${index + 1}. ${chunk.filePath}
**Type**: ${chunk.type} | **Nom**: \`${chunk.name}\` | **Lignes**: ${chunk.startLine}-${chunk.endLine}

\`\`\`${getLanguageFromPath(chunk.filePath)}
${chunk.content}
\`\`\`
`).join('\n---\n');

  return `
Tu es un assistant de développement expert. Utilise UNIQUEMENT le contexte fourni pour répondre.

## 📚 Contexte du Codebase

${contextSection}

## ❓ Question

${query}

## 📋 Instructions
- Base ta réponse UNIQUEMENT sur le contexte fourni ci-dessus
- Si l'information n'est pas dans le contexte, dis-le clairement
- Cite les fichiers et numéros de ligne quand tu fais référence au code
- Si plusieurs fichiers sont pertinents, explique leurs relations
`;
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust'
  };
  return langMap[ext ?? ''] ?? '';
}
```

### 7.5.2 Gestion de la limite de tokens

Les modèles ont une limite de contexte (128K pour GPT-4, 200K pour Claude). Il faut sélectionner intelligemment les chunks pour ne pas la dépasser :

```typescript
// src/context/token-manager.ts

function fitToTokenLimit(
  chunks: RetrievedChunk[],
  query: string,
  maxTokens: number
): RetrievedChunk[] {
  const encoder = getTokenEncoder();

  // Réserver des tokens pour la query et le template
  const queryTokens = encoder.encode(query).length;
  const templateOverhead = 500;  // ~500 tokens pour les instructions
  const availableTokens = maxTokens - queryTokens - templateOverhead;

  const selected: RetrievedChunk[] = [];
  let totalTokens = 0;

  // Ajouter les chunks par ordre de pertinence
  for (const chunk of chunks) {
    const chunkTokens = encoder.encode(chunk.content).length;

    if (totalTokens + chunkTokens <= availableTokens) {
      selected.push(chunk);
      totalTokens += chunkTokens;
    } else if (totalTokens < availableTokens * 0.9) {
      // Si on a de la place, tronquer le dernier chunk
      const remaining = availableTokens - totalTokens;
      if (remaining > 100) {
        const truncated = truncateToTokens(chunk.content, remaining);
        selected.push({
          ...chunk,
          content: truncated + '\n// ... (tronqué)',
          truncated: true
        });
      }
      break;
    }
  }

  return selected;
}
```

![Budget tokens](images/token-budget.svg)

---

## 7.6 🛠️ Implémentation Grok-CLI

### 7.6.1 Architecture du module RAG

![Architecture du module RAG](images/rag-module-architecture.svg)

### 7.6.2 Indexeur de codebase

L'indexeur parcourt le projet, découpe le code et stocke les embeddings :

```typescript
// src/context/codebase-rag/indexer.ts

interface IndexingResult {
  files: number;
  chunks: number;
  errors: number;
  duration: number;
}

export class CodebaseIndexer {
  private chunker: ASTChunker;
  private embedder: Embedder;
  private store: VectorStore;

  /**
   * Indexe un répertoire complet.
   * Parcourt tous les fichiers de code et génère leurs embeddings.
   */
  async indexDirectory(dirPath: string): Promise<IndexingResult> {
    const startTime = Date.now();
    const stats = { files: 0, chunks: 0, errors: 0, duration: 0 };

    // Trouver tous les fichiers de code
    const files = await glob('**/*.{ts,js,tsx,jsx,py,go,rs,java}', {
      cwd: dirPath,
      ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '*.test.*',
        '*.spec.*'
      ]
    });

    console.log(`📁 ${files.length} fichiers à indexer...`);

    // Traiter par batch pour optimiser la mémoire
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      await Promise.all(batch.map(async file => {
        try {
          await this.indexFile(path.join(dirPath, file));
          stats.files++;
        } catch (error) {
          console.error(`❌ Erreur ${file}:`, error);
          stats.errors++;
        }
      }));

      // Progress
      const progress = Math.round((i + batch.length) / files.length * 100);
      console.log(`⏳ ${progress}% (${stats.chunks} chunks)...`);
    }

    stats.duration = Date.now() - startTime;
    console.log(`✅ Indexation terminée en ${stats.duration}ms`);

    return stats;
  }

  private async indexFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');

    // 1. Chunker le fichier via AST
    const chunks = this.chunker.chunk(content, filePath);

    // 2. Générer les embeddings
    const textsForEmbedding = chunks.map(c => this.formatForEmbedding(c));
    const embeddings = await this.embedder.embedBatch(textsForEmbedding);

    // 3. Stocker dans la base
    for (let i = 0; i < chunks.length; i++) {
      await this.store.upsert({
        ...chunks[i],
        embedding: embeddings[i]
      });
    }
  }

  /**
   * Formate un chunk pour l'embedding.
   * Inclut le type et le nom pour un meilleur matching sémantique.
   */
  private formatForEmbedding(chunk: Chunk): string {
    const parts = [
      `${chunk.type} ${chunk.name}`,           // "function calculateTotal"
      chunk.docstring ?? '',                    // JSDoc si présent
      chunk.content.slice(0, 500)               // Premiers 500 chars du code
    ];
    return parts.filter(Boolean).join('\n');
  }

  /**
   * Met à jour un seul fichier (pour les changements incrémentaux).
   */
  async updateFile(filePath: string): Promise<void> {
    // Supprimer les anciens chunks de ce fichier
    await this.store.deleteByFile(filePath);

    // Réindexer
    await this.indexFile(filePath);
  }
}
```

### 7.6.3 Retriever complet

Le retriever combine toutes les techniques vues précédemment :

```typescript
// src/context/codebase-rag/retriever.ts

interface RetrievalOptions {
  topK?: number;           // Nombre de résultats (défaut: 5)
  minScore?: number;       // Score minimum (défaut: 0.5)
  fileFilter?: string[];   // Filtrer par patterns de fichiers
  typeFilter?: ChunkType[]; // Filtrer par type (function, class, etc.)
  expandDependencies?: boolean; // Inclure les imports
}

export class CodebaseRetriever {
  private store: VectorStore;
  private embedder: Embedder;
  private reranker: CrossEncoderReranker;

  async retrieve(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievedChunk[]> {
    const {
      topK = 5,
      minScore = 0.5,
      fileFilter,
      typeFilter,
      expandDependencies = false
    } = options;

    // 1. Embed la query
    const queryEmbedding = await this.embedder.embed(query);

    // 2. Recherche hybride (sémantique + keywords)
    let candidates = await this.store.hybridSearch({
      embedding: queryEmbedding,
      text: query,
      limit: topK * 3  // Récupérer plus pour le reranking
    });

    // 3. Appliquer les filtres
    if (fileFilter) {
      candidates = candidates.filter(c =>
        fileFilter.some(pattern => minimatch(c.filePath, pattern))
      );
    }

    if (typeFilter) {
      candidates = candidates.filter(c => typeFilter.includes(c.type));
    }

    // 4. Reranking avec cross-encoder
    const reranked = await this.reranker.rerank(query, candidates, topK);

    // 5. Filtrer par score minimum
    let results = reranked.filter(c => c.rerankScore >= minScore);

    // 6. Expansion optionnelle des dépendances
    if (expandDependencies) {
      results = await this.expandWithDependencies(results);
    }

    return results;
  }

  /**
   * Ajoute les chunks importés par les résultats principaux.
   * Permet de fournir plus de contexte au LLM.
   */
  private async expandWithDependencies(
    chunks: RetrievedChunk[]
  ): Promise<RetrievedChunk[]> {
    const expanded = [...chunks];
    const seen = new Set(chunks.map(c => c.id));

    for (const chunk of chunks) {
      // Récupérer les chunks des fichiers importés
      for (const importPath of chunk.imports ?? []) {
        const imported = await this.store.getByFile(importPath);

        for (const dep of imported) {
          if (!seen.has(dep.id)) {
            expanded.push({ ...dep, isExpanded: true });
            seen.add(dep.id);
          }
        }
      }
    }

    return expanded;
  }
}
```

---

## 7.7 📊 Évaluation du RAG

### 7.7.1 Métriques clés

Pour savoir si votre RAG fonctionne bien, il faut le mesurer avec des métriques standardisées :

| Métrique | Description | Formule | Cible |
|----------|-------------|---------|:-----:|
| **Recall@K** | % de docs pertinents dans top K | pertinents ∩ topK / pertinents | > 80% |
| **Precision@K** | % de top K qui sont pertinents | pertinents ∩ topK / K | > 60% |
| **MRR** | Rang moyen du 1er pertinent | 1 / rang_premier_pertinent | > 0.7 |
| **Latence** | Temps de retrieval | ms | < 100ms |

![Metriques RAG](images/rag-metrics.svg)

### 7.7.2 Benchmark maison

Créez un benchmark spécifique à votre codebase pour évaluer votre RAG :

```typescript
// src/context/benchmark.ts

interface RAGBenchmark {
  queries: Array<{
    query: string;
    relevantChunks: string[];  // IDs des chunks pertinents
  }>;
}

interface RAGMetrics {
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
  avgLatencyMs: number;
}

async function evaluateRAG(
  retriever: CodebaseRetriever,
  benchmark: RAGBenchmark,
  k: number = 5
): Promise<RAGMetrics> {
  let totalRecall = 0;
  let totalPrecision = 0;
  let totalMRR = 0;
  let totalLatency = 0;

  for (const { query, relevantChunks } of benchmark.queries) {
    // Mesurer le temps
    const start = Date.now();
    const retrieved = await retriever.retrieve(query, { topK: k });
    totalLatency += Date.now() - start;

    const retrievedIds = new Set(retrieved.map(r => r.id));
    const relevantSet = new Set(relevantChunks);

    // Recall : combien de pertinents trouvés
    const foundRelevant = relevantChunks.filter(id => retrievedIds.has(id));
    totalRecall += foundRelevant.length / relevantChunks.length;

    // Precision : combien de trouvés sont pertinents
    const relevantFound = retrieved.filter(r => relevantSet.has(r.id));
    totalPrecision += relevantFound.length / k;

    // MRR : 1/rang du premier pertinent
    const firstRelevantRank = retrieved.findIndex(r => relevantSet.has(r.id));
    if (firstRelevantRank >= 0) {
      totalMRR += 1 / (firstRelevantRank + 1);
    }
  }

  const n = benchmark.queries.length;
  return {
    recallAtK: totalRecall / n,
    precisionAtK: totalPrecision / n,
    mrr: totalMRR / n,
    avgLatencyMs: totalLatency / n
  };
}

// Exemple de benchmark
const myBenchmark: RAGBenchmark = {
  queries: [
    {
      query: "Comment fonctionne l'authentification ?",
      relevantChunks: ['auth-service:42', 'auth-middleware:15', 'jwt-utils:8']
    },
    {
      query: "processPayment",
      relevantChunks: ['payment-service:120', 'payment-types:5']
    }
    // ... 20+ queries
  ]
};
```

---

## 📝 Points Clés

| Concept | Point clé |
|---------|-----------|
| 🚫 **Problème** | LLM ne connaît pas votre code, connaissance figée |
| 🔄 **Solution RAG** | Retrieve → Augment → Generate |
| 🧮 **Embeddings** | Représentation vectorielle du sens (384-3072 dim) |
| ✂️ **Chunking** | Découper par unités logiques via AST, pas par lignes |
| 🔀 **Hybride** | Sémantique + keywords = meilleurs résultats |
| 🏆 **Reranking** | Cross-encoder pour affiner le top K |
| 📊 **Métriques** | Recall@K > 80%, Precision@K > 60%, Latence < 100ms |

---

## 🏋️ Exercices

### Exercice 1 : Indexation
**Objectif** : Indexer votre propre projet

```bash
# 1. Mesurez le temps et l'espace disque
time node scripts/index-codebase.js ./my-project

# 2. Notez les statistiques
# - Nombre de fichiers indexés
# - Nombre de chunks générés
# - Taille de la base SQLite
```

### Exercice 2 : Comparaison de chunking
**Objectif** : Comparer chunking par lignes vs par AST

| Méthode | Recall@5 | Precision@5 | Observations |
|---------|:--------:|:-----------:|--------------|
| Lignes (50) | | | |
| AST | | | |

### Exercice 3 : Tuning hybride
**Objectif** : Trouver le meilleur ratio sémantique/keyword

Testez ces configurations sur votre benchmark :

| Ratio Sémantique/Keyword | Recall@5 | Observations |
|:------------------------:|:--------:|--------------|
| 1.0 / 0.0 | | Sémantique pur |
| 0.8 / 0.2 | | |
| 0.7 / 0.3 | | Défaut Grok-CLI |
| 0.5 / 0.5 | | Équilibré |

### Exercice 4 : Créer un benchmark
**Objectif** : Créer 20 queries de test avec leurs chunks pertinents

```typescript
// Créez votre benchmark
const myBenchmark: RAGBenchmark = {
  queries: [
    // Ajoutez 20 queries représentatives de votre codebase
  ]
};
```

---

## 📚 Références

| Type | Référence |
|------|-----------|
| 📄 Paper | Lewis, P., et al. (2020). "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" |
| 📄 Paper | Gao, L., et al. (2023). "Retrieval-Augmented Generation for Large Language Models: A Survey" |
| 💻 Code | Grok-CLI : `src/context/codebase-rag/` |
| 📖 Docs | Transformers.js : https://huggingface.co/docs/transformers.js |

---

## 🌅 Épilogue

*Fin d'après-midi. Lina teste son nouveau système RAG.*

**Lina** : "Explique-moi comment fonctionne la fonction `processPayment`."

*Cette fois, l'agent récupère le vrai code du projet avant de répondre.*

**Agent** : *"D'après `src/services/payment-service.ts` lignes 45-78, la fonction `processPayment` prend un objet `Order` et retourne un `PaymentResult`..."*

**Lina** *(souriant)* : "Il connaît vraiment mon code maintenant !"

*Mais son sourire s'efface quand elle lit la suite.*

**Agent** : *"...le type `PaymentResult` est défini dans ce fichier..."*

**Lina** : "Attends. `PaymentResult` n'est PAS défini dans ce fichier. Il est importé de `types.ts`."

*Elle vérifie.*

**Lina** : "Le RAG a récupéré le bon fichier, mais il ne comprend pas les imports. Il ne sait pas que `PaymentResult` vient d'ailleurs."

**Marc** *(arrivant avec son café)* : "C'est le problème classique. Le RAG récupère des morceaux pertinents, mais il ne comprend pas les **relations** entre eux."

**Lina** : "Donc si je demande 'modifie le type de retour de processPayment', il ne saura pas où aller ?"

**Marc** : "Exactement. Il faut lui donner la conscience du graphe de dépendances. Savoir que `payment-service.ts` importe de `types.ts`, qui importe de `common.ts`..."

*Il pose sa tasse.*

**Marc** : "C'est ce qu'on appelle le **Dependency-Aware RAG**. Le RAG nouvelle génération."

**Lina** *(ouvrant son carnet)* : "Montre-moi comment ça marche."

---

**À suivre** : *Chapitre 8 — Dependency-Aware RAG*

*Le RAG classique trouve les fichiers pertinents. Mais peut-il comprendre qu'un fichier A importe B qui dépend de C ? La réponse change tout pour les grandes codebases.*

---

<div align="center">

**← [Chapitre 6 : Repair et Réflexion](06-repair-reflexion.md)** | **[Sommaire](README.md)** | **[Chapitre 8 : Dependency-Aware RAG](08-dependency-aware-rag.md) →**

</div>
