#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// Supported nationalities
const NATIONALITIES = [
  'AU', 'BR', 'CA', 'CH', 'DE', 'DK', 'ES', 'FI', 'FR', 'GB',
  'IE', 'IN', 'IR', 'MX', 'NL', 'NO', 'NZ', 'RS', 'TR', 'UA', 'US'
] as const;

type Nationality = typeof NATIONALITIES[number];

interface GenderCounts {
  male: number;
  female: number;
}

interface NationalityWeights {
  [key: string]: number;
}

interface FieldOptions {
  name?: boolean;
  phone?: boolean;
  email?: boolean;
  location?: boolean;
  picture?: boolean;
  dob?: boolean;
  login?: boolean;
  registered?: boolean;
  id?: boolean;
  cell?: boolean;
  nat?: boolean;
}

interface FormatOptions {
  type: 'json' | 'csv' | 'sql' | 'xml';
  sql?: {
    dialect: 'mysql' | 'postgresql' | 'sqlite';
    tableName: string;
    includeCreate: boolean;
  };
  csv?: {
    delimiter: ',' | ';' | '\t';
    includeHeader: boolean;
  };
  structure?: {
    flattenObjects: boolean;
    arrayFormat: 'brackets' | 'comma' | 'numbered';
    dateFormat: 'iso' | 'unix' | 'formatted';
    nameFormat: 'full' | 'first_last' | 'separate';
    nullValues: 'empty' | 'null' | 'omit';
  };
}

class RandomUserServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'randomuser-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: 'https://randomuser.me/api/',
    });

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_random_user',
          description: 'Get a single random user',
          inputSchema: {
            type: 'object',
            properties: {
              gender: {
                type: 'string',
                enum: ['male', 'female'],
                description: 'Filter results by gender'
              },
              nationality: {
                type: 'string',
                enum: NATIONALITIES,
                description: 'Specify nationality'
              },
              fields: {
                type: 'object',
                description: 'Specify which fields to include',
                properties: this.getFieldProperties()
              },
              format: this.getFormatOptionsSchema(),
              password: {
                type: 'object',
                properties: this.getPasswordOptionsSchema()
              }
            }
          }
        },
        {
          name: 'get_multiple_users',
          description: 'Get multiple random users',
          inputSchema: {
            type: 'object',
            properties: {
              count: {
                type: 'number',
                minimum: 1,
                maximum: 5000,
                description: 'Number of users to generate'
              },
              gender: {
                type: 'string',
                enum: ['male', 'female']
              },
              nationality: {
                oneOf: [
                  {
                    type: 'string',
                    enum: NATIONALITIES
                  },
                  {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: NATIONALITIES
                    }
                  }
                ]
              },
              nationalityWeights: {
                type: 'object',
                patternProperties: {
                  "^[A-Z]{2}$": {
                    type: 'number',
                    minimum: 0,
                    maximum: 1
                  }
                }
              },
              fields: {
                type: 'object',
                properties: this.getFieldProperties()
              },
              format: this.getFormatOptionsSchema(),
              password: {
                type: 'object',
                properties: this.getPasswordOptionsSchema()
              }
            },
            required: ['count']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'get_random_user':
          return this.handleGetRandomUser(request.params.arguments);
        case 'get_multiple_users':
          return this.handleGetMultipleUsers(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private getFieldProperties() {
    return {
      mode: {
        type: 'string',
        enum: ['include', 'exclude'],
        default: 'include'
      },
      values: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'name',
            'phone',
            'email',
            'location',
            'picture',
            'dob',
            'login',
            'registered',
            'id',
            'cell',
            'nat'
          ]
        }
      }
    };
  }

  private getFormatOptionsSchema() {
    return {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['json', 'csv', 'sql', 'xml'],
          default: 'json'
        },
        sql: {
          type: 'object',
          properties: {
            dialect: {
              type: 'string',
              enum: ['mysql', 'postgresql', 'sqlite']
            },
            tableName: { type: 'string' },
            includeCreate: { type: 'boolean' }
          }
        },
        csv: {
          type: 'object',
          properties: {
            delimiter: {
              type: 'string',
              enum: [',', ';', '\t']
            },
            includeHeader: { type: 'boolean' }
          }
        },
        structure: {
          type: 'object',
          properties: {
            flattenObjects: { type: 'boolean' },
            arrayFormat: {
              type: 'string',
              enum: ['brackets', 'comma', 'numbered']
            },
            dateFormat: {
              type: 'string',
              enum: ['iso', 'unix', 'formatted']
            },
            nameFormat: {
              type: 'string',
              enum: ['full', 'first_last', 'separate']
            },
            nullValues: {
              type: 'string',
              enum: ['empty', 'null', 'omit']
            }
          }
        }
      }
    };
  }

  private getPasswordOptionsSchema() {
    return {
      charsets: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['special', 'upper', 'lower', 'number']
        },
        description: 'Character sets to include in password'
      },
      minLength: {
        type: 'number',
        minimum: 8,
        maximum: 64,
        description: 'Minimum password length (8-64)'
      },
      maxLength: {
        type: 'number',
        minimum: 8,
        maximum: 64,
        description: 'Maximum password length (8-64)'
      }
    };
  }

  private formatResults(results: any[], format?: FormatOptions): { content: [{ type: 'text', text: string }] } {
    if (!format) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    }

    switch (format.type) {
      case 'json':
        return this.formatJson(results, format.structure);
      case 'csv':
        return this.formatCsv(results, format.csv, format.structure);
      case 'sql':
        return this.formatSql(results, format.sql, format.structure);
      case 'xml':
        return this.formatXml(results, format.structure);
      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
    }
  }

  private formatJson(results: any[], structure?: FormatOptions['structure']): { content: [{ type: 'text', text: string }] } {
    let formatted = results;

    if (structure) {
      formatted = results.map(result => {
        const formatted: any = {};
        
        if (structure.flattenObjects) {
          this.flattenObject(result, formatted);
        } else {
          Object.assign(formatted, result);
        }

        if (structure.nameFormat) {
          this.formatName(formatted, structure.nameFormat);
        }

        if (structure.dateFormat) {
          this.formatDates(formatted, structure.dateFormat);
        }

        return formatted;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formatted, null, 2)
        }
      ]
    };
  }

  private formatCsv(
    results: any[],
    options?: FormatOptions['csv'],
    structure?: FormatOptions['structure']
  ): { content: [{ type: 'text', text: string }] } {
    const delimiter = options?.delimiter || ',';
    const includeHeader = options?.includeHeader ?? true;

    const flattened = results.map(result => {
      const flat: any = {};
      this.flattenObject(result, flat);
      return flat;
    });

    const headers = Object.keys(flattened[0]);
    const rows = flattened.map(item => 
      headers.map(header => item[header] ?? '').join(delimiter)
    );

    if (includeHeader) {
      rows.unshift(headers.join(delimiter));
    }

    return {
      content: [
        {
          type: 'text',
          text: rows.join('\n')
        }
      ]
    };
  }

  private formatSql(
    results: any[],
    options?: FormatOptions['sql'],
    structure?: FormatOptions['structure']
  ): { content: [{ type: 'text', text: string }] } {
    const tableName = options?.tableName || 'users';
    const dialect = options?.dialect || 'postgresql';
    const includeCreate = options?.includeCreate ?? true;

    const flattened = results.map(result => {
      const flat: any = {};
      this.flattenObject(result, flat);
      return flat;
    });

    const columns = Object.keys(flattened[0]);
    
    let sql = '';
    
    if (includeCreate) {
      sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      sql += `  id SERIAL PRIMARY KEY,\n`;
      sql += columns
        .map(col => `  ${col} VARCHAR(255)`)
        .join(',\n');
      sql += '\n);\n\n';
    }

    sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;
    sql += flattened
      .map(item => 
        `(${columns
          .map(col => `'${item[col]?.replace(/'/g, "''")}'`)
          .join(', ')})`
      )
      .join(',\n');
    sql += ';';

    return {
      content: [
        {
          type: 'text',
          text: sql
        }
      ]
    };
  }

  private formatXml(results: any[], structure?: FormatOptions['structure']): { content: [{ type: 'text', text: string }] } {
    const formatValue = (value: any): string => {
      if (typeof value === 'object' && value !== null) {
        return Object.entries(value)
          .map(([k, v]) => `<${k}>${formatValue(v)}</${k}>`)
          .join('');
      }
      return String(value);
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<users>\n';
    
    results.forEach(result => {
      xml += '  <user>\n';
      Object.entries(result).forEach(([key, value]) => {
        xml += `    <${key}>${formatValue(value)}</${key}>\n`;
      });
      xml += '  </user>\n';
    });
    
    xml += '</users>';
    return {
      content: [
        {
          type: 'text',
          text: xml
        }
      ]
    };
  }

  private flattenObject(obj: any, flat: any = {}, prefix = '') {
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}_${key}` : key;
      if (typeof value === 'object' && value !== null) {
        this.flattenObject(value, flat, newKey);
      } else {
        flat[newKey] = value;
      }
    });
    return flat;
  }

  private formatName(obj: any, format: string) {
    if (!obj.name) return;

    switch (format) {
      case 'full':
        obj.name = `${obj.name.first} ${obj.name.last}`;
        break;
      case 'first_last':
        obj.first_name = obj.name.first;
        obj.last_name = obj.name.last;
        delete obj.name;
        break;
      // 'separate' is default format from API
    }
  }

  private formatDates(obj: any, format: string) {
    const formatDate = (date: string | number) => {
      const d = new Date(date);
      switch (format) {
        case 'unix':
          return Math.floor(d.getTime() / 1000);
        case 'iso':
          return d.toISOString();
        case 'formatted':
          return d.toLocaleDateString();
        default:
          return date;
      }
    };

    if (obj.dob?.date) obj.dob.date = formatDate(obj.dob.date);
    if (obj.registered?.date) obj.registered.date = formatDate(obj.registered.date);
  }

  private async handleGetRandomUser(args: any) {
    try {
      const params: any = {};
      
      if (args.gender) params.gender = args.gender;
      if (args.nationality) params.nat = args.nationality;

      if (args.fields?.mode === 'include') {
        params.inc = args.fields.values.join(',');
      } else if (args.fields?.mode === 'exclude') {
        params.exc = args.fields.values.join(',');
      }

      if (args.password) {
        const charsets = args.password.charsets?.join(',') || 'upper,lower,number';
        params.password = args.password.maxLength ?
          `${charsets},${args.password.minLength || 8}-${args.password.maxLength}` :
          `${charsets},${args.password.minLength || 8}`;
      }

      const response = await this.axiosInstance.get('', { params });
      return this.formatResults(response.data.results, args.format);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `API Error: ${error.response?.data.error || error.message}`
        );
      }
      throw error;
    }
  }

  private calculateCountForNationalityAndGender(
    args: any,
    nationality: string,
    gender: string
  ): number {
    if (!args.nationality) return 0;
    if (args.gender && args.gender !== gender) return 0;
    
    const totalCount = args.count || 0;
    const weights = args.nationalityWeights || {};
    
    if (!Array.isArray(args.nationality)) {
      return nationality === args.nationality ? totalCount : 0;
    }
    
    if (!args.nationality.includes(nationality)) return 0;
    
    const natWeight = weights[nationality] || (1 / args.nationality.length);
    const genderRatio = args.gender ? 1 : 0.5; // If gender specified use full count, else split 50/50
    
    return Math.round(totalCount * natWeight * genderRatio);
  }

  private async handleGetMultipleUsers(args: any) {
    try {
      const results = [];
      const params: any = {};

      // Add field parameters
      this.addFieldParams(params, args);

      if (args.password) {
        const charsets = args.password.charsets?.join(',') || 'upper,lower,number';
        params.password = args.password.maxLength ?
          `${charsets},${args.password.minLength || 8}-${args.password.maxLength}` :
          `${charsets},${args.password.minLength || 8}`;
      }

      // Make one API call per requested nationality+gender combination
      for (const gender of ['female', 'male']) {
        if (args.gender && args.gender !== gender) continue;
        
        params.gender = gender;
        
        // Handle single nationality or array of nationalities
        const nationalities = Array.isArray(args.nationality) 
          ? args.nationality 
          : [args.nationality];

        for (const nat of nationalities) {
          params.nat = nat;
          
          const count = this.calculateCountForNationalityAndGender(args, nat, gender);
          if (count === 0) continue;
          
          params.results = count;
          
          const response = await this.axiosInstance.get('', { params });
          results.push(...response.data.results);
        }
      }

      return this.formatResults(results, args.format);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `API Error: ${error.response?.data.error || error.message}`
        );
      }
      throw error;
    }
  }

  private addFieldParams(params: any, args: any): void {
    if (args.fields?.mode === 'include') {
      params.inc = args.fields.values.join(',');
    } else if (args.fields?.mode === 'exclude') {
      params.exc = args.fields.values.join(',');
    }
  }

  private setupErrorHandling() {
    this.server.onerror = (error: Error) => {
      console.error('[MCP Error]', error);

      if (error instanceof McpError) {
        switch (error.code) {
          case ErrorCode.InvalidParams:
            console.error('Invalid parameters provided:', error.message);
            break;
          case ErrorCode.MethodNotFound:
            console.error('The requested operation is not supported:', error.message);
            break;
          case ErrorCode.InternalError:
            console.error('An internal server error occurred:', error.message);
            break;
          default:
            console.error('An unexpected error occurred:', error.message);
        }
      }
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Random User MCP server running on stdio');
  }
}

const server = new RandomUserServer();
server.run().catch(console.error);
