// ==UserScript==
// @name SkyPlanX dev
// @description This extension (by Ethan Shields) allows you to export routes to formats compatible for GEFS and FSX.
// @match *.skyvector.com/*
// @require https://code.jquery.com/jquery-3.1.0.min.js
// @run-at document-end
// @version 0.2.1
// @grant none
// ==/UserScript==

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
    // decreases margin-left of slider div to make room for new icon
    $(".svfpl_switch").css("margin", "0px 0px 0px 111px");

    // Appends button and modal to DOM
    spx.ui.toolbarIcon = $("<a>")
        .addClass("svfpl_iconlinkbtn")
        .attr("title", "Export to Flight Sim")
        .click(spx.fsx)
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
                    .addClass("tppMenu fsx")
                    .text("FSX/P3D")
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
                    .addClass("tppMenu xp")
                    .text("X-Plane")
                )
        ,   $("<tr>")
                .addClass("tppMenu")
                .append( $("<td>")
                    .addClass("tppMenu asa")
                    .text("Aerosoft A320")
                )
        ,   $("<tr>")
                .addClass("tppMenu")
                .append( $("<td>")
                    .addClass("tppMenu jar")
                    .text("JARDesign A320")
                )
        ,   $("<tr>")
                .addClass("tppMenu")
                .append( $("<td>")
                    .addClass("tppMenu qw757")
                    .text("QualityWings 757")
                )
            )
        )
        .appendTo("body");
});

// Initializes spx object and formats list
window.spx = {
    fileExtensions: [".flp", ".pln", ".json", ".txt", ".rte", ".fms"],
    formatsList: ["asa", "fsx", "gefs", "jar", "qw", "xp"],
    global: {},
    ui: {}
};

for (var i=0; i<spx.fileExtensions.length; i++) {
    spx[spx.formatsList[i]] = {
        extension: spx.fileExtensions[i],
        lib: {}
    }
}

// Converts flight level to altitude in feet
spx.global.convertCrz = function(fl) {
	if (fl.indexOf("FL") > -1) {
		fl.replace("FL", "");
		var alt = fl + "00";
		return alt;
	}
};

// Removes preceding letters in runway name
spx.global.convertRwy = function(rwy) {
	rwy = rwy.replace("RW", "");
	return rwy;
};

// Exports the route
spx.global.export = function(title, content, ext) {
    var e = document.createElement('a');
    e.href = 'data:attachment/text,' + encodeURI(content);
    e.target = '_blank';
    e.download = title + ext;

    var click = new MouseEvent("click", {
        "view": window,
        "bubbles": true,
        "cancelable": false
    });
    e.dispatchEvent(click);
}

// Creates an array of waypoints using the flight plan data in SkyVector
spx.global.formatRoute = function() {
    var FPL = SkyVector.data.FPL;
    var rte = [];
    var length = FPL.route.length-1;

	rte.push([
        FPL.route[0].ident,
        FPL.route[0].lat,
        FPL.route[0].lon,
        FPL.route[0].elev
    ]);
	for (var i=1; i<FPL.route.length; i++) {
		if (FPL.route[i].route && FPL.route[i].route.length) {
			var list = FPL.route[i].route;
			for (var j=0; j<list.length; j++) {
				if (j === 0 && list[0].ident == rte[rte.length-1][0]) j++;
				rte.push([list[j].ident, list[j].lat, list[j].lon]);
			}
		} else {
			if (FPL.route[i].ident == FPL.route[i-1].ident) i++;
			rte.push([
                FPL.route[i].ident,
                FPL.route[i].lat,
                FPL.route[i].lon
            ]);
		}
	}
	rte.push([
        FPL.route[length].ident,
        FPL.route[length].lat,
        FPL.route[length].lon,
        FPL.route[length].elev
    ]);
    return rte;
}

// Uses the length of the waypoint to determine what type it is
spx.global.getType = function(wpt) {
	var type;
	var l = wpt.length;
	if (l <= 3) type = "VOR";
	else if (l == 4) type = "Airport";
	else type = "Intersection";

	return type;
};

