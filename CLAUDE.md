# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A Vue.js web application that converts .NET appsettings.json files to Docker Compose environment variables format. Built with TypeScript, Vue 3, and Vite, designed for deployment on GitHub Pages.

- "master" is the main branch

## Common Development Commands

### Development Server
```bash
npm run dev            # Start development server with hot reload
```

### Building and Preview
```bash
npm run build          # Build for production (runs type check + vite build)
npm run preview        # Preview production build locally
```

### Code Quality
```bash
npm run lint           # Run ESLint with auto-fix
npm run format         # Format code with Prettier
npm run type-check     # Run TypeScript type checking without emit
```

### Testing
```bash
npm run test:unit      # Run unit tests once
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

### Examples and Scripts
```bash
npm run examples       # Run example conversions (TypeScript)
npm run examples:build # Build and run examples (JavaScript)
```

## Architecture Overview

### Core Conversion Pipeline
The application follows a modular architecture with distinct layers:

1. **Parser Layer** (`src/core/parser.ts`) - JSON validation and structure parsing
2. **Converter Layer** (`src/core/converter.ts`) - Transform JSON to environment variables
3. **Formatter Layer** (`src/core/formatter.ts`) - Output formatting (Docker Compose, .env, plain text)
4. **Service Layer** (`src/core/conversion-service.ts`) - Orchestrates the complete workflow

### UI Components
- **App.vue** - Main application component with input/output management
- **FileUpload.vue** - Drag-and-drop file upload functionality
- **OutputPreview.vue** - Live preview and export of converted output

### Type System
Comprehensive TypeScript types defined in `src/core/types.ts`:
- `ConversionOptions` - Configuration for conversion behavior
- `FormatOptions` - Output format-specific settings
- `ConversionServiceResult` - Complete conversion workflow results
- `EnvironmentVariable` - Individual environment variable metadata

## Key Features

### Input Methods
- Direct JSON paste in editor
- File upload with drag-and-drop
- Real-time validation and error reporting

### Conversion Options
- Multiple naming conventions (preserve, uppercase, lowercase)
- Custom variable prefixes
- Configurable null handling strategies
- Array indexing options

### Output Formats
- Docker Compose YAML environment section
- .env file format
- Plain text environment variables

## Development Configuration

### Build Tools
- **Vite** - Fast build tool and development server
- **Vue 3** with Composition API
- **TypeScript** with strict type checking
- **SCSS** for styling with variables

### Code Quality Tools
- **ESLint** with Vue and TypeScript rules
- **Prettier** for code formatting
- **Vitest** for unit testing with coverage
- **Vue Test Utils** for component testing

### Deployment
- Configured for GitHub Pages with base path `/appsettings-to-docker-compose/`
- Vite server configured for container development (host: true)

## Testing Approach
- Unit tests for all core conversion logic
- Component tests for Vue components  
- Integration tests for complete conversion workflows
- Coverage reporting with Vitest
