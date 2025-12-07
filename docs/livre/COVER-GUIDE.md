# 🎨 Guide de Création de Couverture

## Template SVG

Le fichier `images/cover-template.svg` contient un template prêt à l'emploi avec :
- Zone centrale pour l'image IA (400x300px)
- Titre et sous-titre positionnés
- Badges de statistiques
- Palette de couleurs cohérente avec le livre

## Dimensions

| Format | Largeur | Hauteur | Ratio |
|--------|---------|---------|-------|
| Template SVG | 600px | 900px | 2:3 |
| Print (6"x9") | 1800px | 2700px | 2:3 |
| Ebook | 1600px | 2400px | 2:3 |
| PDF | 600pt | 900pt | 2:3 |

## Palette de Couleurs

```
Background:    #0a0a1a → #1a1a2e → #16213e (gradient)
Primary:       #3498db (bleu cyan)
Secondary:     #2ecc71 (vert émeraude)
Accent:        #f39c12 (orange)
Highlight:     #e74c3c (rouge)
Purple:        #9b59b6
Text light:    #ffffff
Text muted:    #a0a0a0
```

## Prompts pour l'Image Centrale

### Prompt recommandé (Midjourney v6)

```
Abstract digital brain made of glowing neural pathways and code
fragments, central processing core with branching decision trees,
dark blue and purple background, cyan and green bioluminescent
connections, ethereal particles floating, professional tech
illustration style, centered composition, no text --ar 4:3
--style raw --stylize 150
```

### Variante minimaliste

```
Minimalist geometric AI symbol, interconnected hexagons forming
a brain pattern, gradient from cyan to emerald green, dark navy
background, subtle glow effects, clean vector style, centered
--ar 4:3 --style raw
```

### Variante avec personnage (Lina)

```
Silhouette of a female developer from behind, facing multiple
holographic screens showing neural networks and code, warm cyan
and green light emanating from screens, dark atmospheric
environment, cinematic lighting, professional illustration
--ar 4:3 --style raw
```

## Instructions d'Intégration

### Étape 1 : Générer l'image
1. Utiliser le prompt sur Midjourney/DALL-E/Stable Diffusion
2. Générer en haute résolution (minimum 1200x900px)
3. Sauvegarder en PNG avec transparence si possible

### Étape 2 : Intégrer dans le SVG
```xml
<!-- Remplacer le placeholder par : -->
<image
  x="100" y="280"
  width="400" height="300"
  href="cover-image.png"
  preserveAspectRatio="xMidYMid slice"/>
```

### Étape 3 : Export final
```bash
# Avec Inkscape (recommandé)
inkscape cover-template.svg --export-type=png \
  --export-filename=cover.png \
  --export-width=1800 --export-height=2700

# Ou avec ImageMagick
convert -density 300 cover-template.svg cover.png
```

## Structure du Template

```
┌─────────────────────────────────────┐
│  ═══════════════════════════════    │ ← Ligne décorative
│  [INTELLIGENCE ARTIFICIELLE]        │ ← Tag catégorie
│                                     │
│        Construire un                │
│        Agent LLM                    │ ← Titre principal
│        Moderne                      │
│                                     │
│    ┌─────────────────────────┐      │
│    │                         │      │
│    │    [ IMAGE IA ICI ]     │      │ ← Zone image (400x300)
│    │                         │      │
│    └─────────────────────────┘      │
│                                     │
│     De la Théorie à Grok-CLI        │ ← Sous-titre
│                                     │
│  Transformers • RAG • ToT • MCTS    │ ← Features
│  Tool-Use • Mémoire • Multi-Agent   │
│  ─────────────────────────────────  │
│                                     │
│  [260+]  [130]   [16]    [155+]     │ ← Badges stats
│  PAGES   DIAG    CHAP    CODE       │
│                                     │
│  Un guide pratique pour construire  │ ← Description
│  des agents IA de développement     │
│  ═══════════════════════════════    │ ← Ligne décorative
│                              v1.0   │
└─────────────────────────────────────┘
```

## Fichiers

| Fichier | Description |
|---------|-------------|
| `images/cover-template.svg` | Template avec placeholder |
| `images/cover.svg` | Couverture finale (à créer) |
| `images/cover.png` | Export PNG haute résolution |

## Licence Images IA

Si vous utilisez une image générée par IA :
- **Midjourney** : Droits commerciaux avec abonnement Pro
- **DALL-E** : Droits d'utilisation accordés
- **Stable Diffusion** : Selon le modèle utilisé

Pensez à mentionner "Cover art generated with AI" dans les crédits.
