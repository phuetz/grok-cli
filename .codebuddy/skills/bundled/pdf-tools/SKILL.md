---
name: pdf-tools
version: 1.0.0
description: Read, extract, convert, and manipulate PDF files
author: Code Buddy
tags: pdf, extract, convert, document
---

# PDF Tools

## Overview

Read, extract text, convert, and manipulate PDF files using common CLI tools.

## Reading PDFs

### Extract text
```bash
# Using pdftotext (poppler-utils)
pdftotext document.pdf -         # stdout
pdftotext document.pdf output.txt

# Specific pages
pdftotext -f 1 -l 5 document.pdf -  # pages 1-5

# Layout mode (preserve formatting)
pdftotext -layout document.pdf -
```

### Get PDF info
```bash
pdfinfo document.pdf
# Pages, size, creator, producer, etc.
```

## Converting

### PDF to images
```bash
# Using pdftoppm (poppler-utils)
pdftoppm -png document.pdf /tmp/page   # page-1.png, page-2.png, ...
pdftoppm -png -f 1 -l 1 document.pdf /tmp/cover  # first page only
pdftoppm -jpeg -r 300 document.pdf /tmp/hires     # 300 DPI
```

### Images to PDF
```bash
# Using ImageMagick
convert image1.png image2.png output.pdf

# Using img2pdf (preserves quality)
img2pdf *.png -o output.pdf
```

### Markdown/HTML to PDF
```bash
# Using pandoc
pandoc document.md -o output.pdf
pandoc --pdf-engine=weasyprint document.html -o output.pdf
```

## Manipulating

### Merge PDFs
```bash
# Using pdfunite (poppler-utils)
pdfunite file1.pdf file2.pdf merged.pdf

# Using qpdf
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf
```

### Split PDF
```bash
# Extract specific pages with qpdf
qpdf input.pdf --pages . 1-5 -- first5.pdf
qpdf input.pdf --pages . 10 -- page10.pdf
```

### Rotate pages
```bash
qpdf input.pdf --rotate=90:1-3 -- rotated.pdf  # rotate pages 1-3 by 90°
```

### Compress
```bash
# Using Ghostscript
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dQUIET -dBATCH -sOutputFile=compressed.pdf input.pdf
```

## Prerequisites

Install on Ubuntu/Debian:
```bash
sudo apt-get install poppler-utils qpdf ghostscript
```

Install on macOS:
```bash
brew install poppler qpdf ghostscript
```

## Tips

- Always check page count first: `pdfinfo file.pdf | grep Pages`
- For OCR on scanned PDFs: `ocrmypdf scanned.pdf searchable.pdf`
- Use `pdftotext -layout` to preserve tables and columns
- For large PDFs, process page ranges to save memory
