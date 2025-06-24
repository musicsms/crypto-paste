# Crypto Paste - Cloudflare Pastebin Alternative

A modern pastebin service built with Cloudflare's ecosystem.

## Architecture

- **Frontend**: Static HTML/CSS/JS hosted on Cloudflare Pages
- **Backend**: Cloudflare Workers for API endpoints  
- **Database**: Cloudflare KV for paste storage
- **CDN**: Automatic via Cloudflare's global network

## Project Structure

```
crypto-paste/
├── frontend/
│   ├── index.html      # Main interface for creating pastes
│   ├── style.css       # Styles and responsive design
│   ├── script.js       # Frontend logic and API calls
│   └── view.html       # Interface for viewing pastes
├── worker/
│   ├── src/
│   │   └── index.js    # Worker API endpoints
│   ├── wrangler.toml   # Worker configuration
│   └── package.json    # Dependencies
├── PLAN.MD             # Detailed implementation plan
└── README.md           # This file
```

## Setup

1. Install dependencies: `npm install -g wrangler`
2. Authenticate with Cloudflare: `wrangler auth login`
3. Deploy worker: `cd worker && wrangler deploy`
4. Deploy frontend: Connect to Cloudflare Pages

## Features

- Create and share text pastes
- Syntax highlighting
- Configurable expiry times
- Password protection (optional)
- Mobile-responsive design
- Copy-to-clipboard functionality 