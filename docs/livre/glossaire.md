# 📚 Glossaire

> Définitions des termes techniques utilisés dans ce livre

---

## A

### Agent
Programme autonome capable de percevoir son environnement, prendre des décisions et exécuter des actions pour atteindre des objectifs. Contrairement à un simple chatbot, un agent peut utiliser des outils et persister entre les sessions.

### Attention (Mécanisme d')
Composant clé des Transformers permettant au modèle de "regarder" toutes les positions d'une séquence simultanément et de pondérer leur importance relative. Voir : *Self-Attention*, *Multi-Head Attention*.

### Autorégressif
Mode de génération où chaque token est produit en fonction des tokens précédents. Les LLMs génèrent du texte token par token, sans possibilité de retour en arrière.

---

## B

### Backpropagation (MCTS)
Phase finale de MCTS où le résultat d'une simulation est propagé vers le haut de l'arbre pour mettre à jour les statistiques de chaque nœud traversé.

### Beam Search
Stratégie de recherche qui maintient les K meilleures solutions à chaque étape, offrant un compromis entre exploration exhaustive (BFS) et exploration profonde (DFS).

### BFS (Breadth-First Search)
Parcours en largeur d'abord. Explore tous les nœuds d'un niveau avant de passer au suivant. Garantit de trouver la solution la plus proche mais coûteux en mémoire.

### BPE (Byte Pair Encoding)
Algorithme de tokenization qui fusionne itérativement les paires de caractères les plus fréquentes. Utilisé par GPT et la plupart des LLMs modernes.

---

## C

### Chain-of-Thought (CoT)
Technique de prompting où on demande au LLM de "penser étape par étape", améliorant ses performances sur les tâches de raisonnement. Précurseur de Tree-of-Thought.

### Chunk (Chunking)
Division d'un document en segments plus petits pour l'indexation RAG. Le chunking AST respecte la structure syntaxique du code (fonctions, classes).

### Compression de Contexte
Techniques pour réduire la taille du contexte envoyé au LLM tout en préservant l'information essentielle : résumé, masquage, déduplication sémantique.

### Cosine Similarity
Mesure de similarité entre deux vecteurs basée sur l'angle entre eux. Valeur entre -1 et 1, où 1 = identique. Utilisée pour comparer des embeddings.

---

## D

### DFS (Depth-First Search)
Parcours en profondeur d'abord. Explore une branche jusqu'au bout avant de revenir. Économe en mémoire mais peut s'enliser dans des impasses.

### Dependency Graph
Graphe représentant les dépendances entre fichiers/modules d'un codebase. Utilisé par Dependency-Aware RAG pour enrichir le contexte.

---

## E

### Early Stopping
Technique d'optimisation qui arrête la recherche dès qu'une solution satisfaisante est trouvée, évitant des calculs inutiles.

### Embedding
Représentation vectorielle dense d'un texte dans un espace à haute dimension (768-1536 dimensions). Capture le sens sémantique.

### Épisodique (Mémoire)
Type de mémoire stockant les événements passés : conversations, actions, résultats. Répond à "Que s'est-il passé ?".

### Expansion (MCTS)
Phase de MCTS où un nouveau nœud enfant est ajouté à un nœud feuille sélectionné.

---

## F

### Few-Shot Learning
Apprentissage à partir de quelques exemples fournis dans le prompt. Contraste avec Zero-Shot (aucun exemple).

### Fine-Tuning
Entraînement supplémentaire d'un modèle pré-entraîné sur des données spécifiques pour l'adapter à une tâche.

### FrugalGPT
Approche de Stanford (2023) pour réduire les coûts API en routant les requêtes vers le modèle le moins cher capable de les traiter.

---

## G

### Génération Autorégressive
Voir *Autorégressif*.

### Guardrails
Mécanismes de sécurité empêchant le LLM de produire du contenu dangereux ou d'exécuter des actions interdites.

---

## H

### Hallucination
Génération de contenu factuellement incorrect mais présenté avec confiance par le LLM. Problème majeur des modèles génératifs.

### Hook
Point d'extension permettant d'exécuter du code personnalisé avant/après certains événements (PreToolUse, PostToolUse, etc.).

---

## I

