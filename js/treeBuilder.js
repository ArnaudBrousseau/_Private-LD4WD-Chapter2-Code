/**************************************/
/* TreeBuilder -- let's build a tree! */
/**************************************/

function TreeBuilder(filmName, dataFetcher) {
  this.root = filmName;
  this.dataFetcher = dataFetcher;
  this.content = {};
  this.simpleTree = {};
  this.progress = 0;
  this.activity = 'Starting block';
  this.artist = {};
}

TreeBuilder.prototype.start = function(startUrl) {
  var requestId = this.dataFetcher.addToQueue(
      startUrl, 
      'jsonp', 
      ['result','properties','/film/film/soundtrack', 'values'],
      'soundtracks'
  );
  this.content[this.filmName] = requestId;
  this.dataFetcher.start();
}

TreeBuilder.prototype.stop = function() {
  this.dataFetcher.stop();
  this.dataFetcher.clear();
}

TreeBuilder.prototype.integrate = function(requestId) {
  var result = this.retrieve(requestId);
  switch (result.type) {
     
      case 'soundtracks':
        var insertionPoint = this.findInsertionPoint(requestId);
        insertionPoint[result.type] = result.data[0];
        
        //delete the insertion point token
        delete this.content[this.filmName];
        
        this.progress = 25;
        this.activity = 'Searching for realease-group links...';     
        break;
        
      case 'release-group link':
        var insertionPoint = this.findInsertionPoint(requestId);
        var musicBrainzFound = false;
        for (var i=0; i<result.data.length; i++) {
          if (result.data[i].text == 'MusicBrainz') {
            musicBrainzFound = true;
            insertionPoint[result.type] = result.data[i];
          }
        }
        
        if (musicBrainzFound) {
          //delete the insertion point token
          delete this.content.soundtracks.url; 
          this.progress = 50;
          this.activity = 'Searching a MusicBrainz release...';

        } else {
          //Throw error
          var errorMessage = '<p>Ooops! No MusicBrainz release '
                         +'for this soundtrack.'
                         + 'Sorry about that, especially if that was your '
                         + 'favorite movie.<br>'
                         + 'Good news is you can help build a better web by '
                         + 'contributing to MusicBrainz. Get started'
                         + ' <a href="http://musicbrainz.org/doc/'
                         + 'How_To_Contribute">here</a>'
                         + ', don\'t be shy :)</p>';
          errorManager.print(errorMessage);
        }
        break;
        
      case 'release-group':
        var insertionPoint = this.findInsertionPoint(requestId);
        if (result.data[0]) { // jauery..isArray()
          //Several release-group -- e.g., Fight Club
          delete result.data[0]['text-representation'];
          insertionPoint[result.type] = result.data[0];
        } else {
          //Only one release-group -- e.g., The Big Lebowsky
          delete result.data['text-representation'];
          insertionPoint[result.type] = result.data;
        }
        //delete the insertion point token
        delete this.content.soundtracks['release-group link'].url;
        
        this.progress = 75;
        this.activity = 'Yay! Found it! Sucking data...';
        break;
        
      case 'tracks':
        var insertionPoint = this.findInsertionPoint(requestId);
        //Formatting duration of songs & removing (possible) artist data
        for (var i=0; i<result.data.track.length; i++) {
          var duration = result.data.track[i].duration;
          var min = Math.floor((duration/1000)/60); //Duration is in millisec
          var sec = Math.floor( Math.floor(duration/1000) - min*60);
          var humanReadableDuration = min + "' " + sec + "s";
          result.data.track[i].duration = humanReadableDuration;
          
          if (result.data.track[i].artist) {
            var artistName = result.data.track[i].artist.name;
            delete result.data.track[i].artist;
            result.data.track[i].artistName = artistName;
          }
        }
        
        insertionPoint[result.type] = result.data.track;
        console.log('inserting tracks');
        console.log(result.data);
        
        //little bit of cleaning here -- data we don't need to print
        delete this
            .content
            .soundtracks['release-group link']['release-group']
            .id;
        delete this
            .content
            .soundtracks['release-group link']['release-group']
            .asin;
        delete this
            .content
            .soundtracks['release-group link']['release-group']['track-list'];
        
        this.dataFetcher.stop();
        this.progress = 100; //Yay, we are done! 
        this.activity = 'Tracks found! Will now sleep for a while... :)';        
        break;
      
      case 'artist':
        //case where we want to retrieve the artist of a particular track
        this.artist =  result.data;
        break;
      
      case 'related artists':
        //case where we want to retrieve the related artists
        this.artist.related =  result.data;
        break;

      default:
        var errorMessage = '<p>Ooops! Looks like the application'
                       + 'wasn\'t able to integrate the data of type '
                       + result.type;
        errorManager.print(errorMessage);
  }
  console.log('Insertion of data done for request #' + requestId);
  return true;
}

TreeBuilder.prototype.retrieve = function(requestId) {
  console.log("retrieving result #" + requestId);
  var results = this.dataFetcher.results;
  console.log(results[requestId]);
  return results[requestId];
}

TreeBuilder.prototype.findInsertionPoint = function(requestId) {
  var self = this;
  var insertionPoint = null;
  (function recursiveTreeLoop(obj) {
    for (var key in obj) {
      if (typeof obj[key] == 'object') {
        recursiveTreeLoop(obj[key]);
      } else {
        if (obj[key] == requestId) {
          insertionPoint = obj;
        }
      }
    }
  })(self.content);
  return insertionPoint;  
}

TreeBuilder.prototype.computeSimpleTree = function() {
  this.simpleTree['tracks'] = this.content
      .soundtracks['release-group link']['release-group']
      .tracks;
}

