# chess\_project\_fac 🎉♟️

Proiect de Inteligență Artificială pentru jocul de șah, cu suport pentru varianta Fischer Random Chess (Chess960) și un AI antrenabil.

## 📖 Cuprins

* [🚀 Prezentare](#🚀-prezentare)
* [✨ Funcționalități](#✨-funcționalități)
* [📂 Structura proiectului](#📂-structura-proiectului)
* [⚙️ Instalare](#⚙️-instalare)
* [🔧 Configurare](#🔧-configurare)
* [🏃 Utilizare](#🏃-utilizare)
* [📊 Date și antrenare AI](#📊-date-și-antrenare-ai)
* [🤝 Contribuții](#🤝-contribuții)
* [📝 Licență](#📝-licență)

---

## 🚀 Prezentare

Acest proiect îmbină o interfață web modernă de șah cu un modul de Inteligență Artificială care poate învăța și juca atât șah clasic, cât și Fischer Random Chess (Chess960).

> **Demo interfață web**
>
> ![Captură ecran interfață](images/screenshot_ui.png)

## ✨ Funcționalități

* 🎲 **Joc de șah tradițional** și **Fischer Random Chess (Chess960)**
* 🤖 AI bazat pe machine learning pentru generarea și evaluarea mutărilor
* 🌐 Interfață web modernă (JavaScript, HTML, SCSS/CSS)
* 🐍 Backend Python pentru antrenarea și rularea modelului AI
* 💾 Salvarea istoricului jocurilor și a datelor de învățare în fișiere JSON

## 📂 Structura proiectului

```
chess_project_fac/
├── images/                    # Capturi ecran și setup Fischer Random
├── fisher-random-chess/       # Cod Python pentru AI și varianta Fischer Random
├── node_modules/              # Dependențe frontend (JavaScript)
├── game_history.json          # Istoric al jocurilor jucate
├── learning_data.json         # Date de antrenament pentru AI
├── package.json               # Configurație npm (frontend)
├── package-lock.json          # Versiuni exacte ale pachetelor npm
└── README.md                  # Acest fișier
```

> **Exemplu setup Chess960**
>
> ![Setup Fischer Random Chess](images/chess960_setup.png)

## ⚙️ Instalare

### 1. Clonare proiect

```bash
git clone https://github.com/EdiW31/chess_project_fac.git
cd chess_project_fac
```

### 2. Instalare dependențe frontend

```bash
npm install
```

### 3. Instalare dependențe Python

Este recomandat să folosești un mediu virtual:

```bash
python3 -m venv venv
source venv/bin/activate   # Linux/macOS
venv\Scripts\activate    # Windows
```

Dacă există un fișier `requirements.txt`, rulează:

```bash
pip install -r requirements.txt
```

În lipsa lui, instalează manual bibliotecile necesare (de ex. `numpy`, `torch`, etc.).

## 🔧 Configurare

Modifică parametrii de antrenare și setările AI în fișierele din `fisher-random-chess/config/` (ex. `config.yaml`).

## 🏃 Utilizare

### Pornire frontend

```bash
npm start
```

Deschide apoi în browser: `http://localhost:3000` 📍

### Rulare/antrenare AI

```bash
# Antrenare model AI
python fisher-random-chess/train_ai.py

# Joacă direct contra AI
python fisher-random-chess/play_vs_ai.py
```

## 📊 Date și antrenare AI

* **game\_history.json**: înregistrează succesiunea mutărilor din partidele jucate
* **learning\_data.json**: date preprocesate pentru etapa de învățare a modelului AI

## 🤝 Contribuții

Contribuțiile sunt binevenite! Pentru schimbări majore, deschide un *issue* înainte de a propune un *pull request*. 🙌

## 📝 Licență

Acest proiect este licențiat sub licența MIT. Vezi fișierul `LICENSE` pentru detalii.
