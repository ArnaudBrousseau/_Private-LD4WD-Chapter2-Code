function LinkedDataApp() {
  
  //Reference to important objects
  this.dealer = {};
  this.errorManager = {};
  
  //Configuration object
  this.config = {
    requestTimePeriod: 2000,
    ajaxTimeout: 10000,
    lastFmApiKey: 'b25b959554ed76058ac220b7b2e0a026',
    url: {
      freebaseSearchService: 
          'http://freebase.com/api/service/search?',
      freebaseStandard: 
          'http://www.freebase.com/experimental/topic/standard', 
      lastFmRelatedArtistsWebService: 
          'http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar'
    }
  }
}

LinkedDataApp.prototype.displayWaiting = function(progress, activity) {
  $('.waiting').remove();
  $('#movie').val('Loading and searching...').attr('disabled', 'disabled');
  var progress = $('<progress />')
                     .attr({'max': '100', 'value': progress})
                     .html(progress + '%');

  var txt = $('<p />').html('<span>' + activity);
  var loadingContainer = $('<div />')
                             .addClass('waiting')
                             .append(progress)
                             .append(txt);

  loadingContainer.insertAfter('form');
}

LinkedDataApp.prototype.removeWaiting = function() {
  $('.waiting').remove();
  $('#movie')
      .attr('placeholder', 'Finished! Want to try another time? :)')
      .val('')
      .removeAttr('disabled');
}

LinkedDataApp.prototype.clearInterface = function() {
  $('body>span').remove();
  $('.error').remove();
}

//That reference will keep track of the app
// e.g. when we want to listen to SVG events
var linkedDataApp = new LinkedDataApp();


/**************************************/
/* Setup of event listening & binding */
/**************************************/

$(document).ready(function() {

  $('body').bind('dataFetched', function(event, requestId) {
    console.log('Results ready for request #' + requestId);
    linkedDataApp.dealer.handleData(requestId);
  })

  $('body').bind('loading', function(event, progress, activity) {
    console.log('Progress: '+ progress +'%. Current activity: '+ activity);
    linkedDataApp.displayWaiting(progress, activity);
  })

  $('body').bind('upToDate', function(event) {
    console.log('Interface up-to-date.Yay!');
    linkedDataApp.removeWaiting();
    linkedDataApp.dealer.treeBuilder.computeSimpleTree();
    var breadth = 17;
    linkedDataApp.render(linkedDataApp.dealer.treeBuilder.simpleTree, 
           linkedDataApp.dealer.filmName, 
           breadth);
  })

  $('body').bind('waitingForArtists', function(event) {
    //Let's hide the div and put it in loading phase
    $('.artists').html('').fadeOut();
    var mydiv = $('<div />')
                    .addClass('artists')
                    .html('<p style="padding-top: 140px">loading...</p>');
    $('body>span').append(mydiv).hide().fadeIn();
  })

  $('body').bind('artistsArrived', function(event, artist) {
    var titleContent = artist.name 
                       + '<a href="#" id="closeArtists">(close)</a>';
    var title = $('<h1 />').html(titleContent);
    var paragraph = $('<p />').html('Related Artists (credits to LastFM)');
    var list = $('<ul />');
  
    var limit = artist.related.length;
    if (artist.related.length>5) { var limit = 5; }
  
    var imgSrc, artistName, artistUrl; 
    for (var i=1; i<limit; i++) { 
      //We begin at 1 cause the first "related" artist is actually the artist...
      artistName = artist.related[i].name;
      imgSrc = artist.related[i].image[0].content;
      artistUrl = artist.related[i].url;
      list.append(
          '<li><a href="http://' 
          + artistUrl 
          + '" title="Go to LastFM page">' 
          + artistName 
          + '</a><img src="' 
          + imgSrc 
          + '"></li>'
      );
    }
    $('.artists').html('').append(title).append(paragraph).append(list);
  })

  $('body').bind('error', function(event, errorMessage) {
    var mydiv = $('<div />').addClass('error').html(errorMessage);
    $('body').append(mydiv);
    $('#movie')
        .val('')
        .attr('placeholder','Wow! Error! Want to try another time?')
        .removeAttr('disabled');
  })
  $('body').bind('notice', function(event, errorMessage) {
    $('.notice').remove();
    var mydiv = $('<div />').addClass('notice').html(errorMessage);
    mydiv.appendTo($('body')).hide().fadeIn(600);
    setTimeout(function(){ $('.notice').fadeOut(2000); },3000);
  })

  $('#stop').click(function() {
    linkedDataApp.dealer.dataFetcher.stop();
  });
  
  $('#complexTree').live('click',function() {
    linkedDataApp.clearInterface();  
    linkedDataApp.renderGeneric(
        linkedDataApp.dealer.treeBuilder.content, 
        linkedDataApp.dealer.filmName
    ); 
    $(this).attr('id', 'simpleTree').html('Simple Tree');
  });
  
  $('#simpleTree').live('click',function() {
    linkedDataApp.clearInterface();  
    linkedDataApp.render(
        linkedDataApp.dealer.treeBuilder.simpleTree, 
        linkedDataApp.dealer.filmName
    );
    $(this).attr('id', 'complexTree').html('Complex Tree');
  });
  
  $('#closeArtists').live('click',function(e) {
    $('.artists').html('').fadeOut();
    linkedDataApp.clearInterface();
    linkedDataApp.render(linkedDataApp.dealer.treeBuilder.simpleTree, linkedDataApp.dealer.filmName);
    return false;
  });

  /****************************/
  /* Autocompletion behaviour */
  /****************************/

  $('#movie').autocomplete({
    //Thanks to the JQuery UI, let's implement autocompletion
    source: function(request, response) {
      $.ajax({
        //base URL for the Freebase API
        url: linkedDataApp.config.url.freebaseSearchService,
        //We want JSON data returned
        dataType: 'jsonp',
        //We force a request stricly restricted to films
        data: { 
            query: request.term, 
            type: '/film/film', 
            type_strict: 'all', 
            limit: 3 
        },
        success: function(data) {
          response($.map(data.result, function(item) {
            return {
              label: item.name,
              value: linkedDataApp.config.url.freebaseStandard + item.id
            }
          }));
        }
      });
    },
    minLength: 2,
    select: function(event, ui) {
      //When a option of the list is selected
      if (ui.item) {
        linkedDataApp.clearInterface();
        var url = ui.item.value;
        var name = ui.item.label;
        console.log("You selected " + name);
        console.log("Will now try to fetch data about " + url);
      
        /* TODO: use var and global closure */
        linkedDataApp.dealer = new SemanticDealer(name, url);
        linkedDataApp.errorManager = new ErrorManager(linkedDataApp.dealer);
        linkedDataApp.clearInterface();
        linkedDataApp.displayWaiting(0, 'In the starting blocks. Ready?');
        linkedDataApp.dealer.start();
      }
    },
  });
  
});