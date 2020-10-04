const { v4: uuidV4 } = require('uuid')
const express = require('express')
const app = express()
const fs = require('fs');
const https = require('https')
const server = https.createServer({
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem'),
}, app)

const io = require('socket.io')(server)


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
    socket.to(roomId).broadcast.emit('new-user-entered', userId)

    socket.on('offer', (localDescription, userId) => {
      socket.to(roomId).broadcast.emit('offer', localDescription, userId)
    })

    socket.on('answer', (localDescription, userId) => {
      socket.to(roomId).broadcast.emit('answer', localDescription, userId)
    })

    socket.on('new-ice-candidate', (candidate) => {
      socket.to(roomId).broadcast.emit('new-ice-candidate', candidate)
    })

    socket.on('ready-to-stream', (streamId) => {
      socket.to(roomId).broadcast.emit('ready-to-stream', streamId)
    })

    // when client closes browser, it automatically emits a disconnect
    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

server.listen(3000)



