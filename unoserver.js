var bodyParser = require('body-parser');
var express = require('express');
var httpModule = require('http');
var socketIO = require('socket.io');
var path= require('path')
var cookie = require('cookie')

var app = express();
var http = httpModule.Server(app);
var io = socketIO(http)//bind socket.io to http server

const PORT = 1991;
const HOST = 'localhost';

var users = {};
var NEXT_USR_ID = 1;

var rooms = {};
var NEXT_ROOM_ID = 1;

app.use(express.static(path.join(__dirname, 'public')));//works as middleware for serving static files
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

io.on('connection', (socket) => {
  console.log('a user connected, trying to get his cookie...')

  var cookief = socket.handshake.headers.cookie; 
  var cookies = cookie.parse(cookief);
  let usrid = (cookies && cookies['usrid']) || '';
  if (!!usrid){
    if (!users[usrid]){
      console.log('Invalid usrid got from cookie sent from client, since it does not exist: ' + usrid)
    }
    else{
      let usrInfo = users[usrid];//{name:xx, roomid:xx}
      let usrname = usrInfo.name;
      console.log('existing user(usrid='+ usrid + ', name='+ usrname +')coming...')
      
      //已存在的用户，发送用户信息及可能的房间id
      let roomid = usrInfo.roomid;
      let sendData = {me:usrname};
      if (0 < roomid && rooms[roomid]){
        Object.assign(sendData, rooms[roomid])
      }
      else{
        console.log('user \'' + usrname +'\' do NOT has a roomid, or the roomid is not found in rooms. roomid='+ roomid)
      }
      socket.emit('connected', sendData);//{me:xx [, roomInfo ]  }
    }
  }
  else{
    console.log('new user coming!')
  }

  socket.on('disconnect', ()=>{
    console.log('user disconnected');
  });

  function SendErrorToExitRoom(errmsg){
    socket.emit('onExitRoom', {err: errmsg})
  }
  function SendErrorToStartNextRound(errmsg){
    socket.emit('onStartNextRound', {err: errmsg})
  }

  //房主重开一把
  socket.on('onStartNextRound', data => {
    let roomid = data.roomID;
    if (!roomid || !rooms[roomid]){
        errmsg = `[onStartNextRound]cannot get room ID(${roomid}), or no this room is found in rooms`
        SendErrorToStartNextRound(errmsg)
        return;
    }

    //房间改为ready to play状态、清除大家的分数
    rooms[roomid].players.forEach(player=>{
      player.total = 0;
      player.roundScores = [];
    })
    rooms[roomid].gameStatus = 'ReadyToPlay';

    io.to(roomid).emit('onStartNextRound', rooms[roomid])
  })

  //离开房间
  socket.on('onExitRoom', data=>{
      //data={who: whoIsGonnaLeave, roomid: roomID}
      let who = data.who, roomid = data.roomid;
      let errmsg = '';
      if (!who){
        errmsg = '[onExitRoom]cannot get who is gonna to leave'
        SendErrorToExitRoom(errmsg)
        return;
      }
      if (!roomid){
        errmsg = `[onExitRoom]cannot get which room ID he(${who}) is gonna to leave`
        SendErrorToExitRoom(errmsg)
        return;
      }
      if (!rooms[roomid]){
        errmsg = `[onExitRoom]the room user ${who} gonna to leave is not found in rooms.`
        SendErrorToExitRoom(errmsg)
        return;
      }

      //trying to leave...
      console.log(`[onExitRoom]user ${who} is gonna leave room(room ID=${roomid})...`)
      socket.leave(roomid, err => {
        if (err){
          let errmsg = `[onExitRoom]socket.leave error. user: ${who}, roomid: ${roomid}, err: ${err}`;
          socket.emit('onExitRoom', {err: errmsg})
          return;
        }
        console.log(`[onExitRoom]user ${who} leaved. (room ID=${roomid})`)

        let players = rooms[roomid].players.filter(player => player.name != who)
        rooms[roomid].players = players;
  
        //console.log('players still in room count: ' + players.length)
        //console.log('current room owner: ' + rooms[roomid].owner)
        //如果离开的是房主，则指定第一个玩家为新房主
        if (0 < players.length && who == rooms[roomid].owner){
          rooms[roomid].owner = players[0].name;
          console.log(`[onExitRoom]room owner changes to ${players[0].name}`)
        }
        
        //emit to all except the one who is leaving
        socket.to(roomid).emit('onExitRoom', {whoLeaved: who, roominfo: rooms[roomid]})

        //emit to himself that every thing is ok
        socket.emit('onExitRoom', {msg: 'OK'})
      })
  })
  

  //创建房间
  socket.on('onCreateRoom', function(data){
    var newRoomID = NEXT_ROOM_ID++;
    socket.join(newRoomID, (err) => {
      if (err){
        console.log('[onCreateRoom]join room#'+newRoomID+' error:' + err);
        socket.emit('onCreateRoom', {err: 'join room#'+newRoomID+' error!'})
      }
      else{
        var houseOwner = data.houseOwner,
        totalScore = data.totalScore;
        rooms[newRoomID] = {
          roomID: newRoomID,
          gameStatus: 'ReadyToPlay',
          owner: houseOwner,
          totalScore: totalScore,
          players: [{name:houseOwner, total:0, roundScores:[]}]
        };

        //set cookie: usrid
        console.log('set new user(room creator):' + houseOwner + '(usrid=' + NEXT_USR_ID+')')
        users[NEXT_USR_ID++] = {name:houseOwner, roomid:newRoomID};

        socket.emit('onCreateRoom', {roominfo: rooms[newRoomID], usrid: NEXT_USR_ID-1});
      }
    })
  });

  //玩家加入房间
  socket.on('onJoinRoom', function(data){
    let roomID = data.roomID,
    player = data.player;
    if (!rooms[roomID]){
        console.log('[onJoinRoom]Room #'+ roomID+' NOT found!');
        socket.emit('onJoinRoom', {err: 'Faild to join room! Because cannot find the given room: ' + roomID, roomID:roomID});
        return;
    }
    if (rooms[roomID].gameStatus != 'ReadyToPlay'){
        let errmsg = '[onJoinRoom]Room #'+ roomID+' is not in ready-to-play, cannot join into it! Status: ' + rooms[roomID].gameStatus;
        console.log(errmsg);
        socket.emit('onJoinRoom', {err: errmsg, roomID:roomID});
        return;
    }

    socket.join(roomID, err => {
      if (err){
        console.log('[onJoinRoom]join room error:' + err);
        socket.emit('onJoinRoom', {err: 'join room#'+roomID+' error!', roomID:roomID})
      }
      else{
        //add player
        rooms[roomID].players.push({name:player, total:0, roundScores:[]})

        //notify others in this room
        //socket.to(roomID).emit('onJoinRoom', '玩家 ['+ player +'] 加入了房间！')

        //set cookie: usrid
        console.log('set new user(player joining):' + player + '(usrid=' + NEXT_USR_ID+')')
        users[NEXT_USR_ID++] = {name:player, roomid:roomID};

        //notify all in this room
        //不应该告诉其他人加入者的usrid，TODO
        io.to(roomID).emit('onJoinRoom', {whoJoinedIn:player, usrid: NEXT_USR_ID-1,...rooms[roomID]})
      }
    })
  });

  //房主开始游戏
  socket.on('onGameStarted', function(data){
    console.log('[onGameStarted]fired, data: ')
    console.log(data)

    let roomID = data.roomID,
      totalScore = data.totalScore;
    if (!rooms[roomID]){
        let errmsg = '[onGameStarted]Cannot start game! You are not in Room #'+ roomID+' !';
        console.log(errmsg)
        socket.emit('onGameStarted', {err: errmsg, roomID:roomID});
        return;
    }
    if (isNaN(totalScore) || totalScore < 1){
      totalScore = 500
      console.log('[onGameStarted]Room owner ['+rooms[roomID].owner+'] didnot set a total score, automatically fall back to 500!')
    }

    rooms[roomID].gameStatus = 'InPlaying';
    rooms[roomID].totalScore = totalScore;

    //通知所有玩家游戏开始
    io.to(roomID).emit('onGameStarted', rooms[roomID])
  })

  //房主添加一轮分数
  socket.on('onAddNewRoundScore', function(data){
    console.log('[onAddNewRoundScore]fired, data: ')
    console.log(data)

    let roomID = data.roomID,
      you = data.me,
      roundScore = data.newRoundScore;
    if (!rooms[roomID]){
        let errmsg = '[onAddNewRoundScore]Cannot add new round score! You are not in Room #'+ roomID+' !';
        console.log(errmsg)
        socket.emit('onAddNewRoundScore', {err: errmsg, roomID:roomID});
        return;
    }
    if (rooms[roomID].owner != you){
        let errmsg = '[onAddNewRoundScore]You have not permission to add new round score since you are not the room owner!';
        console.log(errmsg)
        socket.emit('onAddNewRoundScore', {err: errmsg, roomID:roomID});
        return;
    }
    if (!Array.isArray(roundScore) || roundScore.length != rooms[roomID].players.length){
        let errmsg = '[onAddNewRoundScore]Invalid new round score submitted! Its length should be as same as the player numbers.';
        console.log(errmsg)
        socket.emit('onAddNewRoundScore', {err: errmsg, roomID:roomID});
        return;
    }
    if (rooms[roomID].gameStatus != 'InPlaying'){
      let errmsg = '[onAddNewRoundScore]Game room is not in appropriate status. Current status: ' + rooms[roomID].gameStatus;
      console.log(errmsg)
      socket.emit('onAddNewRoundScore', {err:errmsg, roomID:roomID})
      return;
    }

    //累加新一轮的分数
    let boom = {name:'',score: rooms[roomID].totalScore-1};
    roundScore.forEach((score, i) => {
      rooms[roomID].players[i].roundScores.push(score)
      rooms[roomID].players[i].total += score
      if (rooms[roomID].totalScore <= rooms[roomID].players[i].total){
        rooms[roomID].gameStatus = 'GameOver'
        if (boom.score < rooms[roomID].players[i].total){
          boom.score = rooms[roomID].players[i].total;
          boom.player = rooms[roomID].players[i].name;
        }
      }
    })

    //通知所有玩家，进行中游戏的变化
    io.to(roomID).emit('onAddNewRoundScore', {boom:boom, ...rooms[roomID]})
  })

})

app.get('/uno.html', (req, res, next) => {
      var options = {
      root: __dirname
    }
  res.sendFile('uno.html', options, err => {
    if (err){
      console.log('error occurred:'+err)
      next(err)//by passing control to the next route
    }
  })
})

http.listen(PORT, HOST, () => {
  console.log(`UNO Server is running on http://${HOST}:${PORT} ...`);
});