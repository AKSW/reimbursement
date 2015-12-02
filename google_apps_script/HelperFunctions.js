/*****************************************************
******************************************************
******          Helper Functions           ***********
******************************************************
******************************************************

******************************************************
in this file are more or less generic functions which are
not really domain specific and do not contain any
business logic

******************************************************/


function extractIdFromDownloadUrl(url)
{
  var urlPat  = /\/d\/([^\/]*)\//;
  var urlPat2  = /\?id\=([^\/\&]*)/;
  var match = urlPat.exec(url);
  var id;
  if (match)
  {
      id = match[1];
      return id;
  }
  else
  {
    match = urlPat2.exec(url);
    if (match) {
      id = match[1];
      return id;
    }
  }
  return null;
}

function extractUsernameFromMail(email)
{
  var mailPat = /([^\@]*)\@/;
  var match   = mailPat.exec(email);
  var name;
  if (match)
  {
      name = match[1];
  }
  return name;
}


/**
*  return the folder 
*
*  @param {String} folder_name 
*  @return {Folder} the Folder
*
**/
function getFolder(folder_name,parent_folder) 
{
  var folder;
  if(!parent_folder) 
    folders = DriveApp.getFoldersByName(folder_name);
  else
    folders = parent_folder.getFoldersByName(folder_name);
  var folder;
  if (folders.hasNext())
  {
    folder = folders.next(); 
  }
  else
    Logger.log("Could not find the following folder: "+folder_name);
  return folder;
}


function createFolderIfNotExists(parent,child) {
  var p = getFolder(parent);
  var folders = p.getFoldersByName(child);
  if (!folders.hasNext())
    return p.createFolder(child);
  else
    return folders.next();
}

function createFolderAndMoveOldFolderIfExists(parent,child) {
  var p = getFolder(parent);
  var folders = p.getFoldersByName(child);
  if (!folders.hasNext())
    return p.createFolder(child);
  else
  {
    var travel = folders.next();
    var old_folder = createFolderIfNotExists(travel,'old');
    moveFiles(travel,old_folder);
    moveFolders(travel,old_folder);
    return travel;
  }
}

function moveFiles(source_folder, dest_folder) {
  
  var files = source_folder.getFiles();
 
  while (files.hasNext()) {
 
    var file = files.next();
    dest_folder.addFile(file);
    source_folder.removeFile(file);
 
  }
}
function moveFolders(source_folder, dest_folder) {
  
  var folders = source_folder.getFolders();
  
  while (folders.hasNext()) {
    
    var folder = folders.next();
    if (folder.getId()==dest_folder.getId())
       continue;
    dest_folder.addFolder(folder);
    source_folder.removeFolder(folder);
    
  }
}


function getDate() {
  var d = new Date();
  var date = Utilities.formatDate(d,"CET","yyyy-MM-dd");
  return date;
}


function getTime() {
  var d = new Date();
  var time = Utilities.formatDate(d,"CET","HH:mm");
  return time;
}

function formatDate(date)
{
  return Utilities.formatDate(date,"CET","yyyy-MM-dd");
}

function formatDateDR(date)
{
  return Utilities.formatDate(date,"CET","yyMMdd");
}


function createDateTimeFromGerman(date,timestring)
{
  var dmy = timestring.split(":");
  var d = createDateFromGerman(date);
  d.setHours(dmy[0]); d.setMinutes(dmy[1]);
  return d;
}

function createTimeFromGerman(time)
{
  var dmy = time.split(":");
  var d = new Date();d.setTime(0);
  d.setHours(dmy[0]); d.setMinutes(dmy[1]);
  return d;
}

function createDateFromGerman(date)
{
  var dmy = date.split(".");
  var d = new Date(dmy[2], dmy[1] - 1, dmy[0]);
  return d;
}

/**
*  return the value of an element in an xml document
*
*  @param {String} path xpath like query, supported query types: "" root element , "level1/level2" single child paths from root , "level1@foo" attributes, "level[1]" choose a specific sibling
*  @return {String} the value of the requested element
**/
function getDataFromXMLDoc(path,xmlDoc,silent) {
  
  silent = typeof silent !== 'undefined' ? silent : false;
  var tags = path.split("/");
 try {
  var xelement = xmlDoc.getRootElement(); 

  for(var i in tags) {
    var tag = tags[i];

     var index = tag.indexOf("[");
     
     if(tag=="")
       return xelement.getText();
     if(index != -1) //found child node sibling selector like 'foo[1]'
     {
       var val = parseInt(tag[index+1]);
          tag = tag.substring(0,index);
          xelement = xelement.getElements(tag)[val-1];
     } 
     else           // other selectors
     {
          if((splits=tag.split('@')).length>1)  // found attribute selector like 'foo@attribute'
          {
             xelement = xelement.getChild(splits[0]); // get element 'foo'
             if (xelement==null)
               if(!silent) Logger.log("XML Parsing Issue: Could not find Element '"+tag+"' in XML-Document for requested path: '"+path+"'");
             xelement = xelement.getAttribute(splits[1]); //get 'attribute'
             if (xelement==null)
               if(!silent) Logger.log("XML Parsing Issue: Could not find Attribute '"+splits[1]+"' of XML-Element '"+splits[0]+"' for requested path: "+path+"'\nCHECK YOUR XML!");
             return xelement.getValue();
          }
          else                                  // found single child element selector like 'foo'
          {                                 
             xelement = xelement.getChild(tag);
             if (xelement==null)
               if(!silent) Logger.log("XML Parsing Issue: Could not find Element '"+tag+"' in XML-Document for requested path: '"+path+"'\nCHECK YOUR XML!");
          }
     }
 
  }
  } catch (e)
  {
    if(!silent) logException(e);
  }
  return xelement.getText();
}


function logException(e)
{
  Logger.log("'"+e.name+"'-Exception was thrown in '"+e.fileName+":"+e.lineNumber+"' because of '"+e.message+"'\nSTACKTRACE:\n"+e.stack);
}
