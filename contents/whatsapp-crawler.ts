import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: ["https://web.whatsapp.com/*"]
}

interface Message {
    sender: string;
    content: string;
    timestamp: string;
}

const SELECTORS = {
    // Main containers
    chatList: '#pane-side',
    chatItem: 'div[role="listitem"]',
    messageContainer: '#main div[role="region"]',
    
    // Message elements
    message: 'div[role="row"]',
    messageText: 'span.x78zum5.x1cy8zhl',
    messageTime: 'span[class*="message-time"]',
    messageSender: 'span[class*="message-author"]',
    
    // Chat elements
    chatTitle: 'span[title]',
    backButton: '[data-testid="btn-back"]'
};

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const element = document.querySelector(selector);
        if (element) return element;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
        return null;
    }

function getMessageContent(element: Element): string {
    const messageEl = element.querySelector('span.x78zum5.x1cy8zhl');
    if (messageEl?.textContent) {
        // Filter out status indicators
        const text = messageEl.textContent.replace(/status-dblcheck|status-check/g, '').trim();
        console.log("Found message:", text);
        return text;
    }
    return 'No message';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);

    if (request.action === "scanChats") {
        (async () => {
            try {
                await sleep(2000);

                const chatItems = document.querySelectorAll(SELECTORS.chatItem);
                console.log("Chat items found:", chatItems.length);

                if (chatItems.length === 0) {
                    const altChatItems = document.querySelectorAll('#pane-side [role="row"]');
                    console.log("Alternative chat items found:", altChatItems.length);
                    
                    if (altChatItems.length === 0) {
                        throw new Error("No chat items found");
                    }

                    const results = Array.from(altChatItems).slice(0, 15).map(chat => {
                        const titleEl = chat.querySelector('span[title]');
                        const messageEl = chat.querySelector(SELECTORS.messageText);
                        const timeEl = chat.querySelector('span[class*="message-time"]');
                        
                        const name = titleEl?.getAttribute('title') || titleEl?.textContent || 'Unknown';
                        const content = messageEl?.textContent?.replace(/status-dblcheck|status-check/g, '').trim() || 'No message';
                        const time = timeEl?.textContent?.trim() || new Date().toLocaleTimeString();

                        console.log("Extracted message:", { name, content, time });

                        return {
                            name,
                            lastMessage: {
                                sender: name,
                                content,
                                time
                            }
                        };
                    });

                    console.log("Processed chats:", results);
                    sendResponse({ success: true, chats: results });
                    return;
                }

                const results = [];
                const chatItemsToProcess = Array.from(chatItems).slice(0, 15);

                for (const chat of chatItemsToProcess) {
                    try {
                        const titleEl = chat.querySelector(SELECTORS.chatTitle);
                        const messageEl = chat.querySelector(SELECTORS.messageText);
                        const timeEl = chat.querySelector('span[class*="message-time"]');

                        const name = titleEl?.textContent?.trim() || 'Unknown';
                        const content = getMessageContent(chat);
                        const time = timeEl?.textContent?.trim() || new Date().toLocaleTimeString();

                        console.log("Extracted message:", { name, content, time });

                        results.push({
                            name,
                            lastMessage: {
                                sender: name,
                                content,
                                time
                            }
                        });

                    } catch (error) {
                        console.error(`Error processing chat:`, error);
                    }
                }

                console.log("Processed chats:", results);
                sendResponse({ success: true, chats: results });
            } catch (error) {
                console.error("Error:", error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }
});

// Add this to verify the content script is loaded
window.addEventListener('load', () => {
    console.log("WhatsApp crawler loaded, checking elements:");
    console.log("Chat list exists:", !!document.querySelector(SELECTORS.chatList));
    console.log("Chat items:", document.querySelectorAll(SELECTORS.chatItem).length);
});

console.log("WhatsApp crawler initialized");