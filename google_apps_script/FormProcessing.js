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

var xmlstring = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<reisekostenabrechnung>\r\n<file_type>reisekostenabrechnung<\/file_type>\r\n<name pdf=\"Max Muster\" >\r\nMax Muster\r\n<\/name>\r\n<referat pdf=\"Dienststel\\newline le\\newline\">Dienststelle<\/referat>\r\n<adresse>Wohnungsadresse<\/adresse>\r\n<telefon>12345<\/telefon>\r\n<status>1<\/status>\r\n<personenkreis>0<\/personenkreis>\r\n<reiseart>1<\/reiseart>\r\n<reiseziel>Reiseziel<\/reiseziel>\r\n<reisezweck>Reisezweck<\/reisezweck>\r\n<hinreise adresse=\"genau ADDResse\" adresstyp=\"3\" datum=\"05.09.2015\" uhrzeit=\"00:01\" verkehrsmittel=\"Bahn\" abfahrtszeit=\"00:00\" fahrten_oepnv=\"\" zeitkarte=\"0\" fahrkarte=\"0\"  \/>\r\n<geschaeftsort dienstbeginn_uhrzeit=\"00:01\" dienstbeginn_datum=\"05.09.2015\" dienstende_uhrzeit=\"00:02\" dienstende_datum=\"05.09.2015\" weitere_orte=\"\" adresse=\"\" fahrten=\"\"  \/>\r\n<rueckreise adresse=\"\" adresstyp=\"4\" datum=\"05.09.2015\" uhrzeit=\"00:03\" verkehrsmittel=\"Bahn\" abfahrtszeit=\"00:00\" fahrten_oepnv=\"\" zeitkarte=\"0\" fahrkarte=\"0\"  \/>\r\n<fk_hinreise fahrkarte=\"1\" fahrkarte_w=\"EUR\" flugzeug=\"1\" flugzeug_w=\"EUR\" reservierung=\"1\" reservierung_w=\"EUR\" oepnv=\"1\" oepnv_w=\"EUR\" mietwagen=\"1\" mietwagen_w=\"EUR\" taxi=\"1\" taxi_w=\"EUR\" >\r\na) 1,00 EUR\\linebreak a) 1,00 EUR\\linebreak b) 1,00 EUR\\linebreak c) 1,00 EUR\\linebreak c) 1,00 EUR\\linebreak c) 1,00 EUR\r\n<\/fk_hinreise>\r\n<fk_geschaeftsort fahrkarte=\"100\" fahrkarte_w=\"EUR\" flugzeug=\"1\" flugzeug_w=\"FJD\" reservierung=\"7\" reservierung_w=\"EUR\" oepnv=\"2\" oepnv_w=\"FKP\" mietwagen=\"3\" mietwagen_w=\"EUR\" taxi=\"4\" taxi_w=\"EUR\" >\r\na) 100,00 EUR\\linebreak a) 1,00 FJD\\linebreak b) 7,00 EUR\\linebreak c) 2,00 FKP\\linebreak c) 3,00 EUR\\linebreak c) 4,00 EUR\r\n<\/fk_geschaeftsort>\r\n<fk_rueckreise >\r\n\r\n<\/fk_rueckreise>\r\n<fk_gesamt>123,00 EUR<\/fk_gesamt>\r\n<bonusprogramm>0<\/bonusprogramm>\r\n<bonusprogrammart>miles+more<\/bonusprogrammart>\r\n<weg_hinreise kfz=\"100\" grund=\"2\" fahrrad=\"1\" >\r\nb) 100\\linebreak d) 1\r\n<\/weg_hinreise>\r\n<weg_geschaeftsort kfz=\"200\" grund=\"2\" fahrrad=\"2\" >\r\nb) 200\\linebreak d) 2\r\n<\/weg_geschaeftsort>\r\n<weg_rueckreise kfz=\"400\" grund=\"2\" fahrrad=\"8\" >\r\nb) 400\\linebreak d) 8\r\n<\/weg_rueckreise>\r\n<weg_gesamt>711 km<\/weg_gesamt>\r\n<verkehrsmittel_grund>Begruendung fuer Benutzung von Taxi und\/oder Mietwagen:<\/verkehrsmittel_grund>\r\n<person1 name=\"Erste Person\" dienststelle=\"Dienstele\" start=\"von-Adresse\" ziel=\"nach-Adresse\" hinreise_km=\"100\" geschaeftsort_km=\"200\" rueckreise_km=\"400\" zurueck=\"1\"  \/>\r\n<person2 name=\"Zweite Person\" dienststelle=\"Dienstele\" start=\"vvon-Adresse\" ziel=\"nach-Adresse\" hinreise_km=\"10\" geschaeftsort_km=\"20\" rueckreise_km=\"40\" zurueck=\"1\"  \/>\r\n<person3 name=\"Dritte Person\" dienststelle=\"Dienstele\" start=\"von-Adresse\" ziel=\"nach-Adresse\" hinreise_km=\"1\" geschaeftsort_km=\"2\" rueckreise_km=\"4\" zurueck=\"1\"  \/>\r\n<me_hinreise>a) 3\\linebreak b) 100\\linebreak 10\\linebreak 1<\/me_hinreise>\r\n<me_geschaeftsort>a) 3\\linebreak b) 200\\linebreak 20\\linebreak 2<\/me_geschaeftsort>\r\n<me_rueckreise>a) 3\\linebreak b) 400\\linebreak 40\\linebreak 4<\/me_rueckreise>\r\n<me_gesamt>777 km<\/me_gesamt>\r\n<nk_hinreise><\/nk_hinreise>\r\n<nk_geschaeftsort>a 1,00 EUR<\/nk_geschaeftsort>\r\n<nk_rueckreise><\/nk_rueckreise>\r\n<nk_gesamt>1,00 EUR<\/nk_gesamt>\r\n<nk_1 hinreise=\"0\" hinreise_w=\"EUR\" geschaeftsort=\"1\" geschaeftsort_w=\"EUR\" rueckreise=\"0\" rueckreise_w=\"EUR\" >\r\na\r\n<\/nk_1>\r\n<nk_2 hinreise=\"0\" hinreise_w=\"EUR\" geschaeftsort=\"0\" geschaeftsort_w=\"EUR\" rueckreise=\"0\" rueckreise_w=\"EUR\" >\r\nb\r\n<\/nk_2>\r\n<nk_3 hinreise=\"0\" hinreise_w=\"EUR\" geschaeftsort=\"0\" geschaeftsort_w=\"EUR\" rueckreise=\"0\" rueckreise_w=\"EUR\" >\r\nc\r\n<\/nk_3>\r\n<nebenkosten_grund><\/nebenkosten_grund>\r\n<uebernachtung_unentgeltlich status=\"0\" naechte=\"\" abgelehnt=\"0\" abgelehnt_naechte=\"\" abgelehnt_grund=\"\" wohnung=\"0\" wohnung_ort=\"\" wohnung_fahrtkosten=\"\"  \/>\r\n<uebernachtung_entgeltlich status=\"1\" kosten=\"100,00\" kosten_w=\"EUR\" naechte=\"3\" fruehstueck_inkl=\"1\" mittagessen_inkl=\"1\" abendessen_inkl=\"1\"  \/>\r\n<uebernachtung_text><\/uebernachtung_text>\r\n<verpflegung>0<\/verpflegung>\r\n<verpflegung_abgelehnt>0<\/verpflegung_abgelehnt>\r\n<verpflegung_abgelehnt_mahlzeiten><\/verpflegung_abgelehnt_mahlzeiten>\r\n<verpflegung_abgelehnt_grund><\/verpflegung_abgelehnt_grund>\r\n<verpflegung_arbeitgeber>0<\/verpflegung_arbeitgeber>\r\n<verpflegung_arbeitgeber_anlass><\/verpflegung_arbeitgeber_anlass>\r\n<verpflegung_chipkarte status=\"0\" erlaeuterung=\"\" wert=\"0\"  \/>\r\n<urlaubsreise status=\"0\" beginn_datum=\"\" ende_datum=\"\" ort=\"\" zeit=\"\"  \/>\r\n<sonstige_angaben pdf=\"Begruendung fuer Benutzung von Taxi und\/oder Mietwagen:; \" >\r\n\r\n<\/sonstige_angaben>\r\n<abschlagszahlung><\/abschlagszahlung>\r\n<menu_kosten>1<\/menu_kosten>\r\n<menu_uebernachtung>1<\/menu_uebernachtung>\r\n<\/reisekostenabrechnung>"; // the body of the new file...	

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
