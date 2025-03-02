import type { Chat } from '~types'

interface AnalysisResult {
    name: string;
    relevance: number;
    reason: string;
    expertise: string[];
    confidenceScore: number;
    contextMatch?: {
        type: 'expertise' | 'experience' | 'conversation' | 'activity';
        details: string;
    }[];
}

// Add this interface at the top of the file
interface DomainData {
    keywords?: string[];
    languages?: string[];
    concepts?: string[];
    tools?: string[];
    channels?: string[];
    [key: string]: string[] | undefined | DomainData;
}

// Enhanced expertise categories with related terms and context
const DOMAIN_KNOWLEDGE = {
    technical: {
        programming: {
            keywords: ['code', 'programming', 'developer', 'software', 'bug', 'api', 'frontend', 'backend', 'fullstack', 'database', 'git'],
            languages: ['javascript', 'python', 'java', 'typescript', 'react', 'node', 'angular', 'vue', 'php', 'ruby'],
            concepts: ['algorithm', 'debugging', 'testing', 'deployment', 'architecture', 'security', 'performance']
        },
        design: {
            keywords: ['design', 'ui', 'ux', 'interface', 'user experience', 'wireframe', 'prototype'],
            tools: ['figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'indesign'],
            concepts: ['typography', 'layout', 'color theory', 'accessibility', 'responsive', 'mobile-first']
        },
        data: {
            keywords: ['data', 'analytics', 'statistics', 'machine learning', 'ai', 'visualization'],
            tools: ['python', 'r', 'sql', 'tableau', 'powerbi', 'excel'],
            concepts: ['analysis', 'prediction', 'clustering', 'regression', 'classification']
        }
    },
    business: {
        management: {
            keywords: ['management', 'leadership', 'strategy', 'planning', 'operations'],
            concepts: ['team building', 'decision making', 'risk management', 'resource allocation']
        },
        marketing: {
            keywords: ['marketing', 'branding', 'advertising', 'social media', 'content'],
            channels: ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'],
            concepts: ['seo', 'analytics', 'campaign', 'conversion', 'engagement']
        },
        startup: {
            keywords: ['startup', 'entrepreneurship', 'business model', 'pitch', 'funding'],
            concepts: ['mvp', 'product market fit', 'scaling', 'venture capital', 'bootstrapping']
        }
    },
    professional: {
        consulting: ['consulting', 'advisory', 'strategy', 'solutions'],
        legal: ['legal', 'law', 'contract', 'agreement', 'compliance'],
        finance: ['finance', 'investment', 'accounting', 'budget', 'forecast']
    }
};

// Intent classification patterns
const INTENT_PATTERNS = {
    problemSolving: /help|issue|problem|fix|solve|trouble|need assistance/i,
    networking: /connect|introduction|network|meet|refer|recommendation/i,
    learning: /learn|study|understand|explain|teach|guide|tutorial/i,
    collaboration: /collaborate|work together|partner|join|team up/i,
    analysis: /analyze|analyse|review|evaluate|assess|examine/i
};

// Add weight factors for better scoring
const WEIGHTS = {
    EXACT_MATCH: 35,
    EXPERTISE_MATCH: 25,
    CONTEXT_MATCH: 20,
    RECENCY: 10,
    INTENT_MATCH: 10
};

export async function analyzeChatsWithAI(prompt: string, chats: Chat[]): Promise<AnalysisResult[]> {
    try {
        console.log("Starting enhanced analysis with prompt:", prompt);

        // Determine user intent
        const intent = classifyIntent(prompt);
        console.log("Detected intent:", intent);

        // Extract key topics and requirements
        const topics = extractTopics(prompt);
        console.log("Extracted topics:", topics);

        // Enrich chat data with expertise and context analysis
        const enrichedChats = await enrichChatsWithContext(chats, prompt);
        console.log("Enriched chats with context");

        // Score and rank contacts based on intent and needs
        const results = scoreContacts(enrichedChats, prompt, intent, topics);
        console.log("Scored contacts:", results);

        return results;
    } catch (error) {
        console.error("Enhanced analysis error:", error);
        throw error;
    }
}

function classifyIntent(prompt: string): string[] {
    return Object.entries(INTENT_PATTERNS)
        .filter(([_, pattern]) => pattern.test(prompt))
        .map(([intent]) => intent);
}

function extractTopics(prompt: string): Set<string> {
    const topics = new Set<string>();
    const promptLower = prompt.toLowerCase();

    // Recursively search through domain knowledge
    function searchDomain(obj: Record<string, string[] | DomainData>) {
        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                if (value.some(term => promptLower.includes(term.toLowerCase()))) {
                    topics.add(key);
                }
            } else if (typeof value === 'object' && value !== null) {
                const domainData = value as DomainData;
                if (domainData.keywords?.some(k => promptLower.includes(k.toLowerCase()))) {
                    topics.add(key);
                }
                searchDomain(value);
            }
        }
    }

    searchDomain(DOMAIN_KNOWLEDGE);
    return topics;
}

