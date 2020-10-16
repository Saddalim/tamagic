
let thermalCanvas = null;
let thermalCanvasDOM = null;

let thermalPoints = [];

let lastImageData = null;

//let thermalRedrawTimeout = null;
let roughRedrawResolution = 0.05;

let lSlider = null;
let lValueDisplay = null;
let cSlider = null;
let cValueDisplay = null;
let l2cValueDisplay = null;
let L = 0.24;
let C = 1;
let maxLift = 0.0;
let maxSink = 0.0;
let maxVY = 0.0;

let strengths = [];

let editThermalPoints = false;
let showGliderInThermal = false;
let showThermalStrength = true;
let editedThermalPoint = null;
let draggingThermalPoint = false;
let liveEditingThermalPoint = false;

function createArray(length)
{
    let arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        let args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}

function getImageDataIdx(imageData, x, y)
{
    return imageData.width * 4 * y + x * 4;
}

function setPixel(imageData, x, y, r, g, b)
{
    //console.log("setPixel(data, " + x + ", " + y + ", " + r + ", " + g + ", " + b + ")");
    let pixelStart = getImageDataIdx(imageData, x, y);
    imageData.data[pixelStart]     = r;
    imageData.data[pixelStart + 1] = g;
    imageData.data[pixelStart + 2] = b;
    imageData.data[pixelStart + 3] = 255;
}

function updateL()
{
    L = parseFloat(lSlider.val());
    lValueDisplay.html(L);
    delayedRedraw();
}

function updateC()
{
    C = parseFloat(cSlider.val());
    cValueDisplay.html(C);
    delayedRedraw();
}

function getStrengthAt(x, y)
{
    //console.log("getStrengthAt(" + x + ", " + y + ") returns " + strengths[x][y]);
    // Simple extrapolation for points out of viewport
    let idxX = Math.min(Math.max(x, 0), strengths.length - 1);
    let idxY = Math.min(Math.max(y, 0), strengths[idxX].length - 1);
    return strengths[idxX][idxY];
}

