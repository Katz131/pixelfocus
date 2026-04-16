/* =============================================================================
 *  patsy-names.js  —  v3.20.31
 *
 *  Patsies, in the Ratiocinatory, are the bodies commissioned to absorb
 *  cognitive blame on behalf of chartered panels of inquiry. They have
 *  NAMES — a very large multi-regional pool, no duplicates — so the UI
 *  can surface a commissioned individual rather than a tally on a page.
 *
 *  Name style braids many voices, all filtered through Wes Anderson-style
 *  tastefulness: distinguished, slightly esoteric, the sort of names that
 *  could plausibly appear on a brass nameplate in a two-person research
 *  office above a bookbinder's in Trieste.
 *
 *    - Bureaucratic ghost                 (Delmar, Opal, Thaddeus)
 *    - Wes Anderson lobby-brass           (Ignatius, Genevieve, Fenstermacher)
 *    - Stranger than Fiction / science    (Crick, Pascal, Hilbert, Escher)
 *    - Italian scholar-bureaucrat         (Giancarlo Castellani, Ottavio Palladio)
 *    - Russian/Soviet intelligentsia      (Arkady Vorontsov, Dmitri Pasternak)
 *    - Ukrainian                          (Bohdan Hrushevsky, Taras Kotlyarevsky)
 *    - Old-guard distinguished American   (Chauncey Thornburgh, Winthrop Peabody)
 *    - Chinese literary-scholar           (Zhenyuan Huang, Shaoyuan Ouyang)
 *    - Australian colonial-academic       (Banjo Flinders, Hamish Drysdale)
 *    - South African Afrikaner            (Stephanus Coetzee, Hendrik Pretorius)
 *
 *  UNIQUENESS GUARANTEE: every entry in the pool is distinct. The pool is
 *  built by walking a deterministically shuffled permutation of the full
 *  (first x last) Cartesian grid, so the same pair is never emitted twice.
 *  The shuffle seed is a constant, so "patsy #42" stays patsy #42 across
 *  reloads.
 *
 *  Usage:
 *    PatsyNames.list()               -> full flat list
 *    PatsyNames.count()              -> total number in the pool
 *    PatsyNames.pickStable(seed)     -> deterministic pick for a seed integer
 *    PatsyNames.pickRandom()         -> random pick, per-call
 *    PatsyNames.pickUnique(usedSet)  -> first pool entry not in the provided
 *                                       Set/Array; falls back to suffixing
 *                                       a roman numeral if the whole pool
 *                                       is exhausted
 *    PatsyNames.stats()              -> { firstNames, lastNames, combinationsAvailable, pool }
 * ============================================================================= */

