//globals
var data;
var tables;
var globals;
var storage;

// Return reference to DOM element given by @id
function $(id)
{
	return document.getElementById(id);
}

// Return true if variable @a is set (not null or undefined)
function isset(a)
{
	return (typeof a !== 'undefined' && a != null);
}

// Return a new array of length @size filled with default value given by @initial
function createArray(size, initial)
{
	var array = [];

	while(array.length < size)
		array.push(initial);

	return array;
}

function clearStat(stat)
{
	if($('STAT_' + stat).value == 0)
		$('STAT_' + stat).value = '';
}

// Determine whether a number is odd or even
function even(num)
{
	return num % 2 == 0;
}

// Level up the current pokemon by 1 level.
function levelUp()
{
	storage.levelup = true;
	saveAll();
}

// Evolve the current pokemon.
function evolvePokemon()
{
	storage.evolve = true;
	saveAll();
}

// Devolve the current pokemon.
function devolvePokemon()
{
	storage.revert = true;
	saveAll();
}

// Increase the knockout count of a pokemon
function changeKO(id, dir)
{
	if(storage.manualEntry[id - 1] == false)
	{
		var entry = $('k' + id);
		entry.value = parseFloat(entry.value) + dir * parseFloat(storage.kostep);

		if(entry.value < 0)//field validation
			entry. value = 0;

		storage.buttonEntry[id - 1] = true;
		entry.style.backgroundColor = '#ff8fa0';
	}
}

// Set manual entry mode for a KO input field
function setManual(id)
{
	var entry = $('k' + id);

	if(storage.buttonEntry[id - 1] == false)
	{
		var i = id - 1;
		storage.manualEntry[i] = true;
		storage.previousKO[i] = parseFloat(entry.value);
		entry.value = 0;
		entry.style.backgroundColor = '#ff8fa0';
	}
	else
	{
		entry.blur();// prevent manual entry after buttons have been used to change value - the two methods cannot be used simultaneously
	}
}

function untrack(event)
{
	id = this.alt;

	if(isset(storage.savedpokemon[id]))
	{
		storage.savedpokemon[id].track = false;
		saveAll();
	}
}

// Set the experience tracker column by which to sort its entries.
function sortBy(column)
{
	if(column == storage.global.sortby)
		storage.global.sortorder *= -1;
	else
		storage.global.sortorder = 1;

	storage.global.sortby = column;
	saveAll();
}

// Refresh the application.
function refresh()
{
	localStorage.setItem('storage', JSON.stringify(storage));
	location.reload();
}

// Change the generation mode of the calculator.
function changeGen()
{
	var gen = 1;

	if(storage.gen == 1)
		gen = 2;

	localStorage.setItem('gen', String(gen));
	resetCalc();
}

// Reset and reinitialize the application.
function resetCalc()
{
	getFormInput();

	if(storage.input.confirm == true)
	{
		var gen = localStorage.getItem('gen');
		localStorage.clear();
		localStorage.setItem('gen', String(gen));
		$('CONFIRM_RESET').checked = false;
		location.reload();
	}
	else
	{
		if(!storage.confirmLabel)
		{
			var label = document.createElement('label');
			var text = document.createTextNode("Confirm: ");
			label.appendChild(text);
			$('PROMPT').insertBefore(label, $('CONFIRM_RESET'));
		}

		storage.confirmLabel = true;
	}
}

// Change the current zone to that selected.
function changeZone()
{
	storage.zone = $('ZONE_SELECT').value;
	saveAll();
}

// Service function used for sorting experience tracker entries by KO.
function orderByKO(a, b)
{
	var compare = 0;

	if(b < storage.global.numpokemon)
	{
		var pokeA = storage.knockouts[a - 1];
		var pokeB = storage.knockouts[b - 1];

		if(pokeA < pokeB)
			compare = -1;
		else if(pokeA > pokeB)
			compare = 1;
	}

	return compare * storage.global.sortorder;
}

// Service function used for sorting experience tracker entries by column.
function orderByColumn(a, b)
{
	var compare = 0;

	if(b < storage.global.numpokemon)
	{
		var pokeA = tables.pokemon[a - 1][storage.global.sortby];
		var pokeB = tables.pokemon[b - 1][storage.global.sortby];

		if(storage.global.sortby != 'type' && storage.global.sortby != 'name')
		{
			pokeA = parseInt(pokeA);
			pokeB = parseInt(pokeB);

			if(pokeA < pokeB)
				compare = -1;
			else if(pokeA > pokeB)
				compare = 1;
		}
		else
		{
			compare = pokeA.localeCompare(pokeB);
		}
	}

	return compare * storage.global.sortorder;
}

/* Populate the experience tracker with all Pokemon found in the current zone,
   sorting by column or KO. */
function populateTracker(id)
{
	var count = 0;
	var in_zone = [];

	for(i = 0; i < tables.map.length; i++)
	{
		if(tables.map[i][id] == 1 || id == 'allzones')
			in_zone[count++] = tables.map[i].pokedex;
	}

	if(storage.global.sortby == 'ko')
		in_zone.sort(orderByKO)
	else
		in_zone.sort(orderByColumn);

	storage.in_zone = in_zone;
}

// Set experience tracker to veteran mode.
function veteranMode()
{
	storage.veteran = (!storage.veteran) ? true : false;
	saveAll();
}

// Show base stats in tracker
function baseStats()
{
	storage.display.basestats = (storage.display.basestats) ? false : true;
	saveAll();
}

/* Dump all form fields into a local storage object for later processing in pollInput.
   Takes the place of the POST variable from previous PHP version. */
function getFormInput()
{
	storage.input = new Object();
	var temp = $('FORM').elements;

	for(var i in temp)
	{
		if(temp[i] != null)
		{
			if(temp[i].type != 'checkbox')
				storage.input[temp[i].name] = temp[i].value;
			else
				storage.input[temp[i].name] = temp[i].checked;
		}
	}
}

