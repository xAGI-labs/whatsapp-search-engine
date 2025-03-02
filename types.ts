export interface LastMessage {
    sender: string;
    content: string;
    time: string;
}

export interface Chat {
    name: string;
    lastMessage: LastMessage;
} 