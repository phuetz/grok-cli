# Avant-propos

---

## Le Declic

*Decembre 2023, 23h47. Je fixe mon terminal depuis trois heures.*

L'agent IA que j'avais construit venait de supprimer mon fichier de configuration. Encore. La troisieme fois cette semaine.

"Il suffit de lui dire de ne pas le faire," m'avait suggere un collegue.

Mais c'etait plus profond que ca. Mon agent ne *comprenait* pas ce qu'il faisait. Il executait des commandes sans contexte, sans memoire de nos echanges precedents, sans raisonnement sur les consequences. Un perroquet stochastique avec acces root.

J'ai ferme mon laptop, frustre. Puis une question m'a tenu eveille toute la nuit :

> **Comment construire un agent qui *pense* avant d'agir ?**

Ce livre est ma reponse a cette question.

---

## Ce Livre Est Pour Vous Si...

- Vous avez deja utilise ChatGPT, Claude ou Grok et voulez aller plus loin
- Vous etes developpeur et voulez construire vos propres agents IA
- Vous voulez comprendre la recherche recente (Tree-of-Thought, MCTS, RAG...)
- Vous etes frustre par les limites des chatbots : hallucinations, oublis, incapacite a agir

**Ce livre n'est PAS** un tutoriel de prompt engineering ni une introduction au machine learning. C'est un guide d'architecture pour construire des systemes intelligents robustes.

---

## Ce Que Vous Allez Construire

A travers ce livre, nous construirons ensemble **Grok-CLI** — un agent IA de terminal complet avec :

| Capacite | Description | Chapitre |
|----------|-------------|----------|
| Raisonnement avance | Tree-of-Thought, Monte-Carlo Tree Search | 4-5 |
| Auto-reparation | Correction automatique avec feedback de tests | 6 |
| Memoire intelligente | RAG, compression de contexte, memoire persistante | 7-9, 14 |
| 41 outils | Fichiers, recherche, bash, git, refactoring... | 10-11 |
| Optimisations | Cache semantique (68% reduction API), parallelisation | 12-13 |
| Securite | Confirmations, sandbox, redaction automatique | 15-16 |

**A la fin de ce livre**, vous aurez non seulement un agent fonctionnel, mais surtout une comprehension profonde des principes qui permettent aux agents LLM d'etre fiables et utiles.

---

## Prerequis

Pour tirer le meilleur de ce livre, vous devriez avoir :

| Competence | Niveau Requis | Notes |
|------------|---------------|-------|
| TypeScript/JavaScript | Intermediaire | Async/await, classes, types |
| Terminal | A l'aise | Navigation, commandes de base |
| Concepts IA | Notions | Savoir ce qu'est un LLM |
| Git | Basique | Clone, commit, push |

**Pas besoin** d'expertise en machine learning, statistiques ou mathematiques avancees. Les concepts sont expliques au fur et a mesure.

---

## L'Histoire de Lina

Tout au long de ce livre, vous suivrez **Lina**, une developpeuse fictive mais representative de milliers d'ingenieurs qui tentent aujourd'hui d'exploiter le potentiel des LLMs.

Lina n'est pas une experte en machine learning. Elle est pragmatique, curieuse, et parfois frustree. Elle veut des **resultats**, pas des theories abstraites. Son collegue **Marc** l'accompagne, apportant tantot du scepticisme sain, tantot des idees brillantes.

A travers leur parcours, vous vivrez les memes defis, les memes "eureka", et les memes solutions que j'ai decouvertes en construisant Grok-CLI.

> Astuce : Les dialogues entre Lina et Marc ne sont pas juste decoratifs. Ils introduisent souvent des concepts importants de maniere accessible avant la theorie formelle.

---

## Structure du Livre

Ce livre est organise en sept parties progressives :

