/*** configs & globals  **/
  var reimb_root                = 'travel reimbursement';    // name of reimbursement root folder   (gets overridden by real folder object in intializeGlobals())
  var users_base_folder         = 'travels by user';                // folder where the travels of each user are stored  (gets overridden by real folder object in intializeGlobals())
  var template_folder           = 'templates';               // name of the folder where the templates are in (gets overridden by real folder object in intializeGlobals())
  var InfAI_template_germany    = 'travel application and reimbursement'; // reimbursement (gets overridden by real folder object in intializeGlobals())
  var AKSWabsenceCalendar       = 'AKSW Abwesenheiten 2';    // name of the calendar to which absences are added for every travel (gets overridden by real calendar object in intializeGlobals())
  var controlling_table         = 'Controlling';
  var projects_table            = 'Projects Database';
  var users_table               = 'User Database';
  var deductions_table          = 'Deductions Database';


  var xmlDoc                    ; // global for the parsed xml
  var travel_folder             ; // global for the folder of the submitted travel
  var InfAI_doc_germany         ; // global for the copy of the InfAI form for the submitted travel
  var form_data                 ; // global for the submitted form data
  var form_data_file            = 'Form Data'; //global for the submitted reimbursement application form data saved in spreadsheet
  var personal_data_file;

  var personal_data_db = '';

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
    projects_table            = reimb_root.getFilesByName(projects_table).next();
    users_table               = reimb_root.getFilesByName(users_table).next();
    deductions_table          = reimb_root.getFilesByName(deductions_table).next();
  } 
  catch(e) {
    Logger.log('Something went wrong with reading the Travel-Reimbursement Resources!\nYou probably don\'t have the correct rights yet! You need to ask for write permissions for the Google Drive Folder and the Calendar.');
    throw e;
  }
}


/** main function called from FormProcessing.gs after "submit" click on submit button 
 *
 * @param {Object} theForm filled in Form transformed by Google see https://developers.google.com/apps-script/guides/html/communication#forms
 */
function mainCalledByWebService(form)
{
  initializeGlobals();
  form_data = form; var xmlBlob;                                                     //make data in form globally available

  if(form.xmlMode=='xml-url-mode')
    xmlBlob = fetchXMLFromUrl(form.UrlToLoad);
  else
    xmlBlob = form.FileToLoad;                                         //get uploaded XML-File

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

   if(getDataFromXMLDoc('file_type',xmlDoc)!=form['reimbursement-mode'])
    throw new Error('Reimbursement Type of provided xml file does not match with the type of the submitted form.');
  
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
  
  //if (xmlBlob,getDataFromXMLDoc('file_type',xmlDoc)=='reisekostenabrechnung')  //open the Controling table and add the Travel to it
  {
    var controlling_doc = SpreadsheetApp.open(controlling_table);
    var lock = LockService.getScriptLock(); // Get a public lock on this script, because we're about to modify a shared resource.
    lock.waitLock(30000); // Wait for up to 30 seconds for other processes to finish otherwise exception
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
                                                                                  name: 'AKSW Travel Reimbursement Script'
                                                                                });
  }
  catch(e) {
    Logger.log('Something wrent wrong with writing an email to you!');
    throw e;
  }
  
}


function copyFilesToUserFolder(xmlBlob)
{
  var user_name     = getDataFromXMLDoc('name@pdf',xmlDoc);
  var user_folder   = createFolderIfNotExists(users_base_folder,user_name);
  var date_prefix   = formatDate(createDateFromGerman(getDataFromXMLDoc('hinreise@datum',xmlDoc)));
  var travel_name   = date_prefix+"_"+getDataFromXMLDoc('reiseziel',xmlDoc);
  
  travel_folder     = (getDataFromXMLDoc('file_type',xmlDoc)=='dienstreiseantrag') ? createFolderAndMoveOldFolderIfExists(user_folder,travel_name) : createFolderIfNotExists(user_folder,travel_name) ;
  var other_folder  = createFolderIfNotExists(travel_folder,'other forms (not needed)');
  
  var sponsor       = getProjectReimbursementInstitution(replacePlaceholders('/**/PaidBy**/'));
  
  //when sponsor is InfAi put university forms into other folder otherwise put InfAI forms into other folder
  var infai_forms   = (sponsor.match(/^InfAI$/i)) ?  travel_folder : other_folder;
  var uni_forms     = (sponsor.match(/^InfAI$/i)) ?  other_folder  : travel_folder; 
  
  var xml_file      = travel_folder.createFile(xmlBlob);
  
  var type_name     = getDataFromXMLDoc('file_type',xmlDoc)=='dienstreiseantrag' ? 'Travel Application' : 'Travel Reimbursement';
  var infai_dates   = formatDateDR(createDateFromGerman(getDataFromXMLDoc('hinreise@datum',xmlDoc)))+'-'+formatDateDR(createDateFromGerman(getDataFromXMLDoc('rueckreise@datum',xmlDoc)));
  
  var document_name = 'DR'+infai_dates+' '+getDataFromXMLDoc('name',xmlDoc)+'_'+getDataFromXMLDoc('reiseziel',xmlDoc)+' '+type_name;
  var xml_name      = type_name+'.xml';
  xml_file.setName(xml_name);

  if (getDataFromXMLDoc('file_type',xmlDoc)=='dienstreiseantrag')
    storeFormDataToSpreadsheet(form_data);
  
  InfAI_doc_germany = InfAI_template_germany.makeCopy(document_name+' (InfAI)',infai_forms); //make a copy of the template in the user folder
  try {
    fetchUniversityForms(xmlBlob,getDataFromXMLDoc('file_type',xmlDoc),uni_forms);
  }
  catch(e) {
     Logger.log('Something wrent wrong with fetching the University Forms. This mostly happens, when you submit a xml document with some special characters'+
                ' or there is some error in the data (e.g. date is already in the past for travel application');
    if (sponsor.match(/^InfAI$/i)) 
      Logger.log('The university forms could not be fetched. Due to the fact that you just need the InfAI forms for your travel this should not be an issue.');
    else
      throw e;
  }
     
}