### In-Context Learning
Capacité des LLMs à apprendre de nouvelles tâches à partir d'exemples fournis dans le prompt, sans modification des poids.

### Iterative Repair
Approche de correction de bugs en boucle : générer un patch → tester → analyser l'erreur → régénérer. Inspirée de ChatRepair.

---

## L

### Lazy Loading
Technique de chargement différé des modules lourds jusqu'à leur première utilisation, réduisant le temps de démarrage.

### LLM (Large Language Model)
Modèle de langage de grande taille (milliards de paramètres) entraîné sur des corpus massifs. Ex : GPT-4, Claude, Grok.

### LLMCompiler
Recherche de Berkeley (2023) sur l'exécution parallèle des outils avec analyse des dépendances.

---

## M

### MCP (Model Context Protocol)
Protocole standardisé (Anthropic, 2024) pour connecter des LLMs à des sources de données et outils externes via des serveurs.

### MCTS (Monte-Carlo Tree Search)
Algorithme de recherche combinant exploration stochastique et exploitation des résultats. Utilisé par AlphaGo.

### Multi-Head Attention
Extension de l'attention avec plusieurs "têtes" parallèles, chacune capturant différents types de relations.

---

## O

### Observation Masking
Technique de compression filtrant les sorties d'outils non pertinentes pour la requête courante.

### Orchestrateur
Composant central d'un agent coordonnant les autres modules : raisonnement, mémoire, outils, sécurité.

---

## P

### Procédurale (Mémoire)
Type de mémoire stockant les séquences d'actions efficaces et workflows. Répond à "Comment faire ?".

### Prompt Engineering
Art de formuler des instructions pour obtenir les meilleures réponses d'un LLM.

### Prospective (Mémoire)
Type de mémoire stockant les tâches planifiées et rappels futurs. Répond à "Que dois-je faire ?".

---

## R

### RAG (Retrieval-Augmented Generation)
Architecture combinant recherche documentaire et génération LLM. Le contexte pertinent est récupéré avant génération.

### ReAct
Pattern d'agent alternant Reasoning (raisonnement) et Acting (action) en boucle jusqu'à résolution.

### Reranking
Étape de RAG réordonnant les résultats de recherche par pertinence, souvent avec un cross-encoder.

### Rollout (MCTS)
Phase de simulation où une partie est jouée jusqu'au bout pour estimer la valeur d'un nœud.

---

## S

### SBFL (Spectrum-Based Fault Localization)
Technique de localisation de bugs analysant quelles lignes sont exécutées par les tests qui échouent vs réussissent.

### Sémantique (Mémoire)
Type de mémoire stockant les connaissances factuelles : préférences, patterns, faits. Répond à "Qu'ai-je appris ?".

### Self-Attention
Mécanisme où chaque position d'une séquence peut "regarder" toutes les autres positions pour calculer sa représentation.

### Streaming
Mode de génération où les tokens sont envoyés au client dès leur production, sans attendre la réponse complète.

---

## T

### Token
Unité de base manipulée par un LLM. Peut être un mot, sous-mot, ou caractère selon le tokenizer. ~4 caractères en moyenne.

### Tokenization
Processus de découpage du texte en tokens. Utilise généralement BPE ou SentencePiece.

### Tool-Use (Function Calling)
Capacité d'un LLM à invoquer des fonctions/outils externes en générant des appels structurés (JSON).

### ToT (Tree-of-Thought)
Extension de Chain-of-Thought explorant plusieurs chemins de raisonnement en parallèle et évaluant les plus prometteurs.

### Transformer
Architecture de réseau de neurones introduite en 2017, basée sur l'attention. Fondation de tous les LLMs modernes.

---

## U

### UCB1 (Upper Confidence Bound)
Formule utilisée par MCTS pour équilibrer exploration (nœuds peu visités) et exploitation (nœuds prometteurs).

---

## V

### Vector Database
Base de données optimisée pour stocker et rechercher des embeddings par similarité (ex : FAISS, Pinecone, Chroma).

---

## Z

### Zero-Shot
Capacité d'un modèle à effectuer une tâche sans exemple préalable, uniquement à partir d'instructions.

---

| 📖 Retour au sommaire |
|:---------------------:|
| [README](README.md) |
