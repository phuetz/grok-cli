#!/bin/bash
# scripts/generate-epub.sh
# Genere le livre au format EPUB avec Pandoc

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIVRE_DIR="$SCRIPT_DIR/../docs/livre"
OUTPUT="$LIVRE_DIR/livre-grok-cli.epub"

cd "$LIVRE_DIR"

echo "Generation de l'EPUB..."
echo "Repertoire: $LIVRE_DIR"

# Liste des chapitres dans l'ordre
CHAPTERS=(
  "00-avant-propos.md"
  "01-comprendre-les-llms.md"
  "02-role-des-agents.md"
  "03-anatomie-agent.md"
  "04-tree-of-thought.md"
  "05-mcts.md"
  "06-repair-reflexion.md"
  "07-rag-moderne.md"
  "08-dependency-aware-rag.md"
  "09-context-compression.md"
  "10-tool-use.md"
  "11-plugins-mcp.md"
  "12-optimisations-cognitives.md"
  "13-optimisations-systeme.md"
  "14-apprentissage-persistant.md"
  "15-architecture-complete.md"
  "16-system-prompts-securite.md"
  "glossaire.md"
  "bibliographie.md"
)

# Verification que les fichiers existent
for chapter in "${CHAPTERS[@]}"; do
  if [[ ! -f "$chapter" ]]; then
    echo "ERREUR: Fichier manquant: $chapter"
    exit 1
  fi
done

# Options pour l'image de couverture
COVER_OPTS=""
if [[ -f "images/cover-image.png" ]]; then
  COVER_OPTS="--epub-cover-image=images/cover-image.png"
  echo "Image de couverture trouvee"
fi

# Generation avec Pandoc
pandoc \
  --from=markdown+smart+yaml_metadata_block+pipe_tables+fenced_code_blocks \
  --to=epub3 \
  --metadata-file=metadata.yaml \
  $COVER_OPTS \
  --toc \
  --toc-depth=2 \
  --css=styles/epub.css \
  --epub-chapter-level=1 \
  --resource-path=".:images:images/svg" \
  -o "$OUTPUT" \
  "${CHAPTERS[@]}"

echo ""
echo "EPUB genere avec succes: $OUTPUT"
echo "Taille: $(du -h "$OUTPUT" | cut -f1)"
