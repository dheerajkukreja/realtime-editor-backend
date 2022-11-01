const express = require('express')

const app = express()

const http = require('http')

const {Server} = require('socket.io')
const ACTIONS = require('../public/src/Actions')






const PORT = process.env.PORT || 8000


const server = app.listen(PORT, ()=>{
    console.log(`Sever running on http://localhost:${PORT}`)
})


const io = new Server(server)


const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket)=>{
    
    socket.on(ACTIONS.JOIN, ({roomId, username}) =>{
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    })


    socket.on(ACTIONS.CODE_CHANGE, ({roomId, code})=>{
        socket.broadcast.to(roomId).emit(ACTIONS.CODE_CHANGE, {code})
    })

    socket.on(ACTIONS.SYNC_CODE, ({code, socketId}) =>{
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, {code})
    })



    socket.on('disconnecting', ()=>{
        const rooms = [...socket.rooms]
        rooms.forEach((roomId)=>{
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username : userSocketMap[socket.id],
            })
        })
        delete userSocketMap[socket.id]
        socket.leave()
    })

})