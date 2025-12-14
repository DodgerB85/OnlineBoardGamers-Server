// No text

document.addEventListener('DOMContentLoaded', function () {
  var i = 0;

  // Update all times to local
  var timeSpans = document.getElementsByClassName('timeToConvertSpan');
  for (i = 0; i < timeSpans.length; i++) {
    /*var localDateTime = new Date(parseInt(timeSpans[i].innerText)).toLocaleString();
    localDateTime = localDateTime.slice(0, -3);
    //localDateTime = localDateTime.replaceAll(',', '');
    localDateTime = localDateTime.replace(/,/g, "");
    timeSpans[i].innerHTML = localDateTime;*/
    //timeSpans[i].innerHTML = new Date(parseInt(timeSpans[i].innerText)).toLocaleString({dateStyle: 'short', timeStyle: 'short'}); 
    //timeSpans[i].innerHTML = new Date(parseInt(timeSpans[i].innerText)).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    let localDateTime = new Date(parseInt(timeSpans[i].innerText)).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'});
    localDateTime = localDateTime.replace(/,/g, "");

    timeSpans[i].innerHTML = localDateTime + "<br/>"
  }

});