// Save all user data.
function saveAll()
{
	getFormInput();
	storage.save = true;
	refresh();
}

// Change current Pokemon to that selected in the form.
function changePokemon()
{
	getFormInput();
	localStorage.setItem('storage', JSON.stringify(storage));
	location.reload();
}

// Perform main calculation routine.
function calculateDV()
{
	getFormInput();
	storage.input.calculate = true;
	localStorage.setItem('storage', JSON.stringify(storage));
	location.reload();
}

/* Calculate the DV for a Pokemon's HP stat.
   Level must be greater than 0 or a divide by 0 error will be thrown. */
function calculateHitpointsDV(level, base, stat, exp)
{
	level = parseInt(level);
	base = parseInt(base);
	stat = parseInt(stat);
	exp = parseInt(exp);
	return Math.ceil(((100 * (stat - level - 10)) / level - (2 * base) - calculatePoints(exp)) / 2);
}

/* Calculate the range of HP DVs that give an equal HP value
   to that given by the Pokemon's current HP DV.
   Returns an array with structure [min, max]. */
function calculateHitpointsRange(base, dv, exp)
{
	var statRange = new Array();
	var stat = calculateHitpoints(storage.stats.lvl, base, dv, exp);
	var value = dv;

	while(calculateHitpoints(storage.stats.lvl, base, value, exp) == stat)
	{
		value++;
	}

	var highest = value - 1;
	value = dv;//reset

	while(calculateHitpoints(storage.stats.lvl, base, value, exp) == stat)
	{
		value--;
	}

	statRange[0] = value + 1;
	statRange[1] = highest;
	return statRange;
}

// Calculate the DV for any of the main four stats (Att, Def, Spd, Spc).
function calculateStatDV(level, base, stat, exp)
{
	level = parseInt(level);
	base = parseInt(base);
	stat = parseInt(stat);
	exp = parseInt(exp);
	return Math.ceil((100 * (stat - 5)) / (level * 2) - base - (calculatePoints(exp) / 2));
}

/* Calculate the range of stat DVs that give an equal stat value
   to that given by the Pokemon's current DV.
   Returns an array with structure [min, max]. */
function calculateStatRange(base, dv, exp)
{
	var statRange = new Array();
	var stat = calculateStat(storage.stats.lvl, base, dv, exp);
	var value = dv;

	while(calculateStat(storage.stats.lvl, base, value, exp) == stat)
	{
		value++;
	}

	var highest = value - 1;
	value = dv;

	while(calculateStat(storage.stats.lvl, base, value, exp) == stat)
	{
		value--;
	}

	statRange[0] = value + 1;
	statRange[1] = highest;

	return statRange;
}

// Calculate experience points for a stat based on corresponding experience value @exp.
function calculatePoints(exp)
{
	exp = parseInt(exp);
	var r = Math.sqrt(Math.max(0, exp - 1)) + 1;
	return Math.floor(Math.min(255, r) / 4);
}

/* Calculate a Pokemon's hitpoints value.
   This calculation differs from that used for the other 4 stats. */
function calculateHitpoints(level, base, dv, exp)
{
	level = parseInt(level);
	base = parseInt(base);
	dv = parseInt(dv);
	exp = parseInt(exp);
	return Math.floor((2 * (base + dv) + calculatePoints(exp)) * (level / 100) + level + 10);
}

// Calculate a Pokemon's stat value.
function calculateStat(level, base, dv, exp)
{
	level = parseInt(level);
	base = parseInt(base);
	dv = parseInt(dv);
	exp = parseInt(exp);
	return Math.floor((2 * (base + dv) + calculatePoints(exp)) * (level / 100) + 5);
}

// Find the hidden power of a Pokemon in generation 2.
function calculateHiddenPower()
{
	var binary = "";
	var types = ['Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel'
		, 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];

	storage.hiddenpower = new Object();

	for(i = 1; i < getLength(storage.mode) - 1; i++)
	{
		if(storage.mode[i] <= 7)
			binary = binary + "0";
		else
			binary = binary + "1";
	}

	var x = parseInt(binary, 2);
	var y = storage.mode[4] % 4;
	var basedmg = (5 * x + y) / 2 + 31;
	var a = (+storage.mode[1]).toString(2).padStart(4, '0');
	var b = (+storage.mode[2]).toString(2).padStart(4, '0');
	var typebin = a[2] + a[3] + b[2] + b[3];
	var typedec = parseInt(typebin, 2);
	storage.hiddenpower.damage = Math.floor(basedmg);
	storage.hiddenpower.type = types[typedec];
}

//Initialize the calculator. Globals must be set before calling this
function initialize(gen)
{
	storage.records = new Object();
	storage.input = new Object();
	storage.in_zone = [];
	storage.displayData = new Object();
	storage.display = new Object();
	storage.current_pokemon = new Array();
	storage.lookup = [];
	storage.kostep = 1;
	storage.initialized = true;

	if(gen == 1)
	{
		storage.current_pokemon[0] = "Bulbasaur";
		storage.current_pokemon[1] = "Bulbasaur";
		storage.current_pokemon[2] = 0;
		storage.zone = "pallettown";
	}
	else if(gen == 2)
	{
		storage.current_pokemon[0] = "Chikorita";
		storage.current_pokemon[1] = "Chikorita";
		storage.current_pokemon[2] = 151;
		storage.zone = "newbarktown";
	}

	storage.modecalculated = false;
	storage.attributes = [];
	storage.counter = 1;
	storage.calculate = false;
	storage.evolve = false;
	storage.estimation = false;
	storage.gen = gen;
	storage.map = true;
	storage.numtracked = 1;//the number of pokemon sharing experience
	storage.outofrange = false;
	storage.reset = false;
	storage.revert = false;
	storage.savecount = createArray(storage.global.numpokemon, 0);
	storage.confirmreset = false;
	storage.save = false;
	storage.savedpokemon = new Object();
	storage.sortorder = "ASC";
	storage.trackedindex = 0;
	storage.type = "All";
	clear();//must be called after initialization

	if(window.innerWidth < 600)
	{
		//for narrow screens to inititially prevent display of base stats
		storage.display.basestats = false;
	}

	localStorage.setItem('storage', JSON.stringify(storage));
}

