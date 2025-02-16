export {}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background script received message:", request);
    if (request.action === "updateMessages") {
        chrome.storage.local.set({ whatsappMessages: request.data }, () => {
            console.log("Groups data saved:", request.data);
            sendResponse({ status: "Data saved successfully" });
        });
    }
    return true; // Indicates that the response is sent asynchronously
});