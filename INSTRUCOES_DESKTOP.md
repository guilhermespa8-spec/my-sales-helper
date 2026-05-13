# Guia de Instalação e Build Desktop (Tauri)

Este guia explica como transformar seu projeto em um aplicativo instalável (`.exe` ou `.dmg`) no seu computador.

## 1. Pré-requisitos

Antes de começar, você precisa instalar:

*   **Node.js (LTS):** [https://nodejs.org/](https://nodejs.org/)
*   **Rust:** [https://rustup.rs/](https://rustup.rs/) (Siga as instruções para o seu sistema operacional)
*   **Dependências do Sistema (Apenas para Tauri):**
    *   **Windows:** Instale o [C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
    *   **Linux (Ubuntu/Debian):** `sudo apt update && sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

## 2. Comandos para Preparar o Projeto

Abra o terminal (ou CMD/PowerShell) na pasta onde você baixou o código e rode:

```bash
# 1. Instalar as dependências do projeto
npm install

# 2. Instalar a CLI do Tauri localmente (caso não tenha instalado)
npm install -g @tauri-apps/cli
```

## 3. Comandos para Criar o Aplicativo

### Para testar o aplicativo (Modo Desenvolvimento)
```bash
npm run tauri dev
```

### Para gerar o INSTALADOR final (.exe ou .dmg)
```bash
npm run tauri build
```

---

## Onde encontrar o arquivo instalador?
Após o comando `build` terminar, seu instalador estará em:
`src-tauri/target/release/bundle/`

## Como atualizar o programa?
Sempre que você fizer alterações no Lovable:
1. Faça o "Pull" ou baixe o ZIP atualizado do GitHub.
2. Rode `npm run tauri build` novamente no seu computador.
