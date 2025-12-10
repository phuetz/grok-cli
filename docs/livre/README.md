<p align="center">
  <img src="images/cover-image.png" alt="Couverture du livre" width="600"/>
</p>

# Construire un Agent LLM Moderne

**Le Guide Pratique pour Économiser $10,000 et 6 Mois de Développement**

> *Ne répétez pas mes erreurs : facture API de $847, agent qui supprime vos fichiers, RAG qui ne trouve rien d'utile...*

---

## Ce Que Vous Allez Construire

À la fin de ce livre, vous aurez **Grok-CLI** — un agent de terminal complet :

| Fonctionnalité | Chapitre | Code |
|----------------|:--------:|:----:|
| Agent fonctionnel en 30 minutes | 1 | 50 lignes |
| Raisonnement Tree-of-Thought | 4 | ~200 lignes |
| Monte-Carlo Tree Search | 5 | ~300 lignes |
| Auto-réparation avec tests | 6 | ~250 lignes |
| RAG avec graphe de dépendances | 7-8 | ~400 lignes |
| Cache sémantique (68% de réduction) | 12 | ~150 lignes |
| Model routing FrugalGPT (-70% coûts) | 13 | ~100 lignes |
| **Total** | 17 chapitres | ~25,000 lignes |

---

## Table des Matières

### Partie I : Votre Premier Agent en 2 Heures

| Ch. | Titre | Ce que vous obtenez |
|:---:|-------|---------------------|
| **1** | [Votre Premier Agent en 30 Minutes](01-premier-agent.md) | Agent fonctionnel avec garde-fous |
| **2** | [Les Patterns d'Agents](02-role-des-agents.md) | Savoir quand utiliser quoi |
| **3** | [Les 6 Composants Essentiels](03-anatomie-agent.md) | Architecture production-ready |

### Partie II : Raisonnement Avancé

| Ch. | Titre | Ce que vous obtenez |
|:---:|-------|---------------------|
| **4** | [Tree-of-Thought : Explorer Plusieurs Solutions](04-tree-of-thought.md) | Agent qui compare les alternatives |
| **5** | [MCTS : Quand ToT Ne Suffit Pas](05-mcts.md) | Recherche optimale pour problèmes complexes |
| **6** | [Auto-Réparation : Se Corriger avec les Tests](06-repair-reflexion.md) | Boucle ChatRepair (40% vs 15%) |

### Partie III : Mémoire Intelligente

| Ch. | Titre | Ce que vous obtenez |
|:---:|-------|---------------------|
| **7** | [RAG Moderne (Pas le Tutoriel Basique)](07-rag-moderne.md) | Pipeline complet avec reranking |
| **8** | [RAG avec Graphe de Dépendances](08-dependency-aware-rag.md) | Contexte complet automatique |
| **9** | [Compression de Contexte](09-context-compression.md) | Économiser 40% de tokens |

### Partie IV : Action et Outils

| Ch. | Titre | Ce que vous obtenez |
|:---:|-------|---------------------|
| **10** | [45+ Outils : Le Catalogue Complet](10-tool-use.md) | Validation, permissions, exécution parallèle |
| **11** | [Plugins et MCP](11-plugins-mcp.md) | Architecture extensible |

### Partie V : Optimisation (-70% de Coûts)

| Ch. | Titre | Ce que vous obtenez |
|:---:|-------|---------------------|
| **12** | [Cache Sémantique](12-optimisations-cognitives.md) | 68% de réduction d'appels API |
| **13** | [Model Routing FrugalGPT](13-optimisations-systeme.md) | -70% de coûts automatique |

### Partie VI : Production

| Ch. | Titre | Ce que vous obtenez |
|:---:|-------|---------------------|
| **14** | [Apprentissage Persistant](14-apprentissage-persistant.md) | Agent qui apprend de ses erreurs |
| **15** | [Architecture Complète](15-architecture-complete.md) | Grok-CLI de A à Z |
| **16** | [Sécurité : Le Chapitre le Plus Important](16-system-prompts-securite.md) | Défense contre prompt injection |
| **17** | [Ce Qui Arrive en 2025](17-perspectives-futures.md) | Préparez-vous |

### Annexes

| | Titre | Description |
|:---:|-------|-------------|
| **A** | [Comprendre les Transformers](annexe-a-transformers.md) | La théorie (optionnelle) |
| **B** | [Glossaire](glossaire.md) | 80+ termes définis |
| **C** | [Index](index.md) | Index alphabétique |
| **D** | [Bibliographie](bibliographie.md) | Publications et ressources |

---

## Ce Que Ce Livre Va Vous Éviter

### La Facture de $847
Mon agent est parti en boucle infinie. 6 heures de tokens. **Chapitre 1** : limites d'itérations et budget.

### L'Agent Qui Supprime Vos Fichiers
23h47, un mardi. Configuration supprimée. **Chapitre 16** : système de permissions.

### Le RAG Qui Retourne N'importe Quoi
Mon RAG trouvait les bons fichiers mais pas les dépendances. **Chapitre 8** : Dependency-Aware RAG.

### Le Modèle 10x Trop Cher
Tout sur GPT-4 alors que 73% des requêtes marchent avec un modèle moins cher. **Chapitre 13** : FrugalGPT.

---

## Prérequis

### Obligatoire
- TypeScript/JavaScript intermédiaire (async/await, classes, types)
- Terminal à l'aise (navigation, commandes de base)
- Un compte API (xAI, OpenAI, ou Anthropic)
- ~$20 de crédits pour les exercices

### Ce que vous n'avez PAS besoin de savoir
- Machine Learning / Deep Learning
- Les maths derrière les Transformers
- Comment entraîner un LLM

Ce livre est sur l'**utilisation** des LLM, pas sur leur fonctionnement interne. (La théorie est en **Annexe A** si vous êtes curieux.)

---

## Comment Lire ce Livre

### Option 1 : Terminal avec Glow (recommandé)

```bash
brew install glow        # macOS
glow .                   # Menu interactif
```

### Option 2 : VS Code

```bash
code .
# Ouvrir un fichier .md → Ctrl+Shift+V pour prévisualiser
```

### Option 3 : Générer un PDF

```bash
./scripts/generate-pdf.sh
```

---

## Statistiques

| Métrique | Valeur |
|----------|--------|
| **Chapitres** | 17 + annexes |
| **Mots** | ~45,000 |
| **Pages imprimées** | ~150 |
| **Diagrammes** | 140+ |
| **Outils documentés** | 41+ |
| **Code prêt-à-l'emploi** | Chaque chapitre |

---

## Commencez Maintenant

**[Chapitre 1 : Votre Premier Agent en 30 Minutes →](01-premier-agent.md)**

La théorie sur les Transformers ? Elle est en **[Annexe A](annexe-a-transformers.md)** si vous êtes curieux. Mais vous n'en avez pas besoin pour construire.

---

*Patrice Huetz*
*Décembre 2024*
