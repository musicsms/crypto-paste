# Deployment Guide

## Pre-deployment Checklist

### 1. Cloudflare Setup
- [ ] Cloudflare account created
- [ ] Wrangler CLI installed: `npm install -g wrangler`
- [ ] Logged in: `wrangler login`

### 2. Configuration Setup
**Important**: This repository contains a `wrangler.toml.example` file. You need to create your own `wrangler.toml` file with your actual configuration.

```bash
# Copy the example configuration
cp wrangler.toml.example wrangler.toml
```

### 3. KV Namespace Setup
```bash
# Create production KV namespace
wrangler kv namespace create "PASTES_KV"

# Create preview KV namespace  
wrangler kv namespace create "PASTES_KV" --preview
```

**Update your `wrangler.toml`** with the generated namespace IDs:
```toml
[[kv_namespaces]]
binding = "PASTES_KV"
id = "your-actual-production-namespace-id"  # Replace with real ID from command output
preview_id = "your-actual-preview-namespace-id"  # Replace with real ID from command output
```

### 4. Configuration Updates
- [ ] ✅ Created `wrangler.toml` from `wrangler.toml.example`
- [ ] Updated `wrangler.toml` with correct KV namespace IDs
- [ ] Update worker name in `wrangler.toml` if needed
- [ ] Verify CORS origins in `src/worker.ts` for your domain

### 5. Build and Test
```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Build the project
npm run build

# Test worker locally
npm run worker:dev
```

## Deployment Steps

### Step 1: Deploy the Worker
```bash
npm run worker:deploy
```

This will:
- Deploy the Hono API to Cloudflare Workers
- Set up the KV bindings
- Make the API available at `https://crypto-paste-api.your-subdomain.workers.dev`

### Step 2: Deploy the Frontend
```bash
npm run deploy
```

This will:
- Build the React app
- Deploy to Cloudflare Pages
- Make the site available at `https://crypto-paste2.pages.dev`

### Step 3: Custom Domain (Optional)
1. Go to Cloudflare Dashboard > Pages
2. Select your project
3. Go to Custom domains
4. Add your domain
5. Update DNS records as instructed
6. Update CORS origins in worker if using custom domain

## Environment Variables

Set these in the Cloudflare Workers dashboard or via Wrangler:

```bash
# Set production environment
wrangler secret put ENVIRONMENT
# Enter: production
```

## Post-deployment Verification

### Test the API endpoints:
```bash
# Health check
curl https://your-worker-domain.workers.dev/api/health

# Create a test paste
curl -X POST https://your-worker-domain.workers.dev/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"test","expiresAt":null,"burnAfterRead":false}'
```

### Test the frontend:
1. Open your Pages URL
2. Create a test paste
3. Verify encryption/decryption works
4. Test expiration and burn-after-read features

## Security Considerations

- [ ] ✅ `wrangler.toml` is in `.gitignore` to prevent committing real IDs
- [ ] ✅ Use `wrangler.toml.example` as a template for setup
- [ ] Never log or store encryption keys server-side
- [ ] Review CORS origins for production
- [ ] Ensure HTTPS only (Cloudflare handles this)
- [ ] Monitor usage and set up rate limiting if needed

## Monitoring and Maintenance

### Cloudflare Analytics
- Monitor request volume in Workers dashboard
- Check error rates and performance metrics
- Set up alerts for high error rates

### KV Storage
- Monitor KV storage usage
- Set up cleanup jobs for expired pastes if needed
- Consider implementing usage quotas

## Troubleshooting

### Common Issues:
1. **Missing wrangler.toml**: Copy `wrangler.toml.example` to `wrangler.toml` first
2. **CORS errors**: Check worker CORS configuration
3. **KV errors**: Verify namespace IDs in your `wrangler.toml`
4. **Build errors**: Check Node.js version (18+ required)
5. **Routing issues**: Verify `_routes.json` configuration

### Debug Mode:
```bash
# Local development with debug
npm run worker:dev --debug

# Check worker logs
wrangler tail
```

## Scaling Considerations

- Cloudflare Workers automatically scale
- KV storage has generous limits
- Consider implementing rate limiting for abuse prevention
- Monitor costs in Cloudflare dashboard

## Backup and Recovery

- KV data is automatically replicated by Cloudflare
- Consider implementing export functionality for compliance
- Keep deployment scripts and configuration in version control 