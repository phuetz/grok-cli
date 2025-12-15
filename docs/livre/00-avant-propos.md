# Avant-propos

## Ce Livre N'est Pas Pour Tout le Monde

Si vous cherchez une introduction aux Transformers ou l'histoire de l'IA, passez votre chemin. Ces informations sont gratuites sur YouTube, ChatGPT ou Wikipedia.

Ce livre est pour vous si :

- ✅ Vous voulez construire un **agent de terminal** qui code, débugue et refactore pour vous
- ✅ Vous êtes prêt à **coder** (TypeScript) et pas juste à lire des concepts
- ✅ Vous voulez les **techniques avancées** : Tree-of-Thought, MCTS, RAG avec graphe de dépendances
- ✅ Vous voulez éviter les erreurs qui m'ont coûté des semaines et des centaines de dollars

---

## Ce Que Vous Allez Construire

À la fin de ce livre, vous aurez construit **Code Buddy** — un agent de terminal complet :

| Ce que fait Code Buddy | Chapitre |
|---------------------|:--------:|
| Lit et modifie votre code intelligemment | 3, 10 |
| Raisonne avec Tree-of-Thought et MCTS | 4, 5 |
| Se corrige automatiquement quand les tests échouent | 6 |
| Comprend les dépendances entre vos fichiers (pas juste du RAG basique) | 7, 8 |
| Économise 68% de vos appels API avec du cache sémantique | 12 |
| Route vers le bon modèle (FrugalGPT : -70% de coûts) | 13 |
| Apprend de ses erreurs et améliore ses performances | 14 |

**Le code complet** : 25,000 lignes, 41 outils, 200+ tests, open-source.

---

## Ce Que Ce Livre Va Vous Éviter

### L'agent qui supprime vos fichiers
*Décembre 2023, 23h47.* Mon agent venait de supprimer mon fichier de configuration. La troisième fois cette semaine. Il ne *comprenait* pas ce qu'il faisait. **Chapitre 16** : système de permissions et sandbox.

### La facture API de $847
Un de mes agents est parti en boucle infinie. 6 heures de tokens GPT-4. **Chapitre 3** : limites d'itérations et garde-fous.

### Le RAG qui retourne n'importe quoi
Mon RAG trouvait les bons fichiers mais pas les dépendances. L'agent ne comprenait pas le contexte. **Chapitre 8** : Dependency-Aware RAG avec graphe AST.

### Le modèle qui coûte 10x trop cher
Tout sur GPT-4 alors que 73% des requêtes marchent avec un modèle 10x moins cher. **Chapitre 13** : FrugalGPT et model routing.

---

## Comment Ce Livre Est Différent

| Livre classique | Ce livre |
|-----------------|----------|
| "L'attention est un mécanisme qui..." | **Le code qui marche** (TypeScript, testé) |
| "Considérons l'architecture..." | **Le problème** → **La solution** |
| "Les Transformers ont révolutionné..." | **Comment économiser 70% sur l'API** |
| Exercice : "Réfléchissez à..." | Exercice : **Implémentez X en 30 min** |

La théorie (Transformers, n-grammes) est en **annexe** pour ceux qui veulent approfondir.

---

## Prérequis

### Obligatoire
- TypeScript/JavaScript intermédiaire (async/await, classes, types)
- Terminal à l'aise (navigation, commandes de base)
- Un compte API (xAI Grok, OpenAI, ou Anthropic)
- ~$20 de crédits pour les exercices

### Ce que vous n'avez PAS besoin de savoir
- Machine Learning / Deep Learning
- Les maths derrière les Transformers
- Comment entraîner un LLM

Ce livre est sur l'**utilisation** des LLM pour construire des agents, pas sur leur fonctionnement interne.

---

## Structure du Livre

### Partie I : Démarrage Rapide (Ch. 1-3)
**Objectif** : Un agent fonctionnel en 2 heures
- Ch. 1 : Votre premier agent (le code minimal)
- Ch. 2 : Les patterns d'agents (quand utiliser quoi)
- Ch. 3 : Les 6 composants d'un agent robuste

### Partie II : Raisonnement Avancé (Ch. 4-6)
**Objectif** : Un agent qui réfléchit avant d'agir
- Ch. 4 : Tree-of-Thought (explorer plusieurs solutions)
- Ch. 5 : MCTS (quand ToT ne suffit pas)
- Ch. 6 : Auto-réparation (se corriger avec les tests)

### Partie III : Mémoire Intelligente (Ch. 7-9)
**Objectif** : Un agent qui comprend le contexte
- Ch. 7 : RAG moderne (pas le tutoriel basique)
- Ch. 8 : RAG avec graphe de dépendances
- Ch. 9 : Compression de contexte (économiser les tokens)

### Partie IV : Action (Ch. 10-11)
**Objectif** : Un agent qui agit efficacement
- Ch. 10 : 41 outils (le catalogue complet)
- Ch. 11 : Plugins et MCP (extensibilité)

### Partie V : Optimisation (Ch. 12-13)
**Objectif** : -70% de coûts, +3x de vitesse
- Ch. 12 : Cache sémantique (68% de réduction)
- Ch. 13 : Model routing et parallélisation

### Partie VI : Production (Ch. 14-17)
**Objectif** : Un agent déployable
- Ch. 14 : Apprentissage persistant
- Ch. 15 : Architecture complète
- Ch. 16 : Sécurité (le chapitre le plus important)
- Ch. 17 : Ce qui arrive en 2025

---

## Le Code Source

Tout le code est disponible et testé :

```bash
git clone https://github.com/phuetz/code-buddy.git
cd code-buddy
npm install
export GROK_API_KEY=your_key
npm run dev
```

| Statistique | Valeur |
|-------------|--------|
| Lignes de code | ~25,000 |
| Outils intégrés | 41 |
| Tests | 200+ |

---

## Commencez Maintenant

Passez directement au **Chapitre 1** pour avoir un agent fonctionnel en 30 minutes.

La théorie sur les Transformers ? Elle est en **annexe** si vous êtes curieux. Mais vous n'en avez pas besoin pour construire.

---

*Patrice Huetz*
*Décembre 2024*
