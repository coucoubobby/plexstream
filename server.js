const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

let streams = []; // store active streams {id,user,title,category}
let clients = {}; // track connections by id

function broadcast(data, exclude) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== exclude) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on("connection", (ws) => {
    ws.id = Math.random().toString(36).substr(2, 9);

    ws.on("message", (msg) => {
        try {
            const data = JSON.parse(msg);

            // handle chat
            if (data.type === "chat") {
                broadcast({ type: "chat", chat: data.chat, user: data.user }, ws);
            }

            // handle new stream start
            else if (data.type === "newStream") {
                const stream = {
                    id: ws.id,
                    user: data.user,
                    title: data.title,
                    category: data.category,
                };
                streams.push(stream);
                ws.stream = stream;
                broadcast({ type: "streamsUpdate", streams });
            }

            // handle stop stream
            else if (data.type === "stopStream") {
                streams = streams.filter((s) => s.id !== ws.id);
                broadcast({ type: "streamsUpdate", streams });
            }

            // handle search
            else if (data.type === "search") {
                const q = data.query.toLowerCase();
                const results = streams.filter(
                    (s) =>
                        s.title.toLowerCase().includes(q) ||
                        s.user.toLowerCase().includes(q)
                );
                ws.send(JSON.stringify({ type: "searchResults", results }));
            }

            // handle WebRTC signals
            else if (data.type === "offer" || data.type === "answer" || data.type === "iceCandidate") {
                broadcast(data, ws);
            }
        } catch (e) {
            console.error("Invalid message", e);
        }
    });

    ws.on("close", () => {
        // remove stream if user disconnects
        if (ws.stream) {
            streams = streams.filter((s) => s.id !== ws.id);
            broadcast({ type: "streamsUpdate", streams });
        }
    });
});

console.log("✅ WebSocket server running on ws://localhost:8080");
