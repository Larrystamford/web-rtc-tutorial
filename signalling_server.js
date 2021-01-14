const { v4: uuidV4 } = require('uuid')
const express = require('express')
const app = express()
const fs = require('fs');
const https = require('https')
const signalling_server = https.createServer({
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem'),
}, app)

const io = require('socket.io')(signalling_server)


app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})



io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    // broadcast.emit vs .emit
    // if broadcast, message is not sent to self
    console.log("INFO: " + userId + " has joined room " + roomId);
    socket.to(roomId).broadcast.emit('another-user-entered', userId)

    socket.on('offer', (localDescription, userId, targetId) => {
      console.log(`INFO: ${userId} has presented WebRTC Offer to ${targetId}:` + localDescription);
      socket.to(roomId).broadcast.emit('offer', localDescription, userId, targetId)
    })

    socket.on('answer', (localDescription, userId, targetId) => {
      console.log(`INFO: ${userId} has replied ${targetId} with WebRTC Answer:` + localDescription);
      socket.to(roomId).broadcast.emit('answer', localDescription, userId, targetId)
    })

    socket.on('new-ice-candidate', (candidate, userId, targetId) => {
      console.log(`INFO: ${userId} has new ICE candidate:` + candidate);
      socket.to(roomId).broadcast.emit('new-ice-candidate', candidate, userId, targetId)
    })

    // when client closes browser, it automatically emits a disconnect
    socket.on('disconnect', () => {
      console.log("INFO: " + userId + " has disconnected");
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

signalling_server.listen(3000)



