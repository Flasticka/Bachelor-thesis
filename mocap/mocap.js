/*
    Authors:
        Jan Sedmidubsky, Brno, Czech Republic, sedmidubsky@gmail.com
*/

/********************* CONSTANTS *********************/

var fps = -1;
var numberOfSkippedFramesToDisplay = -1;
var subsequenceWindowSize = 100;
var minDiff = 100;
var maxRange = 500;

var bonesVicon = [
    {a: 0, b: 1}, {a: 1, b: 2}, {a: 2, b: 3}, {a: 3, b: 4}, {a: 4, b: 5}, // leg
    {a: 0, b: 6}, {a: 6, b: 7}, {a: 7, b: 8}, {a: 8, b: 9}, {a: 9, b: 10}, // leg
    {a: 0, b: 11}, {a: 11, b: 12}, {a: 12, b: 13}, {a: 13, b: 14}, {a: 14, b: 15}, {a: 15, b: 16}, // torso + head
    {a: 13, b: 17}, {a: 17, b: 18}, {a: 18, b: 19}, {a: 19, b: 20}, {a: 20, b: 21}, {a: 21, b: 22}, {a: 20, b: 23}, // hand
    {a: 13, b: 24}, {a: 24, b: 25}, {a: 25, b: 26}, {a: 26, b: 27}, {a: 27, b: 28}, {a: 28, b: 29}, {a: 27, b: 30}]; // hand

var bonesKinect = [
    {a: 0, b: 1}, {a: 1, b: 2}, {a: 2, b: 3}, {a: 3, b: 4}, // leg
    {a: 0, b: 6}, {a: 6, b: 7}, {a: 7, b: 8}, {a: 8, b: 9}, // leg
    {a: 0, b: 11}, {a: 11, b: 13}, {a: 13, b: 14}, {a: 14, b: 16}, // torso + head
    {a: 13, b: 17}, {a: 17, b: 18}, {a: 18, b: 19}, {a: 19, b: 21}, {a: 21, b: 22}, {a: 21, b: 23}, // hand
    {a: 13, b: 24}, {a: 24, b: 25}, {a: 25, b: 26}, {a: 26, b: 28}, {a: 28, b: 29}, {a: 28, b: 30}]; // hand


/********************* VARIABLES *********************/

var px = 0;
var py = 0;
var rotating = false;


/********************* FUNCTIONS *********************/

function onCanvasMouseDown(event) {
    event.preventDefault();
    px = event.pageX;
    py = event.pageY;
    rotating = true;
}

function onCanvasMouseUp(event) {
    event.preventDefault();
    rotating = false;
}

function showFrame(k3dController, frames, frameIndex) {
    k3dController.objects = [];
    k3dController.addK3DObject(frames[frameIndex]);
    k3dController.frame();
}

function setSubsequenceLinkAction(searchLinkElementID, sequenceID, parentOffset, rangeFromElementID, rangeToElementID, action) {
    var searchLinkElement = document.getElementById(searchLinkElementID);
    var rangeFrom = parseInt($("#" + rangeFromElementID).text());
    var rangeTo = parseInt($("#" + rangeToElementID).text());
    var subseqOffset = parentOffset + rangeFrom;
    var subseqSize = rangeTo - rangeFrom;
    if (subseqSize < minDiff) {
        alert("Query motion must be longer than 100 frames!");
        return false;
    }
    searchLinkElement.href = action + "?sequenceLocator=" + sequenceID + "&offset=" + subseqOffset + "&size=" + subseqSize;
    return true;
}

function setSubsequenceLink(searchLinkElementID, sequenceID, parentOffset, rangeFromElementID, rangeToElementID) {
    return setSubsequenceLinkAction(searchLinkElementID, sequenceID, parentOffset, rangeFromElementID, rangeToElementID, "similar");
}

function appendLinkParams(linkElement) {
    var linkParams = ['sequenceLocator', 'annotationClassID'];
    var formJQuerySliderParams = ['modalityWeight'];
    linkParams.forEach(function (entry) {
        var element = document.getElementById(entry);
        if (element !== null && linkElement.href.indexOf(entry) === -1) {
            linkElement.href = linkElement.href + "&" + entry + "=" + element.value;
        }
    });
    formJQuerySliderParams.forEach(function (entry) {
        if ($("#"+entry).length > 0 && linkElement.href.indexOf(entry) === -1) {
            linkElement.href = linkElement.href + "&" + entry + "=" + $("#"+entry).slider("option", "value");
        }
    });
    return true;
}

