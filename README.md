# IL2CPP Symbol Extractor

Extract ELF symbols, IL2CPP exports, and strings from `libil2cpp.so`.
Optionally analyze `global-metadata.dat` headers.

## Deploy to Vercel (from GitHub)

### 1. Create GitHub Repo
```bash
# Create the project locally
mkdir il2cpp-symbol-extractor
cd il2cpp-symbol-extractor

# Create all files from this repo, then:
git init
git add .
git commit -m "init"
git branch -M main

# Create a new empty repo on GitHub, then push:
git remote add origin https://github.com/YOUR_USERNAME/il2cpp-symbol-extractor.git
git push -u origin main
