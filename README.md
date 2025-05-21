# chess\_project\_fac

Proiect de Inteligență Artificială pentru jocul de șah, cu suport pentru varianta Fischer Random Chess și unui AI antrenabil.

## Cuprins

* [Prezentare](#prezentare)
* [Funcționalități](#funcționalități)
* [Structura proiectului](#structura-proiectului)
* [Instalare](#instalare)
* [Configurare](#configurare)
* [Utilizare](#utilizare)
* [Date și antrenare AI](#date-și-antrenare-ai)
* [Contribuții](#contribuții)
* [Licență](#licență)

## Prezentare

Acest proiect îmbină o interfață web de șah cu un modul de inteligență artificială care poate fi antrenat să joace atât șah clasic, cât și varianta Fischer Random Chess (cunoscută și ca Chess960).

## Funcționalități

* **Joc de șah tradițional** și **Fischer Random Chess**
* AI bazat pe algoritmi de machine learning pentru generarea și evaluarea mutărilor
* Interfață web modernă (JavaScript, HTML, SCSS/CSS)
* Backend Python pentru antrenarea și rularea modelului AI
* Salvarea istoricului jocurilor și a datelor de învățare în fișiere JSON

## Structura proiectului

```
chess_project_fac/
├── fisher-random-chess/       # Cod Python pentru AI și varianta Fischer Random
├── node_modules/              # Dependențe frontend (JavaScript)
├── game_history.json          # Istoric al jocurilor jucate
├── learning_data.json         # Date de antrenament pentru AI
├── package.json               # Configurație npm (frontend)
├── package-lock.json          # Versiuni exacte ale pachetelor npm
├── README.md                  # Acest fișier
```

## Instalare

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

## Configurare

Adaugă sau modifică fișierele de configurare din directorul `fisher-random-chess/` în funcție de parametri de antrenare și de setările AI.

## Utilizare

### Pornire frontend

```bash
npm start
```

Deschide apoi în browser: `http://localhost:3000`

### Rulare/antrenare AI

```bash
# Exemplu de comandă (în directorul root)
python fisher-random-chess/train_ai.py
# Sau pentru a juca direct contra AI:
python fisher-random-chess/play_vs_ai.py
```

## Date și antrenare AI

* **game\_history.json**: înregistrează succesiunea mutărilor din partidele jucate
* **learning\_data.json**: date preprocesate pentru etapa de învățare a modelului AI

## Contribuții

Contribuțiile sunt binevenite! Pentru schimbări majore, te rugăm să deschizi un issue înainte de a propune un pull request.

## Licență

Acest proiect este licențiat sub licența MIT. Vezi fișierul `LICENSE` pentru detalii.
