var scale = 50,
    stroke = 2;

function $$(tag, attributes) {
    var svgns = "http://www.w3.org/2000/svg";
    var element = document.createElementNS(svgns, tag);
    if (tag == "svg")
        element.setAttribute("xmlns", svgns);
    _.each(attributes,
           function (value, name) {
               //element.setAttributeNS(svgns, name, value);
               element.setAttribute(name, value);
           });
    return $(element);
}

function renderTestMolecule(molecule) {
    var svg = $$("svg",
                 { width: "10cm", height: "10cm",
                   version: "1.1" }).appendTo(".question");
    var bounds = chainCoords(7);
    svg.get(0).viewport.width = bounds[0];
    svg.get(0).viewport.height = bounds[1];
    var base = drawStraightChain(7);
    svg.append(base);
    var g = position(base, chainCoords(7), -45).appendTo(svg);
    var side1 = drawStraightChain(3);
    svg.append(side1);
    g.append(position(side1, chainCoords(4), -45));
    var side2 = drawStraightChain(2);
    svg.append(side2);
    g.append(position(side2, chainCoords(3), 135));
    return svg;
}

function toSVG(renderer) {
    var svg = $$("svg",
                 { width: "12cm", height: "12cm",
                   version: "1.1" }).appendTo(".question");
    var bounds = chainCoords(10);
    svg.get(0).viewport.width = bounds[0];
    svg.get(0).viewport.height = bounds[1];
    renderer(svg);
}

function position(element, translation, rotation) {
    var g = $$("g");
    if (translation) {
        var tr = element.get(0).ownerSVGElement.createSVGTransform();
        tr.setTranslate(translation[0], translation[1]);
        g.get(0).transform.baseVal.appendItem(tr);
    }
    if (rotation) {
        var r = element.get(0).ownerSVGElement.createSVGTransform();
        r.setRotate(rotation, 0, 0);
        g.get(0).transform.baseVal.appendItem(r);
    }
    g.append(element);
    return g;
}

function drawStraightChain(n) {
    var bounds = chainCoords(n);
    var lines = [];
    for (var i = 1; i <= n; i++) {
        var c = chainCoords(i);
        lines.push("L "+ c[0] +" "+ c[1]);
    }
    var path = $$("path",
                  { d: "M 0 0 "+ lines.join(" "),
                    stroke: "black",
                    "stroke-width": stroke,
                    fill: "none" });
    return path;
}

function chainCoords(n) {
    return [Math.ceil((n - 1) / 2)*scale+(stroke/2),
            Math.floor((n - 1) / 2)*scale+(stroke/2)];
}
