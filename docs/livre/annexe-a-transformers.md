# Annexe A : Comprendre les Transformers

> **Note** : Cette annexe est pour ceux qui veulent comprendre le fonctionnement interne des LLMs. Elle n'est **pas nécessaire** pour construire des agents — vous pouvez la sauter sans problème.

---

## A.1 Une Brève Histoire des Modèles de Langage

### A.1.1 L'Ère Statistique : Les Modèles N-grammes

Pendant des décennies, le traitement automatique du langage naturel (NLP) reposait sur des approches purement statistiques. L'idée fondamentale était simple : si nous pouvons compter combien de fois certaines séquences de mots apparaissent ensemble dans un grand corpus de texte, nous pouvons prédire quel mot viendra probablement après une séquence donnée.

Les **modèles n-grammes** incarnaient cette philosophie. Un modèle bigramme (n=2) prédisait le mot suivant uniquement en fonction du mot précédent. Un modèle trigramme (n=3) utilisait les deux mots précédents. Et ainsi de suite.

Prenons un exemple concret. Supposons que nous ayons entraîné un modèle 5-grammes sur un corpus de textes français. Face à la séquence "le chat dort sur le", le modèle consulterait ses tables de fréquences :

- "le chat dort sur le **canapé**" : vu 1,247 fois dans le corpus
- "le chat dort sur le **tapis**" : vu 892 fois
- "le chat dort sur le **lit**" : vu 756 fois
- "le chat dort sur le **toit**" : vu 23 fois

Le modèle prédirait donc "canapé" avec une probabilité proportionnelle à ces fréquences. Simple, efficace... et profondément limité.

Le problème fondamental des n-grammes tient en un mot : **contexte**. Ces modèles ne peuvent "voir" qu'une fenêtre fixe de mots — typiquement 3 à 5. Or, le langage humain regorge de dépendances à longue distance. Considérez cette phrase :

> "Le développeur qui avait passé trois ans à travailler sur ce projet, malgré les difficultés rencontrées avec l'équipe de management et les contraintes budgétaires imposées par la direction, **était** finalement satisfait du résultat."

Le verbe "était" doit s'accorder avec "Le développeur" — un mot situé à plus de trente tokens de distance ! Aucun modèle n-gramme pratique ne pouvait capturer cette relation.

| Aspect | Modèles N-grammes | Limitation |
|--------|-------------------|------------|
| **Mémoire** | Fenêtre fixe (3-5 mots) | Perte du contexte lointain |
| **Taille** | Croissance exponentielle | V^n entrées pour vocabulaire V |
| **Généralisation** | Aucune | Ne reconnaît que ce qu'il a vu exactement |
| **Données rares** | Problématique | "smoothing" nécessaire mais imparfait |

### A.1.2 Les Réseaux Récurrents : Une Promesse Partiellement Tenue

Dans les années 2010, une nouvelle approche émergea : les réseaux de neurones récurrents (RNN). L'idée était élégante et biologiquement inspirée. Au lieu de regarder une fenêtre fixe de mots, le réseau maintiendrait un **état caché** — une sorte de "mémoire de travail" — qui se propagerait d'un mot au suivant.

Les variantes comme LSTM (Long Short-Term Memory) et GRU (Gated Recurrent Unit) ajoutèrent des mécanismes de "portes" pour mieux contrôler le flux d'information.

Cependant, deux problèmes fondamentaux persistaient :

**Le gradient évanescent** : Lors de l'entraînement, les signaux d'erreur doivent se propager à travers la chaîne de récurrence. À chaque étape, ils sont multipliés par des poids, et si ces poids sont inférieurs à 1, le signal diminue exponentiellement. Après 50 ou 100 étapes, il devient pratiquement imperceptible.

**La séquentialité imposée** : Par construction, un RNN doit traiter les mots un par un, dans l'ordre. Cette dépendance séquentielle empêche toute parallélisation efficace.

| Critère | N-grammes | RNN/LSTM | Impact pratique |
|---------|-----------|----------|-----------------|
| **Contexte** | ~5 mots | ~100-500 mots (théorique) | LSTM meilleur mais imparfait |
| **Parallélisation** | Excellente | Impossible | Entraînement 10-100x plus lent |
| **Mémoire GPU** | Faible | Modérée | LSTM plus gourmand |
| **Dépendances longues** | Aucune | Difficiles | Gradient vanishing persiste |