// Reinitialize the form for a new Pokemon without resetting calculator.
function clear()
{
	storage.input = [];//clear all previous input to ensure next call to pollInput doesn't pick up old data
	storage.stats = new Object();
	storage.stats.lvl = 0;
	storage.stats.hp = 0;
	storage.stats.att = 0;
	storage.stats.def = 0;
	storage.stats.spd = 0;

	if(storage.gen == 1)
	{
		storage.stats.spc = 0;
	}
	else if(storage.gen == 2)
	{
		storage.stats.spca = 0;
		storage.stats.spcd = 0;
	}

	storage.knockouts = createArray(storage.global.numpokemon, 0);
	storage.manualEntry = createArray(storage.global.numpokemon, false);
	storage.buttonEntry = createArray(storage.global.numpokemon, false);
	storage.previousKO = createArray(storage.global.numpokemon, 0);
	storage.accuracy = createArray(storage.global.numstats, 0);
	storage.display = new Object();
	storage.display.max = false;
	storage.display.best = true;
	storage.display.stat_exp = true;
	storage.display.last_dv = false;
	storage.display.dv = false;
	storage.display.rare = false;
	storage.display.hiddenpower = false;
	storage.display.mode_dv = false;
	storage.modecalculated = false;
	storage.display.party = true;
	storage.display.basestats = false;
	storage.display.kostep = 1.0 / 6.0;
	storage.dvalues = createArray(storage.global.numstats, [-1, -1]);
	storage.stat_exp = createArray(storage.global.numstats, 0);
	storage.mode = createArray(storage.global.numstats, -1);
	storage.max = createArray(storage.global.numstats, -1);
	storage.best = createArray(storage.global.numstats, -1);
	storage.vitamins = createArray(storage.global.numstats, 10);
	storage.hiddenpower = [0, ""];
	storage.maxexp = false;
	storage.rarity = 1;
	storage.records = new Object();
	storage.prompt = false;
	storage.track = false;
	storage.veteran = false;
	storage.showtable = false;
	storage.shiny = false;
	saveid = storage.current_pokemon[0];

	if(isset(storage.savedpokemon[saveid]))
	{
		storage.attributes = getPokemon(storage.savedpokemon[saveid].pokemon[2]);
		storage.stats = storage.savedpokemon[saveid].stats;
		storage.stat_exp = storage.savedpokemon[saveid].exp;
		storage.knockouts = storage.savedpokemon[saveid].knockouts;
		storage.records = storage.savedpokemon[saveid].records;
		storage.mode = storage.savedpokemon[saveid].mode;
		storage.max = storage.savedpokemon[saveid].max;
		storage.rarity = storage.savedpokemon[saveid].rarity;
		storage.accuracy = storage.savedpokemon[saveid].accuracy;
		storage.track = storage.savedpokemon[saveid].track;
		storage.input.track = storage.track;
		storage.shiny = storage.savedpokemon[saveid].shiny;
		storage.hiddenpower = storage.savedpokemon[saveid].hidden;
		storage.modecalculated = storage.savedpokemon[saveid].modecalculated;

		if(storage.modecalculated)
		{
			storage.display.max = true;
			storage.display.mode_dv = true;
			storage.display.dv = true;
		}

		storage.display.stat_exp = true;
	}

	if(storage.records > 0)
	{
		storage.display.mode_dv = true;
		storage.display.max = true;
	}
}

// Return true if Pokemon given by @id exists in saved storage
function isSaved(id)
{
	var keys = Object.keys(storage.savedpokemon);
	var saved = false;

	for(i = 0; i < keys.length; i++)
	{
		if(keys[i] == id)
		{
			saved = true;
			break;
		}
	}

	return saved;
}

