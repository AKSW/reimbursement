/** for security reasons every macro function needs to be 'registered' in this array, otherwise one could call any js function **/
var registeredMacros = ['dates','passengers'];

function runMacro(macroName)
{
  if (registeredMacros.indexOf(macroName)>=0) //check wheter it's allowed to call the macro
    return executeFunctionByName(macroName,this);
  else
    return '**##UnregisteredMacro##**'
}

function executeFunctionByName(functionName, context /*, args */) {
  var args = [].slice.call(arguments).splice(2);
  var namespaces = functionName.split(".");
  var func = namespaces.pop();
  for(var i = 0; i < namespaces.length; i++) {
    context = context[namespaces[i]];
  }
  return context[func].apply(this, args);
}



/*****************************************************
******************************************************
******  Definition of the Macro Functions  ***********
******************************************************
******************************************************/


function dates()
{
  var a = getDataFromXMLDoc('hinreise@datum',xmlDoc); var b=getDataFromXMLDoc('rueckreise@datum',xmlDoc);
  var start = createDateFromGerman(a); start.setHours(0,0,0,0);
  var end = createDateFromGerman(b); end.setHours(0,0,0,0);

  if (start.getTime()==end.getTime())
    return a;
  else
    return a+'-'+b;
}

/* calculates the passenger ratio for conveyed passengers in car from the very detailed university description to the InfAI specific ratio multiplyer */
function passengers()
{
  if (getDataFromXMLDoc('file_type',xmlDoc)=='dienstreiseantrag') /* do not run this macro just remove the placeholder when it is an travel application */
    return '';
  var hin   = parseFloat(getDataFromXMLDoc('weg_hinreise@kfz',xmlDoc)); hin = (hin) ? hin : 0;
  var rueck = parseFloat(getDataFromXMLDoc('weg_rueckreise@kfz',xmlDoc)); rueck = (rueck) ? rueck : 0;
  var gesch = parseFloat(getDataFromXMLDoc('weg_geschaeftsort@kfz',xmlDoc)); gesch = (gesch) ? gesch : 0;
  var total_km = hin+rueck+gesch;
  var passenger_km =0;var foo ='\n';
  for (var i = 1; i<4; i++)
  {
    var silent= true;
    try {var hin2   = parseFloat(getDataFromXMLDoc('person'+i+'@hinreise_km',xmlDoc,silent));} catch(e){}  hin2 = (hin2) ? hin2 : 0;
    try {var rueck2 = parseFloat(getDataFromXMLDoc('person'+i+'@rueckreise_km',xmlDoc,silent)); } catch(e) {}; rueck2 = (rueck2) ? rueck2 : 0;
    try {var gesch2 = parseFloat(getDataFromXMLDoc('person'+i+'@geschaeftsort_km',xmlDoc,silent)); } catch(e) {};gesch2 = (gesch2) ? gesch2 : 0;
    passenger_km += hin2+rueck2+gesch2;
    //foo += i+': '+hin2+' '+rueck2+' '+gesch2+' '+passenger_km+'\n';
  }
  var result = ''+passenger_km/total_km;
  return result.replace('.',',');//''+hin+', '+rueck+', '+gesch+', '+total_km+', '+(passenger_km/total_km)+', '+passenger_km+foo;
}
