/** start show direction **/
$(document).on('click', '#directions', function(e) {
    e.preventDefault();
    var client_id = $('input#client_id').val();
    var caregiverId = $('input#get_caregiver_id').val();
    var caregiverupdateid = $('input#edit_caregiver_schedule_id').val();
    var url = baseUrl + "CaregiverPortal/direction";

    if (geo_position_js.init()) {
        geo_position_js.getCurrentPosition(success_callback, error_callback, {
            enableHighAccuracy: true
        });
    } else {
        alert("Unable to get your current location !");
    }

    function success_callback(p) {
        var caregiver_latitude = p.coords.latitude.toFixed(2);
        var caregiver_longitude = p.coords.longitude.toFixed(2);
        if ((caregiver_latitude.length <= 0) && (caregiver_longitude.length <= 0)) {
            alert("Unable to get your current location !");
        }

        var caregiverlatlong = p.coords.latitude.toFixed(2) + ',' + p.coords.longitude.toFixed(2);
        $.ajax({
            url: url,
            type: 'post',
            dataType: 'JSON',
            data: {
                'caregiver_id': caregiverId,
                'edit_caregiver_schedule_id': caregiverupdateid,
                'client_id': client_id
            },
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
            },
            success: function(data) {
                if (data.status == 1) {
                    alert('Latitude and Longitude for given client address not found.');

                }
                if (data.status == 0) {
                    var lt = parseFloat(data.lat);
                    var long = parseFloat(data.long);
                    var latitude = lt.toFixed(2);
                    var longitude = long.toFixed(2);
                    var clientlatlong = latitude + ',' + longitude;
                    window.open('https://maps.google.com/?saddr=' + caregiverlatlong + '&daddr=' + clientlatlong, '_blank');

                }


            }
        });

    }

    function error_callback(p) {
        alert('Unable to get your current location !');
    }

});

/** Start geo js **/	
var bb_successCallback;
var bb_errorCallback;
var bb_blackberryTimeout_id = -1;

function handleBlackBerryLocationTimeout() {
    if (bb_blackberryTimeout_id != -1) {
        bb_errorCallback({ message: "Timeout error", code: 3 });
    }
}
function handleBlackBerryLocation() {
    clearTimeout(bb_blackberryTimeout_id);
    bb_blackberryTimeout_id = -1;
    if (bb_successCallback && bb_errorCallback) {
        if (blackberry.location.latitude == 0 && blackberry.location.longitude == 0) {
            //http://dev.w3.org/geo/api/spec-source.html#position_unavailable_error
            //POSITION_UNAVAILABLE (numeric value 2)
            bb_errorCallback({ message: "Position unavailable", code: 2 });
        }
        else {
            var timestamp = null;
            //only available with 4.6 and later
            //http://na.blackberry.com/eng/deliverables/8861/blackberry_location_568404_11.jsp
            if (blackberry.location.timestamp) {
                timestamp = new Date(blackberry.location.timestamp);
            }
            bb_successCallback({ timestamp: timestamp, coords: { latitude: blackberry.location.latitude, longitude: blackberry.location.longitude} });
        }
        //since blackberry.location.removeLocationUpdate();
        //is not working as described http://na.blackberry.com/eng/deliverables/8861/blackberry_location_removeLocationUpdate_568409_11.jsp
        //the callback are set to null to indicate that the job is done

        bb_successCallback = null;
        bb_errorCallback = null;
    }
}

