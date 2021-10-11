"use strict";
require('dotenv').config();


const http = require('http');
const WebSocketServer = require('websocket').server;
const TranscriptionService = require('./transcription-service');
const express = require('express');
const axios = require('axios');

const wsserver = http.createServer(handleRequest);

const HTTP_SERVER_PORT = 8080;
const app = express();

function log(message, ...args) {
  console.log(new Date(), message, ...args);
}

const mediaws = new WebSocketServer({
  httpServer: wsserver,
  autoAcceptConnections: true,
});

function handleRequest(req,res,next){
    app.use(req,res)
    next()
}

mediaws.on('connect', function(connection) {
  
  new MediaStreamHandler(connection);
});

class MediaStreamHandler {
  constructor(connection) {
    this.metaData = null;
    this.trackHandlers = {};
    connection.on('message', this.processMessage.bind(this));
    connection.on('close', this.close.bind(this));
  }

  processMessage(message){
    const touchpointID = null;
    const inputID = null;
    const to = null;
    const from = null;
    if (message.type === 'utf8') {
      const data = JSON.parse(message.utf8Data);
      
      if (data.event === "start") {
        this.metaData = data.start;
        this.touchpointID = data.start.customParameters['touchpoint'];
        this.inputID = data.start.customParameters['input'];
        this.to = data.start.customParameters['to'];
        this.from = data.start.customParameters['from'];
       
        return this.touchpointID,this.inputID;
      }
      if (data.event !== "media") {
        return;
      }
      const track = data.media.track;
      if (this.trackHandlers[track] === undefined) {

        var messageType = 1;
        
        
        

        
        


        const service = new TranscriptionService();
        
        service.on('transcription', (transcription) => {
                  log(`Transcription (${track}): ${transcription}`);
          
          if ((this.from == `input:a${this.inputID}` && track == "outbound") || (this.from == `input:a${this.touchpointID}` && track == "inbound")) {
            messageType = 0; // Touchpoint utterance
        } else if ((this.from == `input:a${this.inputID}` && track == "inbound") || (this.from == `input:a${this.touchpointID}` && track == "outbound")) {
            messageType = 1;  // Input utterance
        } else {
            messageType = null;
        }
           
        //:- Only uncomment log when you are testing to avoid unnecessary server load!

          //  log(`Touchpoint : ${this.touchpointID} || Input : ${this.inputID} || To: ${this.to} || From: ${this.from} || Message Type: ${messageType}` );
          


      axios.post('https://api.jupita.io/v1/dump', {

        
                     "input_id": this.inputID,
                     "touchpoint_id": this.touchpointID,
                     "message_type": String(messageType),
                     "text": transcription,
                     "isCall" : true,
                     "timestamp": log()
            
      })
      .then(function (response){
        console.log(response);
      })
         
            
     
      });  
        this.trackHandlers[track] = service;

      }
      this.trackHandlers[track].send(data.media.payload);
    } else if (message.type === 'binary') {
      log('Media WS: binary message received (not supported)');
    }

    
  }

  close(){
    

    for (let track of Object.keys(this.trackHandlers)) {
      
      this.trackHandlers[track].close();
    }
  }
}

wsserver.listen(HTTP_SERVER_PORT, function(){
  console.log("Server listening on: http://localhost:%s", HTTP_SERVER_PORT);
});
