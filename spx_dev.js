// Ensures content runs after page is loaded
var timer = setInterval(function() {
    var target = document.getElementsByClassName("svfpl_toolbar")[0];
    if (target) {
        appendButton();
        clearInterval(timer);
    }
}, 100);

// Adds button to toolbar
var appendButton = function() {
	var toolbarIcon = document.createElement("a");
	toolbarIcon.className = "svfpl_iconlinkbtn";
	toolbarIcon.title = "Export to Flight Sim";
	toolbarIcon.onclick = generatePLN;

	var icon = document.createElement("span");
	icon.className = "fa fa-plane";
	toolbarIcon.appendChild(icon);

	var target = document.getElementsByClassName("svfpl_toolbar")[0];
	target.childNodes[4].style.margin = "0px 0px 0px 111px";
	target.insertBefore(toolbarIcon, target.childNodes[4]);
};

// Builds and exports a PLN file for FSX
var generatePLN = function() {
	var FPL = SkyVector.data.FPL;

	var cruisingAlt = FPL.alt ? convertCrz(cruisingAlt) : "35000";
	var departureID = FPL.dep.aptid;
	var departureLLA = convertCoords(FPL.dep.lat, FPL.dep.lon, FPL.dep.elev);
	var destinationID = FPL.dst.aptid;
	var destinationLLA = convertCoords(FPL.dst.lat, FPL.dst.lon, FPL.dst.elev);
	var title = departureID + " to " + destinationID;
	var descr = title + " - route created by SkyVector and SkyPlanX";
	var departurePosition = FPL.dep.rwy ? convertRwy(FPL.dep.rwy) : "";
	var departureName = FPL.dep.name;
	var destinationName = FPL.dst.name;
	var appVersionMajor = "10";
	var appVersionBuild = "61472";

	var header = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\n<SimBase.Document Type=\"AceXML\" version=\"1,0\">\n<Descr>AceXML Document</Descr>\n<FlightPlan.FlightPlan>\n";

	var xml = header;

	var tags = ["Title", "FPType", "RouteType", "CruisingAlt", "DepartureID", "DepartureLLA", "DestinationID", "DestinationLLA", "Descr", "DeparturePosition", "DepartureName", "DestinationName"];

	var values = [title, "IFR", "HighAlt", cruisingAlt, departureID, departureLLA, destinationID, destinationLLA, descr, departurePosition, departureName, destinationName];

	for (var i=0; i<tags.length; i++) {
		xml += createTag(tags[i], values[i]);
	}

	xml += "<AppVersion>\n<AppVersionMajor>10</AppVersionMajor>\n<AppVersionBuild>61472</AppVersionBuild>\n</AppVersion>\n\n";

	var rte = [];
	rte.push([FPL.route[0].ident, FPL.route[0].lat, FPL.route[0].lon, FPL.route[0].elev]);
	for (var i=1; i<FPL.route.length; i++) {
		if (FPL.route[i].route && FPL.route[i].route.length) {
			var list = FPL.route[i].route;
			for (var j=0; j<list.length; j++) {
				if (j === 0 && list[0].ident == rte[rte.length-1][0]) j++;
				rte.push([list[j].ident, list[j].lat, list[j].lon]);
			}
		} else {
			if (FPL.route[i].ident == FPL.route[i-1].ident) i++;
			rte.push([FPL.route[i].ident, FPL.route[i].lat, FPL.route[i].lon]);
		}
	}
	rte.push([FPL.route[FPL.route.length-1].ident, FPL.route[FPL.route.length-1].lat, FPL.route[FPL.route.length-1].lon, FPL.route[FPL.route.length-1].elev]);

	for (var i=0; i<rte.length; i++) {
		xml += createWaypoint(rte[i]);
	}

	xml += "</FlightPlan.FlightPlan>\n</SimBase.Document>\n";

	var e = document.createElement('a');
	e.href = 'data:attachment/text,' + encodeURI(xml);
	e.target = '_blank';
	e.download = title + ".pln";

	var click = new MouseEvent("click", {
		"view": window,
		"bubbles": true,
		"cancelable": false
	});
	e.dispatchEvent(click);
};

// Converts flight level to altitude in feet
function convertCrz(fl) {
	if (fl.indexOf("FL") > -1) {
		fl.replace("FL", "");
		var alt = fl + "00";
		return alt;
	}
}

// Removes preceding letters in runway name
function convertRwy(rwy) {
	rwy = rwy.replace("RW", "");
	return rwy;
}

/* Converts raw coordinates to format used in PLN file
   type: 0 - lon, 1 - lat */
function convertPoint(point, type) {
	if (typeof point == "string") point = Number(point);
	var h;
	if (type) {
		if (point >= 0) h = "E";
		else h = "W";
	} else {
		if (point >= 0) h = "N";
		else h = "S";
	}

	if (point < 0) point = Math.abs(point);
	var dd = point;
	var d = Math.floor(dd);
	var dm = 60*(dd - d);
	var m = Math.floor(dm);
	var ds = 60*(dm - m);
	var s = (Math.round(100 * ds) / 100);

	if (s == 60) {
		s = 0;
		m++;
	}
	if (m == 60) {
		m = 0;
		d++;
	}
	if (d == 180) {
		d = 179;
		m = 59;
		s = 59.99;
	}

	if (d < 0) d = Math.abs(d);
	var a = h + d + "° " + m + "' " + s + "\"";

	return a;
}

// Converts an elevation value to the format used in the PLN file
function convertElev(alt) {
	if (typeof alt == "number") alt += "";
	var a = Number(alt) >= 0 ? "+" : "-";
	var s = alt.split(".");
	var n = s[0];
	var d = s[1];
	for (var i=0; i<(6 - n.length); i++) {
		a += "0";
	}
	a += (n + "." + d + "0");

	return a;
}

// Converts a set of coordinates to PLN format
function convertCoords(lat, lon, elev) {
	lat = convertPoint(lat, 0);
	lon = convertPoint(lon, 1);
	elev = convertElev(elev);

	return lat + "," + lon + "," + elev;
}

// Creates an XML tag
function createTag(name, content) {
	return "<" + name + ">" + content +  "</" + name + ">\n";
}

// Creates waypoint tag
function createWaypoint(a) {
	var name = a[0];
	var type = getType(name);
	var elev = a[3] || "0.0";
	var position = convertCoords(a[1], a[2], elev);
	var wpt = "<ATCWaypoint id=\"" + name + "\">\n";

	wpt += createTag("ATCWaypointType", type);
	wpt += (createTag("WorldPosition", position) + "<ICAO>\n");
	wpt += (createTag("ICAOIdent", name) + "</ICAO>\n</ATCWaypoint>\n\n");

	return wpt;
}

function getType(wpt) {
	var type;
	var l = wpt.length;
	if (l <= 3) type = "VOR";
	else if (l == 4) type = "Airport";
	else type = "Intersection";

	return type;
}
