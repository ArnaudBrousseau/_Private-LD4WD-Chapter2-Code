/**************************************************************/
/* SemanticDealer -- let's deal with linked data and semantic */
/**************************************************************/

function SemanticDealer(filmName, startUrl){
	this.filmName = filmName;
	this.startUrl = startUrl;
	this.dataFetcher = new DataFetcher();
	this.treeBuilder = new TreeBuilder(filmName, this.dataFetcher);
}
SemanticDealer.prototype.start = function(){
	this.treeBuilder.start(this.startUrl);
}

SemanticDealer.prototype.getTracks = function(){
	
}

SemanticDealer.prototype.getArtists = function(trackId){
	//function to fetch the artist + related artist, via LastFM
	console.log('hello from the getArtists method');
	$('body').trigger('waitingForArtists');
	var source = 'http://mm.musicbrainz.org/ws/1/track/' + trackId + '?type=xml&inc=artist';
	var requestId = this.dataFetcher.addToQueue(source, 'xml', ['query','results','metadata','track','artist'], 'artist');
	this.dataFetcher.start();
}

SemanticDealer.prototype.getRelatedArtists = function(artistId){
	console.log('Will now retrieve the related artists to the artist #' + artistId);
	//var safeArtistName = artistName.replace(/\s/g, "+"); //replace the spaces with '+'
	var source = 'http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&mbid=' + artistId + '&api_key=b25b959554ed76058ac220b7b2e0a026';
	var requestId = this.dataFetcher.addToQueue(source, 'xml', ['query','results','lfm','similarartists','artist'], 'related artists')
}

SemanticDealer.prototype.handleData = function(requestId){
	//Once data is fetched, it triggers this function
	this.treeBuilder.integrate(requestId);
	if(this.treeBuilder.progress != 100){
		console.log('will procede to next step');
		$('body').trigger('loading', [this.treeBuilder.progress, this.treeBuilder.activity]);
		this.nextStep();
	}
	else if(this.treeBuilder.artist.related && this.treeBuilder.artist.id){
		console.log('Will trigger artistArrived');
		$('body').trigger('artistsArrived', this.treeBuilder.artist);
	}
	else if(this.treeBuilder.artist.id){
		this.getRelatedArtists(this.treeBuilder.artist.id);
	} else {
		$('body').trigger('upToDate');
	}
}

SemanticDealer.prototype.nextStep = function(){
	var self = this;
	(function recursiveTreeLoop(obj) {
		for (var key in obj) {
	    if (typeof(obj[key]) == 'object') {
	      recursiveTreeLoop(obj[key]);
	    } else {
	      var stepData = self.match(obj[key]);
				if(stepData){
					//If we have found a match, let's fire a request
					var requestId = self.treeBuilder.dataFetcher.addToQueue(stepData.urlToFetch, stepData.dataType, stepData.accessPath, stepData.type);
					obj[key] = requestId;
				}
	    }
	  }
	})(self.treeBuilder.content);
}

SemanticDealer.prototype.match = function(dataToMatch){
	
	var semanticMatching = {
		// %% = placeholder for matched IDs
		'^http:\/\/www\.freebase\.com\/view\/en\/(.{1,})$': 
				['http://www.freebase.com/experimental/topic/standard/en/%%','jsonp',['result','webpage'],'release-group link'],
		'^http:\/\/www\.freebase\.com\/view\/m\/([0-9a-z]{1,})$': 
				['http://www.freebase.com/experimental/topic/standard/m/%%','jsonp',['result','webpage'], 'release-group link'],
		'^http:\/\/mb-redir\.freebaseapps\.com\/redir\/([0-9a-z-]{1,})$':
				['http://mm.musicbrainz.org/ws/1/release-group/%%.html?type=xml&inc=releases','xml',['query','results','metadata','release-group','release-list','release'], 'release-group'],
		'^([0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12})$':
				['http://mm.musicbrainz.org/ws/1/release/%%?type=xml&inc=tracks','xml',['query','results','metadata','release','track-list'], 'tracks']
	};
	for (var key in semanticMatching){
		//check Regex and make follow the right direction
		var regex = new RegExp(key,'g');
		var match = regex.exec(dataToMatch);
		if(match){ 
			var urlToFetch = semanticMatching[key][0].replace('%%',match[1]);
			var dataType = semanticMatching[key][1];
			var accessPath = semanticMatching[key][2];
			var type = semanticMatching[key][3]
			return {'urlToFetch': urlToFetch, 'dataType': dataType, 'accessPath': accessPath, 'type': type};
		}
	}
	return false;
}