// Poll HTML form and store valid input in local storage
function pollInput()
{
	storage = JSON.parse(localStorage.getItem('storage'));
	var id = storage.current_pokemon[0];

	if(isset(storage.input.current))
	{
		id = storage.input.current;//set current pokemon
	}

	if(id != storage.current_pokemon[0])
	{
		storage.current_pokemon[0] = id;
		clear();//if current pokemon has changed
	}

	if(isSaved(id))
		species = storage.savedpokemon[id].pokemon[1];//0 is id, 1 is species, 2 is pokedex
	else
		species = id;

	storage.attributes = getPokemonByName(species);
	storage.current_pokemon = [id, species, storage.attributes.pokedex - 1];
	storage.overwrite = storage.input.overwrite;

	// Catch and reset empty values caused by onfocus action in stat input row
	var keys = ['lvl', 'hp', 'att', 'def', 'spd', 'spc'];

	if(storage.gen == 2)
		keys.splice(5, 2, 'spca', 'spcd');

	var i = 1;

	for(var k in keys)
	{
		if(storage.input[keys[k]] == '')
			storage.input[keys[k]] = 0;
	}

	//Update stats
	if(isset(storage.input.lvl))
		storage.stats.lvl = storage.input.lvl;

	if(isset(storage.input.hp))
		storage.stats.hp = storage.input.hp;

	if(isset(storage.input.att))
		storage.stats.att = storage.input.att;

	if(isset(storage.input.def))
		storage.stats.def = storage.input.def;

	if(isset(storage.input.spd))
		storage.stats.spd = storage.input.spd;

	if(storage.gen == 1)
	{
		if(isset(storage.input.spc))
			storage.stats.spc = storage.input.spc;
	}
	else if(storage.gen == 2)
	{
		if(isset(storage.input.spca))
			storage.stats.spca = storage.input.spca;

		if(isset(storage.input.spcd))
			storage.stats.spcd = storage.input.spcd;
	}

	// Update vitamins
	if(isset(storage.input.vithp))
		storage.vitamins[0] = storage.input.vithp;

	if(isset(storage.input.vitatt))
		storage.vitamins[1] = storage.input.vitatt;

	if(isset(storage.input.vitdef))
		storage.vitamins[2] = storage.input.vitdef;

	if(isset(storage.input.vitspd))
		storage.vitamins[3] = storage.input.vitspd;

	if(isset(storage.input.vitspc))
	{
		storage.vitamins[4] = storage.input.vitspc;

		if(storage.gen == 2)
			storage.vitamins[5] = storage.input.vitspc;
	}

	//Enforce bounds for vitamins used
	//Must use at least 1, maximum 9
	for(i = 0; i < storage.global.numstats; i++)
	{
		if(storage.vitamins[i] <= 0 || storage.vitamins[i] >= 10 )
			storage.vitamins[i] = 0;
	}

	storage.calculate = storage.input.calculate;
	storage.maxexp = storage.input.maxexp;
	storage.track = storage.input.track;

	if(isset(storage.input.type))
		storage.type = storage.input.type;
}

// Return the length of an Array or Object
function getLength(countable)
{
	var length = 0;

	if(typeof countable == "object")
		length = Object.keys(countable).length;
	else if(Array.isArray(countable))
		length = countable.length;

	return length;
}

// Calculate the maximum possible stats for the current Pokemon
function calculateMaxStats()
{
	if(storage.modecalculated)
	{
		var level = 100;
		var keys = Object.keys(storage.attributes);
		storage.max[0] = calculateHitpoints(level, storage.attributes.hp
			, storage.mode[0], storage.global.maxStatExp);

		for(i = 1; i < storage.global.numstats; i++)
		{
			storage.max[i] = calculateStat(level, storage.attributes[keys[i + storage.global.base_stats_col]]
				, storage.mode[i], storage.global.maxStatExp);
		}

		storage.display.max = true;
	}
}

// Evolve or devolve (@stage) the current Pokemon
function evolve_pokemon(stage)
{
	var evolve = getPokemonEvolution(storage.current_pokemon[2]);
	var newPokemon = getPokemonEvolution(evolve[stage] - 1);

	if(!isSaved(storage.current_pokemon[0]))
	{
		storage.firstSave = true;
		storage.originalSpecies = storage.current_pokemon[1];
	}

	storage.attributes = getPokemonByName(newPokemon.name);
	storage.current_pokemon[1] = storage.attributes.name;
	saveAll();
}

/*
* Generate lookup table for DVs 0 - 15 inclusive, for each stat. Performance expensive.. Makes 75 calls to math functions.
* Code to generate lookup table should always run if a valid level is entered.
*/
function generateLookup()
{
		level = storage.stats.lvl;

		if(level > storage.global.minlevel && level <= storage.global.maxlevel)
		{
			keys = Object.keys(storage.attributes);

			for(i = 0; i <= storage.global.maxdv; i++)
			{
				storage.lookup[i] = [];
				storage.lookup[i][0] = calculateHitpoints(level, storage.attributes.hp, i, storage.stat_exp[0]);

				for(j=1;j<storage.global.numstats;j++)
				{
					storage.lookup[i][j] = calculateStat(level, storage.attributes[keys[j + storage.global.base_stats_col]], i, storage.stat_exp[j]);
				}
			}

			storage.showtable = true;
		}
}

