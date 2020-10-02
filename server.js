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
    // if broadcast, the first client doesn't emit the msg, only subsequent clients will trigger this broadcast 
    socket.to(roomId).broadcast.emit('user-connected', userId)

    // when client closes browser, it automatically emits a disconnect
    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

server.listen(3000)



