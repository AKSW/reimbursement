/*** configs & globals  **/
  var reimb_root                = 'travel reimbursement';    // name of reimbursement root folder   (gets overridden by real folder object in intializeGlobals())
  var users_base_folder         = 'travels by user';                // folder where the travels of each user are stored  (gets overridden by real folder object in intializeGlobals())
  var template_folder           = 'templates';               // name of the folder where the templates are in (gets overridden by real folder object in intializeGlobals())
  var InfAI_template_germany    = 'KOPIE - travel application and reimbursement (germany)'; // reimbursement (gets overridden by real folder object in intializeGlobals())
  var AKSWabsenceCalendar       = 'AKSW Abwesenheiten 2';    // name of the calendar to which absences are added for every travel (gets overridden by real calendar object in intializeGlobals())
  var controlling_table         = 'Controlling';
  var projects_table            = 'Projects Database';

  var xmlDoc                    ; // global for the parsed xml
  var travel_folder             ; // global for the folder of the submitted travel
  var InfAI_doc_germany         ; // global for the copy of the InfAI form for the submitted travel
  var form_data                 ;

/*************************/


function initializeGlobals()
{
  try {
    reimb_root                = getFolder(reimb_root);                     // reimbursement root folder
    users_base_folder         = getFolder(users_base_folder,reimb_root);   // folder where the travels are organized by each user in a separate folder
    template_folder           = getFolder(template_folder,reimb_root);     // folder where the templates are in
    InfAI_template_germany    = template_folder.getFilesByName(InfAI_template_germany).next();   // reimbursement template
    AKSWabsenceCalendar       = CalendarApp.getCalendarsByName('AKSW Abwesenheiten 2').pop();    // the calendar to which absences are added for every travel
    controlling_table         = reimb_root.getFilesByName(controlling_table).next();
  } 
  catch(e) {
    Logger.log('Something went wrong with reading the Travel-Reimbursement Resources!\nYou probably don\'t have the correct rights yet! You need to ask for write permissions for the Google Drive Folder and the Calendar.');
    throw e;
  }
}

function mainStandaloneTest()
{
  //Logger.log(reimb_root);
  xmlDoc = XmlService.parse(users_base_folder.getFilesByName("75f08d1f8ee399f13081a3f59b423d7b.xml").next().getBlob().getDataAsString());
  var InfAI_form = SpreadsheetApp.open(copyTemplateToUserFolder("user"));
  injectXMLIntoSpreadsheet(InfAI_form,xmlDoc);
  addCalendarEntry(xmlDoc);
}




/** main function called from FormProcessing.gs after "submit" click on submit button 
 *
 * @param {Object} theForm filled in Form transformed by Google see https://developers.google.com/apps-script/guides/html/communication#forms
 */
