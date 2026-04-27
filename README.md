# CV Interactif IA — Louis Frerejean

CV interactif avec chatbot propulsé par Google Gemini. Le chatbot répond aux questions sur mon parcours directement depuis la page.

## Stack

| Couche | Technologies |
|---|---|
| Frontend | React · Vite · TailwindCSS |
| Backend (prod) | Vercel Serverless Functions (`api/chat.ts`) |
| Backend (local) | Express + Vite middleware (`server.ts`) |
| IA | Google Gemini API (`@google/genai`) |
| Hébergement | Vercel |

## Lancer en local

```bash
npm install
cp .env.example .env   # puis renseigner API_KEY
npm run dev            # http://localhost:3000
```

## Contenu à modifier

Tout le contenu du CV est dans `src/content/` :

| Fichier | Contenu |
|---|---|
| `identity.json` | Nom, email, LinkedIn, photo, nom du PDF |
| `experiences.md` | Expériences pro, formations, compétences |
| `portfolio.md` | Projets et réalisations |
| `greeting.md` | Message d'accueil du chatbot |
| `instructions.md` | Prompt système du chatbot |

Les assets publics (photo, PDF) sont dans `public/`.

## Déploiement

Le projet est connecté à Vercel via GitHub. Chaque `git push` sur `main` déclenche un redéploiement automatique.

Variable d'environnement requise sur Vercel : `API_KEY` (clé Google AI Studio).
