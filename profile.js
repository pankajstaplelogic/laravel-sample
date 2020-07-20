/************************** Calendar Function*****************************************/
function ajaxSave(callmethod, formId, options) {
    if (!validateForm('form#' + formId)) {
        return false;
    }
    $('form#' + formId).ajaxSubmit(options);
    $('form#' + formId).find('.clientDocumentId').val('');
    $('form#' + formId).find('.clientHospitalId').val('');
}
$(document).on("click", ".save-data", function(e) {
    e.preventDefault();
    var callmethod = $(this).attr("callmethod");
    var formId = $(this).parents('form').attr('id');
    switch (callmethod) {
        case 'save-document':
            var options = {
                success: eval('addClientDocument'),
                error: warningmessage(),
                dataType: 'JSON',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
                },
            };
            ajaxSave(callmethod, formId, options);
            break;
        default:
            alert('Something wrong !');
            $('.loader-outer').hide();
    }
});

function addClientDocument(responseText, statusText, xhr, $form) {
    if (responseText.status == 1) {
        $(document).find("#formAddClientDocument").clearForm();
        getclientDocuments(responseText.data.lead_id);
        // $( ".showdocuments" ).trigger( "click" );
        $("html, body").animate({
            scrollTop: 0
        }, 1000);
        $('div.ajax-message').html('<div class="alert alert-success"><strong>Success!</strong>Document Saved successfully.</div>');
        setTimeout(function() {
            $('div.ajax-message').html('');
        }, 5000);
    } else {
        checkValidation(responseText.errors, 'formAddClientDocument');
    }
}
$(document).on('click', '.delete-doc', function(e) {
    var id = $(this).attr('docid');
    var clientid = $(this).attr('clientid');
    $('.loader-outer').show();
    if (confirm("Are sure want to delete record?")) {
        $.ajax({
            url: baseUrl + 'clients/deleteClientDocument/' + id,
            type: 'post',
            dataType: 'json',
            data: {
                'id': id,
                'clientid': clientid
            },
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
            },
            success: function(responseText) {
                var html = '';
                if (responseText.status == "1") {
                    //clear form after delete
                    $('#formAddClientDocument').clearForm();
                    $('.clientDocumentId').val('');
                    getclientDocuments(clientid);
                    $("html, body").animate({
                        scrollTop: 0
                    }, 1000);
                    $('div.ajax-message').html('<div class="alert alert-success"><strong>Success!</strong>Document Delete Record successfully.</div>');
                    setTimeout(function() {
                        $('div.ajax-message').html('');
                    }, 5000);
                } else {
                    alert("Something went wrong!");
                }
                $('.loader-outer').hide();
            },
            error: function() {
                $('.loader-outer').hide();
            }
        });
    } else {
        $('.loader-outer').hide();
        return false;
    }
});
/* Get Client extra informations */
function getclientDocuments(lead_id) {
    $('.loader-outer').show();
    $.ajax({
        url: baseUrl + 'ClientPortal/getClientDocuments/' + lead_id,
        type: 'post',
        dataType: 'html',
        data: {
            'lead_id': lead_id
        },
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(responseText) {
            var html = '';
            if (responseText == "0") {
                alert("Something went wrong!");
            } else {
                $("#document").find(".client-doc-list").html(responseText);
            }
            $('.loader-outer').hide();
        },
        error: function() {
            $('.loader-outer').hide();
        }
    });
}

function warningmessage() {}

function calendarINSTUnavail(selector, clientId) {
    if (typeof(clientId) == 'undefined') {
        clientId = 0;
    }
    $(selector).fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: '',
        },
        columnFormat: {
            week: 'ddd D/M',
        },
        defaultView: 'agendaWeek',
        editable: false,
        allDay: false,
        events: {
            url: baseUrl + 'staff/getUnavaibility',
            cache: true,
            type: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
            },
            data: {
                caregiver_id: clientId
            },
            error: function() {
                alert('there was an error while fetching events!');
            },
        }

    });
}


