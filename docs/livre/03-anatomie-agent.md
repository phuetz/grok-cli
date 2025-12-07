# Chapitre 3 : Anatomie d'un Agent Autonome

---

## Table des matières

1. [Scène d'ouverture : Les Six Piliers](#scène-douverture--les-six-piliers)
2. [Vue d'Ensemble : Les Six Composants](#31-vue-densemble--les-six-composants)
3. [L'Orchestrateur : Le Chef d'Orchestre](#32-lorchestratuer--le-chef-dorchestre)
4. [Reasoning : Le Moteur de Réflexion](#33-reasoning--le-moteur-de-réflexion)
5. [Memory : La Mémoire Multi-Niveaux](#34-memory--la-mémoire-multi-niveaux)
6. [Action : Les Outils de l'Agent](#35-action--les-outils-de-lagent)
7. [Learning : L'Apprentissage Continu](#36-learning--lapprentissage-continu)
8. [Security : La Protection Multi-Couches](#37-security--la-protection-multi-couches)
9. [Persistance : La Fondation Stable](#38-persistance--la-fondation-stable)
10. [Le Flux Complet : Un Exemple Détaillé](#39-le-flux-complet--un-exemple-détaillé)
11. [Points Clés à Retenir](#310-points-clés-à-retenir)
12. [Exercices](#311-exercices)
13. [Références](#312-références)

---

## Scène d'ouverture : Les Six Piliers

*Le tableau blanc de Lina ressemblait à une toile d'araignée de concepts. Des flèches partaient dans tous les sens, reliant des boxes multicolores. Au centre, six mots encerclés rayonnaient comme un soleil conceptuel.*

Marc s'approcha du tableau, ses yeux suivant les connexions entre les différentes boîtes. Il avait passé des mois à utiliser des chatbots, mais ce qu'il voyait là était d'un tout autre ordre. Ce n'était plus une simple interface de question-réponse — c'était une architecture complète, presque organique.

— "OK, récapitulons," dit Lina en pointant le centre du tableau où elle avait écrit en grosses lettres :

**ORCHESTRATEUR — REASONING — MEMORY — ACTION — LEARNING — SECURITY**

— "Ces six composants. Si l'un manque, ce n'est pas vraiment un agent. C'est juste un chatbot amélioré."

Marc s'approcha encore, absorbant chaque connexion.

— "Ça ressemble à... un cerveau humain, en fait. Ou plutôt à ce qu'on sait du fonctionnement cognitif."

Lina sourit, manifestement satisfaite de la comparaison.

— "Exactement. On essaie de reproduire ce que fait un développeur quand il résout un problème. Il *réfléchit* au problème, se *souvient* de bugs similaires, *agit* en éditant le code, *apprend* de ses erreurs pour la prochaine fois, et — c'est crucial — il ne fait pas n'importe quoi. Il a du bon sens, des garde-fous."

Sophie, la PM qui avait rejoint la discussion, intervint depuis son bureau :

— "Et l'orchestrateur, c'est quoi exactement ? La conscience ?"

— "En quelque sorte. C'est ce qui coordonne tout. Ce qui décide quand réfléchir, quand agir, quand s'arrêter. Sans lui, les autres composants seraient des pièces détachées — brillantes individuellement, mais incapables de produire quoi que ce soit de cohérent."

Elle prit un marqueur rouge et commença à tracer les connexions entre les composants.

— "Laissez-moi vous montrer comment tout ça s'assemble. C'est là que les choses deviennent vraiment intéressantes..."

---

## 3.1 Vue d'Ensemble : Les Six Composants

Un agent n'est pas simplement un LLM avec des outils. Cette vision réductrice passe à côté de l'essentiel. Un agent est une **architecture cognitive** où plusieurs systèmes spécialisés collaborent pour produire un comportement intelligent et autonome. Chaque composant a un rôle précis, et c'est leur interaction harmonieuse qui produit ce que nous percevons comme de l'intelligence artificielle appliquée.

Pour comprendre cette architecture, il faut d'abord abandonner l'idée que l'agent "est" le LLM. Le LLM n'est qu'un des composants — certes central, mais pas unique. L'agent, c'est l'ensemble du système, avec ses boucles de rétroaction, sa gestion d'état, et ses mécanismes de protection.

### 3.1.1 L'Architecture Cognitive

L'illustration ci-dessous représente l'architecture complète d'un agent cognitif moderne. Remarquez comment l'orchestrateur occupe la position centrale, coordonnant les cinq autres composants spécialisés :

![Architecture cognitive d'un agent autonome](images/agent-architecture.svg)

Cette architecture s'organise en couches logiques :

**Couche supérieure : Interface utilisateur**
L'agent doit communiquer avec le monde extérieur. Cette interface peut prendre de nombreuses formes : une ligne de commande (CLI), une interface textuelle riche (TUI), une API REST, une interface vocale, ou même un plugin d'IDE. Le choix de l'interface affecte l'expérience utilisateur mais pas la logique sous-jacente de l'agent.

**Couche centrale : L'orchestrateur**
Le chef d'orchestre coordonne tout. Il reçoit les messages de l'interface, décide quand appeler le LLM, gère l'exécution des outils, et détermine quand la tâche est terminée. C'est le "système nerveux central" de l'agent.

**Couche fonctionnelle : Les cinq composants spécialisés**
Chaque composant gère un aspect spécifique du comportement de l'agent :
- **Reasoning** : Comment penser (niveaux de réflexion)
- **Memory** : Ce qu'il faut retenir (contexte et apprentissage)
- **Action** : Ce qu'il faut faire (exécution d'outils)
- **Learning** : Ce qu'il faut améliorer (feedback et adaptation)
- **Security** : Ce qu'il ne faut pas faire (protection et limites)

**Couche inférieure : Persistance**
Toutes les données permanentes — base de données, embeddings, caches, logs — résident dans cette couche. C'est la "mémoire à long terme" physique de l'agent.

### 3.1.2 Rôle Détaillé de Chaque Composant

Le tableau suivant résume le rôle de chaque composant, avec une analogie humaine pour faciliter la compréhension :

| Composant        | Rôle Principal                           | Analogie Humaine          | Implémentation Grok-CLI      |
|:-----------------|:-----------------------------------------|:--------------------------|:-----------------------------|
| **Orchestrateur** | Coordonne le flux, gère la boucle agentique | Conscience, attention    | `src/agent/grok-agent.ts`    |
| **Reasoning**     | Résout les problèmes complexes            | Réflexion, analyse        | `src/agent/reasoning/`       |
| **Memory**        | Stocke et retrouve l'information          | Mémoire court/long terme  | `src/context/`, `src/database/` |
| **Action**        | Interagit avec le monde externe           | Corps, mains, actions     | `src/tools/`                 |
| **Learning**      | S'améliore avec l'expérience              | Apprentissage, habitudes  | `src/learning/`              |
| **Security**      | Protège contre les erreurs/abus           | Prudence, bon sens        | `src/security/`              |

L'analogie avec le développeur humain est particulièrement instructive. Quand vous résolvez un bug, vous utilisez instinctivement tous ces composants : vous *réfléchissez* au problème (reasoning), vous *vous souvenez* de bugs similaires (memory), vous *agissez* en éditant le code (action), vous *apprenez* pour la prochaine fois (learning), et vous faites *attention* à ne pas introduire de nouvelles erreurs (security). L'agent fait exactement la même chose, mais de manière explicite et structurée.

### 3.1.3 Interdépendance des Composants

Ce qui distingue une vraie architecture d'agent d'un simple assemblage de pièces, c'est l'**interdépendance** des composants. Ils ne fonctionnent pas en isolation — ils communiquent constamment :

- Le **Reasoning** consulte la **Memory** pour récupérer le contexte pertinent
- L'**Orchestrateur** surveille les résultats des **Actions** pour décider de la suite
- Le **Learning** analyse les **Actions** réussies pour améliorer les futures réponses
- La **Security** filtre toutes les **Actions** avant leur exécution
- La **Memory** stocke les résultats de l'**Orchestrateur** pour maintenir la cohérence

Cette interdépendance crée des boucles de rétroaction qui permettent à l'agent de s'adapter dynamiquement. Un chatbot statique ne peut pas faire ça — il traite chaque requête indépendamment, sans contexte ni apprentissage.

---

## 3.2 L'Orchestrateur : Le Chef d'Orchestre

L'orchestrateur est le cœur battant de l'agent. C'est lui qui décide quand appeler le LLM, quand exécuter un outil, quand demander clarification à l'utilisateur, et quand s'arrêter. Sans lui, les autres composants seraient comme des musiciens talentueux mais sans chef — capables individuellement, mais incapables de produire une symphonie cohérente.

### 3.2.1 La Boucle Agentique ReAct

Le pattern fondamental de tout agent moderne est la boucle **ReAct** (Reasoning + Acting). Ce pattern, introduit par Yao et al. en 2022, unifie le raisonnement et l'action dans une boucle itérative qui permet à l'agent de progresser vers son objectif tout en s'adaptant aux résultats observés.

![La boucle agentique ReAct](images/react-loop.svg)

La boucle se décompose en cinq phases distinctes :

**Phase 1 : PERCEIVE (Percevoir)**
L'agent reçoit une entrée — soit un message de l'utilisateur, soit le résultat d'un outil précédemment exécuté. Cette entrée est ajoutée au contexte de conversation, enrichissant l'historique disponible pour les phases suivantes.

**Phase 2 : THINK (Penser)**
Le LLM est appelé avec le contexte complet : le prompt système, l'historique de conversation, les résultats d'outils récents, et les fichiers pertinents. C'est ici que le "raisonnement" se produit — le modèle analyse la situation et formule une réponse.

**Phase 3 : DECIDE (Décider)**
La réponse du LLM est analysée pour déterminer son type :
- **Tool call** : Le LLM veut utiliser un outil (ex: `read_file`, `bash`)
- **Text only** : Le LLM fournit une réponse textuelle finale

Cette décision détermine le chemin à suivre.

**Phase 4 : ACT (Agir) — si tool call**
L'outil demandé est exécuté. Cette exécution passe par plusieurs étapes de validation (que nous détaillerons dans la section Security) avant d'être réellement effectuée. Le résultat — succès ou échec — est capturé.

**Phase 5 : OBSERVE (Observer) — si tool call**
Le résultat de l'outil est ajouté au contexte. L'agent "observe" ce qui s'est passé et peut maintenant raisonner sur ce résultat dans la prochaine itération de la boucle.

**Condition de terminaison**
La boucle continue jusqu'à ce que :
- Le LLM réponde par du texte seul (sans tool call), indiquant qu'il a terminé
- La limite de rounds soit atteinte (protection contre les boucles infinies)
- Une erreur critique se produise (timeout, dépassement de budget)

### 3.2.2 Implémentation Détaillée

Voici une implémentation simplifiée mais complète de l'orchestrateur, montrant comment la boucle ReAct est traduite en code TypeScript :

```typescript
// src/agent/grok-agent.ts (structure simplifiée pour pédagogie)
export class GrokAgent {
  private maxRounds: number = 30;          // Limite anti-boucle infinie
  private currentRound: number = 0;
  private messages: Message[] = [];        // Historique de conversation
  private client: GrokClient;              // Client API
  private tools: Tool[];                   // Outils disponibles

  async run(userMessage: string): Promise<string> {
    // Ajouter le message utilisateur à l'historique
    this.addMessage({ role: 'user', content: userMessage });

    // Enrichir le contexte avec RAG
    const relevantContext = await this.memory.retrieveRelevant(userMessage);
    this.addContextToMessages(relevantContext);

    // Boucle principale ReAct
    while (this.currentRound < this.maxRounds) {
      this.currentRound++;
      this.emit('roundStart', this.currentRound);

      // 1. THINK - Appeler le LLM avec le contexte complet
      const response = await this.client.chat({
        messages: this.messages,
        tools: this.getAvailableTools(),
        temperature: 0.7,
        max_tokens: 4096
      });

      // 2. DECIDE - Analyser la réponse
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Le LLM veut utiliser des outils
        this.addMessage({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls
        });

        // 3. ACT - Exécuter chaque outil demandé
        for (const toolCall of response.tool_calls) {
          try {
            // Validation + Sécurité + Confirmation
            const result = await this.executeToolSafely(toolCall);

            // 4. OBSERVE - Ajouter le résultat au contexte
            this.addToolResult(toolCall.id, result);

            // Learning : enregistrer le pattern
            await this.learning.recordSuccess(toolCall, result);

          } catch (error) {
            this.addToolError(toolCall.id, error);
            await this.learning.recordFailure(toolCall, error);
          }
        }
        // Continuer la boucle pour que le LLM traite les résultats

      } else {
        // Réponse textuelle = tâche terminée
        this.emit('complete', response.content);
        return response.content;
      }
    }

    // Limite de rounds atteinte
    throw new Error(`Max rounds (${this.maxRounds}) exceeded`);
  }

  private async executeToolSafely(toolCall: ToolCall): Promise<ToolResult> {
    // Pipeline de sécurité (voir section 3.7)
    await this.security.validate(toolCall);
    await this.security.checkPermissions(toolCall);

    if (await this.security.requiresConfirmation(toolCall)) {
      const approved = await this.confirmation.ask(toolCall);
      if (!approved) {
        throw new Error('User rejected tool execution');
      }
    }

    // Exécution avec timeout et sandbox
    return await this.tools.execute(toolCall, {
      timeout: 5 * 60 * 1000,  // 5 minutes
      sandbox: this.security.shouldSandbox(toolCall)
    });
  }
}
```

Ce code illustre plusieurs principes importants :

1. **Séparation des responsabilités** : Chaque phase de la boucle est clairement identifiable
2. **Gestion d'erreurs** : Les exceptions sont capturées et enregistrées pour l'apprentissage
3. **Extensibilité** : Les composants (memory, security, learning) sont injectables
4. **Observabilité** : Des événements sont émis à chaque étape pour le monitoring

### 3.2.3 Gestion des Limites et Risques

L'orchestrateur doit protéger contre plusieurs types de risques. Ces protections ne sont pas optionnelles — elles sont essentielles pour un agent de production :

| Risque               | Protection                    | Valeur Typique      | Justification                                    |
|:---------------------|:------------------------------|:--------------------|:-------------------------------------------------|
| **Boucle infinie**   | Limite de rounds              | 30-400 rounds       | Empêche l'agent de tourner indéfiniment          |
| **Dépassement contexte** | Compression automatique   | 128K tokens max     | Le modèle a une limite de context window         |
| **Coût excessif**    | Budget par session            | $10/session         | Contrôle des coûts API                           |
| **Outil bloqué**     | Timeout par outil             | 5min/outil          | Empêche un outil de bloquer tout le système      |
| **Répétition**       | Détection de patterns         | Hash des 5 derniers | Détecte les boucles où l'agent répète les mêmes actions |

La détection de boucle par répétition mérite une attention particulière. Parfois, un agent peut se retrouver coincé dans un pattern répétitif — par exemple, essayant la même commande qui échoue, encore et encore. La détection de patterns permet d'identifier cette situation :

```typescript
private detectLoop(): boolean {
  if (this.messages.length < 5) return false;

  // Hasher les 5 dernières réponses assistant
  const recentHashes = this.messages
    .filter(m => m.role === 'assistant')
    .slice(-5)
    .map(m => this.hashContent(m));

  // Si plus de 3 hashes identiques, c'est probablement une boucle
  const uniqueHashes = new Set(recentHashes);
  return uniqueHashes.size < 3;
}

private handleLoopDetected(): void {
  this.emit('warning', 'Possible boucle détectée');

  // Stratégies possibles :
  // 1. Demander clarification à l'utilisateur
  // 2. Élever le niveau de reasoning (passer de CoT à ToT)
  // 3. Résumer le contexte et repartir à zéro
  // 4. Forcer une approche différente

  this.reasoning.elevateLevel();
}
```

---

## 3.3 Reasoning : Le Moteur de Réflexion

Le composant Reasoning détermine *comment* l'agent réfléchit à un problème. Cette distinction est cruciale : tous les problèmes ne nécessitent pas la même profondeur de réflexion. Demander l'heure est différent de debugger une race condition dans un système distribué.

L'idée fondamentale est que la réflexion a un **coût** — en temps, en tokens, en argent. Un agent bien conçu adapte son niveau de réflexion à la complexité du problème, utilisant juste assez de ressources pour obtenir un bon résultat.

### 3.3.1 Les Quatre Niveaux de Raisonnement

L'agent dispose de quatre niveaux de raisonnement, chacun adapté à un type de problème différent :

![Les quatre niveaux de raisonnement](images/reasoning-levels.svg)

### 3.3.2 Fonctionnement de Chaque Niveau

**Niveau 0 — Direct Response**

Le niveau le plus simple. L'agent répond directement sans phase de réflexion explicite. C'est approprié pour des requêtes factuelles ou des commandes triviales.

Exemple de flux :
```
User: "Lis le fichier config.json"
Agent: [appelle read_file("config.json")]
       [retourne le contenu]
```

Aucune réflexion complexe n'est nécessaire — l'agent sait exactement quoi faire.

**Niveau 1 — Chain-of-Thought (CoT)**

Le CoT introduit une phase de réflexion séquentielle. L'agent décompose le problème en étapes et les résout une par une. C'est efficace pour des problèmes qui ont une solution linéaire.

Exemple de flux :
```
User: "Refactor cette fonction pour qu'elle soit plus lisible"

Thinking (4K tokens):
  1. Analyser la structure actuelle de la fonction
  2. Identifier les sections qui pourraient être extraites
  3. Vérifier les dépendances entre les parties
  4. Proposer une nouvelle structure
  5. Implémenter les changements

Agent: [appelle read_file pour voir le code]
       [analyse et planifie]
       [appelle edit_file pour appliquer les changements]
```

**Niveau 2 — Tree-of-Thought (ToT)**

Le ToT explore plusieurs chemins en parallèle. Au lieu de suivre une seule ligne de raisonnement, l'agent génère plusieurs hypothèses et les évalue pour choisir la meilleure.

Exemple de flux :
```
User: "Debug ce crash qui se produit aléatoirement"

Thinking (10K tokens):
  Hypothèse A: Race condition dans le thread pool
    - Indices: crash aléatoire, multi-threading
    - Investigation: vérifier les mutex
    - Probabilité: 40%

  Hypothèse B: Memory corruption
    - Indices: crash aléatoire, comportement imprévisible
    - Investigation: vérifier les bounds checks
    - Probabilité: 30%

  Hypothèse C: Resource exhaustion
    - Indices: crash après longue utilisation
    - Investigation: vérifier les leaks
    - Probabilité: 30%

  Évaluation: Commencer par A (plus probable)
  Fallback: Si A ne donne rien, tester B puis C

Agent: [investigation méthodique de chaque hypothèse]
```

**Niveau 3 — Monte-Carlo Tree Search (MCTS)**

Le niveau le plus puissant. MCTS simule de nombreuses variations possibles et utilise des statistiques pour converger vers la meilleure solution. C'est particulièrement utile pour des problèmes où l'espace de solutions est vaste.

Exemple de flux :
```
User: "Redesign l'architecture de ce module pour améliorer les performances"

Thinking (32K tokens):
  Simulation 1: Architecture microservices
    - Découpage: 5 services indépendants
    - Avantages: scalabilité, isolation
    - Inconvénients: complexité ops, latence réseau
    - Score simulé: 72/100

  Simulation 2: Architecture modulaire monolithique
    - Découpage: 3 modules avec interfaces claires
    - Avantages: simplicité, performance
    - Inconvénients: moins scalable
    - Score simulé: 81/100

  Simulation 3: Architecture event-driven
    - Découpage: event bus + handlers
    - Avantages: découplage, extensibilité
    - Inconvénients: debugging complexe
    - Score simulé: 77/100

  ... (100+ simulations)

  Convergence: Architecture modulaire avec event bus local
  Score final: 85/100

Agent: [implémentation de la solution optimale]
```

### 3.3.3 Détection Automatique du Niveau

L'agent peut détecter automatiquement le niveau de raisonnement approprié basé sur le contenu de la requête :

```typescript
// src/agent/thinking-keywords.ts
export class ThinkingKeywordsManager {

  // Mots-clés explicites pour forcer un niveau
  private explicitKeywords = {
    ultrathink: ThinkingLevel.MCTS,
    'deep analysis': ThinkingLevel.MCTS,
    megathink: ThinkingLevel.TREE_OF_THOUGHT,
    'think hard': ThinkingLevel.TREE_OF_THOUGHT,
    think: ThinkingLevel.CHAIN_OF_THOUGHT,
  };

  // Indicateurs de complexité implicite
  private complexityIndicators = [
    { pattern: /debug|investigate|why does/i, level: ThinkingLevel.TREE_OF_THOUGHT },
    { pattern: /refactor|optimize|architect/i, level: ThinkingLevel.CHAIN_OF_THOUGHT },
    { pattern: /race condition|memory leak|deadlock/i, level: ThinkingLevel.TREE_OF_THOUGHT },
    { pattern: /redesign|migrate|rewrite/i, level: ThinkingLevel.MCTS },
    { pattern: /performance|scalability|bottleneck/i, level: ThinkingLevel.TREE_OF_THOUGHT },
  ];

  detectLevel(message: string): ThinkingLevel {
    const lowerMessage = message.toLowerCase();

    // 1. Vérifier les mots-clés explicites
    for (const [keyword, level] of Object.entries(this.explicitKeywords)) {
      if (lowerMessage.includes(keyword)) {
        return level;
      }
    }

    // 2. Analyser la complexité implicite
    for (const indicator of this.complexityIndicators) {
      if (indicator.pattern.test(message)) {
        return indicator.level;
      }
    }

    // 3. Par défaut : réponse directe
    return ThinkingLevel.DIRECT;
  }
}
```

### 3.3.4 Coût/Bénéfice de Chaque Niveau

Le choix du niveau de raisonnement est un compromis entre qualité et ressources :

| Niveau   | Latence   | Coût API | Qualité Résultat | Cas d'usage optimal                          |
|:---------|:----------|:---------|:-----------------|:---------------------------------------------|
| Direct   | ~1s       | 1x       | Suffisante       | Commandes simples, requêtes factuelles       |
| CoT      | ~5-10s    | 3x       | Bonne            | Refactoring, bugs simples, explications      |
| ToT      | ~20-30s   | 8x       | Très bonne       | Bugs complexes, design, investigation        |
| MCTS     | ~60-120s  | 20x      | Optimale         | Architecture, problèmes critiques            |

**Principe directeur** : Utiliser le minimum de reasoning nécessaire. Overkill = gaspillage de temps et d'argent. Un bug trivial résolu avec MCTS coûte 20x plus cher pour un résultat identique.

---

## 3.4 Memory : La Mémoire Multi-Niveaux

La mémoire est ce qui distingue fondamentalement un agent d'un chatbot sans état. Sans mémoire, chaque interaction repart de zéro — l'agent ne se souvient pas de ce qui a été dit, de ce qui a été fait, ni de ce qui a fonctionné. Avec mémoire, l'agent peut apprendre, maintenir un contexte cohérent, et s'améliorer au fil du temps.

### 3.4.1 Les Trois Horizons de Mémoire

L'architecture mémoire d'un agent s'organise en trois horizons temporels, chacun avec des caractéristiques et des usages distincts :

![Architecture mémoire multi-niveaux](images/memory-hierarchy.svg)

**Horizon 1 : Mémoire Court Terme (Working Memory)**

C'est la mémoire "vive" de l'agent — ce qui est actuellement actif dans son contexte. Elle contient :

- Les messages de la conversation courante (user et assistant)
- Les résultats des tool calls récents
- Les fichiers récemment lus ou modifiés
- Le contexte immédiat nécessaire pour la tâche en cours

Cette mémoire est **volatile** — elle disparaît à la fin de la session. Elle est stockée en RAM et limitée par la taille du context window du modèle (typiquement 128K tokens pour les modèles modernes).

La gestion de cette mémoire est critique car elle détermine directement ce que "voit" le LLM lors de chaque appel. Trop peu de contexte et l'agent manque d'information ; trop de contexte et il se perd dans le bruit.

**Horizon 2 : Mémoire Moyen Terme (Session Memory)**

C'est la mémoire de "session" — ce qui a été fait depuis le début de la session de travail, même si ce n'est plus dans le context window actif. Elle contient :

- Des résumés des conversations précédentes de la session
- La liste des fichiers modifiés avec leurs timestamps
- Les décisions importantes et leur contexte
- Les statistiques de la session (tokens consommés, outils utilisés, coût)

Cette mémoire est **persistée** en base de données (SQLite) et survit aux redémarrages de l'agent pendant la session. Elle permet de reprendre là où on s'était arrêté.

**Horizon 3 : Mémoire Long Terme (Persistent Memory)**

C'est la "connaissance" permanente de l'agent — ce qu'il a appris et ce qu'il sait du projet. Elle contient :

- Les embeddings du codebase complet (pour le RAG)
- Les patterns de réparation appris (avec leurs scores de confiance)
- Les conventions et le style du projet
- Les préférences utilisateur persistantes

Cette mémoire est **permanente** — elle persiste entre les sessions et s'enrichit avec le temps. C'est grâce à elle que l'agent peut dire "la dernière fois qu'on a eu cette erreur, on l'a résolue en..."

### 3.4.2 Schéma de Base de Données

La persistance de la mémoire repose sur un schéma SQLite bien structuré :

```sql
-- =============================================================================
-- MÉMOIRE LONG TERME : Connaissances et faits persistants
-- =============================================================================
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,              -- Le contenu de la mémoire
  type TEXT NOT NULL,                 -- Type: 'fact', 'preference', 'convention', 'pattern'
  embedding BLOB,                     -- Vecteur d'embedding (384 ou 1536 dimensions)
  importance REAL DEFAULT 0.5,        -- Score d'importance (0-1)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  accessed_at DATETIME,               -- Dernière utilisation
  access_count INTEGER DEFAULT 0,     -- Fréquence d'accès
  project_id TEXT,                    -- Association à un projet
  metadata JSON                       -- Données supplémentaires flexibles
);

CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_project ON memories(project_id);
CREATE INDEX idx_memories_importance ON memories(importance DESC);

-- =============================================================================
-- MÉMOIRE MOYEN TERME : Sessions et historique
-- =============================================================================
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  started_at DATETIME NOT NULL,
  ended_at DATETIME,
  summary TEXT,                       -- Résumé auto-généré de la session
  project_id TEXT,
  total_tokens INTEGER DEFAULT 0,     -- Tokens consommés
  total_cost REAL DEFAULT 0.0,        -- Coût en dollars
  tools_used JSON,                    -- Compteur par outil utilisé
  files_modified JSON,                -- Liste des fichiers touchés
  metadata JSON
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id),
  role TEXT NOT NULL,                 -- 'user', 'assistant', 'tool'
  content TEXT NOT NULL,
  tool_calls JSON,                    -- Si role='assistant' avec tool calls
  tool_call_id TEXT,                  -- Si role='tool'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  token_count INTEGER
);

CREATE INDEX idx_messages_session ON messages(session_id);

-- =============================================================================
-- APPRENTISSAGE : Patterns de réparation
-- =============================================================================
CREATE TABLE repair_learning (
  id TEXT PRIMARY KEY,
  error_pattern TEXT NOT NULL,        -- Pattern d'erreur (regex ou hash)
  error_example TEXT,                 -- Exemple concret d'erreur
  solution_pattern TEXT NOT NULL,     -- Pattern de solution
  solution_example TEXT,              -- Exemple concret de solution
  success_count INTEGER DEFAULT 0,    -- Nombre de succès
  failure_count INTEGER DEFAULT 0,    -- Nombre d'échecs
  last_used_at DATETIME,
  project_id TEXT,
  -- Score de confiance calculé automatiquement
  confidence REAL GENERATED ALWAYS AS (
    CASE
      WHEN success_count + failure_count = 0 THEN 0.5
      ELSE success_count * 1.0 / (success_count + failure_count + 1)
    END
  ) STORED
);

CREATE INDEX idx_repair_confidence ON repair_learning(confidence DESC);

-- =============================================================================
-- STATISTIQUES : Métriques d'utilisation des outils
-- =============================================================================
CREATE TABLE tool_stats (
  id TEXT PRIMARY KEY,
  tool_name TEXT NOT NULL,
  project_id TEXT,
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  avg_duration_ms REAL GENERATED ALWAYS AS (
    CASE WHEN total_calls = 0 THEN 0 ELSE total_duration_ms * 1.0 / total_calls END
  ) STORED,
  success_rate REAL GENERATED ALWAYS AS (
    CASE WHEN total_calls = 0 THEN 0 ELSE successful_calls * 1.0 / total_calls END
  ) STORED
);

CREATE INDEX idx_tool_stats_name ON tool_stats(tool_name);
```

Ce schéma permet :
- **Requêtes par pertinence** : Grâce aux embeddings, on peut trouver les mémoires sémantiquement proches d'une requête
- **Priorisation automatique** : Le score de confiance et l'importance permettent de trier les résultats
- **Analyse temporelle** : Les timestamps permettent de voir l'évolution
- **Isolation par projet** : Chaque projet peut avoir sa propre mémoire

### 3.4.3 RAG : Retrieval-Augmented Generation

Le RAG (Retrieval-Augmented Generation) est la technique qui permet à l'agent de retrouver les informations pertinentes dans sa mémoire long terme. C'est ce qui lui permet de "se souvenir" de fichiers qu'il n'a pas dans son contexte actuel.

![Pipeline RAG complet](images/rag-pipeline.svg)

### 3.4.4 Compression de Contexte

Quand le contexte dépasse la limite du modèle, l'agent doit **compresser** — décider ce qu'il garde, ce qu'il résume, et ce qu'il abandonne. Cette décision est basée sur un système de priorités :

| Priorité | Contenu                                      | Action         | Justification                                    |
|:---------|:---------------------------------------------|:---------------|:-------------------------------------------------|
| **Haute**    | System prompt                            | Garder tel quel | Définit le comportement de base                  |
| **Haute**    | Message utilisateur actuel               | Garder tel quel | C'est la requête en cours                        |
| **Haute**    | Code en cours d'édition                  | Garder tel quel | Contexte immédiat nécessaire                     |
| **Moyenne**  | Historique récent (5 derniers échanges)  | Garder/Résumer  | Contexte conversationnel                         |
| **Moyenne**  | Imports et dépendances du fichier actuel | Résumer         | Nécessaire pour comprendre le code               |
| **Basse**    | Documentation                            | Résumer fortement | Peut être re-fetchée si besoin                 |
| **Basse**    | Historique ancien                        | Supprimer       | Moins pertinent pour la tâche actuelle           |
| **Basse**    | Fichiers non liés à la requête           | Supprimer       | Bruit sans valeur                                |

La compression utilise le LLM lui-même pour résumer les contenus de priorité moyenne :

```typescript
async compressContext(messages: Message[], maxTokens: number): Promise<Message[]> {
  const totalTokens = this.countTokens(messages);
  if (totalTokens <= maxTokens) return messages;

  // 1. Identifier les messages par priorité
  const highPriority = messages.filter(m => this.isHighPriority(m));
  const mediumPriority = messages.filter(m => this.isMediumPriority(m));
  const lowPriority = messages.filter(m => this.isLowPriority(m));

  // 2. Garder les high priority
  let result = [...highPriority];
  let usedTokens = this.countTokens(result);

  // 3. Résumer les medium priority si nécessaire
  const remainingBudget = maxTokens - usedTokens;
  const mediumSummary = await this.summarize(mediumPriority, remainingBudget * 0.7);
  result.push({ role: 'system', content: `Context summary: ${mediumSummary}` });

  // 4. Ignorer les low priority (ils seront supprimés)

  return result;
}
```

---

## 3.5 Action : Les Outils de l'Agent

Le composant Action est ce qui distingue fondamentalement un agent d'un simple chatbot. C'est la capacité d'**agir** sur le monde — lire des fichiers, exécuter du code, modifier du texte, interagir avec des API. Sans cette capacité, l'agent ne serait qu'un oracle capable de parler mais incapable de faire.

### 3.5.1 Anatomie d'un Outil

Chaque outil suit une interface standardisée qui définit son identité, ses capacités, et ses contraintes :

```typescript
export interface Tool {
  // Identification
  name: string;                        // Identifiant unique (ex: "read_file")
  description: string;                 // Description pour le LLM
  category: ToolCategory;              // Classification (file, shell, git, etc.)

  // Spécification des paramètres (JSON Schema)
  inputSchema: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
  };

  // Sécurité
  requiresConfirmation?: boolean;      // Demande approbation utilisateur ?
  dangerLevel: 'safe' | 'moderate' | 'dangerous';
  allowedInSandbox?: boolean;

  // Limites
  timeout?: number;                    // Temps max d'exécution (ms)
  maxOutputSize?: number;              // Taille max du résultat

  // Exécution
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output?: string;                     // Résultat pour le LLM
  error?: string;                      // Message d'erreur si échec
  duration?: number;                   // Temps d'exécution (ms)
  metadata?: Record<string, unknown>;  // Infos supplémentaires (bytes read, etc.)
}
```

Cette interface standardisée permet :
- **Auto-documentation** : Le LLM comprend comment utiliser l'outil grâce à la description et au schema
- **Validation automatique** : Les arguments sont validés contre le JSON Schema avant exécution
- **Sécurité déclarative** : Les niveaux de danger et les besoins de confirmation sont explicites
- **Observabilité** : Chaque exécution produit un résultat structuré avec métadonnées

### 3.5.2 Le Catalogue des 41 Outils

Grok-CLI dispose de 41 outils organisés en catégories fonctionnelles :

![Catalogue des 41 outils Grok-CLI](images/tools-catalog.svg)

### 3.5.3 Flux d'Exécution Sécurisé

Avant qu'un outil puisse s'exécuter, il doit passer par un pipeline de validation rigoureux. Ce pipeline garantit que seules les actions légitimes et approuvées sont effectuées :

![Flux d'exécution sécurisé d'un outil](images/tool-execution-flow.svg)

Le pipeline se décompose en 5 étapes :

**Étape 1 : Validation des paramètres**

Les arguments fournis par le LLM sont validés contre le JSON Schema de l'outil :
- Types corrects (string, number, boolean, array, object)
- Paramètres requis présents
- Valeurs dans les plages autorisées
- Formats respectés (paths, URLs, patterns)

```typescript
// Exemple de validation pour read_file
const schema = {
  type: 'object',
  properties: {
    path: { type: 'string', minLength: 1 },
    encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8' }
  },
  required: ['path']
};

// Si le LLM appelle read_file({ path: 123 }), l'erreur est détectée ici
```

**Étape 2 : Vérification de sécurité**

Le système de sécurité vérifie que l'opération est autorisée :
- La commande n'est pas blacklistée (rm -rf, format, etc.)
- Le path est dans le working directory autorisé
- L'utilisateur a les permissions nécessaires
- L'opération respecte le mode d'approbation actuel

**Étape 3 : Confirmation utilisateur (conditionnelle)**

Si l'outil est marqué comme nécessitant confirmation, l'utilisateur est sollicité :
![Dialogue de confirmation](images/confirmation-dialog.svg)

**Étape 4 : Exécution**

L'outil s'exécute dans un environnement contrôlé :
- Sandbox (firejail) pour les commandes à risque
- Timeout strict (5 minutes max par défaut)
- Capture des sorties stdout et stderr
- Isolation des variables d'environnement sensibles

**Étape 5 : Post-traitement**

Avant de retourner le résultat au LLM :
- Les secrets sont automatiquement masqués (API keys, passwords)
- Les sorties trop longues sont tronquées
- L'exécution est loggée pour audit
- Les statistiques sont mises à jour

---

## 3.6 Learning : L'Apprentissage Continu

Un agent qui n'apprend pas répète inévitablement les mêmes erreurs. Le composant Learning permet à l'agent de s'améliorer avec l'expérience — de reconnaître des patterns, de mémoriser des solutions qui fonctionnent, et d'éviter les approches qui échouent.

### 3.6.1 Les Quatre Types d'Apprentissage

L'agent apprend de différentes manières, chacune capturant un aspect différent de l'expérience :

![Les quatre types d'apprentissage](images/learning-types.svg)

### 3.6.2 La Boucle d'Apprentissage

L'apprentissage suit un cycle en 5 étapes :

| Étape         | Action                                  | Exemple concret                                        |
|:--------------|:----------------------------------------|:-------------------------------------------------------|
| **Observer**  | Capturer erreur + tentative de solution | "TypeError: Cannot read property 'x' of undefined"    |
| **Exécuter**  | Appliquer la solution proposée          | Ajouter `if (obj) { ... }` avant l'accès              |
| **Évaluer**   | Vérifier si ça a fonctionné             | Relancer les tests → tous passent ✓                   |
| **Mémoriser** | Stocker le pattern avec son score       | Pattern sauvé avec confidence = 0.85                  |
| **Réutiliser**| Suggérer pour erreurs similaires        | Prochaine TypeError → suggérer le même fix            |

### 3.6.3 Calcul du Score de Confiance

Le score de confiance d'un pattern évolue avec chaque utilisation :

```typescript
class RepairLearning {
  async updateConfidence(patternId: string, success: boolean): Promise<void> {
    const pattern = await this.db.getPattern(patternId);

    if (success) {
      pattern.successCount++;
    } else {
      pattern.failureCount++;
    }

    // La confiance est le ratio de succès, avec un lissage bayésien
    // pour éviter les conclusions hâtives sur peu de données
    pattern.confidence = (pattern.successCount + 1) /
                         (pattern.successCount + pattern.failureCount + 2);

    await this.db.savePattern(pattern);
  }

  async getSuggestion(errorMessage: string): Promise<RepairSuggestion | null> {
    // Trouver les patterns similaires à l'erreur
    const candidates = await this.db.findSimilarPatterns(errorMessage);

    // Filtrer ceux avec une confiance suffisante
    const reliable = candidates.filter(p => p.confidence >= 0.7);

    if (reliable.length === 0) return null;

    // Retourner le plus fiable
    return reliable.sort((a, b) => b.confidence - a.confidence)[0];
  }
}
```

Ce système permet à l'agent de devenir progressivement plus efficace — les solutions qui fonctionnent sont suggérées plus souvent, tandis que celles qui échouent sont graduellement oubliées.

---

## 3.7 Security : La Protection Multi-Couches

Un agent qui peut modifier des fichiers et exécuter des commandes est puissant — et potentiellement dangereux. Le composant Security est le garde-fou qui empêche les catastrophes, qu'elles soient accidentelles (bug dans le LLM) ou intentionnelles (prompt injection).

### 3.7.1 Les Trois Modes d'Approbation

L'agent peut fonctionner selon trois modes de sécurité, offrant un équilibre différent entre autonomie et contrôle :

![Les trois modes d'approbation](images/approval-modes.svg)

### 3.7.2 Les Six Couches de Protection

La sécurité de l'agent est assurée par six mécanismes complémentaires :

| Couche         | Mécanisme                            | Protection contre                                    |
|:---------------|:-------------------------------------|:-----------------------------------------------------|
| **Blacklist**  | Liste de commandes interdites        | Destruction système (`rm -rf /`, `format`)           |
| **Path validation** | Vérification des chemins        | Accès à des fichiers hors du projet                  |
| **Sandbox**    | Isolation firejail                   | Effets de bord sur le système                        |
| **Redaction**  | Masquage automatique                 | Fuite de credentials dans les logs                   |
| **Audit**      | Journal de toutes les actions        | Traçabilité et forensics                             |
| **Timeout**    | Limite de temps par outil            | Blocage du système par un outil                      |

### 3.7.3 Redaction Automatique des Secrets

L'agent masque automatiquement les secrets avant qu'ils n'apparaissent dans les réponses ou les logs :

```typescript
const REDACTION_PATTERNS = [
  // API Keys (format générique)
  {
    name: 'Generic API Key',
    regex: /api[_-]?key[=:]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
    replace: 'api_key=[REDACTED]'
  },

  // Passwords dans les URLs ou configs
  {
    name: 'Password',
    regex: /password[=:]\s*["']?([^"'\s]+)["']?/gi,
    replace: 'password=[REDACTED]'
  },

  // AWS Access Keys (pattern spécifique)
  {
    name: 'AWS Access Key',
    regex: /AKIA[0-9A-Z]{16}/g,
    replace: '[AWS_KEY_REDACTED]'
  },

  // AWS Secret Keys
  {
    name: 'AWS Secret',
    regex: /[A-Za-z0-9/+=]{40}/g,  // Heuristique pour les secrets AWS
    replace: '[AWS_SECRET_REDACTED]'
  },

  // Private Keys (PEM)
  {
    name: 'Private Key',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END/gi,
    replace: '[PRIVATE_KEY_REDACTED]'
  },

  // GitHub Personal Access Tokens
  {
    name: 'GitHub Token',
    regex: /ghp_[a-zA-Z0-9]{36}/g,
    replace: '[GITHUB_TOKEN_REDACTED]'
  },

  // Bearer Tokens
  {
    name: 'Bearer Token',
    regex: /Bearer\s+[a-zA-Z0-9._-]+/gi,
    replace: 'Bearer [TOKEN_REDACTED]'
  }
];

function redactSecrets(content: string): string {
  let redacted = content;
  for (const pattern of REDACTION_PATTERNS) {
    redacted = redacted.replace(pattern.regex, pattern.replace);
  }
  return redacted;
}
```

### 3.7.4 Blacklist Absolue

Certaines commandes sont **toujours** bloquées, quel que soit le mode d'approbation :

```typescript
const ABSOLUTE_BLACKLIST = [
  // Destruction système
  'rm -rf /',
  'rm -rf /*',
  'rm -rf ~',
  'rm -rf ~/*',

  // Formatage disques
  /mkfs\./,
  /fdisk\s/,
  'format c:',

  // Fork bombs et DoS
  /:\(\)\s*\{\s*:\|:&\s*\}\s*;/,  // :(){ :|:& };:
  /while\s+true.*fork/i,

  // Exfiltration de données
  /curl\s+.*\s+(\/etc\/shadow|\/etc\/passwd)/,
  /wget\s+.*\s+-O\s+-.*\|/,  // wget to pipe

  // Modification des permissions système
  'chmod -R 777 /',
  'chown -R root /',

  // Manipulation du bootloader
  /dd\s+.*of=\/dev\/sd[a-z]$/,
  /grub-install/,
];

function isAbsolutelyForbidden(command: string): boolean {
  for (const pattern of ABSOLUTE_BLACKLIST) {
    if (typeof pattern === 'string') {
      if (command.includes(pattern)) return true;
    } else {
      if (pattern.test(command)) return true;
    }
  }
  return false;
}
```

---

## 3.8 Persistance : La Fondation Stable

Tous les composants de l'agent reposent sur une couche de persistance qui stocke données, cache, et configuration. Cette couche est invisible pour l'utilisateur mais essentielle au bon fonctionnement.

### 3.8.1 Architecture de Stockage

```
~/.grok/                              # Répertoire utilisateur global
├── grok.db                           # Base SQLite principale
│   ├── memories                      # Mémoire long terme
│   ├── sessions                      # Historique des sessions
│   ├── messages                      # Messages de conversation
│   ├── repair_learning               # Patterns de réparation
│   ├── tool_stats                    # Statistiques d'outils
│   └── preferences                   # Préférences utilisateur
│
├── cache/                            # Caches pour performance
│   ├── semantic-cache.json           # Cache des réponses API
│   ├── tool-cache.json               # Cache des résultats d'outils
│   └── embeddings/                   # Embeddings pré-calculés
│       ├── <project-hash>/           # Par projet
│       │   ├── index.bin             # Index FAISS/Annoy
│       │   └── metadata.json         # Métadonnées des chunks
│       └── ...
│
├── settings.json                     # Configuration utilisateur globale
├── credentials/                      # Credentials chiffrés
│   └── .api-keys                     # Clés API (chiffré AES)
└── logs/                             # Logs structurés
    ├── agent.log                     # Log principal
    └── audit.log                     # Journal d'audit sécurité

.grok/ (dans chaque projet)           # Configuration par projet
├── project-settings.json             # Settings spécifiques au projet
├── mcp.json                          # Serveurs MCP configurés
├── hooks.json                        # Hooks personnalisés
├── approval-mode.json                # Mode d'approbation du projet
└── .cache/                           # Cache local au projet
    └── context-summary.json          # Résumé du contexte courant
```

### 3.8.2 Synchronisation et Cohérence

Les différentes couches de stockage sont synchronisées pour maintenir la cohérence :

```typescript
class PersistenceManager {
  private db: Database;
  private cache: CacheManager;
  private settings: SettingsManager;

  async sync(): Promise<void> {
    // 1. Flush les caches volatils vers SQLite
    await this.cache.flushToDatabase(this.db);

    // 2. Compacter la base si nécessaire
    const stats = await this.db.stats();
    if (stats.fragmentationRatio > 0.3) {
      await this.db.vacuum();
    }

    // 3. Nettoyer les caches expirés
    await this.cache.pruneExpired();

    // 4. Sauvegarder les settings modifiés
    await this.settings.saveIfDirty();
  }
}
```

---

## 3.9 Le Flux Complet : Un Exemple Détaillé

Voyons maintenant comment tous ces composants interagissent pour une tâche réelle. Suivons le parcours d'une requête de bout en bout.

**Requête utilisateur :**
> "Trouve et corrige le bug dans la fonction calculateTotal"

![Trace complète d'une requête](images/trace-complete.svg)

Cette trace illustre comment les six composants collaborent :
- L'**Orchestrateur** gère le flux de bout en bout
- Le **Reasoning** adapte la profondeur de réflexion (CoT activé)
- La **Memory** fournit le contexte via RAG
- L'**Action** exécute les outils demandés
- La **Security** valide chaque opération
- Le **Learning** capture le pattern pour le futur

---

## 3.10 Points Clés à Retenir

### Sur l'Architecture Globale

| Concept              | Point essentiel                                              |
|:---------------------|:-------------------------------------------------------------|
| **6 composants**     | Orchestrateur, Reasoning, Memory, Action, Learning, Security |
| **Interdépendance**  | Chaque composant dépend des autres pour fonctionner          |
| **Boucle ReAct**     | Think → Act → Observe → Repeat jusqu'à complétion            |
| **Pas un LLM seul**  | L'agent est l'ensemble du système, pas juste le modèle       |

### Sur le Reasoning

| Concept              | Point essentiel                                              |
|:---------------------|:-------------------------------------------------------------|
| **4 niveaux**        | Direct → Chain-of-Thought → Tree-of-Thought → MCTS           |
| **Adaptation**       | Utiliser le minimum nécessaire pour la tâche                 |
| **Mots-clés**        | think (CoT), megathink (ToT), ultrathink (MCTS)              |
| **Coût/bénéfice**    | Plus de réflexion = meilleur résultat mais plus cher         |

### Sur la Memory

| Concept              | Point essentiel                                              |
|:---------------------|:-------------------------------------------------------------|
| **3 horizons**       | Court terme (RAM) → Moyen terme (session) → Long terme (DB)  |
| **RAG**              | Retrouver l'info pertinente par similarité vectorielle       |
| **Compression**      | Résumer/supprimer quand le contexte déborde                  |
| **Embeddings**       | Représentation numérique permettant la recherche sémantique  |

### Sur la Security

| Concept              | Point essentiel                                              |
|:---------------------|:-------------------------------------------------------------|
| **3 modes**          | Read-only → Auto-approve → Full-access                       |
| **Défense profonde** | Validation → Sécurité → Confirmation → Exécution             |
| **Redaction**        | Masquage automatique des secrets                             |
| **Blacklist**        | Certaines commandes toujours interdites                      |

---

## 3.11 Exercices

### Exercice 1 : Dessiner un Flux (20 min)

Dessinez le flux complet pour la commande suivante :
> "Crée un fichier test.txt avec 'Hello World' dedans"

Identifiez :
- Chaque composant impliqué
- Les étapes de la boucle ReAct
- Les vérifications de sécurité
- Le nombre de rounds attendu

### Exercice 2 : Implémenter un Outil (30 min)

Implémentez un outil `word_count` qui compte les mots d'un fichier :

```typescript
interface WordCountResult {
  words: number;
  lines: number;
  chars: number;
  avgWordLength: number;
}

// Implémentez cet outil en respectant l'interface Tool
```

Bonus : Ajoutez la gestion des fichiers binaires (qui doivent être rejetés).

### Exercice 3 : Sécurité (15 min)

Listez 10 commandes bash qui devraient être **bloquées** et expliquez pourquoi :

1. `rm -rf /` — Destruction complète du système de fichiers
2. `:(){ :|:& };:` — Fork bomb, épuise les ressources système
3. ... (8 autres)

### Exercice 4 : Schema SQL pour Préférences (20 min)

Concevez un schéma SQL pour stocker les préférences utilisateur avec :
- Type de préférence (style, comportement, confirmation)
- Valeur (peut être string, number, boolean, ou JSON)
- Date de dernière modification
- Fréquence d'utilisation

Le schéma doit permettre de requêter efficacement "les préférences les plus utilisées" et "les préférences récemment modifiées".

### Exercice 5 : Calcul de Confiance (15 min)

Un pattern de réparation a été utilisé 15 fois avec succès et 3 fois sans succès.
1. Quel est son score de confiance avec la formule simple (succès/total) ?
2. Quel est son score avec le lissage bayésien : (succès + 1) / (total + 2) ?
3. Pourquoi le lissage est-il préférable ?

---

## 3.12 Références

### Code Source Grok-CLI

| Composant    | Fichiers principaux                         |
|:-------------|:--------------------------------------------|
| Orchestrateur | `src/agent/grok-agent.ts`                  |
| Reasoning    | `src/agent/reasoning/`, `src/agent/thinking-keywords.ts` |
| Memory       | `src/context/`, `src/database/`, `src/memory/` |
| Action       | `src/tools/`                                |
| Learning     | `src/learning/`, `src/agent/repair/`        |
| Security     | `src/security/`                             |

### Publications Académiques

- **ReAct: Synergizing Reasoning and Acting in Language Models**
  Yao et al., 2022
  *Le paper fondateur du pattern ReAct utilisé dans tous les agents modernes*

- **Cognitive Architectures for Language Agents**
  Sumers et al., 2023
  *Une taxonomie des architectures d'agents avec analyses comparatives*

- **Chain-of-Thought Prompting Elicits Reasoning in Large Language Models**
  Wei et al., 2022
  *L'introduction du Chain-of-Thought pour améliorer le raisonnement*

- **Tree of Thoughts: Deliberate Problem Solving with Large Language Models**
  Yao et al., 2023
  *L'extension multi-chemin du CoT pour les problèmes complexes*

---

## Épilogue : La Vision Complète

Marc recula pour observer le tableau blanc maintenant couvert de diagrammes, de flèches, et de notes. Ce qui avait commencé comme un chaos de concepts s'était transformé en une architecture cohérente — chaque pièce trouvant sa place dans le puzzle.

— "Je comprends mieux maintenant," dit-il, passant son doigt sur les connexions entre les composants. "Ce n'est pas juste 'un LLM avec des outils'. C'est une vraie architecture cognitive avec des composants spécialisés qui collaborent. Comme... comme un orchestre où chaque musicien a son rôle."

Lina acquiesça, un sourire satisfait aux lèvres.

— "Exactement. Et le plus beau, c'est que chaque composant peut être amélioré indépendamment. Tu veux un meilleur reasoning ? Implémente MCTS. Tu veux une meilleure mémoire ? Améliore le RAG. Tu veux plus de sécurité ? Ajoute des règles. Le tout sans toucher aux autres parties."

Sophie, qui avait pris des notes pendant toute la discussion, leva la tête :

— "Et dans les prochains chapitres, on va voir chaque composant en détail ?"

— "Oui. On commence par le Reasoning — Tree-of-Thought et MCTS. C'est là que la magie opère vraiment. Quand un agent peut explorer plusieurs chemins de solution en parallèle et choisir le meilleur... c'est là qu'il dépasse les capacités d'un simple chatbot."

Marc regarda le tableau une dernière fois.

— "J'ai hâte de voir comment tout ça fonctionne en pratique."

— "Alors, au travail. On a du code à écrire."

---

*Fin de la Partie I — Fondations*

---

| Navigation |
|:-----------|
| [⬅️ Chapitre 2 : Le Rôle des Agents](02-role-des-agents.md) |
| [📖 Table des matières](README.md) |
| [➡️ Chapitre 4 : Tree-of-Thought](04-tree-of-thought.md) |
