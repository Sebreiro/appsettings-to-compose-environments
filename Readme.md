# AppSettings to Docker Compose

A Vue.js web application that converts .NET `appsettings.json` files to Docker Compose environment variables format. This tool helps developers transform their application configuration into environment variables suitable for containerized deployments.

## Features

- Parse and convert `appsettings.json` configuration files
- Generate Docker Compose compatible environment variable format
- Modern Vue.js 3 application with TypeScript support
- Responsive web interface
- Built with Vite for fast development and building

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd appsettings-to-docker-compose

# Install dependencies
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev

# The application will be available at http://localhost:5173
```

### Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run unit tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### Code Quality

```bash
# Run ESLint to check code quality
npm run lint

# Run TypeScript type checking
npm run type-check

# Format code with Prettier
npm run format
```

## Configuration Files

### Core Configuration

- **`package.json`** - Project dependencies, scripts, and metadata. Contains all npm packages and available commands.
- **`vite.config.ts`** - Vite build tool configuration including Vue plugin setup, path aliases (@/ maps to src/), and test environment settings.
- **`index.html`** - Main HTML entry point for the application.

### TypeScript Configuration

- **`tsconfig.json`** - Root TypeScript configuration that references other config files for different build contexts.
- **`tsconfig.app.json`** - TypeScript settings for application code (src/ directory) with strict mode and path aliases.
- **`tsconfig.node.json`** - TypeScript settings for Node.js build tools (Vite config files).
- **`tsconfig.vitest.json`** - TypeScript settings for Vitest testing framework with DOM types.
- **`env.d.ts`** - TypeScript environment declarations for Vite client types.

### Code Quality & Formatting

- **`.eslintrc.cjs`** - ESLint configuration for Vue 3, TypeScript, and JavaScript linting rules.
- **`.eslintignore`** - Files and directories to exclude from ESLint checking.
- **`.prettierrc.json`** - Prettier code formatting rules (single quotes, no semicolons, 100 char width).

## Project Structure

```
src/
    components/     # Vue components
    core/          # Core business logic
    styles/        # Global styles and SCSS variables
    tests/         # Unit tests
    utils/         # Utility functions
```

## Tech Stack

- **Vue.js 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Vitest** - Unit testing framework
- **SCSS** - CSS preprocessor
- **ESLint** - Code linting
- **Prettier** - Code formatting
