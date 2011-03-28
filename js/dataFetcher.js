/**********************/
/* Data Fetcher class */
/**********************/

function DataFetcher() {
  this.type = null; //variable containing the type of data
  this.lastRequest = new Date().getTime();
  this.queue = []; //To hold the queue of requests
  this.results = {}; //Object to hold the results of the requests 
  this.id = 0; //id of the setInterval() loop
}

DataFetcher.prototype.addToQueue = function(source, dataType, accessPath, type) {
  if (!type) { 
    var type = 'default'; 
  }
  var id = new Date().getTime();
  this.queue.push({
      'id': id,
      'source': source, 
      'dataType': dataType, 
      'accessPath': accessPath, 
      'type': type, 
      timeoutId: 0
  });
  return id;
}

DataFetcher.prototype.start = function() {
  //If the start() method is invoked, let's begin to fire some request
  var self = this;
  if (this.id == 0) {
    this.id = setInterval(function() { 
                self.fireNextRequest(); 
              }, 
              linkedDataApp.config.requestTimePeriod);
  }
}

DataFetcher.prototype.fireNextRequest = function() {
  if (this.queue.length > 0) {
    var nextRequest = this.queue[0];
    if (nextRequest.dataType == 'jsonp') {
      //Set a timeout for the request
      nextRequest.timeoutId = setTimeout(function() {
        var errorMessage = '<p>';
        errorMessage += 'Seems like one of our requests got lost.';
        errorMessage += 'It was a JSONP one. Sorry.<br/>';
        errorMessage += 'Error occured when trying to retrieve a ressource of type ';
        errorMessage += nextRequest.type + ' at address ' + nextRequest.source;
        errorMessage += '</p>';
        if (nextRequest.type == 'artist' || nextRequest.type == 'related artists') {
          linkedDataApp.errorManager.notice(errorMessage);
        } else {
          linkedDataApp.errorManager.print(errorMessage);
        }
      }, linkedDataApp.config.ajaxTimeout);
      console.log('Just set the timeoutId #' + nextRequest.timeoutId);
      //And then, fire the request
      this.fireJsonpRequest(nextRequest);
      
    } else if (nextRequest.dataType == 'xml') {
      nextRequest.timeoutId = setTimeout(function() {
        var errorMessage = '<p>';
        errorMessage += 'Seems like one of our requests got lost.';
        errorMessage += 'It was a XML one. Sorry.<br/>';
        errorMessage += 'Error occured when trying to retrieve a ressource of type ';
        errorMessage += nextRequest.type + ' at address ' + nextRequest.source;
        errorMessage += '</p>';
        if (nextRequest.type == 'artist' || nextRequest.type == 'related artists') {
          linkedDataApp.errorManager.notice(errorMessage);
        } else {
          linkedDataApp.errorManager.print(errorMessage);
        }
      }, linkedDataApp.config.ajaxTimeout);
      //Fire XML request
      this.fireXmlRequest(nextRequest);
      
    } else {
      var errorMessage = '<p>';
      errorMessage += 'Something went wrong.';
      errorMessage += 'There was an attempt to load a ressource which is';
      errorMessage += 'neither XML or JSONP. Gloups.';
      errorMessage += '</p>';
      linkedDataApp.errorManager.print(errorMessage);
      console.error("Fault! Datatype is not jsonp or xml!");
    }
  } else {
    console.log('queue is empty. Nothing to do!');
  } 
}

DataFetcher.prototype.fireJsonpRequest = function(request) {
  var self = this;
  $.ajax({
    url: request.source,
    dataType: 'jsonp',
    timeout: linkedDataApp.config.ajaxTimeout,
    success: function(data) {
      clearTimeout(request.timeoutId);
      self.findAndStore(data, request.accessPath, request.id, request.type);
      console.log('cleared the timeoutId #' + request.timeoutId);
    },
    error: function(jqXHR,msg) {
      var errorMessage = '<p>';
      errorMessage += 'Ooops! Error in JSONP request.';
      errorMessage += 'Happened when requesting a ressource of type ' 
      errorMessage += request.type + ': ' + request.source;
      errorMessage += '<br/> Application responded: "' + msg + '"</p>';
      linkedDataApp.errorManager.print(errorMessage);
      console.log(jqXHR);        
    }
  });
}

DataFetcher.prototype.fireXmlRequest = function(request) {
  var self = this;
  
  //Access-Control-Allow-Origin problem -- Let's use YQL to fetch the data
  encodedUrl = encodeURIComponent(request.source); //URLencoding is done before the parameter passing
  
  //Now, let's build the YQL query
  var YQLQuery = "select%20*%20from%20xml%20where%20url%3D%22" + encodedUrl + "%22";
  var YQLRestQuery = "http://query.yahooapis.com/v1/public/yql?q=" 
                     + YQLQuery 
                     + "&format=json&diagnostics=true&callback=";
  console.log('YQL Query built: ' + YQLRestQuery);
  
  $.ajax({
    url: YQLRestQuery,
    dataType: 'json',
    timeout: linkedDataApp.config.ajaxTimeout,
    success: function(data){
      clearTimeout(request.timeoutId);
      self.findAndStore(data, request.accessPath, request.id, request.type);
      console.log('cleared the timeoutId #' + request.timeoutId);
    },
    error: function(jqXHR,msg) {
      var errorMessage = '<p>';
      errorMessage += 'Ooops! Error in XML request.';
      errorMessage += 'Happened when requesting a ressource of type ' 
      errorMessage += request.type + ': ' + request.source;
      errorMessage += '<br/> Application responded: "' + msg + '"</p>';
      linkedDataApp.errorManager.print(errorMessage);
      console.log(jqXHR);        
    }
  });
}

DataFetcher.prototype.findAndStore = function(data, accessPath, requestId, type) {
  //Stores the useful bits of information in results array
  
  $.each(accessPath, function() {
    //at each iteration, we go down one level.
    if (data[this]) {
      requestedData = data[this];
      data = requestedData;
    } else {
      var errorMessage = '<p>Aouch! Error when requesting a ressource of type '
                         + type 
                         + '.<br/>Data isn\'t available as expected.'
                         + '<br/><a href="">Try again</a>'
                         + ', maybe you\'ll be lucky next time :)</p>';
      if (type == 'artist' || type == 'related artists') {
        linkedDataApp.errorManager.notice(errorMessage);
      } else {
        linkedDataApp.errorManager.print(errorMessage);
      }
      return false; //break the $.each() loop
    }
  });

  //let's store the result
  this.results[requestId] = {
    'data': requestedData, 
    'type': type
  };

  //And delete the item in the queue
  if (this.queue.length > 1) {
    this.queue.splice(0,1);
  } else { this.queue = []; }  

  //trigger of the event to inform interface that new data is ready
  $('body').trigger('dataFetched', requestId);
  return;
}

DataFetcher.prototype.stop = function(){
  clearInterval(this.id);
  this.id = 0;
}

DataFetcher.prototype.clear = function(){
  this.queue = [];
  this.results = [];
}