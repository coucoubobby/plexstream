const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

let streams = []; // {id, title, user, category}
const generateID = () => Math.random().toString(36).substr(2, 9);

function broadcast(data, exclude) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== exclude) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on("connection", (ws) => {
    ws.id = generateID();

    ws.on("message", (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === "chat") {
                broadcast({ type: "chat", chat: data.chat, user: data.user }, ws);
            }
            else if (data.type === "newStream") {
                const streamID = generateID();
                const stream = {
                    id: streamID,
                    title: data.title,
                    user: data.user,
                    category: data.category,
                };
                streams.push(stream);
                ws.stream = stream;
                broadcast({ type: "streamsUpdate", streams });
            }
            else if (data.type === "stopStream") {
                streams = streams.filter((s) => s.id !== ws.stream?.id);
                broadcast({ type: "streamsUpdate", streams });
            }
            else if (data.type === "search") {
                const q = data.query.toLowerCase();
                const results = streams.filter(
                    (s) => s.title.toLowerCase().includes(q)
                );
                ws.send(JSON.stringify({ type: "searchResults", results }));
            }
            else if (data.type === "getStreamByID") {
                const stream = streams.find((s) => s.id === data.id);
                ws.send(JSON.stringify({ type: "streamByID", stream }));
            }
            else if (data.type === "offer" || data.type === "answer" || data.type === "iceCandidate") {
                broadcast(data, ws);
            }
        } catch (e) {
            console.error("Invalid message", e);
        }
    });

    ws.on("close", () => {
        if (ws.stream) {
            streams = streams.filter((s) => s.id !== ws.stream.id);
            broadcast({ type: "streamsUpdate", streams });
        }
    });
});

console.log("✅ WebSocket server running on ws://localhost:8080");
