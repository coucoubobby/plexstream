const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

let streams = []; // {id,title,category,user}
function generateId(){return Math.random().toString(36).substr(2,9);}

function broadcast(data,exclude){
    wss.clients.forEach(c=>{if(c.readyState===WebSocket.OPEN && c!==exclude) c.send(JSON.stringify(data));});
}

wss.on("connection",(ws)=>{
    ws.id=generateId();

    ws.on("message",(msg)=>{
        try{
            const data=JSON.parse(msg);
            if(data.type==="chat"){broadcast({type:"chat",user:data.user,chat:data.chat},ws);}
            else if(data.type==="newStream"){
                const stream={id:generateId(),title:data.title,category:data.category,user:data.user};
                streams.push(stream); ws.stream=stream;
                broadcast({type:"streamsUpdate",streams});
            }
            else if(data.type==="stopStream"){
                streams=streams.filter(s=>s.id!==ws.stream?.id); broadcast({type:"streamsUpdate",streams});
            }
            else if(data.type==="search"){
                const q=data.query.toLowerCase();
                const results=streams.filter(s=>s.title.toLowerCase().includes(q)||s.id.toLowerCase().includes(q))
                    .map(s=>({id:s.id,title:s.title,live:true}));
                ws.send(JSON.stringify({type:"searchResults",results}));
            }
            else if(["offer","answer","iceCandidate"].includes(data.type)){broadcast(data,ws);}
            else if(data.type==="watchStream"){ /* optional: handle if needed */ }
        }catch(e){console.error(e);}
    });

    ws.on("close",()=>{
        if(ws.stream){streams=streams.filter(s=>s.id!==ws.stream.id);broadcast({type:"streamsUpdate",streams});}
    });
});

console.log("✅ WebSocket server running on ws://localhost:8080");