/*
* Called on each page refresh. Performs logic on new input and passes data to view.
* Intent is to minimize operations on data, calls to the math library, and redundant loops.
*/
function update()
{
	var level = storage.stats.lvl;
	storage.outofrange = false;//clear warning
	populateTracker(storage.zone);

	if(storage.evolve)
	{
		evolve_pokemon('next_stage');
		generateLookup();
		storage.evolve = false;
		calculateMaxStats();
	}
	else if(storage.revert)
	{
		evolve_pokemon('previous_stage');
		generateLookup();
		storage.revert = false;
		calculateMaxStats();
	}
	else if(storage.levelup)
	{
		level++;
		storage.stats.lvl = level;
		var keys = Object.keys(storage.stats);

		for(i = 1; i < getLength(keys); i++)
		{
			storage.stats[keys[i]] = 0;
		}

		generateLookup();
		storage.levelup = false;
	}

	if(level <= storage.global.minlevel || level > storage.global.maxlevel)
		storage.calculate = false;//enforce bounds on level

	id = storage.current_pokemon[0];//reuse of temp variable


	//reset button entry flags
	storage.buttonEntry = createArray(storage.global.numpokemon, false);
	//update stat experience based on all rows displayed in tracker
	for(k = 0; k < storage.global.numpokemon; k++)
	{
		var id = 'k' + (k + 1);

		if(isset(storage.input[id]))
		{
			var min = 1 / storage.numtracked;//set minimum step size
			var abs_min = 0.15;//absolute minimum step size to prevent infinite division toward 0
			var knockouts = Number.parseFloat(storage.input[id]);
			storage.knockouts[k] = Number.parseFloat(storage.knockouts[k]);

			if(storage.manualEntry[k] == true)
				knockouts += parseFloat(storage.previousKO[k]);

			var delta = knockouts - storage.knockouts[k];//Find diff. between input and stored value

			if(storage.manualEntry[k] == true) //indexed by pokedex
			{
				//manual entry was performed so divide exp. here instead of button callbacks
				delta /= storage.trackcount;

				if(Math.abs(delta) < min)
				{
					delta = Math.sign(delta) * min; //enforce minimum step size
				}

				storage.manualEntry[k] = false;
				storage.previousKO[k] = 0;
			}

			delta = Number.parseFloat(delta);

			/* catch empty or bad input causing NaN */
			if(isNaN(delta))
				delta = 0;
			else
				storage.knockouts[k] += delta;// Add delta to knockouts, no rounding for maximum precision

			if(storage.knockouts[k] < abs_min)//enforce absolute minimum total KO value
				storage.knockouts[k] = 0;       //otherwise it divides infinitely toward 0

			//Loop through saved pokemon and update data
			var keys = Object.keys(storage.savedpokemon);

			for(j = 0; j < keys.length; j++)
			{
				var entry = storage.savedpokemon[keys[j]];

				if(entry.track)
				{
					storage.savedpokemon[keys[j]].knockouts[k] += delta;

					if(storage.savedpokemon[keys[j]].knockouts[k] < abs_min)
						storage.savedpokemon[keys[j]].knockouts[k] = 0;
				}
			}
		}
	}//end stat exp update loop

	/*
	* Calculate a pokemon's best-case stats, i.e. 15 DVs and maxed stat experience
	*/
	var dv = storage.global.maxdv;
	var exp = storage.global.maxStatExp;
	var level = storage.global.maxlevel;
	var keys = Object.keys(storage.attributes);

	storage.best[0] = calculateHitpoints(level, storage.attributes.hp, dv, exp);

	for(i = 1;i < storage.global.numstats; i++)
	{
		var stat = storage.attributes[keys[i + storage.global.base_stats_col]];
		stat = calculateStat(level, stat, dv, exp);
		storage.best[i] = stat;
	}

	var inRange = (storage.stats.lvl > storage.global.minlevel && storage.stats.lvl <= storage.global.maxlevel);

	// Calculate the DV stats for a Pokemon when the Calculate button was pressed.

	if(storage.calculate == true && inRange)
	{
		var knockoutKeys = Object.keys(storage.knockouts);
		var all_pokemon = getAllPokemon();
		storage.stat_exp = createArray(storage.global.numstats, 0);

		for(i = 0; i < all_pokemon.length; i++)
		{
			var pokemon = all_pokemon[i];
			var ko = Number(storage.knockouts[knockoutKeys[i]]);

			if(ko > 0)
			{
				var keys = Object.keys(pokemon);

				for(j = 0; j < storage.global.numstats; j++)
				{
					storage.stat_exp[j] += Math.floor(Number(pokemon[keys[j + storage.global.base_stats_col]]) * ko);
				}
			}
		}

		count = 0;
		//Set the stat experience array if the calculator is in veteran mode
		if(storage.veteran)
		{
			storage.display.stat_exp = true;

			//Set stat experience to maximum possible if max option is checked
			if(storage.maxexp)
			{
				storage.stat_exp = createArray(storage.global.numstats, storage.global.maxStatExp);
			}
			else
			{
				/* because of the low precision of minimum step size for stat experience
				   when using the vitamin trick the calculator runs in 'estimation' mode,
				   where the results are considered to be only 50% accurate */
				storage.estimation = true;
				storage.stat_exp = createArray(storage.global.numstats, 0);

				//Iterate through each vitamin (5 total)
				for(i = 0; i < storage.global.numstats; i++)
				{
					var x = i;

					if(storage.vitamins[x] > 0)
						storage.stat_exp[i] = storage.global.vitaminMax - storage.vitamins[x] * storage.global.vitaminStep;

					//Enforce bounds
					if(storage.stat_exp[i] < 0)
						storage.stat_exp[i] = 0;
					else if(storage.stat_exp[i] > storage.global.maxStatExp)
						storage.stat_exp[i] = storage.global.maxStatExp;
				}
			}
		}
		else
		{
			//If veteran mode was closed, turn off estimation mode
			storage.estimation = false;
		}

		var valid = true;//assume valid input before validation
		//Get pokemon's attributes in array form, matching a row in the db's pokemon table
		storage.attributes = getPokemonByName(storage.current_pokemon[1]);
		storage.types = storage.attributes.type;
		dv = calculateHitpointsDV(storage.stats.lvl, storage.attributes.hp, storage.stats.hp, storage.stat_exp[0]);
		dv = calculateHitpointsRange(storage.attributes.hp, dv, storage.stat_exp[0]);
		var array = Array.from(storage.stats);
		stats_keys = Object.keys(storage.stats);

		if(dv[0] > 15 || dv[1] < 0)
		{
			dv[0] = -1;
			dv[1] = -1;
			valid = false;
		}

		if(valid)
		{
			storage.outofrange = false;
			//enforce bounds on DV range
			if(dv[0] < 0)
				dv[0] = 0;

			if(dv[1] > 15)
				dv[1] = 15;
		}
		else//set outofrange flag
		{
			storage.outofrange = true;
		}

		var dvrange = [];
		var index = 0;
		dvrange[index++] = dv;//Store DV range for HP

		//for each stat after HP calculate the current DV range
		for(i = 1; i < storage.global.numstats; i++)
		{
			keys = Object.keys(storage.attributes);
			dv = calculateStatDV(storage.stats.lvl, storage.attributes[keys[i + storage.global.base_stats_col]]
				, storage.stats[stats_keys[i + 1]], storage.stat_exp[i]);
			dv = calculateStatRange(storage.attributes[keys[i + storage.global.base_stats_col]], dv, storage.stat_exp[i]);

			//test bounds for DV range
			//invalid only for completely out-of-range cases
			if(dv[0] > 15 || dv[1] < 0)
			{
				dv[0] = -1;
				dv[1] = -1;
				valid = false;
			}

			if(valid)
			{
				storage.outofrange = false;
				//enforce bounds on DV range
				if(dv[0] < 0)
					dv[0] = 0;

				if(dv[1] > 15)
					dv[1] = 15;
			}
			else//set outofrange flag
			{
				storage.outofrange = true;
			}

			dvrange[index++] = dv;
		}

		storage.display.last_dv = valid;
		storage.display.mode_dv = valid;
		storage.dvalues = dvrange;//Store DV range for this level

		//add a new record if all DVs in range
		if(valid)
		{
			storage.modecalculated = true;

			if(!array_key_exists(storage.stats.lvl, storage.records) || storage.overwrite)
			{
				//write record for this level with dv ranges
				storage.records[storage.stats.lvl] = storage.dvalues;
				storage.overwrite = false;
				storage.prompt = false;
			}
			else
			{
				storage.prompt = true;
			}

			/*iterate through records and find highest minimum and lowest maximum DV for each stat*/
			var keys = Object.keys(storage.records);
			if(keys.length > 0)
			{
				min = createArray(6, 0);
				var max = createArray(6, 15);

				for(j = 0; j < keys.length; j++)
				{
					var row = storage.records[keys[j]];

					for(i = 0; i < getLength(row); i++)//for each stat in record
					{
						if(row[i][0] > min[i])
							min[i] = row[i][0];

						if(row[i][1] < max[i])
							max[i] = row[i][1];
					}
				}

				//for every stat and DV record, find the one with the most occurrences
				for(i = 0; i < storage.global.numstats; i++)
				{
					var occurrences = createArray(16, 0);

					for(k = 0; k < storage.records.length; k++)
					{
						var row = storage.records[k];
						//count the occurences of a DV
						for(j = row[0][0]; j <= row[0][1]; j++)//for the range of dv
						{
							if(j >= 0)
								occurrences[j]++;
						}
					}

					var largest = Math.max(occurrences);
					var identical = [-1];//-1 or division by zero error occurs
					//-1 is hack for occurrences having index of 16

					for(j = 0; j < getLength(occurrences) - 1; j++)
					{
						if(occurrences[j] == largest)
							array_push(identical, "j");
					}

					var avg = 0;

					for(j = 0; j < getLength(identical); j++)
					{
						avg += identical[j];
					}

					avg = Math.floor(avg / getLength(identical));
					storage.mode[i] = Math.max(min[i], avg);
					var d = max[i] - min[i];

					if(d < 0)
					{
						storage.mode[i] = min[i];
						d = 0;
					}

					switch(d)
					{
						case 0:
							storage.accuracy[i] = 2;
							break;
						case 1:
							storage.accuracy[i] = 1;
							break;
						default:
							storage.accuracy[i] = 0;
					}
				}

				if(storage.accuracy[0] != 2 && storage.accuracy[1] == 2 && storage.accuracy[2] == 2
					&& storage.accuracy[3] == 2 && storage.accuracy[4] == 2)
				{
					//reverse calculate HP DV if other 4 are known with 100% accuracy
					var hp = 0;

					if(storage.mode[1] % 2 == 1)
						hp += 8;
					if(storage.mode[2] % 2 == 1)
						hp += 4;
					if(storage.mode[3] % 2 == 1)
						hp += 2;
					if(storage.mode[4] % 2 == 1)
						hp += 1;

					storage.mode[0] = hp;
					storage.accuracy[0] = 2;
				}
				else if(storage.accuracy[0] == 2)
				{
					//reverse calculate a stat DV if HP and 3 others are known
					var hp = storage.mode[0];
					var stat = 0;
					var count = 0;
					var reverse = 0;

					for(i = 1; i < storage.global.numstats; i++)
					{
						if(storage.accuracy[i] == 2)
							count++;
						else if(storage.accuracy[i] == 1 || storage.accuracy[i] == 0)
							reverse = i;
					}
					if(count == 3 || (storage.gen == 2 && count == 4))
					{
						if(storage.mode[1] % 2 == 1 && reverse != 1)
							hp -= 8;
						if(storage.mode[2] % 2 == 1 && reverse != 2)
							hp -= 4;
						if(storage.mode[3] % 2 == 1 && reverse != 3)
							hp -= 2;
						if(storage.mode[4] % 2 == 1 && reverse != 4)
							hp -= 1;

						switch(reverse)
						{
							case 1:
								if(hp == 8)
								{
									if(min[1] % 2 == 1)
										storage.mode[1] = min[1];
									else
										storage.mode[1] = max[1];

									storage.accuracy[1] = 2;
								}
								else if(hp == 0)
								{
									if(min[1] % 2 == 0)
										storage.mode[1] = min[1];
									else
										storage.mode[1] = max[1];

									storage.accuracy[1] = 2;
								}
								break;
							case 2:
								if(hp == 4)
								{
									if(min[2] % 2 == 1)
										storage.mode[2] = min[2];
									else
										storage.mode[2] = max[2];

									storage.accuracy[2] = 2;
								}
								else if(hp == 0)
								{
									if(min[2] % 2 == 0)
										storage.mode[2] = min[2];
									else
										storage.mode[2] = max[2];

									storage.accuracy[2] = 2;
								}
								break;
							case 3:
								if(hp == 2)
								{
									if(min[3] % 2 == 1)
										storage.mode[3] = min[3];
									else
										storage.mode[3] = max[3];

									storage.accuracy[3] = 2;
								}
								else if(hp == 0)
								{
									if(min[3] % 2 == 0)
										storage.mode[3] = min[3];
									else
										storage.mode[3] = max[3];

									storage.accuracy[3] = 2;
								}
								break;
							case 4:
								if(hp == 1)
								{
									if(min[4] % 2 == 1)
										storage.mode[4] = min[4];
									else
										storage.mode[4] = max[4];

									storage.accuracy[4] = 2;
								}
								else if(hp == 0)
								{
									if(min[4] % 2 == 0)
										storage.mode[4] = min[4];
									else
										storage.mode[4] = max[4];

									storage.accuracy[4] = 2;
								}
								break;
							default: break;
						}
					}
				}

				if(storage.gen == 2)
				{
					//set value and accuracy of other special stat when one is known
					if(storage.accuracy[4] == 2) {
						storage.mode[5] = storage.mode[4];
						storage.accuracy[5] = 2;
					} else if(storage.accuracy[5] == 2) {
						storage.mode[4] = storage.mode[5];
						storage.accuracy[4] = 2;
					}

					if(!storage.display.hiddenpower)//if display hidden power already set don't calculate again
					{								//in cases where clear() was called for a saved pokemon not all
						calculateHiddenPower();     //required values for calculation will be initialized
						storage.display.hiddenpower = true;
					}
				}

				calculateHiddenPower();

				//calculate pokemon's rarity, which is roughly the probability of finding same DVs or better in any random wild pokemon
				//updated to use a statistical method to improve rarity stat
				if(getLength(storage.records) > 0)
				{
					// Bug fix, HP was undefined
					hp = storage.mode[0];
					var dvTotal = hp;
					for(i = 1; i < getLength(storage.mode); i++)
					{
						if(!(storage.gen == 2 && i == 5))
							dvTotal += storage.mode[i]
					}
					const step = 3;
					const bucketCount = Math.ceil(75 / step);
					const clamp = 3; //exclude this many from each end of rarity array (100% and 0% results)
					const rarities = [100.0, 100.0, 99.96, 99.79, 99.38, 98.44, 96.78, 93.88, 89.32, 82.87, 74.57, 64.7, 53.79, 42.49, 31.92, 22.46, 14.8, 9.11, 5.04, 2.54, 1.16, 0.42, 0.14, 0.02, 0.0];
					storage.rarity = (Math.ceil(rarities[Math.max(Math.min(Math.ceil(dvTotal / step), bucketCount - 1 - clamp), clamp)])).toFixed(0);
					storage.display.rare = true;
				}

				//determine if a pokemon is shiny
				var allten = false;

				if(storage.mode[2] == 10 && storage.mode[3] == 10)
				{
					if(storage.mode[4] == 10)
						allten = true;
				}

				if(allten)
				{
					var att = storage.mode[1];

					if(att == 2 || att == 3 || att == 6 || att == 7
						|| att == 10 || att == 11 || att == 14 || att == 15)
						storage.shiny = true;
				}
			}
		}
		else
		{
			storage.overwrite = false;
			storage.prompt = false;
		}

		generateLookup();

		if(valid)
		{
			calculateMaxStats();
			level = storage.stats.lvl;
		}

		storage.input.calculate = false;
		storage.calculate = false;
		storage.save = true;
	}//end of calculate routine

	/*
	* Save the current Pokemon's attributes if the Save button was pressed.
	*/
	if(storage.save)
	{
		var saveid = storage.current_pokemon[0];
		var keys = Object.keys(storage.savedpokemon);
		var found = false;

		for(i = 0; i < keys.length; i++)
		{
			if(saveid == keys[i])
			{
				found = true;
				break;
			}
		}

		if(!found)
		{
			var saveSpecies = storage.current_pokemon[1];

			if(storage.firstSave)
			{
				saveSpecies = storage.originalSpecies;
				storage.firstSave = false;
			}

			saveid = "" + saveSpecies + "_" + ++storage.savecount[storage.current_pokemon[2]];
			storage.current_pokemon[0] = saveid;
		}

		//update number of tracked pokemon, used in calculating distribution of KOs
		var exists = isset(storage.savedpokemon[saveid]);

		if(storage.numtracked <= 5)
		{
			if(storage.track)
			{
				if(isset(storage.savedpokemon[saveid]))
				{
					if(!storage.savedpokemon[saveid].track)
					{
						storage.numtracked++;
					}
				}
				else
				{
					storage.numtracked++;
				}
			}
			else
			{
				if(isset(storage.savedpokemon[saveid]))
					if(storage.savedpokemon[saveid].track)
						storage.numtracked--;
			}
		}
		else
		{
			storage.track = false;

			if(isset(storage.savedpokemon[saveid]))
			{
				if(storage.savedpokemon[saveid].track)
					storage.numtracked--;
			}
		}

		//id species index
		var pokemon = [saveid, storage.current_pokemon[1], storage.current_pokemon[2]];
		var entry = new Object();
		entry["pokemon"] = pokemon;
		entry["stats"] = storage.stats;
		entry["records"] = storage.records;
		entry["knockouts"] = storage.knockouts;
		entry["exp"] = storage.stat_exp;
		entry["mode"] = storage.mode;
		entry["max"] = storage.max;
		entry["rarity"] = storage.rarity;
		entry["accuracy"] = storage.accuracy;
		entry["track"] = storage.track;
		entry["shiny"] = storage.shiny;
		entry["hidden"] = storage.hiddenpower;
		entry["veteran"] = storage.veteran;
		entry["vitamins"] = storage.vitamins;
		entry["modecalculated"] = storage.modecalculated;
		storage.savedpokemon[saveid] = entry;//write save entry to storage
		storage.save = false;
	}//end of save routine

	id = storage.current_pokemon[0];
	storage.trackcount = storage.numtracked;

	//if current pokemon is tracked, reduce numtracked count by 1 to avoid counting it twice
	if(storage.numtracked >= 1)
	{
		if(isSaved(id) && storage.savedpokemon[id].track)
			storage.trackcount -= 1;
	}

	storage.kostep = 1.0 / storage.trackcount;

	//get a list of Pokemon that can be encountered in the current zone and store it for use in view
	var zone = storage.zone;
	var in_zone = getPokemonInZone(zone);
	storage.pokemon_in_zone = in_zone;

	localStorage.setItem('storage', JSON.stringify(storage));
	localStorage.setItem('saved', JSON.stringify(storage.savedpokemon));//must update storage object with saved pokemon
}//End of update()