function animateStep(sliderId, frame, frameEnd) {
    console.log($(sliderId).slider("option", "canvas"))
    if ($(sliderId).slider("option", "range")) {
        $(sliderId).slider("values", [frame, frame]);
    } else {
        $(sliderId).slider("value", frame);
    }
    showFrame($(sliderId).slider("option", "canvas"), $(sliderId).slider("option", "frames"), frame);
    frame += (numberOfSkippedFramesToDisplay + 1);
    if (frame < frameEnd && !$(sliderId).slider("option", "stopAnimation")) {
        setTimeout(function () {
            animateStep(sliderId, frame, frameEnd);
        }, 1000 / (fps / (numberOfSkippedFramesToDisplay + 1)));
    } else {
        if ($(sliderId).slider("option", "range")) {
            $(sliderId).slider("values", $(sliderId).slider("option", "prePlayPosition"));
        } else {
            $(sliderId).slider("value", $(sliderId).slider("option", "prePlayPosition"));
        }
        $(sliderId).slider("option", "animationInProgress", false);
        $(sliderId).slider("option", "stopAnimation", false);
        var motionId = sliderId.substring("#slider-range".length);
        $("#play" + motionId).removeClass("stop-replay");
        $("#playSelection" + motionId).removeClass("stop-replay");
    }
}

function play() {
    var motionId = $(this).attr("id").substring("play".length);
    var sliderId = "#slider-range" + motionId;
    if (!$(sliderId).slider("option", "animationInProgress")) {
        if ($(sliderId).slider("option", "range")) {
            $(sliderId).slider("option", "prePlayPosition", $(sliderId).slider("values"));
        } else {
            $(sliderId).slider("option", "prePlayPosition", $(sliderId).slider("value"));
        }
        $(sliderId).slider("option", "animationInProgress", true);
        animateStep(sliderId, 0, $(sliderId).slider("option", "max"));
        $("#play" + motionId).addClass("stop-replay");
        $("#playSelection" + motionId).addClass("stop-replay");
    } else {
        $(sliderId).slider("option", "stopAnimation", true);
    }
}

function playSelection() {
    var motionId = $(this).attr("id").substring("playSelection".length);
    var sliderId = "#slider-range" + motionId;
    if (!$(sliderId).slider("option", "animationInProgress")) {
        $(sliderId).slider("option", "prePlayPosition", $(sliderId).slider("values"));
        $(sliderId).slider("option", "animationInProgress", true);
        animateStep(sliderId, $(sliderId).slider("values")[0], $(sliderId).slider("values")[1]);
        $("#play" + motionId).addClass("stop-replay");
        $("#playSelection" + motionId).addClass("stop-replay");
    } else {
        $(sliderId).slider("option", "stopAnimation", true);
    }
}

function slideWithoutRange(event, ui) {
    showFrame($(this).slider("option", "canvas"), $(this).slider("option", "frames"), ui.value);
}

function slide(event, ui) {
    var minDiff = $(this).slider("option", "minDiff");
    var maximum = $(this).slider("option", "max");

    if (ui.value === ui.values[0]) {
        //start point move
        if (ui.values[1] - ui.values[0] <= minDiff) {
            ui.values[1] = ui.values[0] + minDiff;
            if (ui.values[1] >= maximum) {
                ui.values[1] = maximum;
                //ui.values[0]=ui.values[1]-minDiff;
            }
            event.preventDefault();
        } else {
            ui.values[1] = ui.values[0] + $(this).slider("option", "lastDiff");
        }
        $(this).slider("values", ui.values);
    } else {
        //end point move
        if (ui.values[1] - ui.values[0] < minDiff || ui.values[1] - ui.values[0] > maxRange) {
            event.preventDefault();
            return;
        }
    }
    $("#rangeFrom" + $(this).slider("option", "sequenceId")).text(ui.values[0]);
    $("#rangeTo" + $(this).slider("option", "sequenceId")).text(ui.values[1]);
    $(this).slider("option", "lastDiff", ui.values[1] - ui.values[0]);
    showFrame($(this).slider("option", "canvas"), $(this).slider("option", "frames"), ui.value);
}

$(function () {
    $(".play-sequence").click(play);
    $(".play-selection").click(playSelection);
});