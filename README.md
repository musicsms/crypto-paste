# CryptoPaste - Secure Pastebin Alternative

A modern, secure pastebin built with Cloudflare Pages/Workers and end-to-end encryption.

## Features

- 🔒 **End-to-End Encryption**: All content is encrypted client-side using AES-256-GCM
- 🔥 **Burn After Read**: Pastes can self-destruct after being viewed once
- ⏰ **Auto-Expiring**: Set custom expiration times (10 minutes to 1 week)
- 🎨 **Syntax Highlighting**: Automatic language detection with Prism.js
- 🌙 **Dark/Light Theme**: Modern UI with Tailwind CSS
- 📱 **Responsive Design**: Works on all devices
- ⚡ **Fast & Scalable**: Powered by Cloudflare's global network

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Cloudflare Workers with Hono framework
- **Storage**: Cloudflare KV for encrypted paste data
- **Encryption**: Web Crypto API (AES-256-GCM)
- **Deployment**: Cloudflare Pages + Workers

## Development

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd crypto-paste
   npm install
   ```

2. **Configure Cloudflare**:
   ```bash
   # Login to Cloudflare
   npx wrangler login
   
   # Create KV namespace
   npx wrangler kv namespace create "PASTES_KV"
   npx wrangler kv namespace create "PASTES_KV" --preview
   
   # Update wrangler.toml with your KV namespace IDs
   ```

3. **Configure wrangler.toml**:
   ```bash
   # Copy the example file
   cp wrangler.toml.example wrangler.toml
   
   # Update with your KV namespace IDs
   # Replace "your-production-kv-namespace-id" and "your-preview-kv-namespace-id"
   # with the actual IDs from step 2
   ```

### Running Locally

1. **Start the Worker**:
   ```bash
   npm run worker:dev
   ```

2. **Start the Frontend** (in another terminal):
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173

### Deployment

1. **Deploy the Worker**:
   ```bash
   npm run worker:deploy
   ```

2. **Deploy the Frontend**:
   ```bash
   npm run deploy
   ```

3. **Configure Custom Domain** (optional):
   - Add your domain in Cloudflare Dashboard > Pages
   - Update CORS origins in `src/worker.ts`

## Security Features

### End-to-End Encryption
- Content is encrypted using AES-256-GCM before leaving your browser
- Encryption keys are generated client-side and included in the URL fragment
- Keys never reach our servers - only encrypted data is stored

### Data Retention
- Configurable expiration times (10 minutes to 1 week)
- Burn-after-read functionality for sensitive content
- Automatic cleanup of expired pastes

### Privacy
- No user accounts or tracking
- No logs of paste content
- Minimal metadata storage (creation time, expiration)

## API Endpoints

- `POST /api/pastes` - Create a new paste
- `GET /api/pastes/:id` - Retrieve a paste
- `DELETE /api/pastes/:id` - Delete a paste

## Environment Variables

- `ENVIRONMENT` - Set to "production" for production deployment

## Security Configuration

### Important Files (Not in Git)
- `wrangler.toml` - Contains sensitive KV namespace IDs
- `.env*` - Environment variables and secrets
- `dist/` - Build output directory

### Setup for Contributors
1. Copy `wrangler.toml.example` to `wrangler.toml`
2. Replace placeholder values with your actual Cloudflare resource IDs
3. Never commit the actual `wrangler.toml` to version control

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

**Note:** Make sure you don't commit sensitive configuration files (see .gitignore)

## License

MIT License - see LICENSE file for details

## Security

If you discover a security vulnerability, please email security@yourdomain.com instead of creating a public issue.