// Service function adapted from PHP equivalent.
function array_key_exists(lvl, records)
{
	var exists = false;
	var keys = Object.keys(records);

	for(i = 0; i < keys.length; i++)
	{
		if(keys[i] == lvl)
		{
			exists = true;
			break;
		}
	}

	return exists;
}

// Initialize global variables.
function setGlobals(gen)
{
	storage.global = new Object();
	storage.global.maxdv = 15;
	storage.global.minlevel = 0;
	storage.global.maxlevel = 100;
	storage.global.maxStatExp = 65025;
	storage.global.vitaminStep = 2560;
	storage.global.vitaminMax = 25600;
	storage.global.sortorder = 1;
	storage.global.sortby = 'pokedex';

	if(gen == 1)
	{
		storage.global.numpokemon = 151;
		storage.global.numstats = 5;
		storage.global.base_stats_col = 2;
		storage.global.numtypes = 15;
		storage.global.numzones = 48;
	}
	else if(gen == 2)
	{
		storage.global.numpokemon = 251;
		storage.global.numstats = 6;
		storage.global.base_stats_col = 3;
		storage.global.numtypes = 17;
		storage.global.numzones = 45;
	}

	localStorage.setItem('storage', JSON.stringify(storage));
}

// Refresh application. Called every page load.
async function index()
{
	var gen;
	globals = new Object();
	storage = JSON.parse(localStorage.getItem('storage'));
	tables = JSON.parse(localStorage.getItem('tables'));

	if(!isset(storage) || !storage.initialized)
	{
		storage = new Object();
		gen = parseInt(localStorage.getItem('gen'));

		if(isNaN(gen))
			gen = 1;

		setGlobals(gen);
		initialize(gen);
		localStorage.setItem('tablesCached', 'false');
		await cacheTables(gen);
		localStorage.setItem('tables', JSON.stringify(tables));
		localStorage.setItem('storage', JSON.stringify(storage));

		if(globals.cacheComplete)
			localStorage.setItem('tablesCached', 'true');
	}

	pollInput();
	update();
	localStorage.setItem('storage', JSON.stringify(storage));
}

