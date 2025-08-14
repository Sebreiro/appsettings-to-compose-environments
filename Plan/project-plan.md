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

### UI Layer
- **Framework Options**: React, Vue, or Vanilla TypeScript
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
├── ui/                  # User interface
│   ├── components/      # UI components
│   ├── styles/          # CSS/SCSS files
│   └── app.ts          # Main application entry
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
- **Build Tool**: Vite or Webpack
- **Testing**: Jest or Vitest
- **UI Framework**: TBD (React/Vue/Vanilla)
- **Styling**: CSS3/SCSS
- **Deployment**: GitHub Pages

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

## Success Criteria
1. Accurate conversion of nested JSON to flat environment variables
2. Multiple output format support
3. User-friendly interface with real-time preview
4. Robust error handling and validation
5. Successful deployment on GitHub Pages
6. Good test coverage (>80%)