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
            padding: '20px',
            backgroundColor: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <h1 style={{
                fontSize: '20px',
                color: '#1a1a1a',
                marginBottom: '20px',
                fontWeight: '600'
            }}>Network Search</h1>

            {/* Prompt Input */}
            <div style={{
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <textarea 
                    className="prompt-input"
                    placeholder="What kind of help do you need?"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid #e0e0e0',
                        backgroundColor: '#f8f8f8',
                        minHeight: '80px',
                        resize: 'none',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s, background-color 0.2s'
                    }}
                />
                <button 
                    className="analyze-button"
                    onClick={analyzeNetwork}
                    disabled={analyzing || loading || !prompt.trim()}
                    style={{
                        padding: '12px 20px',
                        backgroundColor: '#128C7E',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: analyzing || loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                        opacity: analyzing || loading || !prompt.trim() ? 0.6 : 1,
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'opacity 0.2s, transform 0.2s',
                        transform: analyzing || loading || !prompt.trim() ? 'none' : 'translateY(0)'
                    }}
                >
                    {analyzing ? 'Analyzing...' : 'Search Network'}
                </button>
            </div>

            {/* Status Messages */}
            {loading && (
                <div style={{ 
                    textAlign: 'center',
                    color: '#666',
                    padding: '20px',
                    fontSize: '14px'
                }}>
                    Scanning your chats...
                </div>
            )}

            {error && (
                <div style={{ 
                    color: '#e53935',
                    backgroundColor: '#ffebee',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            {/* Results Section */}
            {recommendations.length > 0 && (
                <div>
                    <h2 style={{ 
                        fontSize: '16px',
                        color: '#1a1a1a',
                        marginBottom: '16px',
                        fontWeight: '500'
                    }}>Recommended Contacts</h2>
                    {recommendations.map((rec, index) => (
                        <div 
                            key={index}
                            className="recommendation-card"
                            style={{
                                padding: '16px',
                                backgroundColor: '#ffffff',
                                marginBottom: '12px',
                                borderRadius: '12px',
                                border: '1px solid #e0e0e0',
                                transition: 'transform 0.2s'
                            }}
                        >
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px'
                            }}>
                                <div style={{ 
                                    fontWeight: '500',
                                    fontSize: '15px'
                                }}>{rec.name}</div>
                                <div style={{ 
                                    backgroundColor: getConfidenceColor(rec.confidenceScore),
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    color: 'white',
                                    fontWeight: '500'
                                }}>
                                    {Math.round(rec.confidenceScore)}% match
                                </div>
                            </div>
                            {rec.expertise.length > 0 && (
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '6px',
                                    flexWrap: 'wrap',
                                    marginBottom: '8px'
                                }}>
                                    {rec.expertise.map(exp => (
                                        <span key={exp} style={{
                                            backgroundColor: '#f0f7f6',
                                            color: '#128C7E',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '500'
                                        }}>
                                            {exp}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div style={{ 
                                fontSize: '13px',
                                color: '#666666',
                                lineHeight: '1.4'
                            }}>
                                {rec.reason}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Available Chats Section */}
            {!recommendations.length && chats.length > 0 && (
                <div>
                    <h2 style={{ 
                        fontSize: '16px',
                        color: '#1a1a1a',
                        marginBottom: '16px',
                        fontWeight: '500'
                    }}>Available Chats</h2>
                    {chats.map((chat, index) => (
                        <div key={index} style={{
                            padding: '12px 16px',
                            backgroundColor: '#ffffff',
                            marginBottom: '8px',
                            borderRadius: '12px',
                            border: '1px solid #e0e0e0'
                        }}>
                            <div style={{ 
                                fontWeight: '500',
                                fontSize: '14px',
                                marginBottom: '4px'
                            }}>{chat.name}</div>
                            <div style={{ 
                                fontSize: '13px',
                                color: '#666666'
                            }}>
                                {chat.lastMessage.content}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && !error && chats.length === 0 && (
                <div style={{ 
                    textAlign: 'center',
                    color: '#666666',
                    padding: '30px 20px',
                    fontSize: '14px'
                }}>
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