function calendarINST(selector, currObj) {
    $(selector).fullCalendar({
        header: {
            left: 'title',
            center: 'month,agendaWeek,agendaDay, today',
            right: 'prev,next'
        },
        columnFormat: {
            week: 'ddd D/M',
        },
        defaultDate: Date(),
        editable: true,
        eventLimit: true,
        dayClick: function(date, jsEvent, view) {},
        events: [],
        eventRender: function(event, element) {
            element.find('span.fc-title').html(element.find('span.fc-title').text());
            /* Start disable right click*/
            element.bind('mousedown', function(e) {
                if (e.which == 3) {
                    $(".fc-event-container,.fc-resizer").on("contextmenu", function(e) {
                        return false;
                    });
                }
            });
            /* End disable right click*/
        },
        eventClick: function(event, jsEvent, view) {},
        displayEventEnd: true,

        /* header: {
              left: 'prev,next today',
              center: 'title',
              right: '',
          },
          defaultView: 'month',
          editable: false,
          allDay: false*/
    });

    var caregiver_id = currObj.attr('data-name');
    $('.loader-outer').show();
    if (caregiver_id) {
        $.ajax({
            url: baseUrl + 'staff/findCaregiverSchedules',
            type: 'post',
            dataType: 'html',
            data: {
                'caregiver_id': caregiver_id,
                //'caregiverScheduleDate': caregiverScheduleDate,
                //'caregiverColumnFormat': caregiverColumnFormat
            },
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
            },
            success: function(json_events) {
                $(selector).fullCalendar('removeEvents');
                $(selector).fullCalendar('addEventSource', JSON.parse(json_events));
                $(selector).fullCalendar('rerenderEvents');

            },
            error: function() {}

        });
    }


}

/************************** Calendar Function*****************************************/



/** get important dates of caregiver **/
$(document).on('click', '.impdates', function() {
    if ($(this).hasClass('loaded') && $(this).attr('href') != '#impo-date') {
        return false;
    }
    $(this).addClass('loaded');
    $.ajax({
        url: baseUrl + "ClientPortal/getImportantDates",
        type: 'post',
        dataType: 'HTML',
        data: {},
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            $('#impo-date').html(data);

        }
    });

});


/** get important dates of caregiver **/
$(document).on('click', '.emergencycontact', function() {
    if ($(this).hasClass('loaded') && $(this).attr('href') != '#eme-cont') {
        return false;
    }
    $(this).addClass('loaded');
    $.ajax({
        url: baseUrl + "ClientPortal/emergencyContacts",
        type: 'post',
        dataType: 'HTML',
        data: {},
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            $('#eme-cont').html(data);

        }
    });

});

/** show and update caregiver login **/

$(document).on('click', '.logindetails', function() {
    if ($(this).hasClass('loaded') && $(this).attr('href') != '#login') {
        return false;
    }
    $(this).addClass('loaded');
    $.ajax({
        url: baseUrl + "ClientPortal/login",
        type: 'post',
        dataType: 'HTML',
        data: {},
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            $('#login').html(data);

        }
    });

});

$(document).on('click', '.saveFormCaregiver', function() {
    var id = $('input[name="id"]').val();
    var clientId = $('input[name="caregiver_id"]').val();
    var password = $('input[name="password"]').val();
    var oldpassword = $('input[name="oldpassword"]').val();
    if ($.trim(oldpassword) == '') {
        alert('Please Enter Old Password');
        return false;
    }
    if ($.trim(password) == '') {
        alert('Please Enter Password');
        return false;
    }
    var confirmPassword = $('input[name="confirm_password"]').val();
    var active = $('input[name="active"]').val();
    if (password != confirmPassword) {
        alert('Passwords not match');
        return false;
    }
    var useremail = $('input[name="useremail"]').val();

    $.ajax({
        url: baseUrl + "ClientPortal/login",
        type: 'post',
        dataType: 'JSON',
        data: {
            'caregiver_id': clientId,
            'password': password,
            'email': useremail,
            'active': active,
            'id': id,
            'oldpassword': oldpassword
        },
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            if (data.status == 4) {
                alert('old password not match');
                return false;
            }

            if (data.status == 1) {
                $("html, body").animate({
                    scrollTop: 0
                }, 1000);
                $('div.ajax-message').html('<div class="alert alert-success"><strong>Success!</strong>Data Saved successfully.</div>');
                setTimeout(function() {
                    $('div.ajax-message').html('');
                }, 5000);
                return false;
            }
        }
    });


});


/** show skills **/
$(document).on('click', '.caregiverskills', function() {
    if ($(this).hasClass('loaded') && $(this).attr('href') != '#skills') {
        return false;
    }
    $(this).addClass('loaded');
    $.ajax({
        url: baseUrl + "ClientPortal/skills",
        type: 'post',
        dataType: 'HTML',
        data: {},
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            $('#skills').html(data);

        }
    });

});