function mainCalledByWebService(form)
{
  initializeGlobals();
  form_data = form;                                                      //make data in form globally available
  var xmlBlob = form.FileToLoad;                                         //get uploaded XML-File
  
  try {
    xmlDoc = XmlService.parse(xmlBlob.getDataAsString());                   //parse the XML-File 
    xmlDoc = xmlNewlineFeedFix();
    var fixed_xml =  XmlService.getRawFormat().format(xmlDoc);
    xmlBlob.setDataFromString(fixed_xml);
    
  } 
  catch(e) {
    Logger.log('Your provided XML-File is corrupt or empty!');
    throw e;
  } 
  
  try {
     copyFilesToUserFolder(xmlBlob);                                        //copy XML-file and templates to a new travel folder of the given user
  }
  catch(e) {
    Logger.log('Something wrent wrong with copying the files to the travel folder within your user folder!\nYou probably don\'t have the correct rights for it yet!');
    throw e;
  }
  
  try {
    var InfAI_form_germany = SpreadsheetApp.open(InfAI_doc_germany);        //open and fill out the InfAI-Forms
    injectXMLIntoSpreadsheet(InfAI_form_germany,xmlDoc);
  }
  catch(e) {
    Logger.log('Something wrent wrong with filling out the InfAI-Templates based on your submitted data!\nCheck your submitted data for missing or incorrect information.');
    throw e;
  }
  
  if (xmlBlob,getDataFromXMLDoc('file_type',xmlDoc)=='reisekostenabrechnung')  //open the Controling table and add the Travel to it
  {
    var controlling_doc = SpreadsheetApp.open(controlling_table);
    var lock = LockService.getScriptLock(); // Get a public lock on this script, because we're about to modify a shared resource.
    lock.waitLock(30000); // Wait for up to 10 seconds for other processes to finish otherwise exception
      try {injectXMLIntoControllingTable(controlling_doc,xmlDoc);}
    finally {lock.releaseLock();} // Release the lock so that other processes can continue. 
    
  }
  
  try { 
    if (xmlBlob,getDataFromXMLDoc('file_type',xmlDoc)=='dienstreiseantrag')
       addCalendarEntry(xmlDoc);                                               //add travel information to AKSW-Absence Calendar
  }
  catch(e) {
    Logger.log('Something wrent wrong with adding the travel information to AKSW-Absence Calendar!\nYou probably don\'t have the correct rights for it yet!');
    throw e;
  }
  
  try {
    var mbox = Session.getActiveUser().getEmail();                          //inform user about the status
    MailApp.sendEmail(mbox, 'AKSW Travel Reimbursement', travel_folder.getUrl()+'\n\nLog:\n'+Logger.getLog() ,{
                                                                                  name: 'Automatic Emailer Script'
                                                                                });
  }
  catch(e) {
    throw e;
  }
  
}


function copyFilesToUserFolder(xmlBlob)
{
  var user_name     = getDataFromXMLDoc('name@pdf',xmlDoc);
  var user_folder   = createFolderIfNotExists(users_base_folder,user_name);
  var date_prefix   = formatDate(createDateFromGerman(getDataFromXMLDoc('hinreise@datum',xmlDoc)));
  var travel_name   = date_prefix+"_"+getDataFromXMLDoc('reiseziel',xmlDoc);
  travel_folder     = createFolderIfNotExists(user_folder,travel_name);

  
  var xml_file      = travel_folder.createFile(xmlBlob);
  var type_name     = getDataFromXMLDoc('file_type',xmlDoc)=='dienstreiseantrag' ? 'Travel Application' : 'Travel Reimbursement';
  var document_name = travel_name+"_InfAI_Germany_"+type_name;
  var xml_name      = type_name+'.xml';
  xml_file.setName(xml_name);

  InfAI_doc_germany = InfAI_template_germany.makeCopy(document_name,travel_folder); //make a copy of the template in the user folder
  try {
    fetchUniversityForms(xmlBlob,getDataFromXMLDoc('file_type',xmlDoc));
  }
  catch(e) {
     Logger.log('Something wrent wrong with fetching the University Forms. This mostly happens, when you submit a xml document with some special characters'+
                ' in it or newline feeds in the innertext of a XML-Element.');
    throw e;
  }
     
}

/**
*  fetch the university pdf files by using reimbursment proxy webservice 
*
*  @param {String} xmlBlob
*  @param {String} mode either 'dienstreiseantrag' or 'reisekostenabrechnung'
*
**/
function fetchUniversityForms(xmlBlob,mode)
{
  var payload =
   {
     "reimbursement-type" : mode,
     "fileAttachment": xmlBlob
   };
  var options =
     {
       "method" : "post",
       "payload" : payload,
       "followRedirects" : true,
       //"muteHttpExceptions" : true
     }
  var response = UrlFetchApp.fetch('http://rka.aksw.org/ReimbursementProxyServlet/Proxy',options);
  if (response.getHeaders())
    

  if(response.getHeaders()['RKA-status']=="Error")
  {
    Logger.log("An Error occured in the ReimbursementProxy-Servlet: Debug Information:\n"+ Utilities.newBlob( Utilities.base64Decode(response.getHeaders()['RKA-debug'], Utilities.Charset.UTF_8) ).getDataAsString());
    Logger.log("Header of the reply from the ReimbursementProxy-Servlet\n"+JSON.stringify(response.getAllHeaders()));
  }
  var pdf = travel_folder.createFile(response.getAs(MimeType.PDF));
  if (mode=="dienstreiseantrag")
    pdf.setName('University Travel Application.pdf');
  else
    pdf.setName('University Travel Reimbursement.pdf');
}


