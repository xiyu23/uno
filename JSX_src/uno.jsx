class UnoClient extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            gameStatus: !props.gameStatus ? '' : props.gameStatus,
            me: '',
            roomID: '',
            owner: '',
            totalScore: 500,
            players: []
        }

        this.setUserConnectedEvent();
        this.setJoinRoomEvent();
        this.setGameStartedEvent();
        this.setAddNewRoundScoreEvent();
        this.setPlayerExitEvent();
        this.setStartNextRoundEvent();
    }

    clearState(){
        this.setState({
            gameStatus: '',
            me: '',
            roomID: '',
            owner: '',
            totalScore: 500,
            players: []
        })
    }

    //刷新浏览器，服务器接收到新连接有cookie，证明是一个有效的会话
    setUserConnectedEvent(){
        let that = this;
        socket.on('connected', function(msg){
            console.log('recover connecting to server successfully!')
            console.log('you are back to the room now!')
            console.log(msg)
            //{me:xx }

            that.setState(msg)
        });
    }

    setJoinRoomEvent(){
        let that = this;
        socket.on('onJoinRoom', function(msg){
            console.log('[onJoinRoom]pushed from server, msg:')
            console.log(JSON.stringify(msg))

            if (msg.err){
                console.log(msg.err)
                return;
            }
            
            //update data, reflect the view
            console.log('玩家 ['+ msg.whoJoinedIn + '(' + msg.usrid + ')' +'] 加入了房间！')

            that.handleCreateOrJoinRoom({flag:'join',...msg});
        });
    }

    setGameStartedEvent(){
        let that = this
        socket.on('onGameStarted', function(msg){
            console.log('[onGameStarted]pushed from server, msg:')
            console.log(JSON.stringify(msg))

            if (msg.err){
                console.log(msg.err)
                return;
            }
            
            //update data, reflect the view
            let gameStartMsg = '房主 ['+ msg.owner +'] 开始了游戏！总分设定为 ' + msg.totalScore+'，看谁先爆炸哈！';
            console.log(gameStartMsg)

            that.setState(msg)
        });
    }

    setAddNewRoundScoreEvent(){
        let that = this;
        socket.on('onAddNewRoundScore', function(msg){
            console.log('[onAddNewRoundScore]pushed from server, msg:')
            console.log(JSON.stringify(msg))

            if (msg.err){
                console.log(msg.err)
                return;
            }
            
            //update data, reflect the view
            //log something~

            //增加分数可能导致游戏结束
            if (msg.gameStatus == 'GameOver'){
                //额外有boom字段，表示谁先爆炸了
                console.log('游戏结束！恭喜玩家 ['+msg.boom.player+'] 率先爆炸！分数：' + msg.boom.score)
            }

            that.setState(msg)
        });
    }

    setPlayerExitEvent(){
        let that = this;
        socket.on('onExitRoom', function(msg){
            if (msg.err){
                console.log(msg.err)
                return;
            }
            
            //leaving person
            if (msg.msg == 'OK'){
                //清除所有状态
                that.clearState();
                return;
            }

            //others that are still in the room
            //msg = {whoLeaved: xx, roominfo: xx}
            console.log('player ' + msg.whoLeaved + ' leaves game')
            that.setState(msg.roominfo)
        })
    }

    //再开一把
    setStartNextRoundEvent(){
        
        let that = this;
        socket.on('onStartNextRound', msg => {
            if (msg.err){
                console.log(msg.err)
                return;
            }

            console.log('start next round is allowed.')

            that.setState(msg)

            
        })
        
    }

    handleMakeChoice(flag){
        if (flag == 'create'){
            flag = 'creating'
        }
        else if (flag == 'join'){
            flag ='joining'
        }
        else{
            console.log('invalid flag:' + flag)
            return;
        }

        this.setState({gameStatus: flag})
    }

    handleCreateOrJoinRoom(param){
        if (param.flag == 'cancel'){
            this.setState({gameStatus:''})
            return;
        }
        if (param.flag != 'create' && param.flag != 'join'){
            console.log('invalid flag:'+param.flag)
            return;
        }
        // 不论是创建还是加'入，得到的都是房间信息
        // roomID: '2'
        // gameStatus: 'ReadyToPlay',
        // owner: houseOwner,
        // totalScore: totalScore,
        // players: [{name:houseOwner, total:0, roundScores:[]}]

        // 以及服务器额外添加的身份标识，me
        // me: 'A' (可能是创建人，也可能是加入者)
        if (param.flag == 'create'){
            delete param.flag
            this.setState({me:param.owner, ...param})

            //tricky code，创建ok和加入ok，则移出主页背景
            //$('body').removeClass('uno-theme bg')
        }
        else{
            delete param.flag
            let whoJoinedIn = param.whoJoinedIn
            let playerID = param.usrid
            delete param.whoJoinedIn
            delete param.usrid
            if (!this.state.me){
                //玩家本人加入游戏
                console.log('玩家加入游戏，设置cookie: usrid='+playerID)
                //set cookie
                document.cookie = 'usrid='+playerID+';max-age=60';

                this.setState({me:whoJoinedIn, ...param})

                //tricky code，创建ok和加入ok，则移出主页背景
                //$('body').removeClass('uno-theme bg')
            }
            else{
                //其他玩家加入了游戏
                console.log('其他玩家加入游戏')
                console.log(param)
                this.setState({...param})
            }
        }
    }

    //确认添加新一轮分数
    handleAddRoundScore(roundScore){
        //修改total, push一个值到roundScores
        socket.emit('onAddNewRoundScore', {roomID:this.state.roomID, me:this.state.me, newRoundScore:roundScore})
    }

    //游戏开始
    handleStartGame(){
        let val = this.state.totalScore;
        if (!val){
            console.log('请设定Total score!')
            return;
        }
        val = parseInt(val.toString().replace(/^\s+/g, '').replace(/\s+$/, ''));
        if (isNaN(val) || val < 1){
            val = 500;
            console.log('illegal total score, defauts it to 500')
        }
        this.setState({totalScore:val})

        console.log('Game started! Total score now has been set to: ' + val)
        socket.emit('onGameStarted', {roomID:this.state.roomID, totalScore:val})
    }

    //再开一把
    hanldStartNextGame(){
        console.log('next round is on the fly, please wait...')
        socket.emit('onStartNextRound', {roomID:this.state.roomID})
    }

    //总分修改
    handleTotalScoreChange(totalScore){
        this.setState({totalScore:totalScore})
    }

    //玩家离开房间
    handleExitRoom(){
        //delete cookie
        document.cookie = 'usrid=;max-age=0';
        let whoIsGonnaLeave = this.state.me;
        if (!whoIsGonnaLeave){
            console.log('Exit room error: cannot get who is gonna leave')
            return;
        }
        let roomID = this.state.roomID;
        if (!roomID){
            console.log('Exit room error: cannot get roomID to leave');
            return;
        }
        console.log('Exit room: ' + whoIsGonnaLeave + ' is gonna leave this room(room ID='+ roomID +')...')
        socket.emit('onExitRoom', {who: whoIsGonnaLeave, roomid: roomID})
    }
    render(){
        console.log('updated')
        let notReadyToPlay = !this.state.gameStatus || this.state.gameStatus == 'creating' || this.state.gameStatus == 'joining';
        return (
            <React.Fragment>
            <h2 className={notReadyToPlay ? 'uno-title' : 'uno-title-inplaying'}>UNO 计分板 v0.3</h2>
            <div className={notReadyToPlay ? 'uno-theme bg' : ''}>
                {
                    !this.state.gameStatus && 
                    <MakeChoice handleMakeChoice={this.handleMakeChoice.bind(this)}/>
                }

                {
                    this.state.gameStatus == 'creating' &&
                    <CreateRome handleCreateOrJoinRoom={this.handleCreateOrJoinRoom.bind(this)}/>
                }

                {
                    this.state.gameStatus == 'joining' &&
                    <JoinRoom handleCreateOrJoinRoom={this.handleCreateOrJoinRoom.bind(this)}/>
                }

                {
                    (this.state.gameStatus == 'ReadyToPlay' || this.state.gameStatus == 'InPlaying' || this.state.gameStatus == 'GameOver') &&
                    <GameBody gameStatus={this.state.gameStatus} 
                            owner={this.state.owner} 
                            totalScore={this.state.totalScore}
                            players={this.state.players}
                            playerCount={this.state.players.length}
                            me={this.state.me}
                            roomID={this.state.roomID}
                            handleAddRoundScore={this.handleAddRoundScore.bind(this)}
                            handleStartGame={this.handleStartGame.bind(this)}
                            hanldStartNextGame={this.hanldStartNextGame.bind(this)}
                            handleTotalScoreChange={this.handleTotalScoreChange.bind(this)}
                            handleExitRoom={this.handleExitRoom.bind(this)}
                            />
                }
            </div>
            </React.Fragment>
        );
    }
}

