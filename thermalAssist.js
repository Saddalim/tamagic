
let taCanvas = null;
let taCanvasDOM = null;

const defaultGliderX = 0.2;
const defaultGliderY = 0.5;
const defaultGliderT = 0.0; // [rad]
const defaultGliderV = 0.05; // [canvasY/sec]
const defaultGliderO = 0.3; // [rad/s]

let gliderX = defaultGliderX;
let gliderY = defaultGliderY;
let gliderT = defaultGliderT;
let gliderV = defaultGliderV;
let gliderO = defaultGliderO;

let circleInterval = 600; // [ms]
let circleCount = 40;
let circleCounter = 0;
let circles = [];
let peaks = [];

const gliderAnimateInterval = 20; // [ms]
const gliderW = 0.04;
const gliderL = 0.049;
const gliderIndent = 0.22;

let keyO = 0.38;
let keyOActive = false;

let fixViewToGlider = false;

const varioUpdateInterval = 500;
let varioUpdateCounter = 0;

let varioHistory = [];
let varioAvgTime = 5000;
let altitudeGained = 0.0;

let varioCurrentGauge = null;
let varioAverageGauge = null;
let altitudeGainedGauge = null;
let varioAvgTimeSlider = null;
let varioAvgTimeValueDisplay = null;
let vSlider = null;
let vValueDisplay = null;
let oSlider = null;
let oValueDisplay = null;
let keyOSlider = null;
let keyOValueDisplay = null;
let dotIntSlider = null;
let dotIntValueDisplay = null;
let dotCntSlider = null;
let dotCntValueDisplay = null;

function redrawTACanvas()
{
    let width = taCanvas.width();
    let height = taCanvas.height();

    taCanvasDOM.width = width;
    taCanvasDOM.height = height;

    let ctx = taCanvasDOM.getContext('2d');

    //console.log(gliderX + " " + gliderY + " " + gliderT);

    // POINTS

    let maxLift = 0.0;
    let maxSink = 0.0;
    for (let i = 0; i < circles.length; ++i)
    {
        if (circles[i].s >= 0.0) maxLift = Math.max(maxLift, circles[i].s);
        else maxSink = Math.min(maxSink, circles[i].s);
    }
    let maxVario = Math.max(maxLift, -maxSink);

    for (let i = 0; i < circles.length; ++i)
    {
        ctx.save();

        if (fixViewToGlider)
        {
            // TODO ugly, refactor to matrices
            let dX = gliderX - circles[i].x;
            let dY = gliderY - circles[i].y;
            let c = Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2));
            let alpha = Math.atan2(dY, dX);
            let beta = gliderT - alpha;
            let gamma = Math.PI / 2 - beta;
            let x = c * Math.cos(beta);
            let y = c * Math.cos(gamma);
            ctx.translate(taCanvasDOM.width / 2 - sx_r(x), taCanvasDOM.height / 2 + sy(y));

        }
        else
        {
            ctx.translate(sx_r(circles[i].x), sy(circles[i].y));
        }

        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = circles[i].s >= 0.0 ? "rgb(0, " + ((circles[i].s / maxLift) * 255) + ", 0)" : "rgb(" + ((circles[i].s / maxSink) * 255) + ", 0, 0)";
        ctx.fill();

        ctx.restore();
    }

    // PEAKS

    for (let i = 0; i < peaks.length; ++i)
    {
        ctx.save();

        if (fixViewToGlider)
        {
            // TODO ugly, refactor to matrices
            let dX = gliderX - peaks[i].x;
            let dY = gliderY - peaks[i].y;
            let c = Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2));
            let alpha = Math.atan2(dY, dX);
            let beta = gliderT - alpha;
            let gamma = Math.PI / 2 - beta;
            let x = c * Math.cos(beta);
            let y = c * Math.cos(gamma);
            ctx.translate(taCanvasDOM.width / 2 - sx_r(x), taCanvasDOM.height / 2 + sy(y));

        }
        else
        {
            ctx.translate(sx_r(peaks[i].x), sy(peaks[i].y));
        }

        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 34, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
        ctx.font = "20px Arial";
        ctx.fillText(peaks[i].s.toFixed(1), 24, -24);

        ctx.restore();
    }

    // Draw marker

    ctx.save();

    if (fixViewToGlider)
    {
        ctx.translate(taCanvasDOM.width / 2, taCanvasDOM.height / 2);
    }
    else
    {
        ctx.translate(sx_r(gliderX), sy(gliderY));
        ctx.rotate(gliderT);
    }

    ctx.beginPath();
    ctx.moveTo(sx_r(-gliderW / 2), sy(gliderL / 2));
    ctx.lineTo(sx_r(0), sy(-gliderL / 2));
    ctx.lineTo(sx_r(gliderW / 2), sy(gliderL / 2));
    ctx.lineTo(sx_r(0), sy(gliderL / 2 - (gliderL * gliderIndent)));
    ctx.closePath();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = "#999999";
    ctx.fill();

    ctx.restore();

}

