var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var UnoClient = function (_React$Component) {
    _inherits(UnoClient, _React$Component);

    function UnoClient(props) {
        _classCallCheck(this, UnoClient);

        var _this = _possibleConstructorReturn(this, (UnoClient.__proto__ || Object.getPrototypeOf(UnoClient)).call(this, props));

        _this.state = {
            gameStatus: !props.gameStatus ? '' : props.gameStatus,
            me: '',
            roomID: '',
            owner: '',
            totalScore: 500,
            players: []
        };

        _this.setUserConnectedEvent();
        _this.setJoinRoomEvent();
        _this.setGameStartedEvent();
        _this.setAddNewRoundScoreEvent();
        return _this;
    }

    //刷新浏览器，服务器接收到新连接有cookie，证明是一个有效的会话


    _createClass(UnoClient, [{
        key: 'setUserConnectedEvent',
        value: function setUserConnectedEvent() {
            var that = this;
            socket.on('connected', function (msg) {
                console.log('recover connecting to server successfully!');
                console.log('you are back to the room now!');
                console.log(msg);
                //{me:xx }

                that.setState(msg);
            });
        }
    }, {
        key: 'setJoinRoomEvent',
        value: function setJoinRoomEvent() {
            var that = this;
            socket.on('onJoinRoom', function (msg) {
                console.log('[onJoinRoom]pushed from server, msg:');
                console.log(JSON.stringify(msg));

                if (msg.err) {
                    console.log(msg.err);
                    return;
                }

                //update data, reflect the view
                console.log('玩家 [' + msg.whoJoinedIn + '(' + msg.usrid + ')' + '] 加入了房间！');

                that.handleCreateOrJoinRoom(Object.assign({ flag: 'join' }, msg));
            });
        }
    }, {
        key: 'setGameStartedEvent',
        value: function setGameStartedEvent() {
            var that = this;
            socket.on('onGameStarted', function (msg) {
                console.log('[onGameStarted]pushed from server, msg:');
                console.log(JSON.stringify(msg));

                if (msg.err) {
                    console.log(msg.err);
                    return;
                }

                //update data, reflect the view
                var gameStartMsg = '房主 [' + msg.owner + '] 开始了游戏！总分设定为 ' + msg.totalScore + '，看谁先爆炸哈！';
                console.log(gameStartMsg);

                that.setState(msg);
            });
        }
    }, {
        key: 'setAddNewRoundScoreEvent',
        value: function setAddNewRoundScoreEvent() {
            var that = this;
            socket.on('onAddNewRoundScore', function (msg) {
                console.log('[onAddNewRoundScore]pushed from server, msg:');
                console.log(JSON.stringify(msg));

                if (msg.err) {
                    console.log(msg.err);
                    return;
                }

                //update data, reflect the view
                //log something~

                //增加分数可能导致游戏结束
                if (msg.gameStatus == 'GameOver') {
                    //额外有boom字段，表示谁先爆炸了
                    console.log('游戏结束！恭喜玩家 [' + msg.boom.player + '] 率先爆炸！分数：' + msg.boom.score);
                }

                that.setState(msg);
            });
        }
    }, {
        key: 'handleMakeChoice',
        value: function handleMakeChoice(flag) {
            if (flag == 'create') {
                flag = 'creating';
            } else if (flag == 'join') {
                flag = 'joining';
            } else {
                console.log('invalid flag:' + flag);
                return;
            }

            this.setState({ gameStatus: flag });
        }
    }, {
        key: 'handleCreateOrJoinRoom',
        value: function handleCreateOrJoinRoom(param) {
            if (param.flag == 'cancel') {
                this.setState({ gameStatus: '' });
                return;
            }
            if (param.flag != 'create' && param.flag != 'join') {
                console.log('invalid flag:' + param.flag);
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
            if (param.flag == 'create') {
                delete param.flag;
                this.setState(Object.assign({ me: param.owner }, param));

                //tricky code，创建ok和加入ok，则移出主页背景
                //$('body').removeClass('uno-theme bg')
            } else {
                delete param.flag;
                var whoJoinedIn = param.whoJoinedIn;
                var playerID = param.usrid;
                delete param.whoJoinedIn;
                delete param.usrid;
                if (!this.state.me) {
                    //玩家本人加入游戏
                    console.log('玩家加入游戏，设置cookie: usrid=' + playerID);
                    //set cookie
                    document.cookie = 'usrid=' + playerID + ';max-age=60';

                    this.setState(Object.assign({ me: whoJoinedIn }, param));

                    //tricky code，创建ok和加入ok，则移出主页背景
                    //$('body').removeClass('uno-theme bg')
                } else {
                    //其他玩家加入了游戏
                    console.log('其他玩家加入游戏');
                    console.log(param);
                    this.setState(Object.assign({}, param));
                }
            }
        }

        //确认添加新一轮分数

    }, {
        key: 'handleAddRoundScore',
        value: function handleAddRoundScore(roundScore) {
            //修改total, push一个值到roundScores
            socket.emit('onAddNewRoundScore', { roomID: this.state.roomID, me: this.state.me, newRoundScore: roundScore });
        }

        //游戏开始

    }, {
        key: 'handleStartGame',
        value: function handleStartGame() {
            var val = this.state.totalScore;
            if (!val) {
                console.log('请设定Total score!');
                return;
            }
            val = parseInt(val.toString().replace(/^\s+/g, '').replace(/\s+$/, ''));
            if (isNaN(val) || val < 1) {
                val = 500;
                console.log('illegal total score, defauts it to 500');
            }
            this.setState({ totalScore: val });

            console.log('Game started! Total score now has been set to: ' + val);
            socket.emit('onGameStarted', { roomID: this.state.roomID, totalScore: val });
        }

        //总分修改

    }, {
        key: 'handleTotalScoreChange',
        value: function handleTotalScoreChange(totalScore) {
            this.setState({ totalScore: totalScore });
        }
    }, {
        key: 'render',
        value: function render() {
            console.log('updated');
            var notReadyToPlay = !this.state.gameStatus || this.state.gameStatus == 'creating' || this.state.gameStatus == 'joining';
            return React.createElement(
                React.Fragment,
                null,
                React.createElement(
                    'h2',
                    { className: notReadyToPlay ? 'uno-title' : 'uno-title-inplaying' },
                    'UNO \u8BA1\u5206\u677F v0.3'
                ),
                React.createElement(
                    'div',
                    { className: notReadyToPlay ? 'uno-theme bg' : '' },
                    !this.state.gameStatus && React.createElement(MakeChoice, { handleMakeChoice: this.handleMakeChoice.bind(this) }),
                    this.state.gameStatus == 'creating' && React.createElement(CreateRome, { handleCreateOrJoinRoom: this.handleCreateOrJoinRoom.bind(this) }),
                    this.state.gameStatus == 'joining' && React.createElement(JoinRoom, { handleCreateOrJoinRoom: this.handleCreateOrJoinRoom.bind(this) }),
                    (this.state.gameStatus == 'ReadyToPlay' || this.state.gameStatus == 'InPlaying' || this.state.gameStatus == 'GameOver') && React.createElement(GameBody, { gameStatus: this.state.gameStatus,
                        owner: this.state.owner,
                        totalScore: this.state.totalScore,
                        players: this.state.players,
                        playerCount: this.state.players.length,
                        me: this.state.me,
                        roomID: this.state.roomID,
                        handleAddRoundScore: this.handleAddRoundScore.bind(this),
                        handleStartGame: this.handleStartGame.bind(this),
                        handleTotalScoreChange: this.handleTotalScoreChange.bind(this)
                    })
                )
            );
        }
    }]);

    return UnoClient;
}(React.Component);

//游戏主体界面: 显示总分、房主、玩家及分数


var GameBody = function (_React$Component2) {
    _inherits(GameBody, _React$Component2);

    function GameBody(props) {
        _classCallCheck(this, GameBody);

        return _possibleConstructorReturn(this, (GameBody.__proto__ || Object.getPrototypeOf(GameBody)).call(this, props));
    }

    _createClass(GameBody, [{
        key: 'handleTotalScoreChange',
        value: function handleTotalScoreChange(e) {
            this.props.handleTotalScoreChange(e.target.value);
        }
    }, {
        key: 'handleStartGameClick',
        value: function handleStartGameClick() {
            this.props.handleStartGame();
        }
    }, {
        key: 'handleAddRoundScoreClick',
        value: function handleAddRoundScoreClick(newRoundScore) {
            this.props.handleAddRoundScore(newRoundScore);
        }
    }, {
        key: 'render',
        value: function render() {
            // players:[
            //     {name:A, total: 23, roundScores:[21,0,2]},
            //     {name:B, total: 2, roundScores:[1,1,0]}
            // ]
            var playerNames = [];
            var roundScores = []; //每轮玩家的分数
            var totalScore = []; //每个玩家的总分
            for (var i = 0; i < this.props.players[0].roundScores.length; i++) {
                roundScores.push([]);
            }
            this.props.players.forEach(function (player) {
                playerNames.push(player.name);
                player.roundScores.forEach(function (score, i) {
                    roundScores[i].push(score);
                });
                totalScore.push(player.total);
            });

            console.log('打印GameBody信息:');
            console.log(playerNames);
            console.log(roundScores);
            console.log(totalScore);

            //playerNames=[A,B]
            //roundScores=[[21,1], [0,1], [2,0]]
            //totalScore=[23,2]
            return React.createElement(
                'div',
                { className: 'game-body' },
                React.createElement(
                    'div',
                    { className: 'uno-header' },
                    React.createElement(
                        'div',
                        null,
                        React.createElement(
                            'label',
                            null,
                            'Total Score:'
                        ),
                        React.createElement('input', { type: 'number', title: '', value: this.props.totalScore, disabled: this.props.owner != this.props.me || this.props.gameStatus != 'ReadyToPlay',
                            onChange: this.handleTotalScoreChange.bind(this), className: 'totalScore'
                        })
                    ),
                    React.createElement(
                        'div',
                        null,
                        React.createElement(
                            'label',
                            null,
                            '\u623F\u4E3B(',
                            React.createElement(
                                'span',
                                { className: 'room-id' },
                                'ID:',
                                this.props.roomID
                            ),
                            '):'
                        ),
                        React.createElement(
                            'label',
                            null,
                            this.props.owner
                        )
                    )
                ),
                React.createElement(
                    'table',
                    null,
                    React.createElement(PlayerNameRow, { playerNames: playerNames, owner: this.props.owner }),
                    React.createElement(ScoreBody, { gameStatus: this.props.gameStatus,
                        owner: this.props.owner,
                        me: this.props.me,
                        playerCount: this.props.playerCount,
                        roundScores: roundScores,
                        totalScore: totalScore,
                        limitScore: this.props.totalScore,
                        handleAddRoundScoreClick: this.handleAddRoundScoreClick.bind(this)
                    })
                ),
                this.props.gameStatus == 'ReadyToPlay' && this.props.owner == this.props.me && React.createElement(
                    'div',
                    { className: 'start-game' },
                    React.createElement(
                        'button',
                        { type: 'button', onClick: this.handleStartGameClick.bind(this) },
                        '\u5F00\u59CB\u6E38\u620F'
                    )
                )
            );
        }
    }]);

    return GameBody;
}(React.Component);

function PlayerNameRow(props) {
    var items = props.playerNames.map(function (name, i) {
        return React.createElement(PlayerNameCell, { name: name, key: i, isOwner: name == props.owner ? true : false });
    });
    return React.createElement(
        'thead',
        null,
        React.createElement(
            'tr',
            null,
            items
        )
    );
}

function GetUsrAvtar(usrname) {
    if (!usrname) {
        return '';
    }
    if (-1 < usrname.indexOf('梦') || usrname == '吴梦' || -1 < usrname.indexOf('芦苇') || -1 < usrname.indexOf('会思想')) {
        return 'wm01';
    }
    if (/htt|doublehtt|黄婷婷|ppt|PPT/.test(usrname)) {
        return 'htt01';
    }
    if (/小菜庞|勇|庞子勇/.test(usrname)) {
        return 'yg01';
    }
    if (/兰|周连兰|连兰|diligent|Diligentlan|diligentlan/.test(usrname)) {
        return 'zll01';
    }
    return 'hy01';
}

function PlayerNameCell(props) {
    //根据不同昵称，显示其图片，fallback为无图片，仅名字

    var classname = '';
    if (props.isOwner) {
        classname = 'owner';
    } else {
        classname = GetUsrAvtar(props.name) + ' bg';
    }
    return React.createElement(
        'th',
        { className: classname },
        props.name
    );
}

function ScoreBody(props) {
    var items = props.roundScores.map(function (roundScore, i) {
        return React.createElement(ScoreRow, { roundScore: roundScore, key: i });
    });
    return React.createElement(
        'tbody',
        null,
        items,
        props.gameStatus == 'InPlaying' && props.me == props.owner && React.createElement(ScoreInputRow, { gameStatus: props.gameStatus,
            owner: props.owner,
            me: props.me,
            playerCount: props.playerCount,
            handleScoreChange: props.handleScoreChange,
            handleAddRoundScoreClick: props.handleAddRoundScoreClick }),
        (props.gameStatus == 'InPlaying' || props.gameStatus == 'GameOver') && React.createElement(CurrentTotalScoreRow, { totalScore: props.totalScore, limitScore: props.limitScore })
    );
}

var ScoreInputRow = function (_React$Component3) {
    _inherits(ScoreInputRow, _React$Component3);

    function ScoreInputRow(props) {
        _classCallCheck(this, ScoreInputRow);

        var _this3 = _possibleConstructorReturn(this, (ScoreInputRow.__proto__ || Object.getPrototypeOf(ScoreInputRow)).call(this, props));

        var newRoundScore = [];
        for (var i = 0; i < _this3.props.playerCount; i++) {
            newRoundScore.push('');
        }

        _this3.state = {
            newRoundScore: newRoundScore
        };
        return _this3;
    }

    //确认点击后，才将input的状态上报给父组件（回调父组件的函数）


    _createClass(ScoreInputRow, [{
        key: 'handleAddRoundScoreClick',
        value: function handleAddRoundScoreClick() {
            console.log('上报并添加本轮分数中...');
            if (!Array.isArray(this.state.newRoundScore)) {
                console.log('bad newRoundScore, ignore add new round score');
                return;
            }

            var newRoundScore = [];
            for (var i = 0; i < this.state.newRoundScore.length; i++) {
                var score = parseInt(this.state.newRoundScore[i]);
                if (isNaN(score) || score < 0) {
                    score = 0;
                }
                newRoundScore[i] = score;
            }
            this.props.handleAddRoundScoreClick(newRoundScore);

            this.setState(function (prevState) {
                //新一轮分数清空，供下次填写
                var newRoundScore = prevState.newRoundScore.map(function () {
                    return '';
                });
                return { newRoundScore: newRoundScore };
            });
        }

        //val: the score owner typed
        //index: index of input 

    }, {
        key: 'handleScoreChange',
        value: function handleScoreChange(val, index) {
            var newRoundScore = this.state.newRoundScore.map(function (score, i) {
                if (i != index) {
                    return score;
                }
                return val;
            });
            this.setState({ newRoundScore: newRoundScore });
        }
    }, {
        key: 'render',
        value: function render() {
            var groups = [];
            for (var i = 0; i < this.state.newRoundScore.length; i++) {
                groups.push(React.createElement(ScoreInputCell, { handleScoreChange: this.handleScoreChange.bind(this), index: i, key: i, score: this.state.newRoundScore[i] }));
            }

            return React.createElement(
                React.Fragment,
                null,
                React.createElement(
                    'tr',
                    { className: 'input-row' },
                    groups
                ),
                this.props.gameStatus == 'InPlaying' && this.props.owner == this.props.me && React.createElement(
                    'tr',
                    { className: 'add-button-row' },
                    React.createElement(
                        'td',
                        { colSpan: this.state.newRoundScore.length },
                        React.createElement(
                            'button',
                            { type: 'button', className: 'add-round-score', onClick: this.handleAddRoundScoreClick.bind(this) },
                            '\u786E\u8BA4\u6DFB\u52A0\u672C\u8F6E\u5206\u6570'
                        )
                    )
                )
            );
        }
    }]);

    return ScoreInputRow;
}(React.Component);

var ScoreInputCell = function (_React$Component4) {
    _inherits(ScoreInputCell, _React$Component4);

    function ScoreInputCell(props) {
        _classCallCheck(this, ScoreInputCell);

        return _possibleConstructorReturn(this, (ScoreInputCell.__proto__ || Object.getPrototypeOf(ScoreInputCell)).call(this, props));
        // let val = parseInt(this.props.score)
        // if (isNaN(val) || score < 0){
        //     val = ''
        // }
        // this.state = {
        //     score: val
        // }
    }

    _createClass(ScoreInputCell, [{
        key: 'handleScoreChange',
        value: function handleScoreChange(e) {
            var val = e.target.value.replace(/^\s+/g, '').replace(/\s+$/, '');
            val = parseInt(val);
            if (isNaN(val) || val < 0) {
                val = '';
            }
            // this.setState({
            //     score: val
            // })

            console.log('score changes to: ' + val);
            this.props.handleScoreChange(val, this.props.index);
        }
    }, {
        key: 'render',
        value: function render() {
            return React.createElement(
                'td',
                null,
                React.createElement('input', { type: 'number', value: this.props.score, onChange: this.handleScoreChange.bind(this) })
            );
        }
    }]);

    return ScoreInputCell;
}(React.Component);

function CurrentTotalScoreRow(props) {
    return React.createElement(ScoreRow, { roundScore: props.totalScore, totalRowClass: 'total-score-row', totalScore: props.limitScore });
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


function ScoreRow(props) {
    var items = props.roundScore.map(function (score, i) {
        return React.createElement(ScoreCell, { score: score, key: i, totalScore: props.totalScore });
    });
    return React.createElement(
        'tr',
        { className: !!props.totalRowClass ? props.totalRowClass : '' },
        items
    );
}

function ScoreCell(props) {
    return React.createElement(
        'td',
        { className: !!props.totalScore && props.score >= props.totalScore ? 'boom-score' : '' },
        props.score
    );
}

var MakeChoice = function (_React$Component5) {
    _inherits(MakeChoice, _React$Component5);

    function MakeChoice(props) {
        _classCallCheck(this, MakeChoice);

        return _possibleConstructorReturn(this, (MakeChoice.__proto__ || Object.getPrototypeOf(MakeChoice)).call(this, props));
    }

    _createClass(MakeChoice, [{
        key: 'handleClick',
        value: function handleClick(flag) {
            this.props.handleMakeChoice(flag);
        }
    }, {
        key: 'render',
        value: function render() {
            return React.createElement(
                'div',
                { className: 'make-choice' },
                React.createElement(
                    'button',
                    { type: 'button', className: 'create-room', onClick: this.handleClick.bind(this, 'create') },
                    '\u521B\u5EFA\u623F\u95F4'
                ),
                React.createElement(
                    'button',
                    { type: 'button', className: 'join-room', onClick: this.handleClick.bind(this, 'join') },
                    '\u52A0\u5165\u623F\u95F4'
                )
            );
        }
    }]);

    return MakeChoice;
}(React.Component);

var CreateRome = function (_React$Component6) {
    _inherits(CreateRome, _React$Component6);

    function CreateRome(props) {
        _classCallCheck(this, CreateRome);

        var _this6 = _possibleConstructorReturn(this, (CreateRome.__proto__ || Object.getPrototypeOf(CreateRome)).call(this, props));

        var score = parseInt(_this6.props.limitScore);
        if (isNaN(score) || score < 1) {
            score = 500;
        }

        _this6.state = {
            me: !_this6.props.me ? '' : _this6.props.me,
            limitScore: score
        };
        return _this6;
    }

    _createClass(CreateRome, [{
        key: 'handleNickNameChange',
        value: function handleNickNameChange(e) {
            var val = e.target.value.replace(/^\s+/g, '').replace(/\s+$/, '');
            if (!val) {
                val = '';
            }
            this.setState({
                me: val
            });
        }
    }, {
        key: 'handleScoreChange',
        value: function handleScoreChange(e) {
            var val = e.target.value.replace(/^\s+/g, '').replace(/\s+$/, '');
            this.setState({
                limitScore: val
            });
        }
    }, {
        key: 'handleClick',
        value: function handleClick(flag) {
            if (flag == 'cancel') {
                this.props.handleCreateOrJoinRoom({ flag: flag });
                return;
            }

            if (!this.state.me) {
                console.log('please input your nickname before creating a room.');
                return;
            }

            if (isNaN(this.state.limitScore) || this.state.limitScore < 1) {
                console.log('please input a legal total score before creating a room.');
                return;
            }

            //TODO: send request to server for creating a room
            socket.emit('onCreateRoom', { houseOwner: this.state.me, totalScore: this.state.limitScore });

            var that = this;
            socket.on('onCreateRoom', function (msg) {
                console.log('[onCreateRoom]pushed from server, msg:');
                console.log(JSON.stringify(msg));

                if (msg.err) {
                    //when room create failed
                    console.log(msg.err);
                    return;
                }
                //when room created ok:
                //update data, reflect the view
                console.log('创建房间成功，需刷新房主界面...');
                var roominfo = msg.roominfo;

                //set cookie
                console.log('设置房主cookie: usrid=' + msg.usrid);
                document.cookie = 'usrid=' + msg.usrid + ';max-age=60';

                that.props.handleCreateOrJoinRoom(Object.assign({ flag: 'create' }, roominfo));
            });
        }
    }, {
        key: 'render',
        value: function render() {
            return React.createElement(
                'div',
                { className: 'creating-dialog' },
                React.createElement(
                    'p',
                    null,
                    React.createElement(
                        'label',
                        null,
                        '\u6635\u79F0:'
                    ),
                    React.createElement('input', { type: 'text', value: !this.state.me ? '' : this.state.me, onChange: this.handleNickNameChange.bind(this), maxLength: '10' })
                ),
                React.createElement(
                    'p',
                    null,
                    React.createElement(
                        'label',
                        null,
                        '\u4E0A\u9650\u5206\u6570:'
                    ),
                    React.createElement('input', { type: 'number', title: '', value: !this.state.limitScore ? '' : this.state.limitScore, onChange: this.handleScoreChange.bind(this) })
                ),
                React.createElement(
                    'div',
                    null,
                    React.createElement(
                        'button',
                        { type: 'button', onClick: this.handleClick.bind(this, 'create') },
                        '\u786E\u8BA4\u521B\u5EFA'
                    ),
                    React.createElement(
                        'button',
                        { type: 'button', onClick: this.handleClick.bind(this, 'cancel') },
                        '\u53D6\u6D88'
                    )
                )
            );
        }
    }]);

    return CreateRome;
}(React.Component);

var JoinRoom = function (_React$Component7) {
    _inherits(JoinRoom, _React$Component7);

    function JoinRoom(props) {
        _classCallCheck(this, JoinRoom);

        var _this7 = _possibleConstructorReturn(this, (JoinRoom.__proto__ || Object.getPrototypeOf(JoinRoom)).call(this, props));

        _this7.state = {
            me: !_this7.props.me ? '' : _this7.props.me,
            roomID: ''
        };
        return _this7;
    }

    _createClass(JoinRoom, [{
        key: 'handleNickNameChange',
        value: function handleNickNameChange(e) {
            var val = e.target.value.replace(/^\s+/g, '').replace(/\s+$/, '');
            if (!val) {
                val = '';
            }
            this.setState({
                me: val
            });
        }
    }, {
        key: 'handleRoomIDChange',
        value: function handleRoomIDChange(e) {
            var val = e.target.value.replace(/^\s+/g, '').replace(/\s+$/, '');
            if (!val) {
                val = '';
            }
            this.setState({
                roomID: val
            });
        }
    }, {
        key: 'handleClick',
        value: function handleClick(flag) {
            if (flag == 'cancel') {
                this.props.handleCreateOrJoinRoom({ flag: flag });
                return;
            }
            if (!this.state.me) {
                console.log('请输入昵称~');
                return;
            }
            socket.emit('onJoinRoom', { roomID: this.state.roomID, player: this.state.me });
        }
    }, {
        key: 'render',
        value: function render() {
            return React.createElement(
                'div',
                { className: 'joining-dialog' },
                React.createElement(
                    'p',
                    null,
                    React.createElement(
                        'label',
                        null,
                        '\u623F\u95F4ID:'
                    ),
                    React.createElement('input', { type: 'number', title: '', value: !this.state.roomID ? '' : this.state.roomID, onChange: this.handleRoomIDChange.bind(this) })
                ),
                React.createElement(
                    'p',
                    null,
                    React.createElement(
                        'label',
                        null,
                        '\u6635\u79F0:'
                    ),
                    React.createElement('input', { type: 'text', value: !this.state.me ? '' : this.state.me, onChange: this.handleNickNameChange.bind(this), maxLength: '10' })
                ),
                React.createElement(
                    'div',
                    null,
                    React.createElement(
                        'button',
                        { type: 'button', onClick: this.handleClick.bind(this, 'join') },
                        '\u786E\u8BA4\u52A0\u5165'
                    ),
                    React.createElement(
                        'button',
                        { type: 'button', onClick: this.handleClick.bind(this, 'cancel') },
                        '\u53D6\u6D88'
                    )
                )
            );
        }
    }]);

    return JoinRoom;
}(React.Component);

var ErrorPrompt = function (_React$Component8) {
    _inherits(ErrorPrompt, _React$Component8);

    function ErrorPrompt(props) {
        _classCallCheck(this, ErrorPrompt);

        return _possibleConstructorReturn(this, (ErrorPrompt.__proto__ || Object.getPrototypeOf(ErrorPrompt)).call(this, props));
    }

    _createClass(ErrorPrompt, [{
        key: 'render',
        value: function render() {
            return React.createElement(
                'div',
                null,
                '\u54C8\u54C8\u8FD9\u91CC\u662F\u9519\u8BEF\u6D88\u606F\uFF0C\u5E94\u8BE5\u653E\u5728\u5E95\u90E8\u54C8\uFF1A',
                this.props.errmsg
            );
        }
    }]);

    return ErrorPrompt;
}(React.Component);

var unoClient = React.createElement(UnoClient, null);
ReactDOM.render(unoClient, document.getElementById('divUNO'));