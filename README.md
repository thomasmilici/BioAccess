# BioAccess — Sistema Controllo Accessi Biometrico

Dashboard di monitoraggio per un sistema di controllo accessi biometrico AI-Driven con Supervisione Umana Remota.

## Stack Tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (Dark Mode / Glassmorphism) |
| Animazioni | Framer Motion |
| Icone | Lucide React |
| Deploy | Vercel |
| CI/CD | GitHub Actions |

## Avvio Rapido

```bash
npm install
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173) nel browser.

## Build di Produzione

```bash
npm run build
npm run preview
```

## Struttura Progetto

```
src/
  components/
    AIPipeline.jsx          # Visualizzazione pipeline AI (5 stage)
    App.jsx                  # Componente principale con routing
    ConfidenceModel.jsx      # Calcolo Confidence = w1·sim + ... + w5·geom
    EarlyExitFallback.jsx    # Sistema Early Exit & Fallback
    Header.jsx               # Barra superiore con stato sistema
    SecurityIndicators.jsx   # Indicatori AES-256, TLS 1.3, Audit
    Sidebar.jsx              # Navigazione laterale
    StatsOverview.jsx        # KPI cards (transiti, confidenza, uptime)
    SupervisionQueue.jsx     # Coda operatori per supervisione umana
    TurnstileCard.jsx        # Card singolo varco biometrico
    TurnstileGrid.jsx        # Griglia varchi (5+2+1)
  data/
    mockData.js              # Dati mock e configurazioni
  hooks/
    useSimulatedData.js      # Hook simulazione dati in tempo reale
```

## Deploy su Vercel

### Primo Deploy

1. Crea un repository su GitHub e carica questo progetto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: BioAccess Dashboard"
   git remote add origin https://github.com/TUO-USERNAME/bioaccess-dashboard.git
   git push -u origin main
   ```

2. Vai su [vercel.com](https://vercel.com) e clicca **Add New → Project**.

3. Importa il repository da GitHub appena creato.

4. Vercel rileverà automaticamente:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. Clicca **Deploy**. Ad ogni push sul branch `main`, Vercel deployerà automaticamente.

### Configurazione Manuale (se necessaria)

Se Vercel non rileva automaticamente le impostazioni:

| Impostazione | Valore |
|-------------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

## Funzionalità

- **8 Varchi Biometrici**: 5 Dipendenti Stabili, 2 Personale Non Stabile, 1 Visitatori
- **AI Pipeline**: Visualizzazione in tempo reale dei 5 stage di elaborazione
- **Modello di Confidenza**: Calcolo pesato `C = w1·sim + w2·stab + w3·qual + w4·live + w5·geom`
- **Supervisione Umana**: Interfaccia operatore per eventi sotto soglia
- **Sicurezza**: AES-256-GCM, TLS 1.3, Audit immutabile SHA-256
- **Simulazione Live**: Dati che fluiscono in tempo reale con `useEffect`

## GitHub Actions

Il workflow CI/CD (`.github/workflows/deploy.yml`) esegue:
- Linting ESLint
- Build di produzione
- Notifica completamento

Si attiva ad ogni push e pull request sul branch `main`.
