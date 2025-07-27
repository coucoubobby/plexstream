const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const streams = new Set(); // Track active stream IDs

wss.on('connection', ws => {
    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'newStream') {
                streams.add(data.streamId);
                broadcastStreams();
            } else if (data.type === 'getStreams') {
                ws.send(JSON.stringify({ type: 'streams', streams: Array.from(streams) }));
            } else if (data.type === 'offer' || data.type === 'answer' || data.type === 'iceCandidate') {
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN && client !== ws) {
                        client.send(JSON.stringify({ ...data, from: data.streamId }));
                    }
                });
            } else if (data.type === 'chat') {
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'chat', message: data.message }));
                    }
                });
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        // Clean up streams if a broadcaster disconnects (simplified)
        broadcastStreams();
    });
});

function broadcastStreams() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'streams', streams: Array.from(streams) }));
        }
    });
}