function addCalendarEntry(xmlDoc)
{
  var name   = getDataFromXMLDoc('name@pdf',xmlDoc)+"@"+getDataFromXMLDoc('reiseziel',xmlDoc);
  //var start  = createDateFromGerman(getDataFromXMLDoc('hinreise@datum',xmlDoc));
  var start = createDateTimeFromGerman(getDataFromXMLDoc('hinreise@datum',xmlDoc),getDataFromXMLDoc('hinreise@uhrzeit',xmlDoc));
  //start = start+Date.parse(getDataFromXMLDoc('rueckreise@uhrzeit',xmlDoc));
  var end   = createDateTimeFromGerman(getDataFromXMLDoc('rueckreise@datum',xmlDoc),getDataFromXMLDoc('rueckreise@uhrzeit',xmlDoc));

  if (!(createDateFromGerman('01.01.2015')<start && start<createDateFromGerman('01.01.2030')))
    throw new Error('start date in the XML-File is not in the range of 01.01.2015 to 01.01.2030');
  if (!(createDateFromGerman('01.01.2015')<end && end<createDateFromGerman('01.01.2030')))
    throw new Error('end date in the XML-File is not in the range of 01.01.2015 to 01.01.2030');
  var event  = AKSWabsenceCalendar.createEvent(name,start,end, {location: getDataFromXMLDoc('reiseziel',xmlDoc)});
}

function injectXMLIntoSpreadsheet(spreadsheet,xmlDoc)
{
  for (var l in spreadsheet.getSheets()) //iterate over all sheets in the spreadsheet
  {
    /* the Patterns below are used to inject some specific data values into the spreadsheet  ***********/
    
    var sheet = spreadsheet.getSheets()[l];
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    var contentRange = sheet.getRange(1,1, lastRow, lastColumn); 
    var values = contentRange.getValues();
     
    for (var i = 1; i <= contentRange.getNumRows(); i++)   //iterate over all rows
    {
      for (var j = 1; j <= contentRange.getNumColumns(); j++) //iterate over all cols
      {
        var currentValue  = values[i-1][j-1];  // NOTE arrays are not naturally indexed unlike ranges in google spreadsheet
        var replacedValue = replacePlaceholders(currentValue);
        if (typeof currentValue === 'string' && replacedValue !== null)
          contentRange.getCell(i,j).setValue(replacedValue);
      }
    }
  }
}

function injectXMLIntoControllingTable(spreadsheet,xmlDoc)
{
  try
  {     
    var sheetName = 'Reise '+new Date().getFullYear();
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet == null) {
      sheet = spreadsheet.insertSheet(sheetName);
    }
    
    var lastRow = sheet.getLastRow();
    var names = sheet.getRange('A' + "1:" + 'A' + lastRow).getValues(); //get Range of the names column
    for (; names[lastRow - 1] == "" && lastRow > 0; lastRow--) //check for the last entry in the names column to detect the real last used row
      ; // not just the last row (is usually different esp. if you're using formulas in a column)
    
    var lastColumn = sheet.getLastColumn();
    var placeHolderRange = sheet.getRange(1,1, 1, lastColumn); // the first row with the placeholders telling what to fill into the columns when inserting a new row
    var contentRange = sheet.getRange(lastRow+1,1, lastRow+1, lastColumn); // the range of the new row (at the bottom) to be filled in
    var values = contentRange.getValues();
    var placeHolders = placeHolderRange.getValues();
     
      for (var j = 1; j <= placeHolderRange.getNumColumns(); j++) //iterate over all cols
      {
        var currentValue  = placeHolders[0][j-1];  // NOTE arrays are not naturally indexed unlike ranges in google spreadsheet
        var replacedValue = replacePlaceholders(currentValue);
        if (typeof currentValue === 'string' && replacedValue !== null) //only change value if there was something to replace
          contentRange.getCell(1,j).setValue(replacedValue);
      }
  }
  catch(e) {
    Logger.log('Something went wrong with filling in the data into the Controlling table.');
    throw e;
  }
}

