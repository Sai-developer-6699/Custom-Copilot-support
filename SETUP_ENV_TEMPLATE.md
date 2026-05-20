# Environment Setup Template

## Backend `.env` File Setup

Create a file named `.env` in the `backend/` directory with the following content:

```bash
# Groq API Configuration
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL_FAST=llama-3.1-8b-instant

# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=True

# Database Configuration (Optional - for future use)
# DATABASE_URL=postgresql://user:password@localhost:5432/atlan_ai

# Redis Configuration (Optional - for caching)
# REDIS_URL=redis://localhost:6379

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Vector Store Configuration
VECTORSTORE_DIR=vectorstore
EMBEDDING_MODEL=all-MiniLM-L6-v2
LLM_MODEL=llama-3.1-8b-instant

# File Upload Configuration
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=uploads
ALLOWED_EXTENSIONS=.txt,.csv,.pdf,.doc,.docx,.xls,.xlsx,.json,.md,.jpg,.jpeg,.png,.gif

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

## Important Notes

1. **Never commit your `.env` file** - it's already in `.gitignore`
2. **Get your Groq API key** from [console.groq.com/keys](https://console.groq.com/keys)
3. Replace `your-groq-api-key-here` with your actual API key
4. The commented lines (starting with `#`) are optional for future features

## Quick Setup Commands

### Windows
```bash
cd backend
copy nul .env
notepad .env
# Paste the content above and save
```

### macOS/Linux
```bash
cd backend
cat > .env << 'EOF'
# Paste the content above
GROQ_API_KEY=your-groq-api-key-here
# ... (rest of the config)
EOF
```

### Using PowerShell (Recommended)
```powershell
cd backend
@"
GROQ_API_KEY=your-groq-api-key-here
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=True
FRONTEND_URL=http://localhost:3000
VECTORSTORE_DIR=vectorstore
EMBEDDING_MODEL=all-MiniLM-L6-v2
LLM_MODEL=llama-3.1-8b-instant
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=uploads
LOG_LEVEL=INFO
"@ | Out-File -FilePath .env -Encoding UTF8
```

## Verification

After creating the `.env` file, verify it was created correctly:

```bash
# Check the file exists
dir .env          # Windows
ls -la .env       # macOS/Linux

# View the contents (without exposing API key)
type .env         # Windows
cat .env          # macOS/Linux
```

## Security Best Practices

✅ Do's:
- Keep your API key secret
- Use environment variables
- Add `.env` to `.gitignore` (already done)
- Use different keys for dev/prod
- Rotate keys regularly

❌ Don'ts:
- Never commit `.env` files
- Don't share API keys publicly
- Don't hardcode keys in source code
- Don't use production keys in development

## Troubleshooting

If you encounter issues:

1. **File not found**: Ensure you're in the `backend/` directory
2. **API errors**: Verify your Groq API key is correct
3. **Permission errors**: Check file permissions
4. **Import errors**: Restart your server after creating `.env`
