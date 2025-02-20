import type { Chat } from '~types'

interface AnalysisResult {
    name: string;
    relevance: number;
    reason: string;
    expertise: string[];
    confidenceScore: number;
}

const EXPERTISE_KEYWORDS = {
    programming: ['code', 'programming', 'developer', 'software', 'bug', 'api', 'frontend', 'backend'],
    design: ['design', 'ui', 'ux', 'figma', 'prototype'],
    business: ['startup', 'business', 'marketing', 'strategy'],
    data: ['data', 'analytics', 'ml', 'ai', 'machine learning'],
    // Add more categories
};

export async function analyzeChatsWithAI(prompt: string, chats: Chat[]): Promise<AnalysisResult[]> {
    try {
        console.log("Starting analysis with prompt:", prompt);
        console.log("Available chats:", chats);

        // Extract expertise areas from messages
        const enrichedChats = chats.map(chat => {
            const messageContent = chat.lastMessage.content.toLowerCase();
            const expertise = Object.entries(EXPERTISE_KEYWORDS).filter(([area, keywords]) => 
                keywords.some(keyword => messageContent.includes(keyword))
            ).map(([area]) => area);

            console.log(`Expertise found for ${chat.name}:`, expertise);
            return { ...chat, expertise };
        });

        // Analyze prompt for needed expertise
        const promptLower = prompt.toLowerCase();
        const neededExpertise = Object.entries(EXPERTISE_KEYWORDS)
            .filter(([area, keywords]) => 
                keywords.some(keyword => promptLower.includes(keyword))
            )
            .map(([area]) => area);

        console.log("Needed expertise:", neededExpertise);

        // Score contacts
        const scored = enrichedChats.map(chat => {
            const messageContent = chat.lastMessage.content.toLowerCase();
            const words = promptLower.split(' ');
            
            const keywordMatch = words.filter(word => messageContent.includes(word)).length;
            const expertiseMatch = chat.expertise.filter(exp => neededExpertise.includes(exp)).length;
            const recency = isRecent(chat.lastMessage.time) ? 1.2 : 1;

            const relevance = (keywordMatch * 0.4 + expertiseMatch * 0.6) * recency;
            
            console.log(`Scores for ${chat.name}:`, {
                keywordMatch,
                expertiseMatch,
                recency,
                relevance
            });

            return {
                name: chat.name,
                relevance,
                expertise: chat.expertise,
                confidenceScore: calculateConfidence(relevance, expertiseMatch),
                reason: generateReason(chat, neededExpertise, keywordMatch)
            };
        });

        const results = scored
            .filter(result => result.relevance > 0)
            .sort((a, b) => b.relevance - a.relevance);

        console.log("Final results:", results);
        return results;

    } catch (error) {
        console.error("Analysis error:", error);
        throw error;
    }
}

function isRecent(timestamp: string): boolean {
    // Consider messages from last 24 hours as recent
    const messageDate = new Date(timestamp);
    const now = new Date();
    return (now.getTime() - messageDate.getTime()) < 24 * 60 * 60 * 1000;
}

function calculateConfidence(relevance: number, expertiseMatch: number): number {
    return Math.min((relevance * 0.7 + expertiseMatch * 0.3) * 100, 100);
}

function generateReason(
    chat: Chat & { expertise: string[] }, 
    neededExpertise: string[],
    keywordMatch: number
): string {
    const parts = [];

    if (chat.expertise.length > 0) {
        const matchingExpertise = chat.expertise
            .filter(exp => neededExpertise.includes(exp))
            .join(', ');
        if (matchingExpertise) {
            parts.push(`Has expertise in: ${matchingExpertise}`);
        }
    }

    if (keywordMatch > 0) {
        parts.push(`Recent message matches your needs: "${chat.lastMessage.content}"`);
    }

    return parts.join('. ') || "Based on overall profile match";
} 