var geo_position_js = function () {

    var pub = {};
    var provider = null;

    pub.getCurrentPosition = function (successCallback, errorCallback, options) {
        provider.getCurrentPosition(successCallback, errorCallback, options);
    }

    pub.init = function () {
        try {
            if (typeof (geo_position_js_simulator) != "undefined") {
                provider = geo_position_js_simulator;
            }
            else if (typeof (bondi) != "undefined" && typeof (bondi.geolocation) != "undefined") {
                provider = bondi.geolocation;
            }
            else if (typeof (navigator.geolocation) != "undefined") {
                provider = navigator.geolocation;
                pub.getCurrentPosition = function (successCallback, errorCallback, options) {
                    function _successCallback(p) {
                        //for mozilla geode,it returns the coordinates slightly differently
                        if (typeof (p.latitude) != "undefined") {
                            successCallback({ timestamp: p.timestamp, coords: { latitude: p.latitude, longitude: p.longitude} });
                        }
                        else {
                            successCallback(p);
                        }
                    }
                    provider.getCurrentPosition(_successCallback, errorCallback, options);
                }
            }
            else if (typeof (window.google) != "undefined" && typeof (google.gears) != "undefined") {
                provider = google.gears.factory.create('beta.geolocation');
            }
            else if (typeof (Mojo) != "undefined" && typeof (Mojo.Service.Request) != "Mojo.Service.Request") {
                provider = true;
                pub.getCurrentPosition = function (successCallback, errorCallback, options) {

                    parameters = {};
                    if (options) {
                        //http://developer.palm.com/index.php?option=com_content&view=article&id=1673#GPS-getCurrentPosition
                        if (options.enableHighAccuracy && options.enableHighAccuracy == true) {
                            parameters.accuracy = 1;
                        }
                        if (options.maximumAge) {
                            parameters.maximumAge = options.maximumAge;
                        }
                        if (options.responseTime) {
                            if (options.responseTime < 5) {
                                parameters.responseTime = 1;
                            }
                            else if (options.responseTime < 20) {
                                parameters.responseTime = 2;
                            }
                            else {
                                parameters.timeout = 3;
                            }
                        }
                    }


                    r = new Mojo.Service.Request('palm://com.palm.location', {
                        method: "getCurrentPosition",
                        parameters: parameters,
                        onSuccess: function (p) { successCallback({ timestamp: p.timestamp, coords: { latitude: p.latitude, longitude: p.longitude, heading: p.heading} }); },
                        onFailure: function (e) {
                            if (e.errorCode == 1) {
                                errorCallback({ code: 3, message: "Timeout" });
                            }
                            else if (e.errorCode == 2) {
                                errorCallback({ code: 2, message: "Position Unavailable" });
                            }
                            else {
                                errorCallback({ code: 0, message: "Unknown Error: webOS-code" + errorCode });
                            }
                        }
                    });
                }

            }
            else if (typeof (device) != "undefined" && typeof (device.getServiceObject) != "undefined") {
                provider = device.getServiceObject("Service.Location", "ILocation");

                //override default method implementation
                pub.getCurrentPosition = function (successCallback, errorCallback, options) {
                    function callback(transId, eventCode, result) {
                        if (eventCode == 4) {
                            errorCallback({ message: "Position unavailable", code: 2 });
                        }
                        else {
                            //no timestamp of location given?
                            successCallback({ timestamp: null, coords: { latitude: result.ReturnValue.Latitude, longitude: result.ReturnValue.Longitude, altitude: result.ReturnValue.Altitude, heading: result.ReturnValue.Heading} });
                        }
                    }
                    //location criteria
                    var criteria = new Object();
                    criteria.LocationInformationClass = "BasicLocationInformation";
                    //make the call
                    provider.ILocation.GetLocation(criteria, callback);
                }
            }
            else if (typeof (window.blackberry) != "undefined" && blackberry.location.GPSSupported) {

                // set to autonomous mode
                if (typeof (blackberry.location.setAidMode) == "undefined") {
                    return false;
                }
                blackberry.location.setAidMode(2);
                //override default method implementation
                pub.getCurrentPosition = function (successCallback, errorCallback, options) {
                    //alert(parseFloat(navigator.appVersion));
                    //passing over callbacks as parameter didn't work consistently
                    //in the onLocationUpdate method, thats why they have to be set
                    //outside
                    bb_successCallback = successCallback;
                    bb_errorCallback = errorCallback;
                    //function needs to be a string according to
                    //http://www.tonybunce.com/2008/05/08/Blackberry-Browser-Amp-GPS.aspx
                    if (options['timeout']) {
                        bb_blackberryTimeout_id = setTimeout("handleBlackBerryLocationTimeout()", options['timeout']);
                    }
                    else
                    //default timeout when none is given to prevent a hanging script
                    {
                        bb_blackberryTimeout_id = setTimeout("handleBlackBerryLocationTimeout()", 60000);
                    }
                    blackberry.location.onLocationUpdate("handleBlackBerryLocation()");
                    blackberry.location.refreshLocation();
                }
                provider = blackberry.location;
            }
        }
        catch (e) {
            alert("error=" + e);
            if (typeof (console) != "undefined") {
                console.log(e);
            }
            return false;
        }
        return provider != null;
    }


    return pub;
} ();
	
/** End geo js **/
