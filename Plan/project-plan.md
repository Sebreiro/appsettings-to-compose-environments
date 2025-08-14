# .NET AppSettings to Docker-Compose Environment Variables Converter

## Project Overview

A frontend-only web application that converts .NET appsettings.json files to docker-compose environment variable format. The project will be hosted on GitHub Pages and built with TypeScript.

## Architecture

### Business Logic Layer (TypeScript)

- **Parser Module** (`src/core/parser.ts`)
  - Parse appsettings.json structure
  - Handle nested objects and arrays
  - Validate JSON format
- **Converter Module** (`src/core/converter.ts`)
  - Transform JSON keys to environment variable format
  - Apply naming conventions (UPPER_CASE, underscores)
  - Handle special characters and reserved words
- **Formatter Module** (`src/core/formatter.ts`)
  - Generate docker-compose.yml format
  - Output environment variables section
  - Support different output formats (YAML, .env file)

### UI Layer (Vue.js)

- **Framework**: Vue 3 with Composition API
- **Components**:
  - File upload/paste area for appsettings.json
  - Live preview of converted output
  - Copy to clipboard functionality
  - Download generated files
  - Settings panel for conversion options

## Technical Requirements

### Core Features

1. **Input Methods**:

   - File upload (.json)
   - Direct text paste
   - Drag & drop support

2. **Conversion Logic**:

   - Flatten nested JSON structure
   - Convert to environment variable naming (e.g., `Database:ConnectionString` → `DATABASE_CONNECTIONSTRING`)
   - Handle arrays and complex objects
   - Preserve data types in comments

3. **Output Formats**:

   - Docker-compose environment section
   - .env file format
   - Copy-ready environment variables

4. **Validation & Error Handling**:
   - JSON syntax validation
   - Invalid character handling
   - User-friendly error messages

### Advanced Features

1. **Customization Options**:
   - Prefix configuration
   - Naming convention selection
   - Value transformation rules
2. **Export Options**:
   - Download as docker-compose.yml
   - Download as .env file
   - Copy individual variables

## Project Structure

```
src/
├── core/                 # Business logic (TypeScript)
│   ├── parser.ts        # JSON parsing logic
│   ├── converter.ts     # Conversion algorithms
│   ├── formatter.ts     # Output formatting
│   └── types.ts         # TypeScript interfaces
├── components/          # Vue components
│   ├── FileUpload.vue   # File upload component
│   ├── JsonEditor.vue   # JSON input editor
│   ├── OutputPreview.vue # Converted output preview
│   └── SettingsPanel.vue # Conversion settings
├── styles/              # SCSS stylesheets
│   ├── main.scss        # Main stylesheet
│   ├── components.scss  # Component styles
│   └── variables.scss   # SCSS variables
├── App.vue              # Root Vue component
└── main.ts              # Application entry point
├── utils/               # Utility functions
└── tests/              # Unit tests
```

## Development Phases

### Phase 1: Core Business Logic

- Implement JSON parser
- Create conversion algorithms
- Add basic formatting
- Write unit tests

### Phase 2: User Interface

- Design and implement UI components
- Add file upload functionality
- Implement live preview
- Add copy/download features

### Phase 3: Enhancement & Polish

- Add customization options
- Implement error handling
- Optimize performance
- Add comprehensive documentation

## Technology Stack

- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Framework**: Vue 3 (Composition API)
- **Styling**: SCSS
- **Testing**: Vitest
- **Deployment**: GitHub Pages
- **Package Manager**: npm or pnpm

## Example Conversion

### Input (appsettings.json):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=MyApp;"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

### Output (docker-compose environment):

```yaml
environment:
  - CONNECTIONSTRINGS_DEFAULTCONNECTION=Server=localhost;Database=MyApp;
  - LOGGING_LOGLEVEL_DEFAULT=Information
  - LOGGING_LOGLEVEL_MICROSOFT=Warning
  - ALLOWEDHOSTS=*
```

## CI/CD Pipeline (GitHub Actions)

### Automated Testing Workflow

- github actions should run unit tests

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "test:unit": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "vue-tsc --noEmit",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "format": "prettier --write src/"
  }
}
```

## Success Criteria

1. Accurate conversion of nested JSON to flat environment variables
2. Multiple output format support
3. User-friendly Vue.js interface with real-time preview
4. Robust error handling and validation
5. Successful deployment on GitHub Pages via GitHub Actions
6. Good test coverage (>80%) with Vitest
7. Automated CI/CD pipeline with testing and deployment
8. TypeScript type safety throughout the application