function redrawThermalCanvas(recalcThermal = true)
{
    adjustMaximums();

    thermalCanvasDOM = thermalCanvas[0];

    let width = thermalCanvas.width();
    let height = thermalCanvas.height();

    thermalCanvasDOM.width = width;
    thermalCanvasDOM.height = height;

    let ctx = thermalCanvasDOM.getContext('2d');

    console.log("Canvas size: " + width + " x " + height);

    if (recalcThermal)
    {
        let imageData = ctx.getImageData(0, 0, width, height);

        console.log("ImageData length = " + imageData.data.length);
        console.log("ImageData size = " + imageData.width + " x " + imageData.height);
        console.log("Canvas    WxH = " + width * height * 4);
        console.log("ImageData WxH = " + imageData.width * imageData.height * 4);


        const L2C = L * L * C;
        l2cValueDisplay.html(L2C);

        // When live editing (dragging a control), calculate with a much bigger grid to speed up responsibility
        const stepX = liveEditingThermalPoint ? Math.ceil(roughRedrawResolution * imageData.width) : 1;
        const stepY = liveEditingThermalPoint ? Math.ceil(roughRedrawResolution * imageData.height) : 1;
        const startX = liveEditingThermalPoint ? Math.floor(stepX / 2) : 0;
        const startY = liveEditingThermalPoint ? Math.floor(stepY / 2) : 0;

        for (let x = startX; x < imageData.width; x += stepX)
        {
            let scaledX = x / imageData.width;

            for (let y = startY; y < imageData.height; y += stepY)
            {
                let scaledY = y / imageData.height;
                let sumW = 0;
                let sumWO = 0;

                for (let i = 0; i < thermalPoints.length; ++i)
                {
                    let d = Math.sqrt(Math.pow(thermalPoints[i].x - scaledX, 2) + Math.pow(thermalPoints[i].y - scaledY, 2));
                    let w = Math.exp(-d * d / L2C);
                    let o = thermalPoints[i].s;
                    sumW += w;
                    sumWO += w * o;
                }

                // Barnes interpolation
                let strength = sumWO / sumW;
                let r = 0;
                let b = 0;

                if (strength > 0)
                {
                    r = (strength / maxVY) * 255;
                    b = 0;
                }
                else
                {
                    r = 0;
                    b = (strength / -maxVY) * 255;
                }

                if (liveEditingThermalPoint)
                {
                    // Color bigger rectangles
                    for (let rectY = y - startY; rectY <= y + startY; ++rectY)
                    {
                        for (let idx = getImageDataIdx(imageData, x - startX, rectY); idx <= getImageDataIdx(imageData, x + startX + startX, rectY); idx += 4)
                        {
                            imageData.data[idx]     = r;
                            imageData.data[idx + 1] = 0;
                            imageData.data[idx + 2] = b;
                            imageData.data[idx + 3] = 255;
                        }
                    }
                }
                else
                {
                    setPixel(imageData, x, y, r, 0, b);
                    //console.log(strengths);
                    if (y === 0) strengths[x] = [];
                    strengths[x][y] = strength;
                }


                //setPixel(imageData, x, y, (x / imageData.width) * 255, (y / imageData.width) * 255, 128);
            }
        }

        ctx.putImageData(imageData, 0, 0);
        lastImageData = imageData;
    }
    else
    {
        ctx.putImageData(lastImageData, 0, 0);
    }


    if (showGliderInThermal)
    {
        // Draw marker

        ctx.save();
        ctx.translate(sx_r(gliderX), sy(gliderY));
        ctx.rotate(gliderT);

        ctx.beginPath();
        ctx.moveTo(sx_r(-gliderW / 2), sy(gliderL / 2));
        ctx.lineTo(sx_r(0), sy(-gliderL / 2));
        ctx.lineTo(sx_r(gliderW / 2), sy(gliderL / 2));
        ctx.lineTo(sx_r(0), sy(gliderL / 2 - (gliderL * gliderIndent)));
        ctx.closePath();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.restore();
    }

    if (editThermalPoints || showThermalStrength)
    {
        const crossLength = 0.01;
        for (let i = 0; i < thermalPoints.length; ++i)
        {
            if (editThermalPoints)
            {
                ctx.beginPath();
                ctx.moveTo(sx(thermalPoints[i].x - crossLength), sy(thermalPoints[i].y - crossLength));
                ctx.lineTo(sx(thermalPoints[i].x + crossLength), sy(thermalPoints[i].y + crossLength));
                ctx.moveTo(sx(thermalPoints[i].x - crossLength), sy(thermalPoints[i].y + crossLength));
                ctx.lineTo(sx(thermalPoints[i].x + crossLength), sy(thermalPoints[i].y - crossLength));
                ctx.closePath();
                ctx.lineWidth = 5;
                ctx.strokeStyle = thermalPoints[i].selected ? 'rgb(255, 255, 255)' : 'rgb(180, 180, 255)';
                ctx.stroke();
            }
            if (showThermalStrength)
            {
                ctx.font = "20px Arial";
                ctx.fillStyle = "#ffffff";
                ctx.fillText(thermalPoints[i].s.toFixed(1), sx(thermalPoints[i].x + crossLength) + (editThermalPoints ? 6 : -20), sy(thermalPoints[i].y) + 6);
            }
        }
    }

}

function animateThermal()
{
    if (! showGliderInThermal) return;

    redrawThermalCanvas(false);
}

function adjustMaximums()
{
    maxLift = 0.0;
    maxSink = 0.0;

    for (let i = 0; i < thermalPoints.length; ++i)
    {
        if (thermalPoints[i].s >= 0.0) maxLift = Math.max(maxLift, thermalPoints[i].s);
        else maxSink = Math.min(maxSink, thermalPoints[i].s);
    }

    maxVY = Math.max(maxLift, -maxSink);

    //console.log("maxLift = " + maxLift + ", maxSink = " + maxSink + ", maxVY = " + maxVY);
}

