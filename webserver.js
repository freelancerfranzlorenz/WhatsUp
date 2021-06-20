/** -----------------------------------------------------------------
 * PROJECT:    WhatsUp
 * AUTHOR:     Franz Lorenz, Kelheim
 * CONTACT:    franzlorenz@web.de
 * ----------------------------------------------------------------*/


// --------------------------------------------
// INCLUDES
// --------------------------------------------
const WebSocket = require( 'ws' );
const http = require( 'http' );
const fs = require( 'fs' );

// --------------------------------------------
// GLOBALS
// --------------------------------------------
const nHttpServerPort = 80;
const nWebsocketPort = 8181;
const sProtocolFile  = "WhatsUp.protocol";

// --------------------------------------------
// HTTP SERVER
// --------------------------------------------
const HttpServer = http.createServer( ( req, res ) => 
{
   res.writeHead( 200 );                                             //write header html
   if( req.url === '/' )                                             //is no explicit website given?
      req.url = '/index.html';                                       // yes, then set default website
   console.log( "load file: " + __dirname + req.url );               //output for the user/debug
   //
   var sData = "";                                                   //initialise data
   try { sData = fs.readFileSync( __dirname + req.url ); }           //read file content
   catch( err ) { sData = "<b>file not found</b>"; }                 //any error - then set content to error message
    res.end( sData );                                                //send data to webclient
}); //const HttpServer...
//
HttpServer.listen( nHttpServerPort );                                //listen on http por
console.log( "HttpServer is running..." );                           //output to user/debug

// --------------------------------------------
// WEBSOCKETSERVER
// --------------------------------------------
const wss = new WebSocket.Server( { port: nWebsocketPort } );        //open websocketserver
wss.on( 'connection',                                                //when connected
   function connection( ws )                                         // then...
   {
      /**
       * This function is called, if message is received
       * from a webclient.
       * @param  sJson     string received from webclient
       */
      ws.on( 'message', function incoming( sJson ) 
      {
         const Data = JSON.parse( sJson );                           //extract json data
         if( typeof( Data["text"] ) === 'string' )                   //text message received from client?
         {
            console.log( "text received" );
            // nothing to change here - the received
            // message can be passed to all clients
         }
         else if( ( typeof( Data["fname"] ) === 'string' ) &&        //received message has filename "fname"
                  ( typeof( Data["fdata"] ) === 'string' )      )    // and filedata "fdata" ?
         {                                                           // yes, then...
            console.log( "file received" );                          // output message to user/debug
            nDataStart = Data["fdata"].indexOf( "base64" ) + 6;      // get begin of the base64 coded data
            let Buff = Buffer.from( Data["fdata"].substr( nDataStart ), 'base64' );    //decode base64 data 
            fs.writeFile( "./file/"+Data["fname"], Buff, ( err ) =>  // write file to local disk
               {                                                     //  any error
                  if( err )                                          //  error occured?
                  {                                                  //   yes, then...
                     console.log( "write file error:'"+err+"'" );    //   output error to user/debug
                     Data = null;                                    //   no data send to webclients
                  }
               } 
            );
            if( null != Data )                                       // anything send back to webclients?
            {                                                        //  yes, then...
               Data["name"] = Data["fname"];                         //  set filename
               Data["link"] = "/file/"+Data["fname"];                //  set link to file
               delete Data["fname"];                                 //  remove original "filename"
               delete Data["fdata"];                                 //  remove original "filedata"
            }
         }
         else                                                        //unknown type of received message
         {                                                           // then...
            Data = null;                                             // do not send any data to webclients
         }
         //
         if( Data != null )                                          //any data send to all webclients?
         {                                                           // yes, then...
            sJson = JSON.stringify( Data );                          // convert Data to json string
            wss.clients.forEach( function each( client )             // set through all available clients
            {                                                        //  then...
               client.send( sJson );                                 //  send json string to each of them
            } );
            sJson += "\n";
            fs.appendFile( sProtocolFile, sJson, 'utf8', (err)=> 
            {
               if( null != err )
               {
                  console.error( "appendFile error '"+err+"'" );
               }
            } );    // add data to protocol
         }
      });   //ws.on( 'message', ... )
      //
      // send all previous command to the client
      // to keep updated
      try 
      {
         const FileData = fs.readFileSync( sProtocolFile, 'utf8' );
         const aLines = FileData.split( /\n/ );
         aLines.forEach( ( sLine ) => 
         {
            ws.send( sLine );
            console.log( sLine );
         } );
      } 
      catch( err ) 
      {
         console.error(err);
      }
   }
); //wss.on( 'connection'...
//
console.log( "WebsocketServer is running..." );                      //output to user/debug
