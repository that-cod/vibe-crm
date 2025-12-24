import Anthropic from '@anthropic-ai/sdk'
import { CRMSpec, FieldSpec } from './orchestrator'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface GeneratedCode {
  files: Array<{
    path: string
    content: string
  }>
  dependencies: Record<string, string>
  instructions: string
}

const CODE_GEN_SYSTEM_PROMPT = `You are an expert Refine.dev v5+ developer specialized in Next.js App Router applications.

CRITICAL REQUIREMENTS:
1. Target Refine v5+: Use @refinedev/core v5+, @refinedev/antd v6+, @refinedev/nextjs-router v7+
2. Next.js App Router: Generate for Next.js App Router structure, NOT Create React App
3. Use @refinedev/nextjs-router for routing (NOT react-router-v6)
4. Configure Supabase data provider with schema parameter
5. Generate resources for each table in the CRM spec
6. Create List, Create, Edit, Show pages using Next.js conventions
7. Use Ant Design components: Table, Form, Input, Select, DatePicker, InputNumber
8. Add Kanban boards for any enum fields (status/stage fields)
9. Include proper TypeScript types and interfaces
10. Use "use client" directive for client components
11. Add form validation using Ant Design Form rules
12. Include proper error handling and loading states
13. Make it responsive and production-ready

NEXT.JS APP ROUTER STRUCTURE:
- app/[[...catchAll]]/page.tsx: Main Refine wrapper with providers
- app/[resource]/page.tsx: List view (e.g., app/leads/page.tsx)
- app/[resource]/create/page.tsx: Create form
- app/[resource]/edit/[id]/page.tsx: Edit form
- app/[resource]/show/[id]/page.tsx: Detail view
- types.ts: TypeScript interfaces

KEY IMPORTS (Refine v5+):
- import { Refine } from "@refinedev/core";
- import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
- import { useNotificationProvider, ThemedLayoutV2 } from "@refinedev/antd";
- import routerProvider from "@refinedev/nextjs-router";
- import { dataProvider, liveProvider } from "@refinedev/supabase";

EXAMPLE OUTPUT FORMAT:
{
  "files": [
    {
      "path": "app/[[...catchAll]]/page.tsx",
      "content": "\"use client\";\n\nimport { Refine } from '@refinedev/core'..."
    }
  ],
  "dependencies": { 
    "@refinedev/core": "^5.0.7",
    "@refinedev/antd": "^6.0.3",
    "@refinedev/nextjs-router": "^7.0.4",
    "@refinedev/supabase": "^6.0.0",
    "@refinedev/kbar": "^1.2.1",
    "antd": "^5.29.3"
  },
  "instructions": "Setup instructions for Next.js App Router..."
}

Generate ONLY valid JSON. Do not include markdown formatting.`

export async function generateRefineApp(
  spec: CRMSpec,
  schemaName: string
): Promise<GeneratedCode> {
  try {
    const specJSON = JSON.stringify(spec, null, 2)

    const userMessage = `Generate a complete Refine.dev application for this CRM specification:

CRM Spec:
${specJSON}

Database Schema Name: ${schemaName}

Generate all necessary files for a production-ready CRM with:
- Main App.tsx with Refine configuration
- Resource pages for: ${spec.tables.map(t => t.displayName).join(', ')}
- Kanban views for tables with status/stage fields
- TypeScript types for all entities
- Supabase data provider configuration

Return the complete code as JSON.`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192, // Longer output for code generation
      temperature: 0.1, // Very low for consistent code
      system: CODE_GEN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/({[\s\S]*})/)

    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from code generation response')
    }

    const generatedCode: GeneratedCode = JSON.parse(jsonMatch[1] || jsonMatch[0])

    return generatedCode
  } catch (error) {
    console.error('Code generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate code: ${errorMessage}`)
  }
}