/** important information **/
$(document).on('click', '.importantinformation', function() {
    $('.loader-outer').show();
    if ($(this).hasClass('loaded') && $(this).attr('href') != '#impo-info') {
        return false;
    }
    $(this).addClass('loaded');
    $.ajax({
        url: baseUrl + "ClientPortal/importantInformation",
        type: 'post',
        dataType: 'HTML',
        data: {},
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            $('#impo-info').html(data);
            $('.loader-outer').hide();

        }
    });

});

$(document).on('click', '.servicesGroup', function() {
    $('.loader-outer').show();
    if ($(this).hasClass('loaded') && $(this).attr('href') != '#services-group') {
        return false;
    }
    $(this).addClass('loaded');
    $.ajax({
        url: baseUrl + "ClientPortal/serviceGroup",
        type: 'post',
        dataType: 'HTML',
        data: {},
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            $('#sevices-group').html(data);
            $('.loader-outer').hide();

        }
    });

});
$(document).on("click", ".save-plan-care", function(e) {
    e.preventDefault();
    var options = {
        success: addPlanGroup,
        dataType: 'JSON',
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
    };

    $('form#formAddPlanCare').ajaxSubmit(options);

});

function addPlanGroup(responseText, statusText, xhr, $form) {
    if (responseText.status == 1) {
        var client_id = 0;

        client_id = $(document).find('.clientIdValue').val();
        //getLeadClientDiagnosis(lead_id);
        $("html, body").animate({
            scrollTop: 0
        }, 1000);
        /*  $(document).find('div.alert-message').html('<div class="alert alert-success"><strong>Success!</strong> Information saved succesfully.</div>');
    setTimeout(function(){$('div.alert-message').html('');}, 5000);*/
        $('div.ajax-message').html('<div class="alert alert-success"><strong>Success!</strong>Data Saved successfully.</div>');
        setTimeout(function() {
            $('div.ajax-message').html('');
        }, 5000);

    }
}

/** contact information **/

$(document).on('click', '.contactinformation', function() {
    $('.loader-outer').show();
    if ($(this).hasClass('loaded') && $(this).attr('href') != '#Cont-info') {
        return false;
    }
    $(this).addClass('loaded');
    $.ajax({
        url: baseUrl + "clientPortal/contactInformation",
        type: 'post',
        dataType: 'HTML',
        data: {},
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            $('#Cont-info').html(data);
            $('.loader-outer').hide();


        }
    });

});
$(document).ready(function() {
    $(document).on('click', 'a.planMove', function(e) {
        e.preventDefault();
        if ($(this).hasClass('planAdd')) {
            if ($('ul.allPlans li input.plans:checked').length > 0) {
                $('ul.allPlans li input.plans:checked').each(function() {
                    var grpId = $(this).parents('.accordion-group').attr('id');
                    var isEsxist = $('div#accordion3Client').find('div#' + grpId + '.accordion-group').length;

                    if (isEsxist == 0) {
                        var accordClone = $(this).parents('.accordion-group').clone();
                        accordClone.find('ul.allPlans').addClass('clientPlans').removeClass('allPlans'); //remove existing left panel class
                        accordClone.find('.accordion-toggle').attr('href', "#collapse" + grpId + "ClientPlan"); // change accordion href and div id
                        accordClone.find('.accordion-body').attr('id', "collapse" + grpId + "ClientPlan");

                        $('div#accordion3Client').append(accordClone);
                        var ul = $('div#accordion3Client').find('div#' + grpId + '.accordion-group').find('ul.cust-togle-list');
                        ul.html('');
                        $(this).parent().appendTo(ul);
                    } else {
                        var ul = $('div#accordion3Client').find('div#' + grpId + '.accordion-group').find('ul.cust-togle-list');
                        $(this).parent().appendTo(ul);
                    }
                });


                $('ul.allPlans li input.plans:checked').parent().appendTo('ul.clientPlans');
                $('ul.allPlans input:checked, ul.clientPlans input:checked').prop('checked', false);
            }
        } else {
            if ($('ul.clientPlans li input.plans:checked').length > 0) {
                var currObj = null;
                $('ul.clientPlans li input.plans:checked').each(function() {
                    currObj = $(this);
                    var grpId = $(this).parents('.accordion-group').attr('id');
                    var isEsxist = $('div#accordion2').find('div#' + grpId + '.accordion-group').length;
                    var accPlanOptionExist = currObj.parents('.accordion-group').find('input.plans').length;
                    if (accPlanOptionExist == 1) {
                        $(this).parents('.accordion-group').remove();
                    }
                    if (isEsxist == 1) {
                        var ul = $('div#accordion2').find('div#' + grpId + '.accordion-group').find('ul.cust-togle-list');
                        $(this).parent().appendTo(ul);
                    }
                    ul.find('input.plans').removeAttr('checked');

                });


                /*$('ul.clientPlans li input.plans:checked').parent().appendTo('ul.allPlans');
                $('ul.clientPlans input:checked, ul.allPlans input:checked').prop('checked', false);*/
            }
        }
    });

    $(document).on('click', 'input.diagnosisAll', function() {
        if ($(this).is(':checked')) {
            $(this).parents('ul').find('input').prop('checked', true);
        } else {
            $(this).parents('ul').find('input').prop('checked', false);
        }
    });


});

