 function urlParam(name){
  var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
  if (results==null){
     return null;
  }
  else{
     return decodeURI(results[1]) || 0;
  }
}

function showMessage(body, title) {
  var modal = $('.modal');
  var title = title || '';
  modal.find('.modal-title').text(title)
  modal.find('.modal-body p').text(body)
  modal.modal({show: true});
}
$(function() {
  $('.modal').modal({show: false});

  $('form').submit(function(event) {
    event.preventDefault();
    $.ajax({
      type: 'POST',
      url: event.target.action,
      data: $(this).serialize(),
      success: function(data, textStatus) {
        if (data.redirect) {
          // data.redirect contains the string URL to redirect to
          window.location.href = data.redirect;
        } else {
          showMessage(data, 'Success');
        }
      },
      error: function(resp) {
        showMessage(resp.responseText, 'Error');
      },
    });
  });

  var msgBody = urlParam('msgBody');
  var msgTitle = urlParam('msgTitle');
  if (msgBody) {
    showMessage(msgBody, msgTitle);
    if (history.pushState) {
      var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({path:newurl},'',newurl);
    }
  }
});