//游戏主体界面: 显示总分、房主、玩家及分数
class GameBody extends React.Component{
    constructor(props){
        super(props);
    }

    handleTotalScoreChange(e){
        this.props.handleTotalScoreChange(e.target.value)
    }

    handleStartGameClick(){
        this.props.handleStartGame()
    }

    handleStartNextRoundClick(){
        this.props.hanldStartNextGame()
    }
    

    handleAddRoundScoreClick(newRoundScore){
        this.props.handleAddRoundScore(newRoundScore)
    }

    handleExitRoomClick(){
        this.props.handleExitRoom()
    }

    render(){
        // players:[
        //     {name:A, total: 23, roundScores:[21,0,2]},
        //     {name:B, total: 2, roundScores:[1,1,0]}
        // ]
        let playerNames = [];
        let roundScores = [];//每轮玩家的分数
        let totalScore = [];//每个玩家的总分
        for (let i = 0; i < this.props.players[0].roundScores.length; i++){
            roundScores.push([])
        }
        this.props.players.forEach(player=>{
            playerNames.push(player.name)
            player.roundScores.forEach((score,i)=>{
                roundScores[i].push(score)
            })
            totalScore.push(player.total)
        })

        console.log('打印GameBody信息:')
        console.log(playerNames)
        console.log(roundScores)
        console.log(totalScore)

        //playerNames=[A,B]
        //roundScores=[[21,1], [0,1], [2,0]]
        //totalScore=[23,2]
        return (
            <div className='game-body'>
                <div><button type='button' onClick={this.handleExitRoomClick.bind(this)}>退出房间</button></div>
                <div className='uno-header'>
                    <div>
                        <label>Total Score:</label>
                        <input type='number' title='' value={this.props.totalScore} disabled={this.props.owner != this.props.me || this.props.gameStatus != 'ReadyToPlay'} 
                        onChange={this.handleTotalScoreChange.bind(this)} className='totalScore'
                        />
                    </div>

                    <div>
                        <label>房主(<span className='room-id'>ID:{this.props.roomID}</span>):</label>
                        <label>{this.props.owner}</label>
                    </div>
                </div>

                <table>
                    <PlayerNameRow playerNames={playerNames} owner={this.props.owner}/>
                    <ScoreBody gameStatus={this.props.gameStatus}
                    owner={this.props.owner} 
                    me={this.props.me}
                    playerCount={this.props.playerCount} 
                    roundScores={roundScores} 
                    totalScore={totalScore}
                    limitScore={this.props.totalScore} 
                    handleAddRoundScoreClick={this.handleAddRoundScoreClick.bind(this)}
                    />
                     
                </table>

                { this.props.gameStatus == 'ReadyToPlay' && this.props.owner == this.props.me && <div className='start-game'><button type='button' onClick={this.handleStartGameClick.bind(this)}>开始游戏</button></div> }

                { this.props.gameStatus == 'GameOver' && this.props.owner == this.props.me && <div className='start-game new-round'><button type='button' onClick={this.handleStartNextRoundClick.bind(this)}>再开一把</button></div> }
                
            </div>
        )
    }
}