/** Save Caregiver Schedule Start **/
$(document).on('click', '.savecontactinformation', function(e) {
    e.preventDefault();
    $('.loader-outer').show();
    var modelName = 'Leads';
    var formId = $(this).parents('form').attr('id');
    if (!validateForm('form#saveClientForm')) {
        return false;
    }

    var options = {
        success: formLogDetailSuccess,
        dataType: 'JSON',
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
    };
    if (modelName != '') {
        checkFormDataValidation(modelName, formId, options);
    } else {
        $('#saveClientForm').ajaxSubmit(options);
    }

});


function formLogDetailSuccess(responseText, statusText, xhr, $form) {
    if (responseText.status == 1) {
        $("html, body").animate({
            scrollTop: 0
        }, 1000);
        $('div.ajax-message').html('<div class="alert alert-success"><strong>Success!</strong>Data Saved successfully.</div>');
        setTimeout(function() {
            $('div.ajax-message').html('');
            window.location.href = baseUrl + "client-portal/profile/" + responseText.id;

        }, 2000);

        $('.hideOnLoad').hide();
        $('.showOnLoad').show();
        $('.loader-outer').hide();
        return false;
    }

}

/** Image upload **/

$(document).on('click', '.saveImageForm', function(e) {
    e.preventDefault();
    /*if(!validateForm('form#imageuploadForm'))
    {
      return false;
    }*/

    var options = {
        success: formImageUploadSuccess,
        dataType: 'JSON',
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
    };
    $('#imageuploadForm').ajaxSubmit(options);
});

function formImageUploadSuccess(responseText, statusText, xhr, $form) {
    if (responseText.status == 1) {
        $("html, body").animate({
            scrollTop: 0
        }, 1000);
        $('div.ajax-message').html('<div class="alert alert-success"><strong>Success!</strong>Data Saved successfully.</div>');
        setTimeout(function() {
            $('div.ajax-message').html('');
            window.location.href = baseUrl + "client-portal/profile/";
        }, 2000);
        return false;
    }


}

/** Show documents and download documents from caregiver portel **/
$(document).on('click', '.showdocuments', function() {
    if ($(this).hasClass('loaded') && $(this).attr('href') != '#document') {
        return false;
    }
    $(this).addClass('loaded');
    $.ajax({
        url: baseUrl + "ClientPortal/documents",
        type: 'post',
        dataType: 'HTML',
        data: {},
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            $('#document').html(data);

        }
    });

});

$(document).on('click', '.client-doc-edit', function() {
    getClientDocumentById($(this).attr('docid'));
});

function getClientDocumentById(id) {
    $('.loader-outer').show();
    /* Get client document information*/
    $.ajax({
        url: baseUrl + 'ClientPortal/getClientDocumentById/' + id,
        type: 'post',
        dataType: 'html',
        data: {
            'id': id
        },
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(responseText) {
            var html = '';
            if (responseText == "0") {
                alert("Something went wrong!");
            } else {
                $("#document").find("#doc-manages #formAddClientDocument").html(responseText);
            }
            $('.loader-outer').hide();
        },
        error: function() {
            $('.loader-outer').hide();
        }
    });
}

/** Save Caregiver important information **/
$(document).on('click', '.saveimportantinformation', function(e) {
    e.preventDefault();
    /*if(!validateForm('form#saveCaregiverForm'))
    {
      return false;
    }*/

    var options = {
        success: formcaregiverimportantSuccess,
        dataType: 'JSON',
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
    };
    $('#importantInformationForm').ajaxSubmit(options);
});


