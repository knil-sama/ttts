
from twisted.internet.protocol import DatagramProtocol, Factory
from twisted.protocols.basic import LineReceiver
from twisted.internet import reactor
from twisted.python import log
import time
from socket import SOL_SOCKET, SO_BROADCAST
from threading import Thread
from patterns import Singleton
from Game import TicTacToe
from Player import AI,AsyncPlayer

from autobahn.twisted.websocket import WebSocketServerProtocol, \
                                       WebSocketServerFactory
                                       
class UDPBroadcaster(DatagramProtocol):
    
    def __init__(self, address, breceiver):
        self.broadcastAddress = address
        self.breceiver = breceiver
        self.broadcastMsg = ""
        self.startBroadcast = False
    
    def setMsgToBroadcast(self, message):
        self.broadcastMsg = message
        self.startBroadcast = True
        print "UDP broadcast started"
        
    def stopBroadcast(self):
        self.startBroadcast = False
        self.broadcastMsg = ""
        print "UDP broadcast stopped" 
        
    def startProtocol(self):
        self.transport.socket.setsockopt(SOL_SOCKET, SO_BROADCAST, True)
        Thread(target=self.doInfiniteBroadcast).start()
        print "UDP protocol initiated, ready for broadcast" 
    
    def doInfiniteBroadcast(self):
        while 1:
            if self.startBroadcast:
                self.transport.write(self.broadcastMsg, self.broadcastAddress)
            time.sleep(2)
 

    def datagramReceived(self, datagram, address):
        if datagram == self.broadcastMsg:
            return
        print 'Datagram received: ', repr(datagram)
        self.breceiver.onBroadcastReceived((datagram, address))

    def getBroadcastListener(self):
        pass


class MyTCPProtocol(LineReceiver):
    def __init__(self):
        self.name = None

    def connectionMade(self):
        self.sendLine("Please connect yourself with your 'CONNECT <yourname>'")
        pass

    def connectionLost(self, reason):
        Network.Instance().removePeer(self.name, self)
        
    def lineReceived(self, line):       
        if "CONNECT" not in line:
            return
                
        space_index = line.find(" ")
        peerName = line[space_index+1:]
        if len(peerName) > 30:
            return
        Network.Instance().addPeer(peerName, self)
        self.peerName = peerName
        self.sendLine("welcome '" + peerName + "', You have been added to my list. There are currently " 
                      + str(len(Network.Instance().getPeers())) + " in my list, Welcome abroad")

class MyTCPProtocolFactory(Factory):
    
    def buildProtocol(self, addr):
        return MyTCPProtocol()
        
    
class MyServerProtocol(WebSocketServerProtocol):

    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))
        Network.Instance().addWebClient(self)

    def onOpen(self):
        print("WebSocket connection open.")

    def onMessage(self, payload, isBinary):
        if isBinary:
            print("Binary message received: {0} bytes".format(len(payload)))
            self.sendMessage(payload, isBinary)
            return
        msg = payload.decode('utf8')
        Network.Instance().treat(self, msg)
        #self.sendMessage(msg, isBinary)
        print("Text message received: {0}".format(payload.decode('utf8')))

    def onClose(self, wasClean, code, reason):
        print("WebSocket connection closed: {0}".format(reason))
        Network.Instance().removeWebClient(self)


@Singleton
class Network:
    
    def __init__(self):
        self.broadcastReceiver = None
        self.broadcaster = None
        self.websocketFactory = None
        self.webconnections = []
        self.peers = []
    
    def setMain(self, main):
        self.main = main

    def addWebClient(self, webclient):
        if webclient not in self.webconnections:
            self.webconnections.append(webclient)
            print "passing webclient"
        self.main.setWebClient(self.webconnections[0])
    
    def removeWebClient(self, webclient):
        if webclient in self.webconnections:
            self.webconnections.remove(webclient)

    def addPeer(self, peer, name):
        if (peer, name) not in self.peers:
            self.peers.append((name, peer))
            print "new peer"+ str((peer, name))

    def removePeer(self, peer, name):
        if (peer, name) in self.peers:
            self.peers.remove((name, peer))
            print("peer removed " + str((peer, name)))           

    def getPeers(self):
        return self.peers

            
    def startNetwork(self):
        self.broadcaster = UDPBroadcaster(("192.168.1.255", 1210), self)
        reactor.listenUDP(1210, self.broadcaster)

        self.websocketFactory = WebSocketServerFactory("ws://localhost:9000", debug = False)
        self.websocketFactory.protocol = MyServerProtocol 
        reactor.listenTCP(9000,self.websocketFactory)
        
        reactor.listenTCP(1210, MyTCPProtocolFactory())
        
        reactor.run()

    def treat(self, peer, msg):
        print msg
        self.main.onWebPeerMessage(peer, msg)
        #return str(len(self.webconnections)) + " peers connected"
        
    #UDP broadcast
    def sendBroadcast(self, msg):
        self.broadcaster.setMsgToBroadcast(msg)    
        pass
    
    def stopBroadcast(self):
        self.broadcaster.stopBroadcast()
    
    def broadcastReceived(self, dtuple):
        print dtuple, " RECEIVED"
            
    #TCP receiver
    def setReceiver(self, receiver):
        pass
    
    #TCP sender
    def sendmsg(self, msg, address):
        pass


class BroadcastListener():

    def __init__(self, main):
        self.main = main

    def onBroadcastReceived(self, dtuple):
        self.main.broadcastReceived(dtuple)
    
    