// Initializes UI, ensures content runs after page is loaded
(function(init) {
    var timer = setInterval(function() {
        var targets = [
            $,
            document.getElementsByClassName("svfpl_toolbar")[0]
        ];
        if (targets.every(function(t) {
            return t;
        })) {
            init();
            clearInterval(timer);
        }
    }, 100);
})(function() {
    $(".svfpl_switch").css("margin", "0px 0px 0px 111px"); // decreases margin-left of slider div to make room for new icon

    // Appends button and modal to DOM

    spx.ui.toolbarIcon = $("<a>")
        .addClass("svfpl_iconlinkbtn")
        .attr("title", "Export to Flight Sim")
        .click(spx.gen.fsx)
        .append( $("<span>").addClass("fa fa-plane"))
        .insertAfter( $(".svfpl_iconlinkbtn").eq(3));

    spx.ui.menu = $("<div>")
        .addClass("tppMenu")
        .css({
            "top": "130px",
            "left": "225px"
        })
        .append( $("<table>")
            .addClass("tppMenu")
            .append( $("<tr>")
                .addClass("tppMenu")
                .append( $("<th>")
                    .addClass("tppMenu")
                    .text("Export To...")
                )
        ,   $("<tr>")
                .addClass("tppMenu")
                .append( $("<td>")
                    .addClass("tppMenu gefs")
                    .text("GEFS-Online")
                )
        ,   $("<tr>")
                .addClass("tppMenu")
                .append( $("<td>")
                    .addClass("tppMenu pln")
                    .text("FSX/P3D")
                )
        ,   $("<tr>")
                .addClass("tppMenu")
                .append( $("<td>")
                    .addClass("tppMenu qw757")
                    .text("QualityWings 757")
                )
        ,   $("<tr>")
                .addClass("tppMenu")
                .append( $("<td>")
                    .addClass("tppMenu asa")
                    .text("Aerosoft Airbus")
                )
            )
        )
        .appendTo("body");
});


window.spx = {
    formatsList: ["fsx", "gefs", "qw", "asa", "as16"],
    gen: {},
    global: {},
    lib: {},
    ui: {}
};

spx.formatsList.forEach(function(f) {
    spx.gen[f] = {
        lib: {}
    }
})

// Builds and exports a PLN file for FSX
spx.gen.fsx.build = function() {
	var FPL = SkyVector.data.FPL;

	var cruisingAlt = FPL.alt ? spx.gen.fsx.lib.convertCrz(FPL.alt) : "35000";
	var departureID = FPL.dep.aptid;
	var departureLLA = spx.gen.fsx.lib.convertCoords(FPL.dep.lat, FPL.dep.lon, FPL.dep.elev);
	var destinationID = FPL.dst.aptid;
	var destinationLLA = spx.gen.fsx.lib.convertCoords(FPL.dst.lat, FPL.dst.lon, FPL.dst.elev);
	var title = departureID + " to " + destinationID;
	var descr = title + " - route created by SkyVector and SkyPlanX";
	var departurePosition = FPL.dep.rwy ? spx.gen.fsx.lib.convertRwy(FPL.dep.rwy) : "";
	var departureName = FPL.dep.name;
	var destinationName = FPL.dst.name;
	var appVersionMajor = "10";
	var appVersionBuild = "61472";

	var header = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\n<SimBase.Document Type=\"AceXML\" version=\"1,0\">\n<Descr>AceXML Document</Descr>\n<FlightPlan.FlightPlan>\n";

	var xml = header;

	var tags = ["Title", "FPType", "RouteType", "CruisingAlt", "DepartureID", "DepartureLLA", "DestinationID", "DestinationLLA", "Descr", "DeparturePosition", "DepartureName", "DestinationName"];

	var values = [title, "IFR", "HighAlt", cruisingAlt, departureID, departureLLA, destinationID, destinationLLA, descr, departurePosition, departureName, destinationName];

	for (var i=0; i<tags.length; i++) {
		xml += spx.gen.fsx.lib.createTag(tags[i], values[i]);
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
		xml += spx.gen.fsx.lib.createWaypoint(rte[i]);
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

// Converts a set of coordinates to PLN format
spx.gen.fsx.lib.convertCoords = function(lat, lon, elev) {
	lat = this.convertPoint(lat, 0);
	lon = this.convertPoint(lon, 1);
	elev = this.convertElev(elev);

	return lat + "," + lon + "," + elev;
};

// Converts flight level to altitude in feet
spx.gen.fsx.lib.convertCrz = function(fl) {
	if (fl.indexOf("FL") > -1) {
		fl.replace("FL", "");
		var alt = fl + "00";
		return alt;
	}
};

// Converts an elevation value to the format used in the PLN file
spx.gen.fsx.lib.convertElev = function(alt) {
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
};

/* Converts raw coordinates to format used in PLN file
   type: 0 - lon, 1 - lat */
spx.gen.fsx.lib.convertPoint = function(point, type) {
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
};

// Creates an XML tag
spx.gen.fsx.lib.createTag = function(name, content) {
	return "<" + name + ">" + content +  "</" + name + ">\n";
};

// Creates waypoint tag
spx.gen.fsx.lib.createWaypoint = function(a) {
	var name = a[0];
	var type = spx.global.getType(name);
	var elev = a[3] || "0.0";
	var position = spx.gen.fsx.lib.convertCoords(a[1], a[2], elev);
	var wpt = "<ATCWaypoint id=\"" + name + "\">\n";
    var createTag = spx.gen.fsx.lib.createTag;

	wpt += createTag("ATCWaypointType", type);
	wpt += (createTag("WorldPosition", position) + "<ICAO>\n");
	wpt += (createTag("ICAOIdent", name) + "</ICAO>\n</ATCWaypoint>\n\n");

	return wpt;
};

// Removes preceding letters in runway name
spx.global.convertRwy = function(rwy) {
	rwy = rwy.replace("RW", "");
	return rwy;
};

// Uses the length of the waypoint to determine what type it is
spx.global.getType = function(wpt) {
	var type;
	var l = wpt.length;
	if (l <= 3) type = "VOR";
	else if (l == 4) type = "Airport";
	else type = "Intersection";

	return type;
};