// Fallback: Generate basic Refine app structure for Next.js App Router
export function generateBasicRefineApp(spec: CRMSpec, schemaName: string): GeneratedCode {
  const resources = spec.tables.map(table => ({
    name: table.name,
    displayName: table.displayName,
    list: `/${table.name}`,
    create: `/${table.name}/create`,
    edit: `/${table.name}/edit/:id`,
    show: `/${table.name}/show/:id`,
  }))

  // Main Refine wrapper (catch-all route)
  const catchAllPage = `"use client";

import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import {
  useNotificationProvider,
  ThemedLayoutV2,
  ErrorComponent,
} from "@refinedev/antd";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { supabaseClient } from "@/lib/supabase";
import { ConfigProvider } from "antd";
import "@refinedev/antd/dist/reset.css";

export default function RefineApp() {
  return (
    <RefineKbarProvider>
      <ConfigProvider>
        <Refine
          dataProvider={dataProvider(supabaseClient, {
            schema: "${schemaName}",
          })}
          liveProvider={liveProvider(supabaseClient, {
            schema: "${schemaName}",
          })}
          notificationProvider={useNotificationProvider}
          routerProvider={routerProvider}
          resources={[
${resources.map(r => `            {
              name: "${r.name}",
              list: "${r.list}",
              create: "${r.create}",
              edit: "${r.edit}",
              show: "${r.show}",
              meta: {
                label: "${r.displayName}",
              },
            }`).join(',\n')}
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            useNewQueryKeys: true,
            projectId: "${schemaName}",
          }}
        >
          <ThemedLayoutV2>
            {/* Pages will be rendered here */}
          </ThemedLayoutV2>
        </Refine>
      </ConfigProvider>
    </RefineKbarProvider>
  );
}
`;

  // Supabase client utility (if not exists)
  const supabaseUtility = `import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
`;

  const files = [
    {
      path: 'app/[[...catchAll]]/page.tsx',
      content: catchAllPage,
    },
    {
      path: 'lib/supabase-client.ts',
      content: supabaseUtility,
    },
  ]

  // Generate list components for each resource
  spec.tables.forEach(table => {
    files.push({
      path: `app/${table.name}/page.tsx`,
      content: generateNextJsListComponent(table.name, table.displayName, table.fields),
    })
  })

  // Generate types file
  files.push({
    path: 'types.ts',
    content: generateTypesFile(spec),
  })

  return {
    files,
    dependencies: {
      '@refinedev/core': '^5.0.7',
      '@refinedev/antd': '^6.0.3',
      '@refinedev/nextjs-router': '^7.0.4',
      '@refinedev/supabase': '^6.0.0',
      '@refinedev/kbar': '^1.2.1',
      'antd': '^5.29.3',
    },
    instructions: 'Generated for Next.js App Router with Refine v5+. All dependencies already installed.',
  }
}

function generateNextJsListComponent(name: string, displayName: string, fields: FieldSpec[]): string {
  return `"use client";

import { List, useTable } from "@refinedev/antd";
import { Table } from "antd";

export default function ${capitalize(name)}List() {
  const { tableProps } = useTable({
    resource: "${name}",
  });

  return (
    <List title="${displayName}">
      <Table {...tableProps} rowKey="id">
${fields.slice(0, 5).map(field => `        <Table.Column 
          dataIndex="${field.name}" 
          title="${field.displayName}" 
        />`).join('\n')}
      </Table>
    </List>
  );
}
`
}

function generateTypesFile(spec: CRMSpec): string {
  const types = spec.tables.map(table => {
    const fields = table.fields.map(field => {
      let tsType = 'string'
      const typeMap: Record<string, string> = {
        'string': 'string',
        'number': 'number',
        'boolean': 'boolean',
        'date': 'string',
        'datetime': 'string',
        'email': 'string',
        'phone': 'string',
        'text': 'string',
        'url': 'string',
        'uuid': 'string',
        'currency': 'number',
      }
      tsType = typeMap[field.type] || 'string'
      const optional = !field.required ? '?' : ''
      return `  ${field.name}${optional}: ${tsType};`
    }).join('\n')

    return `export interface ${capitalize(table.name)} {
  id: string;
${fields}
  createdAt?: string;
  updatedAt?: string;
}`
  }).join('\n\n')

  return types
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
