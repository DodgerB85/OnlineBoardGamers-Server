function download(data, filename, type) {
  var file = new Blob([data], { type: type });
  if (window.navigator.msSaveOrOpenBlob) // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  else { // Others
    var a = document.createElement("a"),
      url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}
			//download(JSON.stringify(tab[18], null, 4), 'file.txt', 'txt') // file is filename, and txt is type of file.	

function compressObjectToDB(obj) {
  var step1 = JSON.stringify(obj);
  var step2 = LZString.compressToEncodedURIComponent(step1);
  return step2;
}

function decompressObjectFromDB(str) {
  var step1 = LZString.decompressFromEncodedURIComponent(str);
  var step2 = JSON.parse(step1);
	//	download(JSON.stringify(step2, null, 4), 'file.txt', 'txt') // file is filename, and txt is type of file.	
  return step2;
}


/*function removeItemAll(arr, value) {
  var i = 0;
  while (i < arr.length) {
    if (arr[i] === value) {
      arr.splice(i, 1);
    } else {
      ++i;
    }
  }
  return arr;
}*/

// FInd index
//var index = this.model.players.map(item => item.colour).indexOf(colour);