function replacePlaceholders(s)
{
  var str = s;
  var xmlPat  = /\/\*\/([a-zA-Z\/\@_0-9]*)\*\//;     // required xml value pattern:  provided *existing* path is retrieved from the xml document; example /*/hinreise@datum*/
  var optPat  = /\/\*\?\/([a-zA-Z\/\@_0-9]*)\*\?\//; // optional xml value pattern:  provided *optional* path is retrieved from the xml document; example /*?/hinreise@datum*?/
  var formPat = /\/\*\*\/([a-zA-Z]*)\*\*\//;      // form value pattern: provided name is retrieved from the form of webservice ; example /**/Justification**/
  var macroPat= /\/\*\+\/([a-zA-Z]*)\*\+\//;      // macro function pattern: provided name is considered to be a js function calculating some complex data; example /*+/macroName*+/
  var eqPat   = /\/==\//;                           // this pattern is replaced by the equal sign, with the help of this pattern you can write formulas including other patterns without spreadsheet preventing you from doing so; example: /==/
  
  var cnt = 0; var lastCnt=-1;
  while(cnt>lastCnt)
  {
    lastCnt=cnt; //count the number of replacements
    var match = xmlPat.exec(str);                             
    if (match)
    {
      cnt++;
      str = str.replace(match[0], getDataFromXMLDoc(match[1],xmlDoc).replace(/\r?\n|\r/g,''));
    }
    match = optPat.exec(str);
    if (match)
    {
      cnt++;
      try {str = str.replace(match[0], getDataFromXMLDoc(match[1],xmlDoc,true).replace(/\r?\n|\r/g,''));}
      catch (e) {str = str.replace(match[0],'0');} 
    }
    match = formPat.exec(str);
    if (match)
    {
      cnt++;
      str = str.replace(match[0], form_data[match[1]]);
    }
    match = macroPat.exec(str);
    if (match)
    {
      cnt++;
      str = str.replace(match[0], runMacro(match[1]));
    }
    match = eqPat.exec(str);
    if (match)
    {
      cnt++;
      str = str.replace(match[0], '=');
    }

  }
  if(cnt>0)
    return str;
  else
    return null; //show that nothing has been replaced by returning empty string
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
*  @param {String} xpath like query, supported query types: "" root element , "level1/level2" single child paths from root , "level1@foo" attributes, "level[1]" choose a specific sibling
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

function getProjectsFromSpreadsheet()
{
  reimb_root                = getFolder(reimb_root);
  projects_table            = reimb_root.getFilesByName(projects_table).next();
  var db = objDB.open(projects_table.getId());
  var rows = objDB.getRows( db, 'Projects' );
  return rows;
}

function logException(e)
{
  Logger.log("'"+e.name+"'-Exception was thrown in '"+e.fileName+":"+e.lineNumber+"' because of '"+e.message+"'\nSTACKTRACE:\n"+e.stack);
}

function xmlNewlineFeedFix()
{
 var referat = xmlDoc.getRootElement().getChild("referat").getText();
 /*var fixed_referat = referat.replace(/\r?\n|\r/g,''); // get rid of the newlinefeeds in referat string added by the university service xml export 
                                                      //     otherwise the university generator will crash when using the reimbursement proxy (maybe an HTMLUnit issue)
 */
 var fixed_referat = 'a'; // get rid of the newlinefeeds in referat string added by the university service xml export 
                                                      //     otherwise the university generator will crash when using the reimbursement proxy (maybe an HTMLUnit issue)
 
 xmlDoc.getRootElement().getChild("referat").setText(fixed_referat);
 return xmlDoc;
}

function xmlNewlineFeedFix()
{
 var referat = xmlDoc.getRootElement().getChild("referat").getText();
 var fixed_referat = referat.replace(/\r?\n|\r/g,''); // get rid of the newlinefeeds in referat string added by the university service xml export 
                                                      //     otherwise the university generator will crash when using the reimbursement proxy (maybe an HTMLUnit issue)
 xmlDoc.getRootElement().getChild("referat").setText(fixed_referat);
 return xmlDoc;
}
