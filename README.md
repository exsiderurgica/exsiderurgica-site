# Exsiderurgica Site

Static GitHub Pages site for Exsiderurgica.

## What it does
- mobile-first homepage
- Eurorack hub
- project links
- YouTube latest-video feed via public YouTube RSS
- GitHub Action refreshes `data/videos.json` every 6 hours
- GitHub Pages deploy workflow

## Android / ChatGPT workflow
The site is intentionally dependency-free. Most updates are simple text edits in `index.html`, `eurorack.html` or `data/videos.json`, so they can be made directly from chat through GitHub.

## First deploy
Create a public repository named `exsiderurgica-site`, upload these files to the `main` branch, then in GitHub Settings → Pages choose **GitHub Actions** as the source if it is not already selected.