function clearNearbyPeaks(x, y, tolerance = 0.1, minAge = 5)
{
    //console.log("Peaks cnt before = " + peaks.length);
    for (let i = 0; i < peaks.length - minAge; ++i)
    {
        let d = Math.sqrt(Math.pow(peaks[i].x - x, 2) + Math.pow(peaks[i].y - y, 2));
        //console.log("D to " + i + " (s = " + peaks[i].s.toFixed(1) + ") = " + d);
        if (d < tolerance)
        {
            //console.log("Removing peak " + i + " (s = " + peaks[i].s.toFixed(1) + ")");
            peaks.splice(i, 1);
        }
    }
    //console.log("Peaks cnt after = " + peaks.length);
}

function setGauge(gauge, value)
{
    gauge.html(value.toFixed(1));
    if (value > 0.0) gauge.removeClass('sinking').addClass('rising');
    else if (value < 0.0) gauge.removeClass('rising').addClass('sinking');
}

function animate()
{

    if (gliderV === 0.0) return;

    let d = iy(gliderV * taCanvasDOM.height) * (gliderAnimateInterval / 1000);

    //console.log(iy(gliderV * taCanvasDOM.height) + " " + (gliderAnimateInterval / 1000));


    gliderX += d * Math.sin(gliderT);
    gliderY -= d * Math.cos(gliderT);
    gliderT += gliderO * (gliderAnimateInterval / 1000);

    let strength = getStrengthAt(Math.round(sx_r(gliderX)), Math.round(sy(gliderY)));

    altitudeGained += strength * (gliderAnimateInterval / 1000);

    if (varioUpdateCounter > varioUpdateInterval)
    {
        setGauge(varioCurrentGauge, strength);
        setGauge(altitudeGainedGauge, altitudeGained);

        varioHistory.push(strength);

        let varioHistoryMaxCnt = varioAvgTime / varioUpdateInterval;
        if (varioHistory.length >= varioHistoryMaxCnt)
        {
            varioHistory.splice(0, varioHistory.length - varioHistoryMaxCnt + 1);
        }

        let varioAvg = 0.0;
        for (let i = 0; i < varioHistory.length; ++i)
        {
            varioAvg += varioHistory[i];
        }
        varioAvg /= varioHistory.length;

        //console.log("Vario avg time = " + varioAvgTime + ", interval = " + varioUpdateInterval + ", l = " + varioHistory.length);

        setGauge(varioAverageGauge, varioAvg);

        varioUpdateCounter = 0;
    }

    circleCounter += gliderAnimateInterval;
    varioUpdateCounter += gliderAnimateInterval;

    if (circleCounter > circleInterval)
    {
        if (circles.length >= circleCount)
        {
            if (circles[0].hasPeak === true) clearNearbyPeaks(circles[0].x, circles[0].y, 0.01);
            circles.splice(0, circles.length - circleCount + 1);
        }


        circles.push({x: gliderX, y: gliderY, s: strength});

        if (circles.length >= 3 && circles[circles.length - 3].s < circles[circles.length - 2].s && circles[circles.length - 2].s > circles[circles.length - 1].s)
        {
            let peakX = circles[circles.length - 2].x;
            let peakY = circles[circles.length - 2].y;

            clearNearbyPeaks(peakX, peakY, 0.1, 0);

            peaks.push({x: peakX, y: peakY, s: strength});
            circles[circles.length - 2].hasPeak = true;
        }
        else
        {
            // If no peak is here, clear older ones that might be around here
            clearNearbyPeaks(gliderX, gliderY, 0.05, Math.round(1000 / circleInterval));
        }

        circleCounter = 0;
    }

    redrawTACanvas();

    //console.log(gliderX + " " + gliderY + " " + gliderT);
}