function formcaregiverimportantSuccess(responseText, statusText, xhr, $form) {
    if (responseText.status == 1) {
        $("html, body").animate({
            scrollTop: 0
        }, 1000);
        $('div.ajax-message').html('<div class="alert alert-success"><strong>Success!</strong>Data Saved successfully.</div>');

        setTimeout(function() {
            $('div.ajax-message').html('');
            window.location.href = baseUrl + "client-portal/profile/" + responseText.id;
        }, 2000);
        $('.hideOnLoad').show();
        $('.showOnLoad').hide();

        return false;
    }

}


/**hide save buttton when it load first time show when you click on upload button **/
$(document).on('click', '.Upload', function(e) {
    e.preventDefault();
    $('.show').trigger('click');
    //$('.hideOnLoad').show();
    //$('.hideOnLoad.date').css('display','table');
    // $('.hideOnLoad.radio-inline').css('display','inline-block');
    // $('.showOnLoad').hide();
    $('.showOnLoad').show();
});


/** Start Edit caregiver information **/
$(document).on('click', '.editcaregiverinformation', function(e) {
    e.preventDefault();
    $('.hideOnLoad').show();
    $('.showOnLoad').hide();
});

/** End Edit caregiver information **/


/** Start Edit caregiver Importantinformation **/
$(document).on('click', '.editimportantinformation', function(e) {
    e.preventDefault();
    $('.hideOnLoad').show();
    $('.showOnLoad').hide();
});

/** End Edit caregiver information **/


/** start caregiver unavailbility **/
$(document).on('click', '.unavalbility', function() {
    var clientId = $('input#clientId').val();
    if ($(this).hasClass('loaded') && $(this).attr('href') != '#unava-tab') {
        return false;
    }
    $(this).addClass('loaded');
    $.ajax({
        url: baseUrl + "staff/unavailability",
        type: 'post',
        dataType: 'HTML',
        data: {
            caregiver_id: clientId
        },
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            //$('form#unavailableForm').html(data);
            calendarINSTUnavail('#calendarUnavailCareGiver', clientId);
            $('#unava-tab').html(data);
            $(document).find('.unschedule_time_start').datetimepicker({
                format: 'HH:mm',
                extraFormats: ['hh:mm:ss'],
                sideBySide: true,
                ignoreReadonly: true
            });
            $(document).find('.unschedule_time_end').datetimepicker({
                format: 'HH:mm',
                extraFormats: ['hh:mm:ss'],
                sideBySide: true,
                ignoreReadonly: true,
            });

        }
    });

});

/** End Caregiver unavailbility **/

/** unavailbity modal **/

$(document).on('click', '#UnavailabilityModal', function(e) {
    e.preventDefault();
    var clientId = $('input#clientId').val();
    $.ajax({
        url: baseUrl + '/staff/unavailbleModal',
        type: 'POST',
        data: {
            caregiver_id: clientId
        },
        dataType: 'html',
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
        success: function(data) {
            $('.loader-outer').hide();
            $('#Unavail').html(data).modal('show');
            $(document).find('.unschedule_time_start').datetimepicker({
                format: 'HH:mm',
                extraFormats: ['hh:mm:ss'],
                sideBySide: true,
                ignoreReadonly: true
            });
            $(document).find('.unschedule_time_end').datetimepicker({
                format: 'HH:mm',
                extraFormats: ['hh:mm:ss'],
                sideBySide: true,
                ignoreReadonly: true,
            });
        }
    });
});


/** save unavailbility **/

$(document).on('click', '.saveFormAdmin', function(e) {
    e.preventDefault();
    var ClientsIds = [];
    if ($('.unabliable_check').is(":checked")) {
        ClientsIds.push($('.unabliable_check').val());
    }
    if (ClientsIds == '') {
        alert('select day first');
        return false;
    }
    var start_time = $('input[name=start_time]').val();
    var end_time = $('input[name=end_time]').val();
    if (start_time == '') {
        alert('please select start time');
        return false;
    } else if (end_time == '') {
        alert('please select end time');
        return false;
    }
    var options = {
        success: unavailableFormSuccess,
        dataType: 'JSON',
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-Token', getCookie('csrfToken'));
        },
    };
    $('#unavailableForm').ajaxSubmit(options);
});

function unavailableFormSuccess(responseText, statusText, xhr, $form) {
    $(document).find('form#unavailableForm').resetForm();
    $(document).find('div#Unavail').modal('hide');
}