### A.1.3 Juin 2017 : "Attention Is All You Need"

Le 12 juin 2017, une équipe de huit chercheurs chez Google publia un article au titre provocateur : **"Attention Is All You Need"**. L'article proposait une architecture radicalement différente appelée **Transformer**.

L'idée centrale : et si on abandonnait complètement la récurrence ? Et si, au lieu de traiter les mots séquentiellement, on les traitait **tous en parallèle**, en utilisant uniquement des mécanismes d'attention pour capturer les relations entre eux ?

Les résultats furent spectaculaires :

| Métrique | LSTM (meilleur) | Transformer | Amélioration |
|----------|-----------------|-------------|--------------|
| BLEU (EN→DE) | 25.8 | 28.4 | +10% |
| BLEU (EN→FR) | 41.0 | 41.8 | +2% |
| Temps d'entraînement | ~3 semaines | 3.5 jours | **~6x plus rapide** |
| Paramètres | ~200M | 65M | 3x moins |

---

## A.2 L'Anatomie d'un Transformer

### A.2.1 La Tokenisation : Découper le Langage

Avant même d'entrer dans le réseau de neurones, le texte doit être converti en nombres. Cette étape, appelée **tokenisation**, est plus subtile qu'il n'y paraît.

**Le problème du vocabulaire**

Une approche naïve consisterait à attribuer un identifiant unique à chaque mot du dictionnaire. Mais cette stratégie se heurte à plusieurs obstacles :

1. **La taille du vocabulaire** : Le français compte environ 100,000 mots courants.
2. **Les mots rares** : De nombreux mots ne seront vus qu'une ou deux fois pendant l'entraînement.
3. **Les langues agglutinantes** : En allemand, finnois ou turc, les mots peuvent être composés de nombreux morphèmes.

**La solution : Byte-Pair Encoding (BPE)**

L'algorithme fonctionne ainsi :
1. Commencer avec un vocabulaire contenant uniquement les caractères individuels
2. Compter toutes les paires de tokens adjacents dans le corpus
3. Fusionner la paire la plus fréquente en un nouveau token
4. Répéter jusqu'à atteindre la taille de vocabulaire désirée

**Implications pratiques pour les développeurs :**

| Impact | Description | Conseil pratique |
|--------|-------------|------------------|
| **Coût** | Les API facturent par token | Noms de variables courts = moins cher |
| **Limite de contexte** | 128K tokens ≠ 128K caractères | Un fichier de 10KB peut consommer 3-5K tokens |
| **Langues** | Non-anglais = plus de tokens | Budget 30-50% de tokens en plus pour le français |
| **Code** | Syntaxe verbale = plus de tokens | `calculateTotalAmountWithTax` = ~8 tokens |
| **Comptage** | LLMs comptent mal les caractères | "Combien de 'r' dans strawberry ?" → souvent faux |

### A.2.2 Les Embeddings : Transformer les Symboles en Vecteurs de Sens

Une fois le texte tokenisé, chaque identifiant numérique doit être converti en une représentation que le réseau de neurones peut manipuler. Cette représentation prend la forme d'un **embedding** : un vecteur dense de nombres réels.

**La magie émergente des embeddings**

Les mots ayant des significations similaires se retrouvent proches dans l'espace vectoriel. L'exemple classique est l'analogie "roi - homme + femme ≈ reine".

Pour le code, cette propriété est précieuse :

| Relation | Exemples |
|----------|----------|
| Équivalence cross-langage | `array.push` (JS) ≈ `list.append` (Python) |
| Patterns de conception | `async/await` ≈ `Promise` ≈ `.then().catch()` |
| Opérations similaires | `console.log` ≈ `print` ≈ `System.out.println` |

---

## A.3 Le Mécanisme d'Attention

### A.3.1 L'Intuition : Une Base de Données Associative

Pour comprendre l'attention, une analogie avec les bases de données est utile :

- **Query (Q)** : "Que cherche-t-on ?" — Ce que le token actuel veut savoir
- **Key (K)** : "Qu'avons-nous ?" — Ce que chaque token peut offrir comme contexte
- **Value (V)** : "Quel contenu ?" — L'information effectivement transmise

### A.3.2 La Mécanique Mathématique