function PlayerNameRow(props){
    const items = props.playerNames.map((name, i)=>{
        return <PlayerNameCell name={name} key={i} isOwner={name == props.owner ? true : false} />
    })
    return (
        <thead><tr>{items}</tr></thead>
    )
}

function GetUsrAvtar(usrname){
    if (!usrname){
        return '';
    }
    if (-1 < usrname.indexOf('梦') || usrname == '吴梦' || -1 < usrname.indexOf('芦苇') || -1 < usrname.indexOf('会思想')){
        return 'wm01'
    }
    if (/htt|doublehtt|黄婷婷|ppt|PPT/.test(usrname)){
        return 'htt01'
    }
    if (/小菜庞|勇|庞子勇/.test(usrname)){
        return 'yg01'
    }
    if (/兰|周连兰|连兰|diligent|Diligentlan|diligentlan/.test(usrname)){
        return 'zll01'
    }
    return 'hy01'
}

function PlayerNameCell(props){
    //根据不同昵称，显示其图片，fallback为无图片，仅名字
    
    let classname = '';
    if (props.isOwner){
        classname = 'owner';
    }
    else{
        classname = GetUsrAvtar(props.name) + ' bg'
    }
    return (
        <th className={classname}>{props.name}</th>
    );
}

function ScoreBody(props){
    const items = props.roundScores.map((roundScore, i) => {
        return <ScoreRow roundScore={roundScore} key={i}/>
    })
    return (
    <tbody>
        {items}

        {props.gameStatus=='InPlaying' && props.me == props.owner &&
        <ScoreInputRow  gameStatus={props.gameStatus}
                        owner={props.owner}
                        me={props.me}
                        playerCount={props.playerCount}
                        handleScoreChange={props.handleScoreChange}
                        handleAddRoundScoreClick={props.handleAddRoundScoreClick}/>}

        {(props.gameStatus=='InPlaying' || props.gameStatus=='GameOver') && <CurrentTotalScoreRow totalScore={props.totalScore} limitScore={props.limitScore} />}
    </tbody>
    )
        
}