function updateV()
{
    gliderV = parseFloat(vSlider.val());
    vValueDisplay.html(gliderV);
}

function updateO()
{
    gliderO = parseFloat(oSlider.val());
    oValueDisplay.html(gliderO);
}

function updateDotInt()
{
    circleInterval = parseInt(dotIntSlider.val());
    dotIntValueDisplay.html(circleInterval);
}

function updateDotCnt()
{
    circleCount = parseInt(dotCntSlider.val());
    dotCntValueDisplay.html(circleCount);
}

function updateVarioAvgTime()
{

    varioAvgTime = parseInt(varioAvgTimeSlider.val());
    varioAvgTimeValueDisplay.html(varioAvgTime);
}

function clearDots()
{
    circles = [];
    peaks = [];
}

function resetGliderPos()
{
    gliderX = defaultGliderX;
    gliderY = defaultGliderY;
    gliderT = defaultGliderT;
}

function resetGliderVel()
{
    vSlider.val(defaultGliderV).change();
    oSlider.val(defaultGliderO).change();
}

function resetGliderAll()
{
    resetGliderPos();
    resetGliderVel();
}

function updateKeyO()
{
    keyO = parseFloat(keyOSlider.val());
    keyOValueDisplay.html(keyO);
}

function onKeyDown(evt)
{
    switch (evt.which)
    {
        // Up / W
        case 38:
        case 87:
            vSlider.val(gliderV + 0.01).change();
            break;
        // Left / A
        case 37:
        case 65:
            oSlider.val(-keyO).change();
            keyOActive = true;
            break;
        // Right / D
        case 39:
        case 68:
            oSlider.val(keyO).change();
            keyOActive = true;
            break;
        // Down / S
        case 40:
        case 83:
            vSlider.val(gliderV - 0.01).change();
            break;
    }
}

function onKeyUp(evt)
{
    switch (evt.which)
    {
        case 37:
        case 65:
        case 39:
        case 68:
            oSlider.val(0).change();
            keyOActive = false;
            break;
    }

}

$(function() {

    taCanvas = $('canvas#taCanvas');
    taCanvasDOM = taCanvas[0];

    vSlider = $('input#vSlider');
    vValueDisplay = $('.vValueDisplay');
    oSlider = $('input#oSlider');
    oValueDisplay = $('.oValueDisplay');
    keyOSlider = $('input#keyOSlider');
    keyOValueDisplay = $('.keyOValueDisplay');

    dotIntSlider = $('input#dotIntSlider');
    dotIntValueDisplay = $('.dotIntValueDisplay');
    dotCntSlider = $('input#dotCntSlider');
    dotCntValueDisplay = $('.dotCntValueDisplay');

    varioAvgTimeSlider = $('input#varioAvgTimeSlider');
    varioAvgTimeValueDisplay = $('.varioAvgTimeValueDisplay');
    varioCurrentGauge = $('#varioCurrentGauge');
    varioAverageGauge = $('#varioAverageGauge');
    altitudeGainedGauge = $('#altitudeGainedGauge');

    vSlider.val(gliderV).change();
    oSlider.val(gliderO).change();
    keyOSlider.val(keyO).change();
    dotIntSlider.val(circleInterval).change();
    dotCntSlider.val(circleCount).change();
    varioAvgTimeSlider.val(varioAvgTime).change();

    $('#cbFixViewToGlider').change(function() {
        fixViewToGlider = $('#cbFixViewToGlider').is(":checked");
        delayedRedraw();
    });

    $(window).keydown(onKeyDown);
    $(window).keyup(onKeyUp);

    setInterval(animate, gliderAnimateInterval);

    redrawTACanvas();

});
