![RandomUser MCP Server Logo](./assets/randomUserLogoRemake.svg)


# RandomUser MCP Server

An MCP server that provides enhanced access to the randomuser.me API with additional features like custom formatting, password generation, and weighted nationality distribution.

## Installation

Clone the repository:
```bash
git clone https://github.com/rycid/randomuserMCP.git
cd randomuserMCP

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

Add to your MCP settings file (`claude_desktop_config.json` or `cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "randomuser": {
      "command": "node",
      "args": ["path/to/randomuserMCP/build/index.js"]
    }
  }
}
```

### Available Tools

#### get_random_user

Get a single random user with customizable options.

```json
{
  "gender": "female",
  "nationality": "US",
  "fields": {
    "mode": "include",
    "values": ["name", "email", "phone"]
  },
  "format": {
    "type": "json",
    "structure": {
      "flattenObjects": true,
      "nameFormat": "full"
    }
  },
  "password": {
    "charsets": ["special", "upper", "lower", "number"],
    "minLength": 8,
    "maxLength": 12
  }
}
```

#### get_multiple_users

Get multiple random users with weighted nationality distribution.

```json
{
  "count": 10,
  "nationality": ["US", "GB", "FR"],
  "nationalityWeights": {
    "US": 0.5,
    "GB": 0.3,
    "FR": 0.2
  },
  "fields": {
    "mode": "include",
    "values": ["name", "email", "nat"]
  },
  "format": {
    "type": "csv",
    "csv": {
      "delimiter": ",",
      "includeHeader": true
    }
  }
}
```

### Output Formats

The server supports multiple output formats:

#### JSON (default)
- Nested or flattened objects
- Customizable name formats (full, first_last, separate)
- Date formatting options (iso, unix, formatted)

#### CSV
- Customizable delimiter
- Optional headers
- Automatically flattened data structure

#### SQL
- Multiple dialect support (MySQL, PostgreSQL, SQLite)
- Optional CREATE TABLE statements
- Proper escaping and type handling

#### XML
- Standard XML format
- Nested data structure
- Proper escaping of special characters

### Field Selection

Include or exclude specific fields:

```json
{
  "fields": {
    "mode": "include",  // or "exclude"
    "values": [
      "name",
      "phone",
      "email",
      "location",
      "picture",
      "dob",
      "login",
      "registered",
      "id",
      "cell",
      "nat"
    ]
  }
}
```

### Supported Nationalities

- AU: Australia
- BR: Brazil
- CA: Canada
- CH: Switzerland
- DE: Germany
- DK: Denmark
- ES: Spain
- FI: Finland
- FR: France
- GB: United Kingdom
- IE: Ireland
- IN: India
- IR: Iran
- MX: Mexico
- NL: Netherlands
- NO: Norway
- NZ: New Zealand
- RS: Serbia
- TR: Turkey
- UA: Ukraine
- US: United States

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start in development mode (with watch mode)
npm run dev

# Start the server
npm start
```

## License

MIT