class ScoreInputRow extends React.Component{
    constructor(props){
        super(props)

        let newRoundScore = [];
        for (let i = 0; i < this.props.playerCount; i++){
            newRoundScore.push('')
        }

        this.state = {
            newRoundScore: newRoundScore
        }
    }
    
    //确认点击后，才将input的状态上报给父组件（回调父组件的函数）
    handleAddRoundScoreClick(){
        console.log('上报并添加本轮分数中...')
        if (!Array.isArray(this.state.newRoundScore)){
            console.log('bad newRoundScore, ignore add new round score')
            return;
        }

        let newRoundScore = [];
        for (let i = 0; i < this.state.newRoundScore.length; i++){
            let score = parseInt(this.state.newRoundScore[i])
            if (isNaN(score) || score < 0){
                score = 0
            }
            newRoundScore[i] = score;
        }
        this.props.handleAddRoundScoreClick(newRoundScore)

        this.setState(prevState=>{
            //新一轮分数清空，供下次填写
            let newRoundScore = prevState.newRoundScore.map(()=>{
                return ''
            });
            return {newRoundScore:newRoundScore}
        })
    }

    //val: the score owner typed
    //index: index of input 
    handleScoreChange(val, index){
        let newRoundScore = this.state.newRoundScore.map((score, i)=>{
            if (i != index){
                return score
            }
            return val
        })
        this.setState({newRoundScore:newRoundScore})
    }

    render(){
        let groups = [];
        for (let i = 0; i < this.state.newRoundScore.length; i++){
            groups.push(<ScoreInputCell handleScoreChange={this.handleScoreChange.bind(this)} index={i} key={i} score={this.state.newRoundScore[i]}/>)
        }
        
        return (
            <React.Fragment>
                <tr className='input-row'>{groups}</tr>
                { this.props.gameStatus == 'InPlaying' && 
                      this.props.owner == this.props.me &&
                      
                    <tr className='add-button-row'><td colSpan={this.state.newRoundScore.length}><button type='button' className='add-round-score' onClick={this.handleAddRoundScoreClick.bind(this)}>确认添加本轮分数</button></td></tr>
                }
            </React.Fragment>
        )
    
    }
}

class ScoreInputCell extends React.Component{
    constructor(props){
        super(props)
        // let val = parseInt(this.props.score)
        // if (isNaN(val) || score < 0){
        //     val = ''
        // }
        // this.state = {
        //     score: val
        // }
    }

    handleScoreChange(e){
        let val = e.target.value.replace(/^\s+/g, '').replace(/\s+$/, '');
        val = parseInt(val);
        if (isNaN(val) || val < 0){
            val = '';
        }
        // this.setState({
        //     score: val
        // })

        console.log('score changes to: ' + val)
        this.props.handleScoreChange(val, this.props.index)
    }

    render(){ 
        return (
            <td><input type='number' value={this.props.score} onChange={this.handleScoreChange.bind(this)}/></td>
        )
    }
}

function CurrentTotalScoreRow(props){
    return (
        <ScoreRow roundScore={props.totalScore} totalRowClass='total-score-row' totalScore={props.limitScore}/>
    )
}

//How to tell the ABOVE vs FOLLOWING ?
// class CurrentTotalScoreRow extends React.Component{
//     constructor(props){
//         super(props)
//         this.state = {
//             totalScore: props.totalScore
//         }
//     }
//     render(){
//     return (
//         <ScoreRow roundScore={this.state.totalScore} />
//     )
//     }
// }


function ScoreRow(props){
    const items = props.roundScore.map((score, i) => {
     return <ScoreCell score={score} key={i} totalScore={props.totalScore}/>
    })
    return (
        <tr className={!!props.totalRowClass ? props.totalRowClass : ''}>{items}</tr>
    )
}

function ScoreCell(props){
    return (
        <td className={(!!props.totalScore && props.score >= props.totalScore) ? 'boom-score' : ''}>{props.score}</td>
    );
}


class MakeChoice extends React.Component{
    constructor(props){
        super(props);
    }

    handleClick(flag){
        this.props.handleMakeChoice(flag);
    }

    render(){
        return (
            <div className='make-choice'>
                <button type='button' className='create-room' onClick={this.handleClick.bind(this, 'create')}>创建房间</button>
                <button type='button' className='join-room' onClick={this.handleClick.bind(this, 'join')}>加入房间</button>
            </div>
        );
    }
}

