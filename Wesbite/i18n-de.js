/* Pathway Real Estate: German helpers for the pages under /de/
 * Number and price formats, plus German names for the fixed terms that come from the portal
 * (tags, categories, amenities, unit types ...). A term that is not in the list is shown as entered.
 */
(function () {
  var TERMS = {
    // listing tags
    'Beachfront': 'Strandlage', 'Beach Access': 'Strandzugang', 'Boat Dock': 'Bootsanleger', 'Deep Sea': 'Tiefes Wasser',
    'Directly at the Highway': 'Direkt am Highway', 'Fruit Trees': 'Obstbäume', 'Mountain View': 'Bergblick',
    'Near to Beach': 'Strandnähe', 'Near Beach': 'Strandnähe', 'Near Town Center': 'Zentrumsnähe', 'Near Airport': 'Flughafennähe',
    'Ocean View': 'Meerblick', 'Sea View': 'Meerblick', 'Sunset View': 'Blick auf den Sonnenuntergang', 'Pool': 'Pool',
    'Ready to Operate': 'Betriebsbereit', 'River Access': 'Flusszugang', 'Road Access': 'Straßenanbindung',
    'Titled': 'Mit Titel', 'Clean Title': 'Lastenfreier Titel', 'Villa': 'Villa', 'Garden': 'Garten', 'Furnished': 'Möbliert',
    'Fenced': 'Eingezäunt', 'Waterfront': 'Am Wasser', 'Hillside': 'Hanglage', 'Quiet Area': 'Ruhige Lage',
    'Island': 'Insel', 'Mangroves': 'Mangroven', 'Investment': 'Kapitalanlage', 'Tax Declaration': 'Tax Declaration',
    // categories and types
    'Land / Lot': 'Grundstück', 'Lot': 'Grundstück', 'Land': 'Grundstück', 'House': 'Haus', 'House & Lot': 'Haus mit Grundstück',
    'Hotel': 'Hotel', 'Resort': 'Resort', 'Hotel/Resort': 'Hotel/Resort', 'Condo': 'Wohnung', 'Apartment': 'Apartment',
    'Farmland': 'Agrarfläche', 'Commercial Building': 'Gewerbeimmobilie', 'Warehouse': 'Lagerhalle',
    'Residential': 'Wohnen', 'Commercial': 'Gewerbe', 'Agricultural': 'Landwirtschaft',
    // utilities
    'Connection possible': 'Anschluss möglich', 'Grid connection': 'Netzanschluss', 'Generator': 'Generator',
    'Solar': 'Solar', 'None': 'Nicht vorhanden', 'Water connection': 'Wasseranschluss', 'Well': 'Brunnen',
    'Deep well': 'Tiefbrunnen', 'Rainwater': 'Regenwasser',
    // condo amenities
    '24/7 Security': 'Sicherheitsdienst rund um die Uhr', 'Backup generator': 'Notstromaggregat', 'Balcony': 'Balkon',
    'CCTV': 'Videoüberwachung', 'Day care': 'Kinderbetreuung', 'Elevator': 'Aufzug', 'Function room': 'Veranstaltungsraum',
    'Gym': 'Fitnessraum', 'Jacuzzi': 'Whirlpool', 'Laundry': 'Waschraum', 'Lobby/Reception': 'Lobby/Rezeption',
    'Parking': 'Parkplätze', 'Playground': 'Spielplatz', 'Sauna': 'Sauna', 'Swimming pool': 'Swimmingpool', 'Wi-Fi': 'WLAN',
    // unit types and completion
    'Studio': 'Studio', '1-BR': '1 Schlafzimmer', '2-BR': '2 Schlafzimmer', '3-BR': '3 Schlafzimmer',
    'Pre-selling': 'Im Vorverkauf', 'Ready for occupancy (RFO)': 'Bezugsfertig (RFO)', 'RFO': 'Bezugsfertig',
    'Under construction': 'Im Bau',
    // listing status
    'Sold': 'Verkauft', 'Reserved': 'Reserviert'
  };

  var LOWER = {};
  Object.keys(TERMS).forEach(function (k) { LOWER[k.toLowerCase()] = TERMS[k]; });

  function term(s) {
    if (s === null || s === undefined || s === '') return s;
    var k = String(s).trim();
    if (Object.prototype.hasOwnProperty.call(TERMS, k)) return TERMS[k];
    var l = k.toLowerCase();       // "Road access" and "Road Access" are the same tag
    return Object.prototype.hasOwnProperty.call(LOWER, l) ? LOWER[l] : s;
  }
  // 1234.5 -> "1.234,5" (up to two decimals)
  function n(v) {
    var x = Number(v);
    return isFinite(x) ? x.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : String(v);
  }
  // price that is already converted into the chosen currency
  function price(symbol, v) {
    if (v >= 1000000) return symbol + ' ' + (v / 1000000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Mio.';
    return symbol + ' ' + Math.round(v).toLocaleString('de-DE');
  }

  window.DE = { term: term, n: n, price: price };
})();