// Return zone caption given by zone @name
function getZoneCaption(name)
{
	var caption;

	for(i = 0; i < storage.global.numpokemon; i++)
	{
		if(tables.zones.data[i].name == name)
		{
			caption = tables.zones.data[i].caption;
			break;
		}
	}

	return caption;
}

// Return entire table of Pokemon objects as array
function getAllPokemon()
{
	return tables.pokemon;
}

// Return Pokemon object given by species @name
function getPokemonByName(name)
{
	var pokemon;

	for(i = 0; i < storage.global.numpokemon; i++)
	{
		if(tables.pokemon[i].name == name)
		{
			pokemon = tables.pokemon[i];
			break;
		}
	}

	return pokemon;
}

/* Return a Pokemon object given by row @index in Pokemon table.
   Tables must be cached before this is called! */
function getPokemon(index)
{
	return tables.pokemon[index];
}

// Return row of evolution table
function getPokemonEvolution(index)
{
	return tables['evolution'][index];
}

// Return array of Pokemon objects composed of only those found in @zone
function getPokemonInZone(zone)
{
	var inzone;

	if(zone == 'allzones')
	{
		inzone = tables.pokemon;
	}
	else
	{
		var j = 0;

		for(i = 0; i < storage.global.numpokemon; i++)
		{
			if(tables.pokemon[i][zone] == 1)
				inzone[j++] = pokemon[i];
		}
	}

	return inzone;
}

