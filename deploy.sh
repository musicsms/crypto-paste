#!/bin/bash

# Crypto Paste Deployment Script
# Automates deployment to Cloudflare Workers and Pages

echo "🚀 Crypto Paste Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI is not installed. Please install with: npm install -g wrangler"
    exit 1
fi

print_success "Wrangler CLI found"

# Check if user is logged in
print_status "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    print_warning "Not authenticated with Cloudflare"
    print_status "Please run: wrangler auth login"
    exit 1
fi

print_success "Authenticated with Cloudflare"

# Deploy Worker
print_status "Deploying Cloudflare Worker..."
cd worker

# Check if KV namespaces exist
print_status "Verifying KV namespace configuration..."
if grep -q "08c8fc654472484fb87168c4414e3afd" wrangler.toml; then
    print_success "KV namespace configured"
else
    print_warning "KV namespace ID not found in wrangler.toml"
    print_status "Creating KV namespace..."
    
    # Create production namespace
    NAMESPACE_OUTPUT=$(wrangler kv namespace create "PASTEBIN_KV")
    NAMESPACE_ID=$(echo "$NAMESPACE_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
    
    # Create preview namespace
    PREVIEW_OUTPUT=$(wrangler kv namespace create "PASTEBIN_KV" --preview)
    PREVIEW_ID=$(echo "$PREVIEW_OUTPUT" | grep -o 'preview_id = "[^"]*"' | cut -d'"' -f2)
    
    # Update wrangler.toml
    sed -i "s/id = \"08c8fc654472484fb87168c4414e3afd\"/id = \"$NAMESPACE_ID\"/" wrangler.toml
    sed -i "s/preview_id = \"44cede8dae7f40bbbfd41e41ffe4af8e\"/preview_id = \"$PREVIEW_ID\"/" wrangler.toml
    
    print_success "KV namespaces created and configured"
fi

# Deploy the worker
print_status "Deploying worker to Cloudflare..."
if wrangler deploy; then
    print_success "Worker deployed successfully!"
    
    # Get the worker URL
    WORKER_URL=$(wrangler subdomain | grep "https://" || echo "https://crypto-paste-worker.your-subdomain.workers.dev")
    print_success "Worker available at: $WORKER_URL"
else
    print_error "Worker deployment failed"
    exit 1
fi

cd ..

# Instructions for Pages deployment
print_status "Frontend deployment instructions:"
echo ""
echo "To deploy the frontend to Cloudflare Pages:"
echo "1. Push this repository to GitHub"
echo "2. Go to Cloudflare Dashboard > Pages"
echo "3. Connect to your GitHub repository"
echo "4. Configure build settings:"
echo "   - Build command: (leave empty)"
echo "   - Build output directory: frontend"
echo "5. Deploy!"
echo ""

# Create a simple test
print_status "Running basic functionality test..."

# Test the worker endpoint
WORKER_DOMAIN=$(wrangler subdomain 2>/dev/null | grep "https://" | head -n1)
if [ -n "$WORKER_DOMAIN" ]; then
    print_status "Testing worker endpoint..."
    
    # Test main page
    if curl -s "$WORKER_DOMAIN" -o /dev/null -w "%{http_code}" | grep -q "200"; then
        print_success "Main page responds correctly"
    else
        print_warning "Main page test failed"
    fi
    
    # Test API endpoint with a sample paste
    print_status "Testing paste creation..."
    RESPONSE=$(curl -s -X POST "$WORKER_DOMAIN/api/paste" \
        -H "Content-Type: application/json" \
        -d '{"content":"Hello World!\nThis is a test paste.","title":"Test Paste","language":"text","expiry":"1h"}')
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        PASTE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        PASTE_URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
        print_success "Test paste created: $PASTE_URL"
        
        # Test retrieval
        if curl -s "$WORKER_DOMAIN/api/paste/$PASTE_ID" | grep -q "Hello World"; then
            print_success "Paste retrieval works correctly"
        else
            print_warning "Paste retrieval test failed"
        fi
    else
        print_warning "Paste creation test failed"
        echo "Response: $RESPONSE"
    fi
else
    print_warning "Could not determine worker domain for testing"
fi

echo ""
print_success "Deployment completed!"
echo ""
echo "🎉 Your Crypto Paste service is ready!"
echo ""
echo "Next steps:"
echo "- Set up custom domain (optional)"
echo "- Configure Cloudflare Pages for frontend"
echo "- Monitor usage and performance"
echo "- Consider setting up analytics"
echo "" 