/**
*  fetch the university pdf files by using reimbursement proxy webservice 
*
*  @param {String} xmlBlob
*  @param {String} mode either 'dienstreiseantrag' or 'reisekostenabrechnung'
*
**/
function fetchUniversityForms(xmlBlob,mode,forms_folder)
{
  var payload =
   {
     "reimbursement-type" : mode, //the mode needs to be set first !!!!!!!!!!
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
  var pdf = forms_folder.createFile(response.getAs(MimeType.PDF));
  if (mode=="dienstreiseantrag")
    pdf.setName('University Travel Application.pdf');
  else
    pdf.setName('University Travel Reimbursement.pdf');
}


function fetchXMLFromUrl(url)
{
  try {
    if (/^https:\/\/service.uni-leipzig.de\/pvz\//.test(url)) // if the url points to the university service use the reimbursement proxy
      return fetchXMLFromProxy(url);
    
    var response = UrlFetchApp.fetch(url);                    // else download it directly
      return response.getBlob();

  }
  catch(e) {
    Logger.log('Something wrent wrong with fetching the xml file from the given url');
    throw e;
  }
}

/**
*  fetch the university xml file by using reimbursement proxy webservice 
*
*  @param {String} url to the xml file
*  @return {Blob} the retrieved xml file as blob
*
**/
function fetchXMLFromProxy(url)
{
  var payload =
   {
     "reimbursement-type" : "xmldownload",       //the mode needs to be set first !!!!!!!!!!
     "xml-url" : url,
     "dummy-file" : Utilities.newBlob('dummy')  //needed to get a multipart encoded request
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
    Logger.log("An Error occured in the ReimbursementProxy-Servlet during fetching the XML File from '"+url+"': Debug Information:\n"+ Utilities.newBlob( Utilities.base64Decode(response.getHeaders()['RKA-debug'], Utilities.Charset.UTF_8) ).getDataAsString());
    Logger.log("Header of the reply from the ReimbursementProxy-Servlet\n"+JSON.stringify(response.getAllHeaders()));
  }
  return response.getBlob();
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
  // var event  = AKSWabsenceCalendar.createEvent(name,start,end, {location: getDataFromXMLDoc('reiseziel',xmlDoc)}); //not working for multi-day allday events see: http://www.harryonline.net/scripts/multi-day-calendar-events-in-google-apps-script/581
  
  /***** using expirmental Calendar Rest API for Apps Script here see: https://developers.google.com/apps-script/advanced/calendar ******/
  var cal_id = AKSWabsenceCalendar.getId();
  // check if there is already an event for the current travel folder (search using myFindValue property)
  var args = 
      {
        "privateExtendedProperty":'myFindValue='+travel_folder.getId()
      }
  var events = Calendar.Events.list(cal_id,args);
  
  // if there is already an event for the current travel folder -> delete it
  if (events.items && events.items.length > 0) 
  {
    var event_old = events.items[0];
    Calendar.Events.remove(cal_id, event_old['id']);
  }
   
  // create a new event and add it to calendar
  end = new Date(end.setDate(end.getDate() + 1)); // increase date by one day to display it properly in google calendar (google calendar bug???)
  var event_obj =
      {
        "end": {
          "date": formatDate(end)
        },
        "start": {
          "date": formatDate(start)
        },
        "extendedProperties": {
          "private": {
            "myFindValue": travel_folder.getId()
          }
        },
        "location": getDataFromXMLDoc('reiseziel',xmlDoc),
        "summary" : name
      };
  var event = Calendar.Events.insert(event_obj, cal_id);
  
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
    var sheetName = 'Reise '+new Date().getFullYear(); var sheetNameOld = 'Reise '+(new Date().getFullYear()-1);
    var sheet = spreadsheet.getSheetByName(sheetName); var sheetOld = spreadsheet.getSheetByName(sheetNameOld);
    if (sheet == null) { // if there is no sheet for the current year make a copy from the template and insert into spreadsheet
      var templateSheet = spreadsheet.getSheetByName('Reise Template');
      sheet = spreadsheet.insertSheet(sheetName, {template: templateSheet});    
    }
    
    /*********************************************************************************************/
    /***********  calculate the index of the row where to fill in the data  **********************/
    /*********************************************************************************************/
    
    var lastRow = sheet.getLastRow(); //get last row of the sheet NOTE: formulas count for that
    var names = sheet.getRange('B' + "1:" + 'B' + lastRow).getValues(); //get Range of the names column
    
    for (; names[lastRow - 1] == "" && lastRow > 0; lastRow--) //check for the last entry in the names column to detect the real last used row
      ; // not just the last row ! (is usually different esp. if you're using formulas in a column)
    
    // overwrite the travel information from the travel application (if exists) with corrected application or reimbursement information
    //if(form_data['reimbursement-mode']=='reisekostenabrechnung')
    {
      var travel_link =  (form_data['reimbursement-mode']=='dienstreiseantrag') ? travel_folder.getUrl()  : form_data['selectedTravel'];
      if (form_data['reimbursement-mode']=='dienstreiseantrag' || form_data['selectedTravel']!='none' ) // if there is no travel selected (always in application mode) just keep the first empty line (calculated above) as 'lastRow' otherwise ->
      {
        var drive_links = sheet.getRange('A' + "1:" + 'A' + sheet.getLastRow()).getValues(); // get content of drivelinks column
        var found = false;
        for(n=0;n<drive_links.length;++n)                 // iterate row by row and search for the given travel in column A
        { 
          if(drive_links[n].toString() == travel_link) // found the travel
          {
            lastRow = n; //actually it is not the last row in 'reisekostenabrechnung mode' it is one line above the selected travel (if counting from 1)
            found = true; //prevent from searching in the sheet of the last year
            break; // stop searching for the travel
          }
        }
        
        if (!found) // if travel was not found in current year sheet search for it in the last year sheet
        {
          var drive_links = sheetOld.getRange('A' + "1:" + 'A' + sheetOld.getLastRow()).getValues(); // get content of drivelinks column
          for(n=0;n<drive_links.length;++n)                 // iterate row by row and search for the given travel in column A
          { 
            if(drive_links[n].toString() == travel_link)
            {
              lastRow = n; //actually it is not the last row in 'reisekostenabrechnung mode' it is one line above the selected travel 
              sheet = sheetOld; //set the sheet from last year where the travel has been found as the sheet where to fill in the data
              break; // stop searching for the travel
            }
          }
        }
      }
    }
    
    /*********************************************************************************************/
    /***********                 now fill in the data                       **********************/
    /*********************************************************************************************/
 
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
      if (form_data['reimbursement-mode']=='reisekostenabrechnung')
        contentRange.getCell(1,j).setBackgroundRGB(255, 255, 255); // set background to white
      else
        contentRange.getCell(1,j).setBackgroundRGB(0, 255, 0); // set background to green
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
  var formPat = /\/\*\*\/([a-zA-Z]*)\*\*\//;         // form value pattern: provided name is retrieved from the form of webservice ; example /**/Justification**/
  var macroPat= /\/\*\+\/([a-zA-Z_]*)\*\+\//;        // macro function pattern: provided name is considered to be a js function calculating some complex data; example /*+/macroName*+/
  var dataPat = /\/\*\-\/([a-zA-Z_0-9]*)\*\-\//;     // additional data pattern: when there is a link for the user for a 'Personal_Data_Table' table in User Database the provided name is used as column in that table and replaced the corresponding value in row 2; example /*-/account_holder*-/
  var eqPat   = /\/==\//;                            // this pattern is replaced by the equal sign, with the help of this pattern you can write formulas including other patterns without spreadsheet preventing you from doing so; example: /==/
  
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
      if (typeof form_data[match[1]] === 'undefined') // if placeholder does not exist in form and you're in reimbursement mode this is probably an information which has been provided in application mode 
      { 
        var r = getDataFromSavedForm(match[1]);
        
        if (r !== null)
        {
          cnt++;
          str = str.replace(match[0], r);
        }
      }
      else {
        cnt++;
        str = str.replace(match[0], form_data[match[1]]);
      }     
    }
    match = macroPat.exec(str);
    if (match)
    {
      cnt++;
      str = str.replace(match[0], runMacro(match[1]));
    }
    match = dataPat.exec(str);
    if (match)
    {
      cnt++;
      str = str.replace(match[0], getPersonalData(match[1]));
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
    return null; //show that nothing has been replaced by returning null
}


function getPersonalData(key)
{
  if (personal_data_db == '') // if not already done try to read Personal_Data_Table
  {
    var db = objDB.open(users_table.getId());
    var user_data = objDB.getRows( db, 'users',[],{'Gmail_Account':extractUsernameFromMail(Session.getActiveUser().getEmail())});
    var data_table_url = user_data[0]['Personal_Data_Table'];
    try {
      personal_data_db = objDB.open(extractIdFromDownloadUrl(data_table_url));
      personal_data_file = SpreadsheetApp.openByUrl(data_table_url);
    }
    catch (e){personal_data_db = null;}
  }
  if (personal_data_db === null)
    return '';
  else 
  {
    var personal_data = objDB.getRows( personal_data_db, personal_data_file.getSheets()[0].getName() ,[],{},1);
    var value = personal_data[0][key];
    if(typeof value === 'undefined') 
      return '';
    else
     return value;
  }
}

function getProjectReimbursementInstitution(project_name)
{
  var db = objDB.open(projects_table.getId());
  var project_data = objDB.getRows( db, 'Projects',[],{'Name': project_name});
  var sponsor = project_data[0]['PaidBy']; 
  return sponsor;
}


/** retrieves the 'Travel Application.xml' file of a given travel 
 *
 * @param {String} drive_link url to the travel folder of the travel
 * @return {String} content of Travel Application.xml'
 *
 */
function getTravelTemplate(drive_link)
{
  initializeGlobals();
  var folder_id = extractIdFromDownloadUrl(drive_link);
  var xml_template =  DriveApp.getFolderById(folder_id).getFilesByName('Travel Application.xml').next().getBlob().getDataAsString('UTF-8');
  return xml_template;
}



/** persists the data specified in the form during travel application for later use in the travel reimbursement process (rka)
 *
 * @param {Object} formObject the complete form object of travel application which needs to be serialized
 *
 */
function storeFormDataToSpreadsheet(formObject) {
  
  var ss = SpreadsheetApp.create(form_data_file); 
  
  // convert ss to file then remove it from root folder and move it to travel folder (there is no other way to create an empty spreadsheet in a specific folder)
  var ss_file = DriveApp.getFileById(ss.getId()); 
  travel_folder.addFile(ss_file);
  DriveApp.getRootFolder().removeFile(ss_file);
  
  var sheet = ss.getSheets()[0];
  
  var members = []; var values= [];
  for (var key in formObject)
  {
    members.push(key);values.push(formObject[key]);
  }
  
  sheet.appendRow(members);
  sheet.appendRow(values);
}

/** retrieves a part of the persisted form data serialized in the 'storeFormDataToSpreadsheet'-function
 *
 * @param {Object} entry_name the name of the form field (e.g. justification)
 *
 */
function getDataFromSavedForm(entry_name)
{ 
  try {
    var form_file = travel_folder.getFilesByName(form_data_file).next();
  }
  catch (e) 
  { 
    Logger.log("the file '"+form_data_file+"' was not found in Travel Folder. So the data could not be filled in correctly'");
    throw e;
    return null;
  }
  var db = objDB.open(form_file.getId());
  var data = objDB.getRows( db, SpreadsheetApp.openById(form_file.getId()).getSheets()[0].getName() ,[]);
  return data[0][entry_name];
}

function xmlNewlineFeedFix()
{
 var referat = xmlDoc.getRootElement().getChild("referat").getText();
 var fixed_referat = referat.replace(/\r?\n|\r/g,''); // get rid of the newlinefeeds in referat string added by the university service xml export 
                                                      //     otherwise the university generator will crash when using the reimbursement proxy (maybe an HTMLUnit issue)
 xmlDoc.getRootElement().getChild("referat").setText(fixed_referat);
 return xmlDoc;
}

function xmlNewlineFeedFixString(xmlString)
{
 var xmlDoc = XmlService.parse(xmlString); 
 var referat = xmlDoc.getRootElement().getChild("referat").getText();
 var fixed_referat = referat.replace(/\r?\n|\r/g,''); // get rid of the newlinefeeds in referat string added by the university service xml export 
                                                      //     otherwise the university generator will crash when using the reimbursement proxy (maybe an HTMLUnit issue)
 xmlDoc.getRootElement().getChild("referat").setText(fixed_referat);
 return xmlDoc;
}
