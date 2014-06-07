Main = function() {

	this.dashboard = new Dashboard(this);
	TicTacToe.setMain(this)
	this.tic = TicTacToe.instance();
	
	
	this.connect = new Connect(this);
	
	this.onSocketDisconnect = function() {
		$("#thickbox").show();
		$("#thickbox-message").text("Disconnected")
	}
	
	this.onSocketConnect = function() {
		this.connect.sendMessage("local PEER_LIST");	
	}
	
	this.onMessageReceived = function(msg) {
		console.log("Received Msg : " + msg)
		
		message = new Message(msg);
		prefix = message.getPrefix();
		sender = message.getSender();
		content = message.getContent();
		console.log("Prefix: [" + prefix + "] Sender: [" + sender.getId() + "] Content: [" + content + "]");
		
		switch (prefix) {
			
			case "DUPLICATE_WEBCLIENT":
				$("#thickbox").show();
				$("#thickbox-message").text("Another webclient logged in, Please use your last client")
				break;
				
			case "PEER_LIST":
				peerObj = JSON.parse(content);
				/*
				for (i in peerObj) {
					found = false;
					for (p in Peer.list) {
						if (p.getId() == peerObj[i]) {
							found = true;
						}
					}
					if (!found) {
						peer = new Peer(peerObj[i]);
						Peer.list[peer.getId()] = peer;
					}
				}*/
				Peer.list = {};
				for (i in peerObj) {
					peer = new Peer(peerObj[i]);
					Peer.list[peer.getId()] = peer;
				}
				
				
				this.dashboard.peerListUpdate();
				Logger.log("Peer list obtained");
				break;

			case "CHAT":
				Chat.getChat(sender).onMessageReceived(content);
				break;
				
			case "NEW_ROOM":
				this.dashboard.onNewRoomBroadcastReceived(sender, content);
				break;				
			case "JOIN_ROOM":
				this.dashboard.addNewBroadcastReply(sender, content);
				break;

			case "ACCEPT_PEER":
				this.dashboard.onAcceptedForRoom(sender, content);
				break;
			case "CAN_WATCH":
				this.dashboard.onCanWatch(sender, content);			
				break;

			case "READY_GAME":
				Logger.log(sender.getName() + " ready for game ");
				break;
			case "START_GAME":
				this.startGame(content);
				break;
		}
	};

	this.gameStarted = false;
	
	this.startGame = function(param) {
		param = param.trim();
		param = JSON.parse(param);
		
		if (!this.gameStarted) {
			
			player1 = param['player1'] =="local" ? new Peer("0_myself") : new Peer(param['player1']);
			player2 = param['player2'] =="local" ? new Peer("0_myself") : new Peer(param['player2']);
			spectators = param['spectators'] =="local" ?  new Peer("0_myself") : new Peer(param['spectators']);

			player1symbol = param['player1Symbol'];
			player2symbol = param['player2Symbol'];
			firstplayer = param['firstPlay'];
			
			if (player1.getName()=="myself") {
				this.tic.setPlayerChar(player1symbol);
				this.tic.setOpponent(player2);
			}

			if (player2.getName()=="myself") {
				this.tic.setPlayerChar(player2symbol);
				this.tic.setOpponent(player1);
			}

			console.log("FirstPlayer: " + firstplayer + " >> " + player1.getName())
			if (firstplayer=="player1" && player1.getName() == "myself" ||
				firstplayer=="player2" && player2.getName() == "myself" ) {
				this.tic.unlockBoard();
			}
			
			this.tic.setTitle(player1.getName() + " vs " + player2.getName());
			this.tic.createBoard();
			this.tic.show();
		}
	}
	
	this.sendChat = function(peer, msg) {
		msg = Message.create(peer, "CHAT", msg);
		this.connect.sendMessage(msg);	
	}
	
	this.createRoom = function(roomName) {
		msg = Message.create("broadcast", "CREATE_ROOM", roomName);
		this.connect.sendMessage(msg);
		this.dashboard.createRoomJoinListenerDOM(roomName);
	}
	
	this.joinRoom = function(peer, roomName) {
		msg = Message.create(peer, "JOIN_ROOM", roomName);
		this.connect.sendMessage(msg);
	}
	
	this.acceptPeer = function(peerId, roomName){
		msg = Message.create(peerId, "ACCEPT_PEER", roomName);
		this.connect.sendMessage(msg);
	}
	
	this.canWatchPeer = function(peerId, roomName){
		msg = Message.create(peerId, "CAN_WATCH", roomName);
		this.connect.sendMessage(msg);
	}
	
	this.readyForGame = function(peer, roomName) {
		msg = Message.create(peer, "READY_GAME", roomName);
		this.connect.sendMessage(msg);
	}
	
	this.sendStartGame = function(roomName) {
		msg = Message.create("broadcast", "START_GAME", roomName);
		this.connect.sendMessage(msg);
	}
	
	this.reBroadcastLastMessage = function() {
		msg = Message.create("brodcast", "REANNOUNCE_CREATED_ROOM", " ");
		this.connect.sendMessage(msg);
	}
	
	this.sendGameMove = function(move) {
		msg = Message.create("local", "TTTS_MOVE", move);
		this.connect.sendMessage(msg);
	}
	
	this.onPlayerMove = function(move) {
		msg = Message.create(peer, "CHAT", msg);
		this.connect.sendMessage(msg);
	}
	
	this.send = function() {
		
	}
	
	that = this
	
	$("#broadcast-btn").click(function(evt){ 
		that.connect.sendMessage("local BROADCAST")
	});
	
	$("#create-room-form-btn").click(function(evt){ 
		that.dashboard.createNewRoomDOM();
	});

	$("#join-room-btn").click(function(evt){
		that.dashboard.joinRoomDOM();
	});	
	
}
Main.self = null;

Main.Instance = function(){
	if (Main.self == null)
		Main.self = new Main();
	return Main.self;
}

m = null;
console.log(m)
$(document).ready(function() {
	m = Main.Instance();
});