// Builds a PLN file for FSX
spx.fsx.build = function() {
    var FPL = SkyVector.data.FPL;
	var cruisingAlt = FPL.alt ? spx.global.convertCrz(FPL.alt) : "35000";
	var departureID = FPL.dep.aptid;
	var departureLLA = spx.fsx.lib.convertCoords(FPL.dep.lat, FPL.dep.lon, FPL.dep.elev);
	var destinationID = FPL.dst.aptid;
	var destinationLLA = spx.fsx.lib.convertCoords(FPL.dst.lat, FPL.dst.lon, FPL.dst.elev);
	var title = departureID + " to " + destinationID;
	var descr = title + " - route created by SkyVector and SkyPlanX";
	var departurePosition = FPL.dep.rwy ? spx.global.convertRwy(FPL.dep.rwy) : "";
	var departureName = FPL.dep.name;
	var destinationName = FPL.dst.name;
	var appVersionMajor = "10";
	var appVersionBuild = "61472";

	var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\n<SimBase.Document Type=\"AceXML\" version=\"1,0\">\n<Descr>AceXML Document</Descr>\n<FlightPlan.FlightPlan>\n";

	var tags = [
        "Title",
        "FPType",
        "RouteType",
        "CruisingAlt",
        "DepartureID",
        "DepartureLLA",
        "DestinationID",
        "DestinationLLA",
        "Descr",
        "DeparturePosition",
        "DepartureName",
        "DestinationName"
    ];

	var values = [title,
        "IFR",
        "HighAlt",
        cruisingAlt,
        departureID,
        departureLLA,
        destinationID,
        destinationLLA,
        descr,
        departurePosition,
        departureName,
        destinationName
    ];

    var rte = spx.global.formatRoute();

	for (var i=0; i<tags.length; i++) {
		xml += spx.fsx.lib.createTag(tags[i], values[i]);
	}

	xml += ("<AppVersion>\n<AppVersionMajor>" + appVersionMajor + "</AppVersionMajor>\n<AppVersionBuild>" + appVersionBuild + "</AppVersionBuild>\n</AppVersion>\n\n");

	for (var i=0; i<rte.length; i++) {
		xml += spx.fsx.lib.createWaypoint(rte[i]);
	}

	xml += "</FlightPlan.FlightPlan>\n</SimBase.Document>\n";

    spx.global.export(title, xml, ".pln");
};

// Functions library specifically for FSX format
spx.fsx.lib = {
    // Converts a set of coordinates to PLN format
    convertCoords: function(lat, lon, elev) {
    	lat = this.convertPoint(lat, 0);
    	lon = this.convertPoint(lon, 1);
    	elev = this.convertElev(elev);

    	return lat + "," + lon + "," + elev;
    },

    // Converts an elevation value to the format used in the PLN file
    convertElev: function(alt) {
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
    },

    /* Converts raw coordinates to format used in PLN file
       type: 0 - lon, 1 - lat */
    convertPoint: function(point, type) {
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
    },

    // Creates an XML tag
    createTag: function(name, content) {
    	return "<" + name + ">" + content +  "</" + name + ">\n";
    },

    // Creates waypoint tag
    createWaypoint: function(a) {
    	var name = a[0];
    	var type = spx.global.getType(name);
    	var elev = a[3] || "0.0";
    	var position = spx.fsx.lib.convertCoords(a[1], a[2], elev);
    	var wpt = "<ATCWaypoint id=\"" + name + "\">\n";
        var createTag = spx.fsx.lib.createTag;

    	wpt += createTag("ATCWaypointType", type);
    	wpt += (createTag("WorldPosition", position) + "<ICAO>\n");
    	wpt += (createTag("ICAOIdent", name) + "</ICAO>\n</ATCWaypoint>\n\n");

    	return wpt;
    }

}

spx.xp.build = function() {
    var FPL = SkyVector.data.FPL;
    var rte = spx.global.formatRoute();

    var title = rte[0][0] + " to " + rte[rte.length - 1][0];
    var waypointCount = rte.length - 1;
    var header = "I\n3 version\n1\n" + waypointCount + "\n\n";

    var txt = header;
    for (var i=0; i<waypointCount; i++) {
        txt += spx.xp.lib.createWaypoint(rte[i]);
    }

    spx.global.export(title, txt, ".fms");
}

spx.xp.lib = {
    createWaypoint: function(a) {
        var FPL = SkyVector.data.FPL;
        var ident = a[0];
        var str = "";
        var type = spx.global.getType(ident);
        var typeCode = "";
        if (type == "Airport") {
            typeCode = "1";
        } else if (type == "VOR") {
            typeCode = "3";
        } else if (type == "Intersection") {
            typeCode = "11";
        }
        var alt = FPL.alt ? spx.global.convertCrz(FPL.alt) : 35000;
        var lat = a[1];
        var lon = a[2];
        str = typeCode + " " + ident + " " + alt + " " + lat + " " + lon + "\n";
        return str;
    },

    waypointTypes: {
        "apt": "1",
        "ndb": "2",
        "vor": "3",
        "fix": "11",
        "llp": "28"
    }
}
