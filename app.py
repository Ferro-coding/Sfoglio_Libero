from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from datetime import datetime, timedelta
import sqlite3
import bleach
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here'  # Cambia questa chiave in produzione
socketio = SocketIO(app)

# Database setup
def init_db():
    conn = sqlite3.connect('instance/messages.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages
        (id INTEGER PRIMARY KEY AUTOINCREMENT,
         nickname TEXT,
         content TEXT,
         timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)
    ''')
    conn.commit()
    conn.close()

def cleanup_messages():
    conn = sqlite3.connect('instance/messages.db')
    c = conn.cursor()
    
    # Rimuove messaggi più vecchi di 24 ore
    yesterday = datetime.now() - timedelta(days=1)
    c.execute('DELETE FROM messages WHERE timestamp < ?', (yesterday,))
    
    # Mantiene solo gli ultimi 1000 messaggi
    c.execute('''
        DELETE FROM messages 
        WHERE id NOT IN (
            SELECT id FROM messages 
            ORDER BY timestamp DESC 
            LIMIT 1000
        )
    ''')
    
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('send_message')
def handle_message(data):
    # Pulisce i messaggi vecchi prima di aggiungerne uno nuovo
    cleanup_messages()
    
    nickname = bleach.clean(data.get('nickname', 'Anonimo'))[:20]
    content = bleach.clean(data.get('content', ''))[:500]
    
    if not content.strip():
        return
    
    conn = sqlite3.connect('instance/messages.db')
    c = conn.cursor()
    c.execute('INSERT INTO messages (nickname, content) VALUES (?, ?)',
              (nickname, content))
    conn.commit()
    
    timestamp = datetime.now().strftime('%H:%M:%S')
    
    emit('new_message', {
        'nickname': nickname,
        'content': content,
        'timestamp': timestamp
    }, broadcast=True)
    
    conn.close()  # Aggiunta chiusura connessione

@app.route('/get_messages')
def get_messages():
    conn = sqlite3.connect('instance/messages.db')
    c = conn.cursor()
    # Modificato per prendere gli ultimi 50 messaggi in ordine cronologico corretto
    c.execute('''
        SELECT nickname, content, timestamp 
        FROM messages 
        ORDER BY timestamp DESC 
        LIMIT 50
    ''')
    messages = [{'nickname': m[0], 'content': m[1], 
                'timestamp': datetime.strptime(m[2], '%Y-%m-%d %H:%M:%S').strftime('%H:%M:%S')} 
               for m in c.fetchall()]
    conn.close()
    return jsonify(messages)

if __name__ == '__main__':
    init_db()
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)  # Aggiunto allow_unsafe_werkzeug=True