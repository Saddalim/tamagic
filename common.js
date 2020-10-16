
let taRedrawTimeout = null;
let thermalRedrawTimeout = null;

function sx(x)
{
    return x * thermalCanvasDOM.width;
}

function sx_r(x)
{
    return x * thermalCanvasDOM.height;
}

function sy(y)
{
    return y * thermalCanvasDOM.height;
}

function ix(x)
{
    return x / thermalCanvasDOM.width;
}

function ix_r(x)
{
    return x / thermalCanvasDOM.height;
}

function iy(y)
{
    return y / thermalCanvasDOM.height;
}

function delayedRedraw()
{
    if (thermalRedrawTimeout !== null) clearTimeout(thermalRedrawTimeout);
    thermalRedrawTimeout = setTimeout(redrawThermalCanvas, 20);

    if (taRedrawTimeout !== null) clearTimeout(taRedrawTimeout);
    taRedrawTimeout = setTimeout(redrawTACanvas, 20);
}

$(function() {

    $(window).resize(delayedRedraw);

});