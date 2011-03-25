/**********************************************************/
/* Error Manager -- Well, there's always failures, right? */
/**********************************************************/

function ErrorManager(semanticDealer){
  this.semanticDealer = semanticDealer;
}

ErrorManager.prototype.print = function(errorMessage){
  this.semanticDealer.stop();
  $('.waiting').remove();
  clearInterface();
  $('body').trigger('error', errorMessage);
}
ErrorManager.prototype.notice = function(noticeMessage){
  this.semanticDealer.stop();
  $('.waiting').remove();
  $('body').trigger('notice', noticeMessage);
}
