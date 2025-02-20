const socket = io();
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message');
const nicknameInput = document.getElementById('nickname');
const sendButton = document.getElementById('send-button');
const charCount = document.getElementById('char-count');

let lastMessageTime = 0;
const COOLDOWN_TIME = 3000; // 3 secondi di cooldown

// Funzione per animare l'entrata dei messaggi
function animateMessage(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        element.style.transition = 'all 0.3s ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }, 50);
}

// Aggiorna il contatore caratteri con stile
messageInput.addEventListener('input', () => {
    const length = messageInput.value.length;
    const percentage = (length / 500) * 100;
    charCount.textContent = `${length}/500`;
    charCount.style.color = percentage > 80 ? '#ef4444' : '#6b7280';
});

// Feedback visivo durante il cooldown
function updateSendButtonState(disabled) {
    sendButton.disabled = disabled;
    if (disabled) {
        sendButton.classList.add('opacity-50', 'cursor-not-allowed');
        sendButton.textContent = 'Attendi...';
    } else {
        sendButton.classList.remove('opacity-50', 'cursor-not-allowed');
        sendButton.textContent = 'Invia Messaggio';
    }
}

// Gestione invio messaggio con feedback
function sendMessage() {
    const currentTime = Date.now();
    if (currentTime - lastMessageTime < COOLDOWN_TIME) {
        const remainingTime = Math.ceil((COOLDOWN_TIME - (currentTime - lastMessageTime)) / 1000);
        alert(`Attendi ${remainingTime} secondi prima di inviare un altro messaggio`);
        return;
    }

    const content = messageInput.value.trim();
    const nickname = nicknameInput.value.trim() || 'Anonimo';

    if (!content) return;

    updateSendButtonState(true);
    
    socket.emit('send_message', {
        nickname: nickname,
        content: content
    });

    messageInput.value = '';
    charCount.textContent = '0/500';
    lastMessageTime = currentTime;
    
    setTimeout(() => updateSendButtonState(false), COOLDOWN_TIME);
}

// Eventi per l'invio
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Ricezione nuovo messaggio con animazione
socket.on('new_message', (data) => {
    const messageElement = createMessageElement(data);
    messagesContainer.insertBefore(messageElement, messagesContainer.firstChild);
    animateMessage(messageElement);
    
    // Rimuovi messaggi vecchi
    while (messagesContainer.children.length > 50) {
        messagesContainer.removeChild(messagesContainer.lastChild);
    }
    
    // Riproduci suono di notifica
    playNotificationSound();
});

// Crea elemento messaggio con stile moderno
function createMessageElement(data) {
    const div = document.createElement('div');
    div.className = 'message-bubble bg-white p-4 rounded-xl shadow-sm';
    
    div.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <span class="font-medium text-purple-600">${escapeHtml(data.nickname)}</span>
            <span class="text-xs text-gray-400">${data.timestamp}</span>
        </div>
        <p class="text-gray-700 leading-relaxed">${escapeHtml(data.content)}</p>
    `;
    
    return div;
}

// Riproduce un suono di notifica
function playNotificationSound() {
    const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFCIiIiIiIjAwMDAwPz8/Pz8/TU1NTU1NW1tbW1tbaWlpaWl3d3d3d3eFhYWFhYWTk5OTk5OgoKCgoK6urq6urry8vLy8vMrKysrKysrY2Njl5eXl8fHx8fHx////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCQAAAAAAAAB4zJAbF//////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAkAkAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tOxAAAFhRzLRUIYFo5AKgAAAADAAAAAAAAAAAAKQWpAEAAAAEAkDgDwBAIAEAgEAgD/9yGlkpQVAgIB4P///8GAwH//y3//xhx///+wZv//////tWxX/rRg4P//////sgFP/KP//9P/5+2P//5g//+93///LLH///w4JB/P//+1SUAUCRIpAUOZBUVFRUUjQ0NUNH5//+H4BBQDg8HwfBIKAgEAYDAcCgQBgIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC4bh+H4fj///cxV2AJA+D6B+H4AAH/5yCEAEAQBgCCAIAgEAQDioqKAoKAICIIAgEAQBA4Hg4DgYBuD4OAAAAAAAAAAAAAADAAAAAAAAAAAAAA//sQxNoAY6X1R7mHgBuJsq1jNvAADkSAAAAAAAAAAAAEAAN7sAAAAAAAAr8wKgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/++DE2YBAAAD+AAAABAAAN4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    audio.play().catch(() => {}); // Ignora errori se l'autoplay è bloccato
}

// Escape HTML per prevenire XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Carica messaggi esistenti all'avvio
fetch('/get_messages')
    .then(response => response.json())
    .then(messages => {
        messages.forEach(message => {
            const messageElement = createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });
    })
    .catch(error => {
        console.error('Errore nel caricamento dei messaggi:', error);
    });