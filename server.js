const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

let streams = []; // store active streams {id, user, title, category}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function broadcast(data, exclude) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== exclude) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on("connection", (ws) => {
    ws.id = generateId();
    console.log("Client connected:", ws.id);

    ws.on("message", (msg) => {
        try {
            const data = JSON.parse(msg);
            console.log("Received:", data.type);

            // Handle chat
            if (data.type === "chat") {
                broadcast({ type: "chat", user: data.user, chat: data.chat }, ws);
            }

            // Handle new stream
            else if (data.type === "newStream") {
                const stream = {
                    id: ws.id, // Use connection ID as stream ID
                    title: data.title,
                    category: data.category,
                    user: data.user,
                    live: true
                };
                streams.push(stream);
                ws.stream = stream;
                console.log("New stream:", stream.title);
                broadcast({ type: "streamsUpdate", streams });
            }

            // Handle stop stream
            else if (data.type === "stopStream") {
                streams = streams.filter(s => s.id !== ws.id);
                console.log("Stream stopped:", ws.id);
                broadcast({ type: "streamsUpdate", streams });
            }

            // Handle search - FIXED VERSION
            else if (data.type === "search") {
                const query = data.query.toLowerCase().trim();
                console.log("Search query:", query);
                
                let results = [];
                if (query) {
                    // Search by title, user, or category
                    results = streams.filter(stream =>
                        stream.title.toLowerCase().includes(query) ||
                        stream.user.toLowerCase().includes(query) ||
                        stream.category.toLowerCase().includes(query)
                    );
                } else {
                    // If empty search, return all active streams
                    results = [...streams];
                }
                
                console.log("Search results:", results.length);
                ws.send(JSON.stringify({ 
                    type: "searchResults", 
                    results: results.map(s => ({
                        id: s.id,
                        title: s.title,
                        user: s.user,
                        category: s.category,
                        live: true
                    }))
                }));
            }

            // Handle WebRTC signals
            else if (["offer", "answer", "iceCandidate"].includes(data.type)) {
                broadcast(data, ws);
            }

            // Handle watch stream requests
            else if (data.type === "watchStream") {
                // This will trigger the stream owner to send their offer
                broadcast(data, ws);
            }

        } catch (e) {
            console.error("Error parsing message:", e);
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected:", ws.id);
        // Clean up streams when user disconnects
        if (ws.stream) {
            streams = streams.filter(s => s.id !== ws.id);
            broadcast({ type: "streamsUpdate", streams });
        }
    });

    // Send current stream list to new client
    ws.send(JSON.stringify({ type: "streamsUpdate", streams }));
});

console.log("WebSocket server running on port 8080") 