// Return zone captions as object indexed by zone name
function getZoneCaptions()
{
	captions = new Object();

	for(i = 0; i < tables.zones.length; i++)
	{
		captions[tables.zones[i].name] = tables.zones[i].caption;
	}

	return captions;
}

// Load JSON file @path
/* This previously used the Fetch API however this app was intended for offline use as well, and browsers prevent local use of Fetch,
   so data is loaded statically through imported Javacsript files. */
async function loadTable(path, title, index)
{
	return JSON.stringify(JSON.parse(data)[index]);;
}

// Load data tables into local storage
async function cacheTables(gen)
{
	var dir = 'assets/data/';
	var title = ['pokemon', 'evolution', 'map', 'zones', 'coordinates'];
	var path;
	var region;
	var temp;

	gen = parseInt(gen);
	tables = new Object();

	if(gen == 1)
	{
		region = 'kanto';
		data = kanto_data;
	}
	else if(gen == 2)
	{
		region = 'johto';
		data = johto_data;
	}

	for(t = 0; t < title.length; t++)
	{
		path = dir + region + '_' + title[t] + '.json';
		temp = await loadTable(path, title[t], t);
		tables[title[t]] = JSON.parse(temp);
	}

	globals.cacheComplete = true;
	location.reload();

	//tables array is not a complete JSON object after loading
	//stringify then parse to get a proper object for local cache
	localStorage.setItem('tables', JSON.stringify(tables));
	tables = JSON.parse(localStorage.getItem('tables'));
}

function scrollToTop() {
	window.scrollTo({top: 0, behavior: 'smooth'});
}

window.onscroll = function() {
	document.getElementById("TOP_BUTTON").style.display =
		document.body.scrollTop > 20 || document.documentElement.scrollTop > 20 ? "block" : "none";
};
//EOF
