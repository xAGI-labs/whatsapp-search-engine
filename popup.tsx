import React, { useEffect, useState } from 'react'

interface Chat {
	name: string;
	avatar: string;
}

function IndexPopup() {
	const [chats, setChats] = useState<Chat[]>([]);
	const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
	const [lastMessage, setLastMessage] = useState<string>('');

	useEffect(() => {
		const fetchChats = () => {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				chrome.tabs.sendMessage(tabs[0].id, { action: "getChats" }, (response) => {
					if (chrome.runtime.lastError) {
						console.error(chrome.runtime.lastError);
					} else if (response && response.chats) {
						setChats(response.chats);
					}
				});
			});
		};

		fetchChats();
	}, []);

	const handleChatClick = (chat: Chat) => {
		setSelectedChat(chat);
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			chrome.tabs.sendMessage(tabs[0].id, { action: "getLastMessage", chatName: chat.name }, (response) => {
				if (chrome.runtime.lastError) {
					console.error(chrome.runtime.lastError);
				} else if (response && response.lastMessage) {
					setLastMessage(response.lastMessage);
				}
			});
		});
	};

	return (
		<div style={{
			width: '350px',
			height: '600px',
			padding: '20px',
			fontFamily: 'Arial, sans-serif',
			backgroundColor: '#f0f2f5',
			color: '#3b4a54',
			overflow: 'auto'
		}}>
			<h1 style={{
				textAlign: 'center',
				color: '#128C7E',
				borderBottom: '2px solid #128C7E',
				paddingBottom: '10px',
				marginBottom: '20px'
			}}>WhatsApp Chats</h1>

			{chats.length > 0 ? (
				<div>
					{chats.map((chat, index) => (
						<div key={index} onClick={() => handleChatClick(chat)} style={{
							display: 'flex',
							alignItems: 'center',
							padding: '10px',
							marginBottom: '10px',
							backgroundColor: 'white',
							borderRadius: '8px',
							cursor: 'pointer'
						}}>
							<img src={chat.avatar} alt={chat.name} style={{
								width: '40px',
								height: '40px',
								borderRadius: '50%',
								marginRight: '10px'
							}} />
							<span>{chat.name}</span>
						</div>
					))}
				</div>
			) : (
				<p>No chats available. Make sure WhatsApp Web is open.</p>
			)}

			{selectedChat && (
				<div style={{
					marginTop: '20px',
					padding: '15px',
					backgroundColor: 'white',
					borderRadius: '8px'
				}}>
					<h2>{selectedChat.name}</h2>
					<p>Last message: {lastMessage || 'Loading...'}</p>
				</div>
			)}
		</div>
	)
}

export default IndexPopup