async function enrichChatsWithContext(chats: Chat[], prompt: string): Promise<any[]> {
    return chats.map(chat => {
        const messageContent = chat.lastMessage.content.toLowerCase();
        
        // Extract expertise indicators
        const expertise = new Set<string>();
        function findExpertise(obj: Record<string, string[] | DomainData>) {
            for (const [domain, value] of Object.entries(obj)) {
                if (Array.isArray(value)) {
                    if (value.some(k => messageContent.includes(k.toLowerCase()))) {
                        expertise.add(domain);
                    }
                } else if (typeof value === 'object' && value !== null) {
                    const domainData = value as DomainData;
                    if (domainData.keywords?.some(k => messageContent.includes(k.toLowerCase()))) {
                        expertise.add(domain);
                    }
                    if (!Array.isArray(value)) findExpertise(value);
                }
            }
        }
        findExpertise(DOMAIN_KNOWLEDGE);

        // Analyze message context
        const contextMatch = analyzeMessageContext(messageContent, prompt);

        return {
            ...chat,
            expertise: Array.from(expertise),
            contextMatch
        };
    });
}

function analyzeMessageContext(message: string, prompt: string): any[] {
    const context = [];
    const promptTokens = new Set(prompt.toLowerCase().split(/\W+/));
    const messageTokens = new Set(message.toLowerCase().split(/\W+/));

    // Calculate semantic overlap
    const overlap = [...promptTokens].filter(token => messageTokens.has(token)).length;
    const overlapScore = overlap / promptTokens.size;

    if (overlapScore > 0.3) {
        context.push({
            type: 'conversation',
            details: 'Recent messages show relevant discussion'
        });
    }

    // Check for expertise indicators
    for (const [domain, categories] of Object.entries(DOMAIN_KNOWLEDGE)) {
        for (const [category, data] of Object.entries(categories)) {
            if (typeof data === 'object' && data.keywords) {
                const hasExpertise = data.keywords.some(k => message.toLowerCase().includes(k.toLowerCase()));
                if (hasExpertise) {
                    context.push({
                        type: 'expertise',
                        details: `Shows knowledge in ${category}`
                    });
                }
            }
        }
    }

    return context;
}

function scoreContacts(
    enrichedChats: any[],
    prompt: string,
    intents: string[],
    topics: Set<string>
): AnalysisResult[] {
    return enrichedChats.map(chat => {
        let score = 0;
        const reasons: string[] = [];

        // Exact keyword matches
        const exactMatches = [...topics].filter(topic => 
            chat.lastMessage.content.toLowerCase().includes(topic.toLowerCase())
        ).length;
        score += exactMatches * WEIGHTS.EXACT_MATCH;

        // Expertise match with higher weight for direct matches
        const expertiseMatch = chat.expertise.filter((exp: string) => topics.has(exp));
        score += expertiseMatch.length * WEIGHTS.EXPERTISE_MATCH;
        
        // Context relevance
        if (chat.contextMatch?.length > 0) {
            const contextScore = chat.contextMatch.reduce((acc: number, context: any) => {
                return acc + (context.type === 'expertise' ? 2 : 1);
            }, 0) * WEIGHTS.CONTEXT_MATCH;
            score += contextScore;
        }

        // Intent alignment
        const intentScore = intents.some(intent => 
            chat.lastMessage.content.toLowerCase().includes(intent)
        ) ? WEIGHTS.INTENT_MATCH : 0;
        score += intentScore;

        // Build detailed reason
        if (expertiseMatch.length > 0) {
            reasons.push(`Expert in ${expertiseMatch.join(', ')}`);
        }
        if (exactMatches > 0) {
            reasons.push('Directly matches your needs');
        }
        if (intentScore > 0) {
            reasons.push('Shows relevant experience');
        }

        return {
            name: chat.name,
            relevance: score / 100,
            reason: reasons.join('. '),
            expertise: chat.expertise,
            confidenceScore: Math.min(Math.round(score), 100),
            contextMatch: chat.contextMatch
        };
    }).filter(result => result.confidenceScore > 40); // Increased threshold
}

function calculateTextSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(text1.toLowerCase().split(/\W+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\W+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
} 