Pour chaque token, trois vecteurs sont calculés :

```
Q = X × W_Q    (query)
K = X × W_K    (key)
V = X × W_V    (value)
```

L'attention est ensuite calculée par :

```
Attention(Q, K, V) = softmax(Q × K^T / √d_k) × V
```

### A.3.3 Multi-Head Attention

Une seule "tête" d'attention capture une seule façon de relier les tokens. La solution est d'utiliser plusieurs têtes en parallèle, chacune avec ses propres matrices de projection.

| Tête | Spécialisation observée | Exemple |
|------|-------------------------|---------|
| Tête 1 | Dépendances syntaxiques | sujet → verbe |
| Tête 2 | Résolution de coréférences | "il" → "développeur" |
| Tête 3 | Relations sémantiques | "Python" → "code" |
| Tête 4 | Positions relatives | mot[i] → mot[i-1] |

---

## A.4 Scaling Laws

Des chercheurs d'OpenAI et d'Anthropic ont montré que les performances suivent des relations mathématiques prévisibles :

| Axe | Description | Effet sur la performance |
|-----|-------------|--------------------------|
| **Paramètres (N)** | Nombre de poids du modèle | L ~ N^(-0.076) |
| **Données (D)** | Tokens d'entraînement | L ~ D^(-0.095) |
| **Compute (C)** | FLOPs d'entraînement | L ~ C^(-0.050) |

| Modèle | Paramètres | Tokens d'entraînement | Ratio Tokens/Params |
|--------|------------|----------------------|---------------------|
| GPT-3 | 175B | 300B | 1.7 |
| Chinchilla | 70B | 1.4T | 20 |
| LLaMA 2 | 70B | 2T | 29 |
| GPT-4 | ~1.8T (rumeur) | ~13T | ~7 |

---

## A.5 Les Hallucinations : Pourquoi les LLMs "Mentent"

Il est crucial de comprendre ce que fait réellement un LLM : il prédit le token le plus probable étant donné le contexte. Il n'a pas de "base de connaissances" séparée qu'il consulte, pas de mécanisme pour vérifier la véracité de ses affirmations.

| Cause | Explication | Exemple |
|-------|-------------|---------|
| **Pression de complétion** | Le modèle doit toujours produire quelque chose | Invente plutôt que de dire "je ne sais pas" |
| **Mélange de patterns** | Combine des informations de sources différentes | Attribue une citation à la mauvaise personne |
| **Généralisation excessive** | Extrapole au-delà des données vues | "Python 4.0 a introduit..." (n'existe pas) |
| **Manque de grounding** | Pas de connexion au monde réel | Ignore les événements post-training |

---

## A.6 Panorama des Modèles 2025

### Modèles Propriétaires (API Cloud)

| Modèle | Éditeur | Forces | Coût (1M tokens) |
|--------|---------|--------|------------------|
| **GPT-4o** | OpenAI | Polyvalent, multimodal, rapide | ~$5-15 |
| **Claude 3.5 Sonnet** | Anthropic | Code excellent, 200K contexte | ~$3-15 |
| **Gemini 1.5 Pro** | Google | 1M tokens contexte | ~$3.5-10.5 |
| **Grok-2** | xAI | Accès temps réel (X/Twitter) | ~$2-10 |

### Modèles Open Source

| Modèle | Paramètres | Licence | Forces |
|--------|------------|---------|--------|
| **Llama 3.1** | 8B/70B/405B | Meta Llama 3.1 | Polyvalent |
| **Mistral Large 2** | 123B | Apache 2.0 | Multilingue |
| **DeepSeek V3** | 685B (MoE) | MIT | État de l'art open |
| **Phi-3** | 3.8B-14B | MIT | Compact, performant |

---

## A.7 Références

| Source | Description |
|--------|-------------|
| Vaswani et al. (2017) | "Attention Is All You Need" — L'article fondateur |
| Kaplan et al. (2020) | "Scaling Laws for Neural Language Models" |
| Hoffmann et al. (2022) | "Training Compute-Optimal LLMs" (Chinchilla) |
| Wei et al. (2022) | "Emergent Abilities of Large Language Models" |
| Ji et al. (2023) | "Survey of Hallucination in NLG" |

---

[📚 Table des Matières](README.md) | [➡️ Annexe B : Glossaire](glossaire.md)
