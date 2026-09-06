# JSON Atelier

A lightweight JSON formatter and comparison tool that runs in the browser. It has no build step and no server-side dependencies.

## Deploy

Upload `index.html`, `styles.css`, `app.js`, `robots.txt`, and `sitemap.xml` to any static hosting provider. The project works as-is on GitHub Pages, Netlify, Vercel, Cloudflare Pages, or a regular web server.

## Features

- Pretty-print JSON with 2 spaces, 4 spaces, or tabs
- Minify JSON
- Stringify JSON into an escaped JSON string
- Unstringify an escaped JSON string back into JSON
- Compare Input and Output JSON documents
- Format both documents before comparison and show added, removed, and changed lines
- Search and replace independently in the Input and Output panes
- Fetch JSON directly from a CORS-enabled API URL
- Drag and drop JSON files or JSON text into the input pane
- Edit formatted output directly before copying or downloading
- Human-readable validation feedback
- Copy formatted output to the clipboard
- Download output as `formatted.json`
- Responsive layout for phones and desktops
- Pasted JSON is processed locally in the browser
- API fetching sends a request to the CORS-enabled URL entered by the user