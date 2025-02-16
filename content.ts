// import type { PlasmoCSConfig } from "plasmo"

// export const config: PlasmoCSConfig = {
//     matches: ["https://web.whatsapp.com/*"]
// }

// interface Message {
//     sender: string;
//     content: string;
//     timestamp: string;
// }

// interface GroupData {
//     name: string;
//     lastMessages: Message[];
// }

// function isExtensionContextValid() {
//     return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
// }

// function waitForElement(selector: string, timeout = 30000): Promise<Element | null> {
//     return new Promise((resolve) => {
//         if (document.querySelector(selector)) {
//             return resolve(document.querySelector(selector));
//         }

//         const observer = new MutationObserver(() => {
//             if (document.querySelector(selector)) {
//                 resolve(document.querySelector(selector));
//                 observer.disconnect();
//             }
//         });

//         observer.observe(document.body, {
//             childList: true,
//             subtree: true
//         });

//         setTimeout(() => {
//             observer.disconnect();
//             resolve(null);
//         }, timeout);
//     });
// }

// async function extractGroupMessages(): Promise<GroupData[]> {
//     console.log("Starting to extract group messages");

//     // Wait for the chat list to load
//     const chatListContainer = await waitForElement('div[aria-label="Chat list"] > div');
//     if (!chatListContainer) {
//         console.log("Chat list container not found");
//         return [];
//     }

//     console.log("Chat list container found. Extracting chat items...");

//     const chatItems = chatListContainer.querySelectorAll('div[role="listitem"]');
//     console.log(`Found ${chatItems.length} chat items`);

//     const groups: GroupData[] = [];

//     chatItems.forEach((chat, index) => {
//         const nameElement = chat.querySelector('span[title]');
//         const name = nameElement?.getAttribute('title') || 'Unknown Group';

//         const messageElement = chat.querySelector('div[role="gridcell"] span.x1iyjqo2');
//         const lastMessageContent = messageElement?.textContent?.trim() || 'No message';

//         const timestampElement = chat.querySelector('div[role="gridcell"]._ak8i');
//         const timestamp = timestampElement?.textContent?.trim() || '';

//         const senderElement = chat.querySelector('div[role="gridcell"] span._ao3e');
//         const sender = senderElement?.textContent?.trim() || 'Unknown';

//         console.log(`Group ${index + 1}: ${name}`);
//         console.log(`Last message: ${lastMessageContent}`);
//         console.log(`Timestamp: ${timestamp}`);
//         console.log(`Sender: ${sender}`);
//         console.log('---');

//         const lastMessages: Message[] = [{
//             sender,
//             content: lastMessageContent,
//             timestamp
//         }];

//         groups.push({ name, lastMessages });
//     });

//     if (isExtensionContextValid()) {
//         console.log("Sending data to popup", groups);
//         chrome.runtime.sendMessage({ action: "updateGroups", data: groups });
//     } else {
//         console.log("Extension context is no longer valid. Unable to send data to popup.");
//     }

//     return groups;
// }

// async function initializeExtension() {
//     try {
//         console.log("WhatsApp Web Group Scraper initialized");
//         await extractGroupMessages();
//     } catch (error) {
//         if (error.message.includes("Extension context invalidated")) {
//             console.log("Extension context was invalidated. The extension may have been reloaded or updated.");
//         } else {
//             console.error("An error occurred:", error);
//         }
//     }
// }

// // Wait for the page to load before initializing
// window.addEventListener('load', () => {
//     setTimeout(initializeExtension, 5000); // Wait an additional 5 seconds after load
// });

// // Listen for messages from the popup or background script
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     if (message.action === "extractGroups") {
//         initializeExtension();
//         sendResponse({ status: "Extraction started" });
//     }
//     return true;
// });



import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: ["https://web.whatsapp.com/*"]
}

interface Message {
    sender: string;    // Name of the message sender
    content: string;   // Content of the message
    timestamp: string; // Timestamp of when the message was sent
}

interface GroupData {
    name: string;       // Name of the chat or group
    lastMessages: Message[]; // Array of the last few messages
}

function extractRecentMessages(): GroupData | null {
    const chatList = document.querySelector('div[aria-label="Chat list"]');
    if (!chatList) {
        console.log("Chat list not found");
        return null;
    }

    console.log("Chat list found:", chatList);

    const firstChat = chatList.firstElementChild as HTMLElement;
    if (!firstChat) {
        console.log("No chats found in the list");
        return null;
    }

    console.log("First chat in the list:", firstChat);

    firstChat.click();

    // Wait for messages to load
    setTimeout(() => {
        const messageContainer = document.querySelector('#main');
        if (!messageContainer) {
            console.log("Message container not found");
            return null;
        }

        console.log("Message container found:", messageContainer);

        const messageElements = messageContainer.querySelectorAll('div[role="row"]');
        console.log("Total message elements found:", messageElements.length);

        const lastMessages: Message[] = [];

        for (let i = Math.max(0, messageElements.length - 5); i < messageElements.length; i++) {
            const messageEl = messageElements[i];
            const senderEl = messageEl.querySelector('._ahxt');
            const contentEl = messageEl.querySelector('._ao3e.selectable-text.copyable-text');
            const timestampEl = messageEl.querySelector('.x1rg5ohu.x16dsc37');

            if (contentEl && timestampEl) {
                const message = {
                    sender: senderEl?.textContent || 'Unknown',
                    content: contentEl.textContent || 'No message',
                    timestamp: timestampEl.textContent || new Date().toISOString()
                };
                lastMessages.push(message);
                console.log("Extracted message:", message);
            } else {
                console.log("Failed to extract message from element:", messageEl);
            }
        }

        const nameElement = firstChat.querySelector('span[title]');
        const name = nameElement?.textContent || 'Unknown Chat';

        const groupData: GroupData = { name, lastMessages };
        console.log("Extracted group data:", groupData);

        chrome.runtime.sendMessage({ action: "updateMessages", data: groupData });
    }, 1000); // Wait 1 second for messages to load

    return null;
}

function initializeExtension() {
    console.log("WhatsApp Web Message Scraper initialized");
    extractRecentMessages();
}

// Use MutationObserver to wait for the chat list to be loaded
const observer = new MutationObserver((mutations, obs) => {
    const chatList = document.querySelector('div[aria-label="Chat list"]');
    if (chatList) {
        console.log("Chat list loaded, initializing extension");
        initializeExtension();
        obs.disconnect(); // Stop observing once we've initialized
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log("WhatsApp Web Message Scraper script loaded");