```
PARTIE I : FONDATIONS
  Ch.01 Comprendre les LLMs......... Transformers, attention, limites
  Ch.02 Le Role des Agents.......... Taxonomie, de chatbot a multi-agent
  Ch.03 Anatomie d'un Agent......... Les 6 composants essentiels

PARTIE II : RAISONNEMENT ET PLANIFICATION
  Ch.04 Tree-of-Thought............ Exploration multi-chemins
  Ch.05 Monte-Carlo Tree Search.... Selection, expansion, simulation
  Ch.06 Repair et Reflexion........ Auto-correction avec tests

PARTIE III : MEMOIRE, RAG ET CONTEXTE
  Ch.07 RAG Moderne................ Embeddings, chunking, reranking
  Ch.08 Dependency-Aware RAG....... Graphe de dependances
  Ch.09 Compression de Contexte.... Priorites, observation masking

PARTIE IV : ACTION ET OUTILS
  Ch.10 Tool-Use................... 41 outils, validation, parallelisation
  Ch.11 Plugins et MCP............. Model Context Protocol

PARTIE V : OPTIMISATION
  Ch.12 Optimisations Cognitives... Cache semantique (68% reduction)
  Ch.13 Optimisations Systeme...... FrugalGPT, LLMCompiler, lazy loading

PARTIE VI : APPRENTISSAGE
  Ch.14 Apprentissage Persistant... 4 types de memoire, consolidation

PARTIE VII : ETUDE DE CAS
  Ch.15 Architecture Complete...... Grok-CLI de A a Z
  Ch.16 System Prompts & Securite.. Prompt injection, defenses

ANNEXES
  Glossaire, Bibliographie, Index
```

---

## Comment Lire Ce Livre

### Option 1 : Lecture lineaire (recommande pour debutants)

Suivez l'histoire de Lina du debut a la fin. Les concepts s'appuient les uns sur les autres.

### Option 2 : Reference (pour developpeurs experimentes)

Sautez directement aux chapitres qui vous interessent. Chaque chapitre inclut ses prerequis.

### Option 3 : Hands-on

Clonez Grok-CLI et experimentez en parallele de votre lecture :

```bash
git clone https://github.com/phuetz/grok-cli.git
cd grok-cli
npm install
export GROK_API_KEY=your_key
npm run dev
```

---

## Conventions du Livre

### Code

Tous les exemples sont en **TypeScript** et proviennent du code reel de Grok-CLI :

```typescript
// src/agent/grok-agent.ts
export class GrokAgent {
  private maxRounds = 30;

  async process(input: string): Promise<string> {
    // Code reel, pas de pseudo-code
  }
}
```

### Encadres Pedagogiques

Repérez ces marqueurs tout au long du livre :

> **A Retenir**
>
> Les concepts essentiels a memoriser.

> **Attention**
>
> Pieges courants et erreurs frequentes.

> **Astuce Pratique**
>
> Conseils d'implementation concrets.

---

## Le Code Source

Tous les exemples proviennent de **Grok-CLI**, un agent open-source complet :

```
https://github.com/phuetz/grok-cli
```

| Statistique | Valeur |
|-------------|--------|
| Lignes de code | ~25,000 |
| Outils integres | 41 |
| Tests | 200+ |
| Documentation | Ce livre ! |

Je vous encourage vivement a explorer le code pendant votre lecture. Rien ne remplace la pratique.

---

## References Scientifiques

Ce livre s'appuie sur des publications academiques recentes. Chaque technique majeure est referencee :

| Technique | Publication | Annee |
|-----------|-------------|-------|
| Tree-of-Thought | Yao et al., NeurIPS | 2023 |
| MCTS pour code | RethinkMCTS, arXiv | 2024 |
| ChatRepair | ISSTA (Distinguished Paper) | 2024 |
| FrugalGPT | Stanford | 2023 |
| LLMCompiler | UC Berkeley | 2023 |
| Context Compression | JetBrains Research | 2024 |

La bibliographie complete est disponible en annexe.

---

## Remerciements

Ce livre n'existerait pas sans :

- La **communaute open-source** qui a partage recherches, idees et code
- Les **chercheurs** derriere ToT, MCTS, FrugalGPT, LLMCompiler, ChatRepair et tant d'autres publications
- Les **early adopters** de Grok-CLI qui ont teste, rapporte des bugs et suggere des ameliorations
- **Ma famille** qui a supporte mes soirees de coding
- **Vous**, lecteur, qui prenez le temps d'apprendre

---

## Une Invitation

L'intelligence artificielle evolue a une vitesse vertigineuse. Ce que vous lisez aujourd'hui sera peut-etre obsolete dans un an. Mais les **principes** — la decomposition de problemes, la memoire structuree, l'action securisee, l'apprentissage continu — ces principes resteront.

Mon espoir est que ce livre vous donne non seulement des techniques concretes, mais surtout une *facon de penser* les systemes intelligents.

Que vous construisiez un assistant de code, un agent de recherche, ou quelque chose que personne n'a encore imagine.

**Bienvenue dans le monde des agents LLM modernes.**

Pret a construire un agent qui pense ? Tournez la page.

---

*Patrice Huetz*
*Decembre 2024*

---

> *"The best way to predict the future is to invent it."*
> — Alan Kay
