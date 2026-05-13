#!/usr/bin/env bash
# Rotaciona localmente o par de chaves do updater Tauri.
# Requisitos: tauri CLI (npm i -g @tauri-apps/cli), gh CLI autenticado, jq
# Uso: ./scripts/rotate-updater-keys.sh "senha-da-chave"
set -euo pipefail

PASSWORD="${1:-}"
if [ -z "$PASSWORD" ]; then
  echo "Uso: $0 <senha-da-chave>"
  exit 1
fi

mkdir -p .keys
tauri signer generate -w .keys/updater.key -p "$PASSWORD" --force

PRIVATE_KEY=$(cat .keys/updater.key)
PUBLIC_KEY=$(cat .keys/updater.key.pub)

# Atualiza pubkey em tauri.conf.json
node -e "
  const fs=require('fs');
  const p='src-tauri/tauri.conf.json';
  const c=JSON.parse(fs.readFileSync(p,'utf8'));
  c.plugins=c.plugins||{}; c.plugins.updater=c.plugins.updater||{};
  c.plugins.updater.pubkey=process.env.PUBLIC_KEY;
  fs.writeFileSync(p, JSON.stringify(c,null,2)+'\n');
" 

PUBLIC_KEY="$PUBLIC_KEY" node -e "console.log('pubkey atualizado em src-tauri/tauri.conf.json')"

# Atualiza secrets no GitHub
gh secret set TAURI_SIGNING_PRIVATE_KEY --body "$PRIVATE_KEY"
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --body "$PASSWORD"

rm -rf .keys
echo "✅ Chaves rotacionadas. Faça commit do tauri.conf.json e dispare uma nova release."
