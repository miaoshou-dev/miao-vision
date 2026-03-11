import { catalogPrompt } from './prompt-generator'
import type { LLMProvider, ChatMessage } from '../types'
import type { VizSpec } from '@/core/viz/types'
import YAML from 'yaml'

export interface GenOptions {
    /**
     * User's natural language request e.g. "Show me sales by region"
     */
    userPrompt: string

    /**
     * Schema of the available data
     */
    dataSchema: {
        sourceName: string
        columns: { name: string; type: string }[]
        sampleData?: any[]
    }
}

export class VizSpecGenerator {
    constructor(private llm: LLMProvider) {}

    /**
     * Generates a VizSpec from natural language
     */
    async generate(options: GenOptions): Promise<VizSpec | null> {
        console.log('[SpecGenerator] Generating with schema columns:', options.dataSchema.columns)

        const systemPrompt = catalogPrompt.generateSystemThinkingContext()

        const userContext = `
DATA CONTEXT:
Source: "${options.dataSchema.sourceName}"
Columns:
${options.dataSchema.columns.map(c => `- ${c.name} (${c.type})`).join('\n')}

Sample Data:
${JSON.stringify(options.dataSchema.sampleData?.slice(0, 3) || [], (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)}

USER REQUEST:
"${options.userPrompt}"

INSTRUCTIONS:
Generate a valid VizSpec YAML block that best visualizes this data according to the request.
Do not wrap your answer in standard markdown text unless it is the block itself.
`

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContext }
        ]

        try {
            console.log('🤖 Sending Prompt to LLM...')
            const response = await this.llm.complete(messages, { temperature: 0.1 })
            const content = response.content

            // Parse the YAML block
            const match = content.match(/```vizspec\n([\s\S]*?)\n```/)
            if (!match) {
                console.error('No vizspec block found in response', content)
                return null
            }

            const yamlContent = match[1]
            // In a real app we would use a YAML parser here.
            // For now, let's assume the Demo UI handles the parsing or we return raw string.
            // But to match the interface returning VizSpec, we should ideally parse it.
            // I'll return the raw object assuming a global YAML parser is available or I will inject one.

            // NOTE: For this "Brain" layer, I will return the raw parsed object if I had a parser.
            // Since I cannot import 'yaml' package easily without checking package.json,
            // I will assume simple parsing or leave it to the UI layer.
            // Let's rely on the installed 'yaml' package I saw earlier in package.json.

            // I will assume for now we return the parsed object.
            return this.parseYaml(yamlContent)

        } catch (e) {
            console.error('LLM Generation Failed', e)
            return null
        }
    }

    private parseYaml(str: string): any {
        // Placeholder for YAML parsing.
        // In the actual implementation we will strictly use the 'yaml' library.
        // For this file generation, I will add the import at the top if I confirm it exists.
        // I recalled seeing "yaml": "^2.x" in package.json.
        return YAML.parse(str)
    }
}