class CreateRome extends React.Component{
    constructor(props){
        super(props)

        let score = parseInt(this.props.limitScore)
        if(isNaN(score) || score < 1){
            score = 500;
        }

        this.state = {
            me: (!this.props.me ? '' : this.props.me),
            limitScore: score
        }
    }

    handleNickNameChange(e){
        let val = e.target.value.replace(/^\s+/g, '').replace(/\s+$/, '');
        if (!val){
            val = '';   
        }
        this.setState({
            me: val
        })
    }

    handleScoreChange(e){
        let val = e.target.value.replace(/^\s+/g, '').replace(/\s+$/, '');
        this.setState({
            limitScore: val
        })
    }

    handleClick(flag){
        if (flag == 'cancel'){
            this.props.handleCreateOrJoinRoom({flag:flag})
            return;
        }

        if (!this.state.me){
            console.log('please input your nickname before creating a room.')
            return;
        }

        if (isNaN(this.state.limitScore) || this.state.limitScore < 1){
            console.log('please input a legal total score before creating a room.')
            return;
        }

        //TODO: send request to server for creating a room
        socket.emit('onCreateRoom', { houseOwner:this.state.me, totalScore: this.state.limitScore});

        let that = this;
        socket.on('onCreateRoom', function(msg){
            console.log('[onCreateRoom]pushed from server, msg:')
            console.log(JSON.stringify(msg))
            
            if (msg.err){
                //when room create failed
                console.log(msg.err)
                return;
            }
            //when room created ok:
            //update data, reflect the view
            console.log('创建房间成功，需刷新房主界面...')
            let roominfo = msg.roominfo;

            //set cookie
            console.log('设置房主cookie: usrid='+msg.usrid)
            document.cookie = 'usrid='+msg.usrid+';max-age=60';

            that.props.handleCreateOrJoinRoom({flag:'create', ...roominfo});
        });
    }

    render(){
        return (
            <div className='creating-dialog'>
                <p>
                    <label>昵称:</label><input type='text' value={!this.state.me ? '' : this.state.me} onChange={this.handleNickNameChange.bind(this)} maxLength='10'/>
                </p>
                <p>
                    <label>上限分数:</label><input type='number' title='' value={!this.state.limitScore ? '' : this.state.limitScore} onChange={this.handleScoreChange.bind(this)}/>
                </p>
                <div>
                    <button type='button' onClick={this.handleClick.bind(this, 'create')}>确认创建</button>
                    <button type='button' onClick={this.handleClick.bind(this, 'cancel')}>取消</button>
                </div>
            </div>
        )
    }
}

class JoinRoom extends React.Component{
    constructor(props){
        super(props)

        this.state = {
            me: (!this.props.me ? '' : this.props.me),
            roomID: ''
        }
    }

    handleNickNameChange(e){
        let val = e.target.value.replace(/^\s+/g, '').replace(/\s+$/, '');
        if (!val){
            val = '';   
        }
        this.setState({
            me: val
        })
    }

    handleRoomIDChange(e){
        let val = e.target.value.replace(/^\s+/g, '').replace(/\s+$/, '');
        if (!val){
            val = '';   
        }
        this.setState({
            roomID: val
        })
    }

    handleClick(flag){
        if (flag == 'cancel'){
            this.props.handleCreateOrJoinRoom({flag:flag})
            return;
        }
        if (!this.state.me){
            console.log('请输入昵称~')
            return;
        }
        socket.emit('onJoinRoom', { roomID:this.state.roomID, player: this.state.me});
    }

    render(){
        return (
            <div className='joining-dialog'>
                <p>
                    <label>房间ID:</label><input type='number' title='' value={!this.state.roomID ? '' : this.state.roomID} onChange={this.handleRoomIDChange.bind(this)}/>
                </p>
                <p>
                    <label>昵称:</label><input type='text' value={!this.state.me ? '' : this.state.me} onChange={this.handleNickNameChange.bind(this)} maxLength='10' />
                </p>
                <div>
                    <button type='button' onClick={this.handleClick.bind(this, 'join')}>确认加入</button>
                    <button type='button' onClick={this.handleClick.bind(this, 'cancel')}>取消</button>
                </div>
            </div>
        )
    }
}

class ErrorPrompt extends React.Component{
    constructor(props){
        super(props);
    }
    render(){
        return (
            <div>哈哈这里是错误消息，应该放在底部哈：{this.props.errmsg}</div>
        )
    }
}

let unoClient =  <UnoClient/>;
ReactDOM.render(
    unoClient,
    document.getElementById('divUNO')
);
