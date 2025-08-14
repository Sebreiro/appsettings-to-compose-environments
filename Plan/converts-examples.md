# AppSettings to Docker Compose Conversion Examples

This document provides examples of how the application should convert .NET `appsettings.json` files to Docker Compose environment variables format.

## Example Conversion

### Input: appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=MyApp;Trusted_Connection=true;",
    "Redis": "localhost:6379"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning",
      "Microsoft.Hosting.Lifetime": "Information"
    }
  },
  "AllowedHosts": "*",
  "ApiSettings": {
    "BaseUrl": "https://api.example.com",
    "Timeout": 30,
    "ApiKey": "your-api-key-here"
  },
  "FeatureFlags": {
    "EnableNewFeature": true,
    "EnableBetaFeature": false
  },
  "Servers": [
    "https://server1.example.com",
    "https://server2.example.com",
    "https://server3.example.com"
  ],
  "DatabaseSettings": {
    "Providers": [
      {
        "Name": "SqlServer",
        "ConnectionString": "Server=sql1;Database=DB1;"
      },
      {
        "Name": "PostgreSQL",
        "ConnectionString": "Host=pg1;Database=DB2;"
      }
    ]
  }
}
```

### Output: Docker Compose Environment Variables

```yaml
environment:
  - ConnectionStrings__DefaultConnection=Server=localhost;Database=MyApp;Trusted_Connection=true;
  - ConnectionStrings__Redis=localhost:6379
  - Logging__LogLevel__Default=Information
  - Logging__LogLevel__Microsoft=Warning
  - Logging__LogLevel__Microsoft__Hosting__Lifetime=Information
  - AllowedHosts=*
  - ApiSettings__BaseUrl=https://api.example.com
  - ApiSettings__Timeout=30
  - ApiSettings__ApiKey=your-api-key-here
  - FeatureFlags__EnableNewFeature=true
  - FeatureFlags__EnableBetaFeature=false
  - Servers__0=https://server1.example.com
  - Servers__1=https://server2.example.com
  - Servers__2=https://server3.example.com
  - DatabaseSettings__Providers__0__Name=SqlServer
  - DatabaseSettings__Providers__0__ConnectionString=Server=sql1;Database=DB1;
  - DatabaseSettings__Providers__1__Name=PostgreSQL
  - DatabaseSettings__Providers__1__ConnectionString=Host=pg1;Database=DB2;
```

## Conversion Rules

1. **Nested objects**: Use double underscores (`__`) to separate hierarchy levels
2. **Arrays**: Use zero-based index notation (e.g., `Servers__0`, `Servers__1`, `Providers__0__Name`)
3. **Boolean values**: Convert to lowercase strings (`true`, `false`)
4. **Null values**: Convert to empty strings or omit entirely
5. **Special characters**: Preserve in values, but hierarchy separators become `__`
6. **Case sensitivity**: Maintain original casing from appsettings.json

## Expected Application Features

- Paste or upload `appsettings.json` content
- Real-time conversion preview
- Copy to clipboard functionality
- Download as `.env` file or Docker Compose snippet
- Validation of JSON format
- Error handling for malformed JSON