(function () {
  'use strict';

  var FIRSTS = [
    // ---- Bureaucratic ghosts ----
    'Delmar','Ellsworth','Harvey','Marvin','Clyde','Orville','Leland',
    'Dwight','Howard','Sheldon','Raymond','Clifford','Wendell','Kenneth',
    'Bernard','Gaylord','Herbert','Milton','Russell','Warren','Wilbur',
    'Ernest','Stanley','Ralph','Melvin','Arnold','Irving','Leonard',
    'Willard','Vernon','Carlton','Hubert','Roland','Merle','Elmer',
    'Lyle','Floyd','Otis','Hiram','Ezra','Lowell','Cletus','Rudolph',
    'Edwin','Mervyn','Thaddeus','Percival','Archibald','Cornelius',
    'Gertrude','Mildred','Bernice','Dorothy','Imogene','Eunice','Vera',
    'Wilhelmina','Edna','Agnes','Hazel','Mabel','Hortense','Henrietta',
    'Minerva','Opal','Lavinia','Beulah','Phyllis','Norma','Enid',
    'Myrna','Doris','Olive','Pearl','Ethel','Leona','Cordelia',
    'Prudence','Ingrid','Myra',
    // ---- Wes Anderson lobby-brass (men) ----
    'Algernon','Alistair','Ambrose','Ansel','Atticus','Augustin','Barnaby',
    'Bartholomew','Basil','Benedict','Bertram','Cedric','Clarence','Cosmo',
    'Corbin','Desmond','Emmett','Emeric','Fitzwilliam','Gaspar','Gervais',
    'Gideon','Horace','Hugo','Ignatius','Ives','Jasper','Julius','Lars',
    'Linus','Lionel','Lucien','Ludovic','Magnus','Montgomery','Mortimer',
    'Oswald','Oswin','Quentin','Reginald','Remi','Rhodes','Roderick',
    'Rupert','Rutherford','Septimus','Silas','Theodore','Tobias','Ulysses',
    'Virgil','Waldo','Wilhelm','Zephyr','Ferdinand','Dashiell','Emil',
    // ---- Wes Anderson lobby-brass (women) ----
    'Adelaide','Agatha','Beatrix','Bettina','Celeste','Clementine','Cosette',
    'Daphne','Delphine','Edwina','Esme','Estelle','Evangeline','Genevieve',
    'Gisela','Greta','Honoria','Imelda','Iris','Josephine','Lenore','Maud',
    'Mirabel','Odette','Philomena','Rosalind','Sybil','Sybilla','Tabitha',
    'Theodora','Ursula','Violetta','Winifred','Harriet','Harlow',
    // ---- Italy: scholar-bureaucrat ----
    'Giancarlo','Lorenzo','Cosimo','Ottavio','Rinaldo','Calogero','Fiorenzo',
    'Edoardo','Vincenzo','Silvio','Enzo','Massimo','Ambrogio','Alessandro',
    'Guglielmo','Fabrizio','Eugenio','Gennaro','Umberto','Cesare','Leonardo',
    'Raffaele','Sergio','Ferruccio','Goffredo','Orazio','Fausto','Primo',
    'Ernesto','Rodolfo','Bruno','Dante','Tiziano','Lamberto','Giordano',
    'Amedeo','Arturo','Benedetto','Carlo','Cipriano','Damiano','Dario',
    'Ercole','Ezio','Felice','Gianluca','Giulio','Ignazio','Ilario',
    'Marcello','Oreste','Osvaldo','Pasquale','Remo','Renato','Ruggero',
    'Salvatore','Stefano','Tullio','Valerio','Vito',
    // ---- Russia: intelligentsia ----
    'Dmitri','Vasily','Yakov','Anatoly','Igor','Rostislav','Lavr','Mstislav',
    'Yuri','Fyodor','Arkady','Nikifor','Grigori','Sergei','Konstantin',
    'Leonid','Valentin','Semyon','Gleb','Boris','Kirill','Stanislav',
    'Svyatoslav','Vyacheslav','Vadim','Nikolai','Timofei','Viktor','Matvei',
    'Miron','Savva','Tikhon','Zakhar','Yefim','Rodion','Ilya',
    // ---- Ukraine ----
    'Taras','Bohdan','Mykhailo','Ostap','Volodymyr','Yaroslav','Mykola',
    'Dmytro','Oleksandr','Vsevolod','Pylyp','Danylo','Nazar','Matviy',
    'Pavlo','Symon','Maksym','Artem','Hryhoriy','Vasyl','Kostyantyn',
    // ---- America: old-guard distinguished ----
    'Chauncey','Whitaker','Sterling','Lancaster','Emerson','Winthrop',
    'Wellington','Thurston','Huntington','Barrington','Fairchild',
    'Kensington','Winslow','Endicott','Forbes','Griswold','Harrington',
    'Hollis','Langdon','Merritt','Northrop','Randolph','Roswell',
    'Sinclair','Stockton','Talmadge','Thornton','Wadsworth','Weston',
    'Abbott','Alden','Bancroft','Brewster','Bryant','Carver','Chandler',
    'Cushing','Dudley','Franklin','Hawthorne','Holbrook','Holt','Langley',
    'Mather','Quincy','Ransom','Revere','Rockwell','Sheffield','Talbot',
    'Townsend','Trueman','Vaughn','Walcott','Webster','Whittier','Wolcott',
    // ---- China: literary-scholar ----
    'Zhenyuan','Xiaosheng','Guorong','Lianfeng','Tianyi','Chengfu','Boheng',
    'Jinshan','Yuanchao','Shengping','Renshu','Zhongyi','Hongwei','Minsheng',
    'Weiming','Dongliang','Xiaolin','Zhenhua','Shaoyuan','Qingshan','Xinyu',
    'Deming','Songlin','Jianhua','Enzhi','Binwen','Yonghui','Changsheng',
    'Xianglin','Zhihao','Wenhao','Shibo','Ruizhe','Haoran','Guanyu','Qiuhan',
    'Yihan','Yuanzhang','Chaolong','Junwei',
    // ---- Australia: colonial-academic ----
    'Banjo','Stirling','Hamish','Angus','Lachlan','Digby','Fergus','Blaxland',
    'Darcy','Clem','Dermott','Giles','Grenville','Hargrave','Kingston',
    'Millar','Neville','Paddington','Rodney','Stanforth','Whelan','Ashton',
    // ---- South Africa: Afrikaner distinguished ----
    'Pieter','Stephanus','Lourens','Tielman','Adriaan','Cornelis','Hendrik',
    'Wynand','Barend','Jurie','Gerrit','Francois','Tertius','Roelof','Deon',
    'Bartholomeus','Jan-Hendrik','Ruan','Thys','Kobus','Willem','Nicolaas',
    'Petrus','Andries','Izak','Johannes'
  ];

  var LASTS = [
    // ---- Bureaucratic-ghost lasts ----
    'Pettibone','Ashwood','Quimby','Fenstermacher','Huckaby','Drinkwater',
    'Wooster','Plimpton','Crabtree','Halliwell','Thistlethwaite','Bramwell',
    'Lockridge','Ackerman','Ellsbury','Ormsby','Dalrymple','Fothergill',
    'Pennywhistle','Wickersham','Osgood','Applegate','Bickford','Tredinnick',
    'Featherington','Hazleton','Bickerstaff','Dunwoody','Marchbanks',
    'Kettlewell','Pinkerton','Hemsworth','Winterbottom','Lockhart',
    'Stillwell','Pendergast','Worthington','Kilbride','Mortlake','Trelawney',
    'Halpenny','Scrimgeour','Gilchrist','Rothermel','Stamper','Easterbrook',
    'Hawkinberry','Quimbleton','Frobisher',
    // ---- Wes Anderson lobby-brass lasts ----
    'Ainsworth','Ashbrook','Bellefleur','Bosworth','Brandywine','Brimsley',
    'Camberly','Cavendish','Chesterfield','Clotworthy','Coppersmith',
    'Crickshaw','Dashwood','Davenport','Deveraux','Dunmore','Dunstable',
    'Eastwick','Eddington','Everwood','Fairweather','Farnsworth','Fencroft',
    'Fettiplace','Finchley','Fontaine','Framingham','Garrowby','Glastonbury',
    'Goodfellow','Hartley','Hastings','Havisham','Haywood','Heatherstone',
    'Holcombe','Hollister','Hornsby','Inverness','Jardine','Kemperly',
    'Kilbourne','Kipling','Linley','Locksworth','Longstreet','Lumley',
    'Mainwaring','Marchmont','Meriwether','Middleton','Milbourn','Montagu',
    'Narbonne','Nesbitt','Northcott','Oakhurst','Pemberton','Pennyfeather',
    'Perriwinkle','Petersham','Pillsworth','Prescott','Pritchard','Quince',
    'Radcliffe','Ravenscroft','Redgrave','Rennington','Rothesay','Ruxton',
    'Saltonstall','Satterfield','Selby','Sedgwick','Sommersby','Southcott',
    'Standish','Starkweather','Stratton','Sumner','Tatterly','Tennyson',
    'Thackeray','Throckmorton','Tillingham','Tremayne','Underwood',
    'Upchurch','Vandermeer','Waddington','Warwick','Weatherby','Wexford',
    'Whitcombe','Whitmore','Winstanley','Woodhouse','Yardley',
    // ---- Stranger / scientist-literary ----
    'Crick','Pascal','Hilbert','Eiffel','Escher','Fermat','Planck','Kepler',
    'Maxwell','Linnaeus','Bronte','Kafka','Auden','Eliot','Yeats','Gogol',
    'Nabokov',
    // ---- Short one-words ----
    'Fox','Bishop','Whitman','Fischer','Blume','Ash','Hale','Wren','Moss',
    'Thorn','Crane','Finch','Quill','Vance',
    // ---- Italian ----
    'Castellani','Morelli','Guarnieri','Vespucci','Zanelli','Tagliaferro',
    'Orsini','Palladio','Bellini','Carducci','Montalbano','Lorenzetti',
    'Pisanello','Salvatori','Moretti','Fiorentino','Vincentini','Boccaccio',
    'Castiglione','Pontecorvo','Morandi','Coltorti','Barbaro','Magnani',
    'Mazzini','Calvino','Colonna','Agnelli','Barzini','Crivelli','Doria',
    'Farnese','Gallo','Gozzoli','Leoni','Mancini','Manzoni','Medici',
    'Nannini','Pacelli','Panzini','Parini','Pavese','Piccolomini','Pirelli',
    'Quasimodo','Ricci','Ruffo','Sarpi','Scarlatti','Sforza','Spinelli',
    'Ungaretti','Verga','Viscardi',
    // ---- Russian ----
    'Kuznetsov','Volkov','Lebedev','Kondratyev','Berezovsky','Rostropovich',
    'Turgenev','Mikhailov','Vorontsov','Stolypin','Bulgakov','Glazunov',
    'Vishnevsky','Pasternak','Ostrovsky','Solovyov','Prokofiev','Karamazov',
    'Romanov','Baryshnikov','Chernyshevsky','Chkalov','Dostoyev','Ehrenburg',
    'Gogolev','Kalinin','Kharitonov','Kropotkin','Lermontov','Lvov',
    'Mayakovsky','Meyerhold','Nechaev','Petrov','Platonov','Radishchev',
    'Saltykov','Shklovsky','Sholokhov','Simonov','Tsvetaev','Vavilov',
    'Vernadsky','Yesenin','Zamyatin',
    // ---- Ukrainian ----
    'Shevchenko','Tymoshenko','Hrushevsky','Chornovil','Lysenko','Kravchuk',
    'Korniichuk','Bondarenko','Melnychuk','Koshovy','Dovhalev','Pavlychko',
    'Zadorozhny','Hrytsenko','Kovalenko','Mazepa','Franko','Kotlyarevsky',
    'Stus','Tychyna','Ukrainka','Vyshnya','Zerov','Sosiura','Horodetsky',
    'Drach','Dovzhenko',
    // ---- American distinguished ----
    'Thornburgh','Chamberlain','Appleby','Fairbank','Vanderhof','Van Doren',
    'Kirkpatrick','Lodge','Cabot','Peabody','Harriman','Vandergriff',
    'Pennington','Ashby','Bradford','Chadwick','Remington','Abernathy',
    'Amory','Astor','Biddle','Bingham','Blackwell','Bradstreet','Choate',
    'Codman','Colgate','Copley','Dana','Delafield','DuPont','Eaton','Fiske',
    'Frelinghuysen','Gardiner','Hallowell','Hemenway','Herter','Higginson',
    'Kellogg','Lamont','Lawrence','Lehman','Lovell','Morgan','Morse','Mott',
    'Niebuhr','Olmsted','Paine','Pembroke','Phipps','Rhinelander',
    'Roosevelt','Sears','Sloan','Stimson','Storey','Strong','Tiffany',
    'Truxton','Vanderbilt','Voorhees','Wainwright','Wharton','Whitney',
    'Widener',
    // ---- Chinese ----
    'Chen','Liang','Zhao','Guo','Chiang','Xu','Cheng','Zhou','Tang','Sun',
    'Huang','Shi','Kao','Feng','Song','Jin','Luo','Yuan','Qian','Tan','Mei',
    'Lai','Yao','Meng','Bai','Ouyang','Xie','Pan','Shen','Deng','Cui','Peng',
    'Sima','Lu','Ye',
    // ---- Australian ----
    'Macarthur','Flinders','Cunningham','Sturt','Kingsford','Oxley',
    'Patterson','Hargraves','Drysdale','Whitlam','Menzies','Strzelecki',
    'Gilmore','Bracegirdle','Chauvel','Fairbairn','Nettleton','Mawson',
    'Bradman','Bligh','Grimwade','Nolan','Wentworth',
    // ---- South African Afrikaner ----
    'Coetzee','Pretorius','Oosthuizen','Viljoen','Roux','Kriel','Steyn',
    'Malan','Kruger','Smuts','Verwoerd','de Villiers','van Rensburg',
    'Marais','Strydom','Naude','Nienaber','du Plessis','Labuschagne',
    'Schoeman','Erasmus','Fouche','Swanepoel','Bezuidenhout','Kotze','Kemp',
    'Terblanche','Vorster','van der Merwe'
  ];

  // Dedupe in place so the Cartesian math is clean.
  function dedupe(arr) {
    var out = []; var seen = Object.create(null);
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (seen[v] === undefined) { seen[v] = 1; out.push(v); }
    }
    return out;
  }
  FIRSTS = dedupe(FIRSTS);
  LASTS  = dedupe(LASTS);

  function buildPool() {
    var F = FIRSTS.length;
    var L = LASTS.length;
    var total = F * L;
    // Generous pool size — enough to cover every employee roster upgrade
    // plus the Ratiocinatory panel, with room left over. Capped at 2000
    // so the initial shuffle stays fast.
    var TARGET_SIZE = Math.min(2000, total);

    var indices = new Array(total);
    for (var k = 0; k < total; k++) indices[k] = k;

    var seed = 0x9E3779B9 | 0;
    function rand() {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return ((seed >>> 0) % 0xFFFFFFFF) / 0xFFFFFFFF;
    }
    for (var i = total - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      if (j < 0) j = 0;
      if (j > i) j = i;
      var tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }

    var pool = [];
    var seen = Object.create(null);
    for (var m = 0; m < TARGET_SIZE; m++) {
      var idx = indices[m];
      var fi = idx % F;
      var li = (idx - fi) / F;
      var full = FIRSTS[fi] + ' ' + LASTS[li];
      if (seen[full] === undefined) {
        seen[full] = 1;
        pool.push(full);
      }
    }

    var flourishes = [
      'Delmar Pettibone, Jr.',
      'Mrs. Ashwood-Quimby',
      'Kenneth "Ken" Kettlewell',
      'H. Lowell Easterbrook',
      'Phyllis (file pending)',
      'Pearl of Accounts Receivable',
      'Thaddeus the Younger',
      'Arnold, no known last name',
      'Cornelius St. John-Pemberton',
      'M. Augustin Mortlake',
      'Ingrid of the Ninth Floor',
      'Hugo (name withheld)',
      'Dr. Genevieve Hilbert-Pascal',
      'Wendell Crick, III',
      'Agatha Eiffel-Whitman',
      'Prof. Giancarlo Castellani-Orsini',
      'Dott. Ottavio Palladio',
      'Arkady Vorontsov (ret.)',
      'Dmitri Pasternak-Lvov',
      'Bohdan Kotlyarevsky, Dr. Phil.',
      'Winthrop Peabody III',
      'Mrs. Chauncey Thornburgh',
      'Prof. Zhenyuan Huang (visiting)',
      'Shaoyuan Ouyang, D.Lit.',
      'Banjo Flinders, O.A.M.',
      'Dr. Hamish Drysdale',
      'Stephanus Coetzee, M.A. (Stellenbosch)',
      'Hendrik Pretorius van Rensburg'
    ];
    for (var f2 = 0; f2 < flourishes.length; f2++) {
      if (seen[flourishes[f2]] === undefined) {
        seen[flourishes[f2]] = 1;
        pool.push(flourishes[f2]);
      }
    }
    return pool;
  }

  var POOL = buildPool();

  function list() { return POOL.slice(); }
  function count() { return POOL.length; }

  function pickStable(seed) {
    var n = POOL.length;
    var s = (typeof seed === 'number' && isFinite(seed)) ? Math.floor(seed) : 0;
    var idx = ((s % n) + n) % n;
    return POOL[idx];
  }

  function pickRandom() {
    return POOL[Math.floor(Math.random() * POOL.length)];
  }

  // Return the first pool entry not in `used`. `used` may be a Set, an Array,
  // or a plain object with name keys. Falls back to suffixing a roman numeral
  // if the entire pool is taken (extremely unlikely given pool >= 2000).
  function pickUnique(used) {
    var usedSet;
    if (used && typeof used.has === 'function') {
      usedSet = used;
    } else {
      usedSet = new Set();
      if (Array.isArray(used)) {
        for (var i = 0; i < used.length; i++) usedSet.add(used[i]);
      } else if (used && typeof used === 'object') {
        for (var k in used) if (Object.prototype.hasOwnProperty.call(used, k)) usedSet.add(k);
      }
    }
    for (var p = 0; p < POOL.length; p++) {
      if (usedSet.has(POOL[p]) === false) return POOL[p];
    }
    // Pool exhausted — suffix roman numerals starting from II on pool[0].
    var numerals = ['II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
    for (var b = 0; b < POOL.length; b++) {
      for (var r = 0; r < numerals.length; r++) {
        var candidate = POOL[b] + ', ' + numerals[r];
        if (usedSet.has(candidate) === false) return candidate;
      }
    }
    // Truly exhausted — return a timestamped placeholder.
    return POOL[0] + ' (#' + Date.now().toString(36) + ')';
  }

  // v3.20.32: first-name extractor. Strips any leading honorific tokens
  // (Prof., Dr., Sir, Lady, etc.) and returns the first real given name.
  // Handles the flourish entries like "Prof. Giancarlo Castellani-Orsini".
  var HONORIFIC_RE = /^(prof\.?|dr\.?|mr\.?|mrs\.?|ms\.?|sir|lady|lord|sgt\.?|capt\.?|col\.?|rev\.?|hon\.?|fr\.?|br\.?)$/i;
  function firstNameOf(fullName) {
    if (!fullName || typeof fullName !== 'string') return '';
    var tokens = fullName.trim().split(/\s+/);
    var i = 0;
    while (i < tokens.length - 1 && HONORIFIC_RE.test(tokens[i])) i++;
    return tokens[i] || tokens[0] || '';
  }

  // Return a pool entry whose FIRST NAME is not already in usedFirsts.
  // Accepts a Set, Array, or plain object. Falls back to roman-numeral
  // tagged alternates when the first-name space is exhausted.
  function pickUniqueFirstName(usedFirsts) {
    var usedSet;
    if (usedFirsts && typeof usedFirsts.has === 'function') {
      usedSet = usedFirsts;
    } else {
      usedSet = new Set();
      if (Array.isArray(usedFirsts)) {
        for (var i = 0; i < usedFirsts.length; i++) usedSet.add(usedFirsts[i]);
      } else if (usedFirsts && typeof usedFirsts === 'object') {
        for (var k in usedFirsts) if (Object.prototype.hasOwnProperty.call(usedFirsts, k)) usedSet.add(k);
      }
    }
    for (var p = 0; p < POOL.length; p++) {
      var fn = firstNameOf(POOL[p]);
      if (fn && usedSet.has(fn) === false) return POOL[p];
    }
    var numerals = ['II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
    for (var b = 0; b < POOL.length; b++) {
      for (var r = 0; r < numerals.length; r++) {
        var baseFirst = firstNameOf(POOL[b]);
        var candidate = baseFirst + ' ' + numerals[r];
        if (usedSet.has(candidate) === false) return candidate;
      }
    }
    return POOL[0] + ' (#' + Date.now().toString(36) + ')';
  }

  function stats() {
    return {
      firstNames: FIRSTS.length,
      lastNames: LASTS.length,
      combinationsAvailable: FIRSTS.length * LASTS.length,
      pool: POOL.length
    };
  }

  window.PatsyNames = {
    list: list,
    count: count,
    pickStable: pickStable,
    pickRandom: pickRandom,
    pickUnique: pickUnique,
    pickUniqueFirstName: pickUniqueFirstName,
    firstNameOf: firstNameOf,
    stats: stats
  };

})();
