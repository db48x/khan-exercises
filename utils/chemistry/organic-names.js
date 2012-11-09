function join(parser) {
    return function () {
        var m = parser.apply(null, arguments);
        if (m) {
            return { matched: _.flatten(m.matched).join(""),
                     leftover: m.leftover };
        }
        return null;
    };
}

function token(matches) {
    if  (_.isString(matches)) {
        return function (text) {
            if (!text)
                return null;
            var matched = text.substr(0, matches.length);
            if (matched == matches)
                return { matched: matched,
                         leftover: text.substr(matches.length) };
            return null;
        };
    } else if (_.isRegExp(matches)) {
        return function (text) {
            if (!text)
                return null;
            var match = matches.exec(text);
            if (match && match[0])
                return { matched: match[0],
                         leftover: text.substr(match[0].length) };
            else
                return null;
        };
    }
}

function optional(parser) {
    return function (text) {
        var m;
        if ((m = (ensureParser(parser))(text))) {
            return m;
        } else {
            return { matched: null,
                     leftover: text };
        }
    };
}

function ensureParser(p) {
    return (typeof p != "function") ? token(p) : p;
}

function any() {
    var parsers = _.toArray(arguments);
    return function (text) {
        var p, m, i = 0;
        while ((p = ensureParser(parsers[i++]))) {
            if ((m = p(text))) {
                return m;
            }
        }
        return null;
    };
}

function sequence() {
    var parsers = _.toArray(arguments);
    return function(text) {
        var matched = [],
            leftover = text;
        var p, m, i = 0;
        while ((p = ensureParser(parsers[i++]))) {
            if ((m = p(leftover))) {
                matched.push(m.matched);
                leftover = m.leftover;
            } else {
                return null;
            }
        }
        if (matched.length > 0) {
            return { matched: matched,
                     leftover: leftover };
        }
        return null;
    };
}

function list(parser, separator) {
    // this is a bit of a hack, actually
    parser = ensureParser(parser);
    var sep = ensureParser(separator);
    return function(text) {
        var matched = [];
        var leftover_before = text,
            leftover_after = text;
        var m, s;
        while ((m = parser(leftover_after))) {
            leftover_before = m.leftover;
            matched.push(m.matched);
            if (separator) {
                if ((m = sep(leftover_before))) {
                    s = true;
                    leftover_after = m.leftover;
                } else {
                    leftover_after = leftover_before;
                    s = false;
                    break;
                }
            } else {
                leftover_after = leftover_before;
            }
        }
        if (matched.length > 0) {
            if (s) {
                return { matched: matched,
                         leftover: leftover_before };
            }
            return { matched: matched,
                     leftover: leftover_after };
        }
        return null;
    };
}

function separated_sequence(separator) {
    separator = ensureParser(separator);
    return function () {
        var parsers = _.toArray(arguments);
        return function(text) {
            var matched = [],
                leftover = text;
            var p, m, i = 0;
            while ((p = ensureParser(parsers[i++]))) {
                if ((m = p(leftover))) {
                    matched.push(m.matched);
                    leftover = m.leftover;
                    if (separator && i < parsers.length) {
                        if ((m = separator(leftover))) {
                            leftover = m.leftover;
                        } else {
                            break;
                        }
                    }
                } else {
                    return null;
                }
            }
            if (matched.length > 0) {
                return { matched: matched,
                         leftover: leftover };
            }
            return null;
        };
    };
}

function separated_list(separator) {
    return function (parser) {
        return list(parser, separator);
    };
}

var hyphenated_sequence = separated_sequence("-");
var commanated_sequence = separated_sequence(",");
var hyphenated_list = separated_list("-");
var commanated_list = separated_list(",");
var word_sequence = separated_sequence(/^[-\s]/);
var word_list = separated_list(/^[-\s]/);

var digit = token(/^\d/);
var number = join(list(digit));
var number_list = commanated_list(number);

function parseAction(actor) {
    return function (parser) {
        return function () {      
            var m = parser.apply(null, arguments);
            if (m) {
                return actor(m);
            }
            return null;
        };
    };
}

