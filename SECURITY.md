# Security Policy

## Package Security & Vulnerability Management

This project uses up-to-date package versions to minimize security vulnerabilities. However, some warnings may still appear during installation due to transitive dependencies.

### Understanding npm Warnings

#### Deprecation Warnings (Normal)
These warnings indicate that some sub-dependencies use older packages:
```
npm WARN deprecated npmlog@6.0.2: This package is no longer supported.
npm WARN deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported.
```

**These are typically safe to ignore** as they come from transitive dependencies that will be updated by their maintainers over time.

#### Security Vulnerabilities (Action Required)
If you see security vulnerabilities:
```
3 high severity vulnerabilities
9 vulnerabilities (3 moderate, 6 high)
```

### Fixing Security Issues

1. **Automatic Fix (Recommended)**
   ```bash
   npm run audit:fix
   ```

2. **Manual Audit & Fix**
   ```bash
   # Check backend vulnerabilities
   npm audit
   npm audit fix
   
   # Check frontend vulnerabilities  
   cd client
   npm audit
   npm audit fix
   ```

3. **Force Fix (If Needed)**
   ```bash
   npm audit fix --force
   cd client && npm audit fix --force
   ```

### Clean Installation

For a clean installation without old lock files:

```bash
# Remove old dependencies
rm -rf node_modules client/node_modules
rm package-lock.json client/package-lock.json

# Fresh install
npm run install:all
```

## Reporting Security Issues

If you discover a security vulnerability in this application (not in dependencies), please report it by creating an issue on GitHub with the "security" label.

## Package Update Policy

- **Major versions**: Updated carefully with testing
- **Minor/Patch versions**: Updated regularly for security fixes
- **Lock files**: Regenerated periodically to get latest secure versions

## Supported Node.js Versions

- **Node.js**: >= 18.0.0 (LTS recommended)
- **npm**: >= 9.0.0

Using older versions may result in additional security warnings.
