/*********************/
/* Utility functions */
/*********************/

var displayWaiting = function(progress, activity){
	$('.waiting').remove();
	$('#movie').val('Loading and searching...').attr('disabled', 'disabled');
	//var img = $('<img/>').attr({'src': 'img/ajax-loader.gif', 'alt': 'ajax loader', 'class': 'waiting'});
	var progress = $('<progress />').attr({'max': '100', 'value': progress}).html(progress + '%');
	var txt = $('<p />').html('<span>' + activity);
	var loadingContainer = $('<div />').addClass('waiting').append(progress).append(txt);
	loadingContainer.insertAfter('form');
}
var removeWaiting = function(){
	$('.waiting').remove();
	$('#movie').val('Finished! Want to try another time? :)').removeAttr('disabled');
}
var clearInterface = function(){
	$('body>span').remove();
}

/****************************/
/* Setup of event listening */
/****************************/

$('#movie').focus(function(){
	//var initialValue = $(this).val();
	$(this).val('');
})
$('body').bind('dataFetched', function(event, requestId){
	console.warn('dataFetched signal catched! Woohoo, my results are ready for request #' + requestId);
	mySemanticDealer.handleData(requestId);
})
$('body').bind('loading', function(event, progress, activity){
	//var progress = mySemanticDealer.treeBuilder.progress;
	//var activity = mySemanticDealer.treeBuilder.activity;
	console.warn('Interface loading, at '+ progress +'%. Current activity: '+ activity);
	displayWaiting(progress, activity);
})
$('body').bind('upToDate', function(event){
	console.warn('Interface up-to-date');
	removeWaiting();
	mySemanticDealer.treeBuilder.computeSimpleTree();
	
	var breadth = 17;
	render(mySemanticDealer.treeBuilder.simpleTree, mySemanticDealer.filmName, breadth);
})
$('body').bind('waitingForArtists', function(event){
	//Let's hide the div and put it in loading phase
	$('.artists').html('').fadeOut();
  var mydiv = $('<div />').addClass('artists').html('<p style="padding-top: 140px">loading...</p>');
  $('body>span').append(mydiv).hide().fadeIn();
})
$('body').bind('artistsArrived', function(event, artist){
	
	var title = $('<h1 />').html(artist.name);
	var paragraph = $('<p />').html('Related Artists (credits to LastFM)');
	var list = $('<ul />');
	
	var limit = artist.related.length;
	if(artist.related.length > 5){ var limit = 5;}
	console.log('limit set to' + limit);
	var imgSrc, artistName, artistUrl; 
	for(var i=1; i<limit; i++){
		artistName = artist.related[i].name;
		imgSrc = artist.related[i].image[0].content;
		artistUrl = artist.related[i].url;
		list.append('<li><a href="http://' + artistUrl + '" title="Go to LastFM page">' + artistName + '</a><img src="' + imgSrc + '"></li>');
	}
	$('.artists').html('').append(title).append(paragraph).append(list);
})
/**********************************************/
/* For testing purpose only -- Keep out folks */
/**********************************************/

$('#stop').click(function(){
	mySemanticDealer.dataFetcher.stop();
});
$('#complexTree').live('click',function(){
	clearInterface();	
	renderGeneric(mySemanticDealer.treeBuilder.content, mySemanticDealer.filmName);
	
	$(this).attr('id', 'simpleTree').html('Simple Tree');
});
$('#simpleTree').live('click',function(){
	clearInterface();	
	render(mySemanticDealer.treeBuilder.simpleTree, mySemanticDealer.filmName);
	
	$(this).attr('id', 'complexTree').html('Complex Tree');
});

/****************************/
/* Autocompletion behaviour */
/****************************/

$('#movie').autocomplete({
	//Thanks to the JQuery UI, let's implement autocompletion
	source: function(request, response) {
		$.ajax({
			//base URL for the Freebase API
			url: 'http://freebase.com/api/service/search?',
			//We want JSON data returned
			dataType: 'jsonp',
			//We force a request stricly restricted to films
			data: { query: request.term, type: '/film/film', type_strict: 'all', limit: 3 },
			success: function(data) {
				response($.map(data.result, function(item) {
					return {
						label: item.name,
						value: 'http://www.freebase.com/experimental/topic/standard' + item.id
					}
				}));
			}
		});
	},
	minLength: 2,
	select: function(event, ui) {
	  //When a option of the list is selected
		if (ui.item) {
			clearInterface();
	    var url = ui.item.value;
	    var name = ui.item.label;
		  console.log("You selected " + name);
		  console.log("Will now try to fetch data about " + url);
			
			mySemanticDealer = new SemanticDealer(name, url);
			displayWaiting(0, 'In the starting blocks. Ready?');
			mySemanticDealer.start();
			
		}
	},
});