function thermalOnMouseDown(evt)
{
    if (! editThermalPoints) return;
    let parentOffset = $(this).parent().offset();
    let x = ix(evt.pageX - parentOffset.left);
    let y = iy(evt.pageY - parentOffset.top);

    const tolerance = ix(20);
    for (var i = 0, found = false; i < thermalPoints.length; ++i)
    {
        thermalPoints[i].selected = false;

        if (!found)
        {
            let dist = Math.sqrt(Math.pow(thermalPoints[i].x - x, 2) + Math.pow(thermalPoints[i].y - y, 2));
            if (dist < tolerance)
            {
                thermalPoints[i].selected = true;
                editedThermalPoint = i;
                found = true;
            }
        }

    }

    if (found)
    {
        if (evt.which === 1)
        {
            $('#thermalEditSlider').val(thermalPoints[editedThermalPoint].s);
            $('#thermalPointEditor').show();
            liveEditingThermalPoint = true;
            draggingThermalPoint = true;
        }
        else if (evt.which === 2)
        {
            console.log("Delete point!");
            thermalPoints.splice(editedThermalPoint, 1);
            editedThermalPoint = null;
            liveEditingThermalPoint = false;
        }
    }
    else
    {
        if (evt.which === 1)
        {
            $('#thermalPointEditor').hide();
        }
        else if (evt.which === 2)
        {
            thermalPoints.push({x: x, y: y, s: 0.0, selected: false});
            editedThermalPoint = thermalPoints.length - 1;
            $('#thermalEditSlider').val(thermalPoints[editedThermalPoint].s);
            $('#thermalPointEditor').show();
        }
    }

    delayedRedraw();
}

function thermalOnMouseMove(evt)
{
    if (!draggingThermalPoint) return;
    if (editedThermalPoint == null) return;
    if (thermalPoints.length - 1 < editedThermalPoint) return;

    let parentOffset = $(this).parent().offset();
    let x = ix(evt.pageX - parentOffset.left);
    let y = iy(evt.pageY - parentOffset.top);

    thermalPoints[editedThermalPoint].x = x;
    thermalPoints[editedThermalPoint].y = y;

    delayedRedraw();
}

function thermalOnMouseUp(evt)
{
    draggingThermalPoint = false;
    liveEditingThermalPoint = false;

    delayedRedraw();
}

function updateThermalPoint()
{
    if (editedThermalPoint == null) return;
    if (thermalPoints.length - 1 < editedThermalPoint) return;
    thermalPoints[editedThermalPoint].s = parseFloat($('#thermalEditSlider').val());

    delayedRedraw();
}

$(function() {

    lSlider = $('input#lSlider');
    lValueDisplay = $('.lValueDisplay');
    cSlider = $('input#cSlider');
    cValueDisplay = $('.cValueDisplay');
    l2cValueDisplay = $('.l2cValueDisplay');

    lSlider.val(L).change();
    cSlider.val(C).change();

    thermalCanvas = $('canvas#thermalCanvas');
    thermalCanvasDOM = thermalCanvas[0];

    thermalCanvas.mousedown(thermalOnMouseDown);
    thermalCanvas.mousemove(thermalOnMouseMove);
    thermalCanvas.mouseup(thermalOnMouseUp);

    thermalPoints.push({x: 0.0,  y: 0.0,  s: -0.9, selected: false});
    thermalPoints.push({x: 0.55, y: 0.0,  s: -1.2, selected: false});
    thermalPoints.push({x: 0.0,  y: 0.45, s: -1.0, selected: false});
    thermalPoints.push({x: 1.0,  y: 0.65, s: 0.0,  selected: false});
    thermalPoints.push({x: 0.45, y: 1.0,  s: -0.5, selected: false});
    thermalPoints.push({x: 0.4,  y: 0.4,  s: 2.5,  selected: false});
    thermalPoints.push({x: 0.7,  y: 0.6,  s: 1.4,  selected: false});

    redrawThermalCanvas();

    $('#cbEnableThermalPointsEdit').change(function() {
        editThermalPoints = $('#cbEnableThermalPointsEdit').is(":checked");
        delayedRedraw();
    });

    $('#cbShowGliderInThermal').change(function() {
        showGliderInThermal = $('#cbShowGliderInThermal').is(":checked");
        delayedRedraw();
    });

    $('#cbShowThermalPointsVY').change(function() {
        showThermalStrength = $('#cbShowThermalPointsVY').is(":checked");
        delayedRedraw();
    });

    $('#thermalEditSlider').mousedown(function() { liveEditingThermalPoint = true; }).mouseup(function() { liveEditingThermalPoint = false; });

    //$('canvas').resize(delayedRedraw);
    //$(window).resize(delayedRedraw);

    setInterval(animateThermal, 20);

});