var actions = { render: { base_chain: parseAction(function (m) {
                                                      var ane = m.matched[2] == "ane",
                                                          size = countFromPrefix(ane ? m.matched[1] : m.matched[0][1]),
                                                          cyclic = !!(ane ? m.matched[0] : m.matched[0][0]),
                                                          bonds = m.matched[1] == "ane" ? [] : m.matched[1],
                                                          func = cyclic ? drawCyclicChain : drawStraightChain;
                                                      return { matched: function (svg) {
                                                                            return func(size, bonds).appendTo(svg);
                                                                        },
                                                               leftover: m.leftover };
                                                  }),
                          side_chain: parseAction(function (m) {
                                                      var size = countFromPrefix(m.matched[1][1]) + 1,
                                                          cyclic = !!m.matched[1][0],
                                                          bonds = m.matched[0],
                                                          func = cyclic ? drawCyclicChain : drawStraightChain;
                                                      return { matched: function (svg) {
                                                                            _.each(bonds, function (bond) {
                                                                                              var chain = func(size);
                                                                                              svg.append(chain);
                                                                                              position(chain,
                                                                                                       chainCoords(bond),
                                                                                                       [-45, 135][bond % 2]).appendTo(svg);
                                                                                          });
                                                                        },
                                                               leftover: m.leftover };
                                                  }),
                           molecule: parseAction(function (m) {
                                                     var base, sides;
                                                     if (typeof m.matched == "function") {
                                                         base = m.matched,
                                                         sides = m.matched.side_chains;
                                                     }
                                                     else {
                                                         base = m.matched[1],
                                                         sides = m.matched[0];
                                                     }
                                                     return function(svg) {
                                                         var group = position(base(svg), [chainCoords(2)[0], 
                                                                                          chainCoords(7)[1]], -45).appendTo(svg);
                                                         _.each(sides, function(s) { s(group); });
                                                     };
                                                 }) },

                make: { base_chain: parseAction(function (m) {
                                                    var ane = m.matched[2] == "ane";
                                                    var chain = { type: "base",
                                                                  size: countFromPrefix(ane ? m.matched[1] : m.matched[0][1]),
                                                                  cyclic: !!(ane ? m.matched[0] : m.matched[0][0]),
                                                                  bonds: { } };
                                                    if (!ane)
                                                        _.each(m.matched[1],
                                                               function (b) { chain.bonds[parseInt(b, 10)] = "double"; });
                                                    return { matched: chain,
                                                             leftover: m.leftover };
                                                }),
                        side_chain: parseAction(function (m) {
                                                    var chain = { type: "side",
                                                                  size: countFromPrefix(m.matched[1][1]),
                                                                  cyclic: !!m.matched[1][0],
                                                                  bonds: m.matched[0] };
                                                    return { matched: chain,
                                                             leftover: m.leftover };
                                                }),
                        molecule: parseAction(function (m) {
                                                  var base;
                                                  if ("type" in m.matched)
                                                      base = m.matched;
                                                  else
                                                      base = m.matched[1];
                                                  base.side_chains = base.side_chains || {};
                                                  var side_chains = m.matched[0];
                                                  _.each(side_chains,
                                                         function (chain) {
                                                             _.each(chain.bonds,
                                                                    function (site) {
                                                                        if (!_.isArray(base.side_chains[site]))
                                                                            base.side_chains[site] = [];
                                                                        base.side_chains[site].push({ type: chain.type,
                                                                                                      size: chain.size,
                                                                                                      cyclic: chain.cyclic
                                                                                                    });
                                                                    });
                                                         });
                                                  return base;
                                              }) } };

var prefixes = { "meth": 1, "eth": 2, "prop": 3, "but": 4, "pent": 5, "hex": 6, "hept": 7, "oct": 8, "non": 9, "dec": 10 };
function countFromPrefix(prefix) { return prefixes[prefix]; }
function grammar(action) {
    action = actions[action];
    var size_prefix = any("meth", "eth", "prop", "but", "pent", "hex", "hept", "oct", "non", "dec");
    var base_chain = (action.base_chain)(any(sequence(optional("cyclo"),
                                                      size_prefix,
                                                      "ane"),
                                             hyphenated_sequence(sequence(optional("cyclo"),
                                                                          size_prefix),
                                                                 number_list,
                                                                 "ene")));
    var side_chain = (action.side_chain)(hyphenated_sequence(number_list,
                                                             sequence(optional("cyclo"),
                                                                      size_prefix,
                                                                      "yl")));
    var molecule = (action.molecule)(any(base_chain,
                                         word_sequence(word_list(side_chain),
                                                       base_chain)));
    return molecule;
}

var renderMolecule = grammar("render");
var makeMolecule = grammar("make");

