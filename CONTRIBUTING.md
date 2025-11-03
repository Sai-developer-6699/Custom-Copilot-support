# Contributing to Atlan AI Customer Support Copilot

Thank you for your interest in contributing! This document provides guidelines and information for contributing to this project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

## 🤝 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Keep communication professional

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/atlan-ai.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request

## 💻 Development Setup

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python -m uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Both Services

```bash
# Windows
.\start-dev.ps1

# Or use the batch file
.\start-dev.bat
```

## 📝 Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

- 🐛 **Bug Reports**: Find a bug? Report it!
- ✨ **Features**: Have an idea? Implement it!
- 📚 **Documentation**: Improve our docs
- 🎨 **UI/UX**: Enhance the user experience
- ⚡ **Performance**: Optimize code
- 🧪 **Tests**: Add test coverage

### Before You Start

1. Check existing issues and PRs
2. Discuss major changes in an issue first
3. Keep PRs focused and small
4. Write clear commit messages

## 🔀 Pull Request Process

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Changes tested on multiple platforms

### PR Title Format

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:
- `feat(backend): add user authentication`
- `fix(frontend): resolve chat scroll issue`
- `docs(readme): update installation instructions`

### Review Process

1. Submit PR with clear description
2. Wait for automated checks
3. Address reviewer feedback
4. Get approval from maintainer
5. Merge!

## 📐 Coding Standards

### Python (Backend)

```python
# Follow PEP 8
# Use type hints where possible
# Keep functions focused and small
# Add docstrings for complex functions

def process_query(query: str, context: dict) -> dict:
    """
    Process a user query with context.
    
    Args:
        query: The user's question
        context: Additional context data
        
    Returns:
        Processed response dictionary
    """
    pass
```

### JavaScript/React (Frontend)

```javascript
// Use ES6+ features
// Prefer functional components
// Use meaningful variable names
// Keep components small and focused

// Good
const TicketCard = ({ ticket, onClick }) => {
  return <div onClick={onClick}>...</div>;
};

// Avoid
const TC = ({ t, oc }) => { return <div onClick={oc}>...</div>; };
```

### Naming Conventions

- **Variables/Functions**: `camelCase`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case` or `snake_case`

### Code Style

- Use meaningful variable names
- Add comments for complex logic
- Keep functions under 50 lines
- Prefer composition over inheritance
- Remove unused imports/code

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/
pytest tests/ -v  # Verbose
pytest tests/ --cov  # Coverage
```

### Frontend Tests

```bash
cd frontend
npm test
npm run test:coverage
```

### Writing Tests

- Write tests for new features
- Maintain >80% coverage
- Test edge cases
- Mock external dependencies

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Windows 10]
- Python: [e.g., 3.11]
- Node: [e.g., 18.x]
- Browser: [e.g., Chrome 120]

**Additional context**
Any other relevant information.
```

## ✨ Feature Requests

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Other solutions or features you've considered.

**Additional context**
Any other context or mockups.
```

## 📞 Getting Help

- Open an issue for bugs/features
- Check existing documentation
- Review closed issues/PRs
- Ask in discussions (if enabled)

## 🎯 Project Priorities

Current focus areas:
1. Database integration
2. Testing suite
3. Docker deployment
4. Authentication
5. Performance optimization

## 🙏 Thank You!

Your contributions make this project better. We appreciate your time and effort!

---

**Questions?** Feel free to open an issue or reach out to maintainers.
