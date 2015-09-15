/* The script is deployed as a web app and renders the form */
/**function doGetOld(e) {
  return HtmlService.createHtmlOutputFromFile('form.html')
            .setSandboxMode(HtmlService.SandboxMode.NATIVE);
  // This is important as file upload fail in IFRAME Sandbox mode.
}*/

function doGet(e) {
  return HtmlService.createTemplateFromFile('Form.html')
    .evaluate() // evaluate MUST come before setting the NATIVE mode
    .setTitle('AKSW Travel Reimbursement')
    .setSandboxMode(HtmlService.SandboxMode.NATIVE);  // This is important as file upload fail in IFRAME Sandbox mode.
}


/** function called by "submit" button 
 *
 * @param {Object} theForm filled in Form transformed by Google see https://developers.google.com/apps-script/guides/html/communication#forms
 */
function processForm(theForm) {

  try {
    
    mainCalledByWebService(theForm);
  }
  catch (e) {
    logException(e);
    return {status:"error", log:Logger.getLog()};
  }

  return {status:"ok", log:Logger.getLog()}; //JSON.stringify(theForm)+Logger.getLog();
}
