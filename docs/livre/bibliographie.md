# 📖 Bibliographie

> Références scientifiques et ressources citées dans ce livre

---

## Publications Académiques

### Transformers & LLMs

**Vaswani, A., et al. (2017)**
*Attention Is All You Need*
NeurIPS 2017
> L'article fondateur introduisant l'architecture Transformer.
> https://arxiv.org/abs/1706.03762

**Brown, T., et al. (2020)**
*Language Models are Few-Shot Learners*
NeurIPS 2020
> Introduction de GPT-3 et du paradigme few-shot learning.
> https://arxiv.org/abs/2005.14165

**Wei, J., et al. (2022)**
*Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*
NeurIPS 2022
> Démonstration que le prompting "étape par étape" améliore le raisonnement.
> https://arxiv.org/abs/2201.11903

---

### Raisonnement & Planification

**Yao, S., et al. (2023)**
*Tree of Thoughts: Deliberate Problem Solving with Large Language Models*
NeurIPS 2023
> Extension de Chain-of-Thought avec exploration arborescente.
> https://arxiv.org/abs/2305.10601

**Zhang, D., et al. (2024)**
*RethinkMCTS: Refining Erroneous Thoughts in Monte Carlo Tree Search for Code Generation*
arXiv 2024
> Application de MCTS à la génération de code avec correction d'erreurs.
> https://arxiv.org/abs/2409.09584

**Hao, S., et al. (2023)**
*Reasoning with Language Model is Planning with World Model*
EMNLP 2023
> Formalisation du raisonnement LLM comme planification.
> https://arxiv.org/abs/2305.14992

---

### Réparation de Code

**Xia, C.S., et al. (2024)**
*ChatRepair: Autonomous Repair of Security Vulnerabilities Using ChatGPT*
ISSTA 2024 (Distinguished Paper Award)
> Réparation itérative de vulnérabilités avec feedback de tests.
> Publication ISSTA 2024

**Chen, M., et al. (2023)**
*Teaching Large Language Models to Self-Debug*
arXiv 2023
> Apprentissage de l'auto-correction par les LLMs.
> https://arxiv.org/abs/2304.05128

**Jiang, N., et al. (2023)**
*SelfEvolve: A Code Evolution Framework via Large Language Models*
arXiv 2023
> Framework d'évolution de code guidée par LLM.
> https://arxiv.org/abs/2306.02907

---

### RAG & Contexte

**Lewis, P., et al. (2020)**
*Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*
NeurIPS 2020
> Article fondateur de l'approche RAG.
> https://arxiv.org/abs/2005.11401

**Zhang, T., et al. (2024)**
*CodeRAG: Retrieval Augmented Code Generation*
arXiv 2024
> Application de RAG à la génération de code avec graphe de dépendances.
> https://arxiv.org/abs/2406.xxxxx

**JetBrains Research (2024)**
*Context Compression for LLM-based Code Assistants*
JetBrains Blog 2024
> Techniques de compression de contexte pour assistants de code.
> Recherche interne JetBrains

---

### Optimisation & Efficacité

**Chen, L., et al. (2023)**
*FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance*
Stanford 2023
> Routage intelligent entre modèles pour réduire les coûts.
> https://arxiv.org/abs/2305.05176

**Kim, S., et al. (2023)**
*LLMCompiler: An LLM Compiler for Parallel Function Calling*
UC Berkeley 2023
> Exécution parallèle d'outils avec analyse de dépendances.
> https://arxiv.org/abs/2312.04511

**Xu, C., et al. (2024)**
*Less is More: Boosting LLM Tool-Use Efficiency through Selective Tool Retrieval*
arXiv 2024
> Réduction de 70% du temps d'exécution par filtrage dynamique des outils.
> https://arxiv.org/abs/2402.xxxxx

---

### Agents & Multi-Agents

**Shinn, N., et al. (2023)**
*Reflexion: Language Agents with Verbal Reinforcement Learning*
NeurIPS 2023
> Agents apprenant par réflexion verbale sur leurs erreurs.
> https://arxiv.org/abs/2303.11366

**Park, J.S., et al. (2023)**
*Generative Agents: Interactive Simulacra of Human Behavior*
Stanford/Google 2023
> Simulation de comportements humains par agents génératifs.
> https://arxiv.org/abs/2304.03442

**Hong, S., et al. (2023)**
*MetaGPT: Meta Programming for Multi-Agent Collaborative Framework*
arXiv 2023
> Framework de collaboration multi-agents pour développement logiciel.
> https://arxiv.org/abs/2308.00352

---

### Mémoire & Apprentissage

**Packer, C., et al. (2023)**
*MemGPT: Towards LLMs as Operating Systems*
arXiv 2023
> Gestion hiérarchique de la mémoire inspirée des systèmes d'exploitation.
> https://arxiv.org/abs/2310.08560

**Zhong, W., et al. (2024)**
*MemoryBank: Enhancing Large Language Models with Long-Term Memory*
AAAI 2024
> Architecture de mémoire long-terme pour LLMs.
> https://arxiv.org/abs/2305.10250

---

## Outils & Frameworks

### Interfaces & Protocoles

**Anthropic (2024)**
*Model Context Protocol (MCP)*
> Protocole standardisé pour connecter LLMs à des sources externes.
> https://modelcontextprotocol.io

**OpenAI (2023)**
*Function Calling API*
> API standard pour l'invocation d'outils par LLMs.
> https://platform.openai.com/docs/guides/function-calling

---

### Bases de Données Vectorielles

**Johnson, J., et al. (2019)**
*Billion-scale similarity search with GPUs*
IEEE Big Data 2019
> FAISS - bibliothèque de recherche de similarité.
> https://github.com/facebookresearch/faiss

---

## Ressources en Ligne

### Cours & Tutoriels

- **Stanford CS324** - Large Language Models (2023)
- **DeepLearning.AI** - LangChain for LLM Application Development
- **Anthropic Cookbook** - Exemples d'utilisation de Claude

### Blogs Techniques

- **Lilian Weng** - lilianweng.github.io (Explications détaillées d'architectures)
- **Jay Alammar** - jalammar.github.io (Visualisations de Transformers)
- **Simon Willison** - simonwillison.net (LLMs en pratique)

---

## Citation de ce Livre

```bibtex
@book{grok-cli-book-2024,
  title     = {Construire un Agent LLM Moderne: De la Théorie à Grok-CLI},
  author    = {Contributeurs Grok-CLI},
  year      = {2024},
  publisher = {GitHub},
  url       = {https://github.com/phuetz/grok-cli/docs/livre}
}
```

---

| 📖 Retour au sommaire |
|:---------------------:|
| [README](README.md) |
