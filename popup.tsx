import { useEffect, useState } from "react"
import { analyzeChatsWithAI } from './services/analysis'
import type { Chat, LastMessage } from '~types'

interface Recommendation {
    name: string;
    relevance: number;
    reason: string;
    expertise: string[];
    confidenceScore: number;
}

function IndexPopup() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("");
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab?.id) return;

            if (!tab.url?.includes("web.whatsapp.com")) {
                setError("Please open WhatsApp Web first");
                setLoading(false);
                return;
            }

            chrome.tabs.sendMessage(tab.id, { action: "scanChats" }, (response) => {
                setLoading(false);
                
                if (chrome.runtime.lastError) {
                    console.error("Runtime error:", chrome.runtime.lastError);
                    setError("Please refresh WhatsApp Web and try again");
                    return;
                }

                console.log("Received response:", response);

                if (response?.success && response.chats) {
                    console.log("Setting chats:", response.chats);
                    setChats(response.chats);
                } else {
                    console.error("Invalid response:", response);
                    setError(response?.error || "Failed to scan chats");
                }
            });
        });
    }, []);

    const analyzeNetwork = async () => {
        if (!prompt.trim()) return;
        
        setAnalyzing(true);
        try {
            const recommendations = await analyzeChatsWithAI(prompt, chats);
            setRecommendations(recommendations);
        } catch (error) {
            console.error("Analysis error:", error);
        }
        setAnalyzing(false);
    };

    return (
        <div style={{
            width: '400px',
            padding: '16px',
            backgroundColor: '#f0f2f5'
        }}>
            <h1 style={{
                fontSize: '24px',
                color: '#128C7E',
                marginBottom: '16px'
            }}>WhatsApp Network Search</h1>

            {/* Prompt Input */}
            <div style={{
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                <textarea 
                    placeholder="Describe your problem or need..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        minHeight: '80px',
                        resize: 'vertical'
                    }}
                />
                <button 
                    onClick={analyzeNetwork}
                    disabled={analyzing || loading || !prompt.trim()}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#128C7E',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        opacity: analyzing || loading || !prompt.trim() ? 0.7 : 1
                    }}
                >
                    {analyzing ? 'Analyzing...' : 'Find Help'}
                </button>
            </div>

            {/* Results Section */}
            {loading ? (
                <div>Scanning chats...</div>
            ) : error ? (
                <div style={{ color: 'red' }}>{error}</div>
            ) : recommendations.length > 0 ? (
                <div>
                    <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Recommended Contacts</h2>
                    {recommendations.map((rec, index) => (
                        <div key={index} style={{
                            padding: '12px',
                            backgroundColor: 'white',
                            marginBottom: '8px',
                            borderRadius: '8px',
                            borderLeft: '4px solid #128C7E'
                        }}>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ fontWeight: 'bold' }}>{rec.name}</div>
                                <div style={{ 
                                    backgroundColor: getConfidenceColor(rec.confidenceScore),
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    color: 'white'
                                }}>
                                    {Math.round(rec.confidenceScore)}% match
                                </div>
                            </div>
                            {rec.expertise.length > 0 && (
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '4px',
                                    marginTop: '4px'
                                }}>
                                    {rec.expertise.map(exp => (
                                        <span key={exp} style={{
                                            backgroundColor: '#e0f2f1',
                                            color: '#128C7E',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '12px'
                                        }}>
                                            {exp}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                                {rec.reason}
                            </div>
                        </div>
                    ))}
                </div>
            ) : chats.length > 0 ? (
                <div>
                    <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Available Chats</h2>
                    {chats.map((chat, index) => (
                        <div key={index} style={{
                            padding: '12px',
                            backgroundColor: 'white',
                            marginBottom: '8px',
                            borderRadius: '8px'
                        }}>
                            <div style={{ fontWeight: 'bold' }}>{chat.name}</div>
                            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                                {chat.lastMessage.content}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', color: '#666' }}>
                    No chats found
                </div>
            )}
        </div>
    );
}

export default IndexPopup

function getConfidenceColor(score: number): string {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
}
