/*  Title: DV Calculator
		Description: A web browser application for calculating diversification values in generation 1 and 2 Pokemon games.
    Copyright (C) 2018 Andrew Noble

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details. */

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

// Return a new Array of length @size filled with default value given by @initial
function createArray(size, initial)
{
	var array = [];

	while(array.length < size)
		array.push(initial);

	return array;
}

// Level up the current Pokemon by 1 level.
function levelUp()
{
	storage.levelup = true;
	saveAll();
}

// Evolve the current Pokemon.
function evolvePokemon()
{
	storage.evolve = true;
	saveAll();
}

// Devolve the current Pokemon.
function devolvePokemon()
{
	storage.revert = true;
	saveAll();
}

// Set the experience tracker column by which to sort its entries.
function sortBy(column)
{
	if(column == storage.global.sortby)
		storage.global.sortorder *= -1;
	else
		storage.global.sortorder = 1;

	storage.global.sortby = column;
	refresh();
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
			var span = document.createElement('span');
			span.setAttribute('id', 'CONFIRM_LABEL');
			var text = document.createTextNode("Confirm: ");
			span.appendChild(text);
			$('PROMPT').insertBefore(span, $('CONFIRM_RESET'));
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
	{
		in_zone.sort(orderByKO)
	}
	else
	{
		in_zone.sort(orderByColumn);
	}

	storage.in_zone = in_zone;
}

// Set experience tracker to veteran mode.
function veteranMode()
{
	storage.veteran = (!storage.veteran) ? true : false;
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
	storage.input.save = true;
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

	for(i = 1; i < getLength(storage.mode); i++)
	{
		if(i != 3 && i != 4)
		{
			if(storage.mode[i] <= 7)
			{
				binary = binary + "0";
			}
			else
			{
				binary = binary + "1";
			}
		}
	}

	if(storage.mode[3] <= 7)
	{
		binary = binary + "0";
	}
	else
	{
		binary = binary + "1";
	}

	var x = parseInt(binary, 2);
	var y = Math.min(storage.mode[4], 3);//special DV capped at 3
	var basedmg = (5 * x + y) / 2 + 31;
	var a = (+storage.mode[1]).toString(2);
	var b = (+storage.mode[1]).toString(2);
	var typebin = a[2] + a[3] + b[2] + b[3];
	var typedec = parseInt(typebin, 2);

	storage.hiddenpower.damage = Math.floor(basedmg);
	storage.hiddenpower.type = types[typedec];
}

/* Initialize the calculator.
   Globals must be set before calling this. */
function initialize(gen)
{

	storage.records = new Object();
	storage.input = new Object();
	storage.in_zone = [];
	storage.displayData = new Object();
	storage.display = new Object();
	storage.current_pokemon = new Array();

	storage.input.showstats = true;
	storage.input.thumbs = false;
	storage.lookup = [];
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
	storage.filter = false;
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
	storage.showstats = true;
	storage.sortorder = "ASC";
	storage.thumbs = false;
	storage.trackedindex = 0;
	storage.type = "All";

	clear();//must be called after initialization

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

	if(storage.gen == 1)
	{
		storage.stats.spd = 0;
		storage.stats.spc = 0;
	}
	else if(storage.gen == 2)
	{
		storage.stats.spca = 0;
		storage.stats.spcd = 0;
		storage.stats.spd = 0;
	}

	storage.knockouts = createArray(storage.global.numpokemon, 0);// new Array(storage.global.numpokemon);
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

	storage.dvalues = createArray(storage.global.numstats, [-1, -1]);// array_fill(0, storage.global.numstats, array(-1, -1));
	storage.stat_exp = createArray(storage.global.numstats, 0);//values involved in calculations must have Math.floor at 0, negative values cause incorrect results
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
		storage.input.track = storage.track;//hack
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

	if(isset(storage.input.current))//this only happens when it's already set... otherwise it still points to old id before reset
	{
		id = storage.input.current;//set current pokemon
	}

	if(id != storage.current_pokemon[0])
	{
		storage.current_pokemon[0] = id;
		clear();//if current pokemon has changed
	}

	if(isSaved(id))
	{
		species = storage.savedpokemon[id].pokemon[1];//0 is id, 1 is species, 2 is pokedex
	}
	else
	{
		species = id;//here the species is set to the save id because the saved storage was cleared and saveid is no longer saved
	}

	storage.attributes = getPokemonByName(species);
	storage.current_pokemon = [id, species, storage.attributes.pokedex - 1];//Subtract 1 from Pokedex number to get index starting at 0
	storage.overwrite = storage.input.overwrite;

	//Update stats
	if(isset(storage.input.lvl))
	{
		storage.stats.lvl = storage.input.lvl;
	}
	if(isset(storage.input.hp))
	{
		storage.stats.hp = storage.input.hp;
	}
	if(isset(storage.input.att))
	{
		storage.stats.att = storage.input.att;
	}
	if(isset(storage.input.def))
	{
		storage.stats.def = storage.input.def;
	}
	if(isset(storage.input.spd))
	{
		storage.stats.spd = storage.input.spd;
	}

	if(storage.gen == 1)
	{
		if(isset(storage.input.spc))
		{
			storage.stats.spc = storage.input.spc;
		}
	}
	else if(storage.gen == 2)
	{
		if(isset(storage.input.spca))
		{
			storage.stats.spca = storage.input.spca;
		}
		if(isset(storage.input.spcd))
		{
			storage.stats.spcd = storage.input.spcd;
		}
	}

	//Update vitamins
	if(isset(storage.input.vithp))
	{
		storage.vitamins[0] = storage.input.vithp;
	}
	if(isset(storage.input.vitatt))
	{
		storage.vitamins[1] = storage.input.vitatt;
	}
	if(isset(storage.input.vitdef))
	{
		storage.vitamins[2] = storage.input.vitdef;
	}
	if(isset(storage.input.vitspd))
	{
		storage.vitamins[3] = storage.input.vitspd;
	}
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
		{
			storage.vitamins[i] = 0;
		}
	}

	storage.calculate = storage.input.calculate;
	storage.filter = (isset(storage.input.filter)) ? true : false;
	storage.maxexp = storage.input.maxexp;
	storage.track = storage.input.track;
	storage.save = (isset(storage.input.save)) ? true : false;

	if(isset(storage.input.type))
	{
		storage.type = storage.input.type;
	}
}

// Return the length of an Array or Object
function getLength(countable)
{
	var length = 0;

	if(typeof countable == "object")
	{
		length = Object.keys(countable).length;
	}
	else if(Array.isArray(countable))
	{
		length = countable.length;
	}

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
	storage.attributes = getPokemonByName(newPokemon.name);
	storage.current_pokemon[1] = storage.attributes.name;
	saveAll();
}

/*
* Called on each page refresh. Performs logic on new input and passes data to view.
* Design is to minimize operatins on data, calls to the math library, and redundant loops.
*/
function update()
{
	storage.outofrange = false;//clear warning
	var level = storage.stats.lvl;
	populateTracker(storage.zone);

	if(storage.evolve)
	{
		evolve_pokemon('next_stage');
		storage.evolve = false;
		//must get new attributes before next call
		calculateMaxStats();
	}
	else if(storage.revert)
	{
		evolve_pokemon('previous_stage');
		storage.revert = false;
		calculateMaxStats();
	}
	else if(storage.levelup)
	{
		level++;//update temp variable for calculations down below .. check
		storage.stats.lvl = level;
		var keys = Object.keys(storage.stats);

		for(i = 1; i < getLength(keys); i++)
		{
			storage.stats[keys[i]] = 0;
		}

		storage.levelup = false;
	}

	if(level <= storage.global.minlevel || level > storage.global.maxlevel)
	{
		storage.calculate = false;//enforce bounds on level
	}

	//change k to i and some other concurrent execution will step on i  causing infinite loop
	//update stat experience based on all rows displayed in tracker
	for(k = 0; k < storage.global.numpokemon; k++)
	{
		var id = 'k' + (k + 1);

		if(isset(storage.input[id]))
		{
			var min = 0;
			var abs_min = 0.15;//absolute minimum step size to prevent infinite division toward 0

			var knockouts = Number.parseFloat(storage.input[id]);
			storage.knockouts[k] = Number.parseFloat(storage.knockouts[k]);
			var delta = knockouts - storage.knockouts[k];//Find diff. between input and stored value
			id = storage.current_pokemon[0];//reuse of temp variable id

			if(storage.numtracked >= 1)
			{
				if(isSaved(id) && storage.savedpokemon[id].track)
				{
					delta = delta / (storage.numtracked - 1);
					min = 1 / (storage.numtracked - 1);
				}
				else
				{
					delta = delta / storage.numtracked;//change in KO / # in party
					min = 1 / storage.numtracked;//Set minimum step size
				}

			}

			if(delta != 0 && Math.abs(delta) < min)
			{
				var sign = delta / Math.abs(delta);
				delta = sign * min;//enforce minimum step size
			}

			delta = Number.parseFloat(delta.toFixed(2));
			storage.knockouts[k] += delta;//Add delta to knockouts, round only here to preserve accuracy

			if(storage.knockouts[k] < abs_min)//enforce absolute minimum total KO value
			{
				storage.knockouts[k] = 0;//otherwise it divides infinitely toward 0
			}

			//Loop through saved pokemon and update data
			//This could be more efficient by only looping through tracked pokemon, refs. stored in another array

			var keys = Object.keys(storage.savedpokemon);
			for(j = 0; j < keys.length; j++)
			{
				var entry = storage.savedpokemon[keys[j]];
				if(entry.track)
				{
					id = entry.pokemon[0];
					storage.savedpokemon[keys[j]].knockouts[k] += delta;
					if(storage.savedpokemon[keys[j]].knockouts[k] < abs_min)
					{
						storage.savedpokemon[keys[j]].knockouts[k] = 0;
					}

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

	/*
	* Calculate the DV stats for a Pokemon when the Calculate button was pressed.
	* If level is 0 the calculateHitpointsDV function will throw a divide by 0 error
	*/
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
			maxExp = storage.global.maxStatExp;//Temp variable to save code space

			//Set stat experience to maximum possible if max option is checked
			if(storage.maxexp)
			{
				storage.stat_exp = createArray(storage.global.numstats, maxExp);
			}
			else
			{
				/* because of the low precision of minimum step size for stat experience
				*  when using the vitamin trick the calculator runs in 'estimation' mode,
				*  where the results are considered to be only 50% accurate
				*/
				storage.estimation = true;
				storage.stat_exp = createArray(storage.global.numstats, 0);

				//Iterate through each vitamin (5 total)
				for(i = 0; i < storage.global.numstats; i++)
				{
					var x = i;
					//Find stat experience from vitamins used
					/*if(storage.gen == 2 && i == 4)
					{
						x = 3; no longer needed - two special vitamins combined into one
					}*/

					if(storage.vitamins[x] > 0)
						storage.stat_exp[i] = storage.global.vitaminMax - storage.vitamins[x] * storage.global.vitaminStep;

					//Test bounds
					if(storage.stat_exp[i] < 0)
					{
						storage.stat_exp[i] = 0;
					}
					else if(storage.stat_exp[i] > storage.global.maxStatExp)
					{
						storage.stat_exp[i] = storage.global.maxStatExp;
					}
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
		//find a way to eliminate this duplicate code
		if(valid)
		{
			storage.outofrange = false;
			//enforce bounds on DV range
			if(dv[0] < 0)
			{
				dv[0] = 0;
			}
			if(dv[1] > 15)
			{
				dv[1] = 15;
			}
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
				{
					dv[0] = 0;
				}
				if(dv[1] > 15)
				{
					dv[1] = 15;
				}
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
						{
							min[i] = row[i][0];
						}

						if(row[i][1] < max[i])
						{
							max[i] = row[i][1];
						}
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
							if(j >= 0)//this validation hack shouldn't be necessary, where is data becoming -1 in the records?
							{
								occurrences[j]++;
							}
						}
					}

					var largest = Math.max(occurrences);

					var identical = [-1];//-1 or division by zero error occurs
					//-1 is hack for occurrences having index of 16

					for(j = 0; j < getLength(occurrences) - 1; j++)
					{
						if(occurrences[j] == largest)
						{
							array_push(identical, "j");
						}
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
						//how could max ever be smaller than min?
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
					{
						hp += 8;
					}
					if(storage.mode[2] % 2 == 1)
					{
						hp += 4;
					}
					if(storage.mode[3] % 2 == 1)
					{
						hp += 2;
					}
					if(storage.mode[4] % 2 == 1)
					{
						hp += 1;
					}
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
						{
							count++;
						}
						else if(storage.accuracy[i] == 1 || storage.accuracy[i] == 0)
						{
							reverse = i;
						}
					}
					if(count == 3)
					{
						if(storage.mode[1] % 2 == 1 && reverse != 1)
						{
							hp -= 8;
						}
						if(storage.mode[2] % 2 == 1 && reverse != 2)
						{
							hp -= 4;
						}
						if(storage.mode[3] % 2 == 1 && reverse != 3)
						{
							hp -= 2;
						}
						if(storage.mode[4] % 2 == 1 && reverse != 4)
						{
							hp -= 1;
						}
						switch(reverse)
						{
							case 1:
								if(hp == 8)
								{
									if(min[1] % 2 == 1)
									{
										storage.mode[1] = min[1];
									}
									else
									{
										storage.mode[1] = max[1];
									}
									storage.accuracy[1] = 2;
								}
								else if(hp == 0)
								{
									if(min[1] % 2 == 0)
									{
										storage.mode[1] = min[1];
									}
									else
									{
										storage.mode[1] = max[1];
									}
									storage.accuracy[1] = 2;
								}
								break;
							case 2:
								if(hp == 4)
								{
									if(min[2] % 2 == 1)
									{
										storage.mode[2] = min[2];
									}
									else
									{
										storage.mode[2] = max[2];
									}
									storage.accuracy[2] = 2;
								}
								else if(hp == 0)
								{
									if(min[2] % 2 == 0)
									{
										storage.mode[2] = min[2];
									}
									else
									{
										storage.mode[2] = max[2];
									}
									storage.accuracy[2] = 2;
								}
								break;
							case 3:
								if(hp == 2)
								{
									if(min[3] % 2 == 1)
									{
										storage.mode[3] = min[3];
									}
									else
									{
										storage.mode[3] = max[3];
									}
									storage.accuracy[3] = 2;
								}
								else if(hp == 0)
								{
									if(min[3] % 2 == 0)
									{
										storage.mode[3] = min[3];
									}
									else
									{
										storage.mode[3] = max[3];
									}
									storage.accuracy[3] = 2;
								}
								break;
							case 4:
								if(hp == 1)
								{
									if(min[4] % 2 == 1)
									{
										storage.mode[4] = min[4];
									}
									else
									{
										storage.mode[4] = max[4];
									}
									storage.accuracy[4] = 2;
								}
								else if(hp == 0)
								{
									if(min[4] % 2 == 0)
									{
										storage.mode[4] = min[4];
									}
									else
									{
										storage.mode[4] = max[4];
									}
									storage.accuracy[4] = 2;
								}
								break;
							default: break;
						}
					}
				}

				if(storage.gen == 2)
				{
					if(storage.accuracy[4] == 2) {
						storage.mode[5] = storage.mode[4];
						storage.accuracy[5] = 2;
					} else if(storage.accuracy[5] == 2) {
						storage.mode[4] = storage.mode[5];
						storage.accuracy[4] = 2;
					}

					if(!storage.display.hiddenpower)//if already set to display hidden power don't calculate again
					{										//in cases where clear() was called for a saved pokemon not all
						calculateHiddenPower();      //required values for calculation will be initialized
						storage.display.hiddenpower = true;
					}
				}

				calculateHiddenPower();

				//calculate pokemon's rarity, which is the probability of finding same DVs or better in
				//any random wild pokemon
				if(getLength(storage.records) > 0)
				{
					var rarity = 1;
					for(i = 1; i < getLength(storage.mode); i++)
					{
						rarity *= (16 - storage.mode[i]) / 16;
					}
					storage.rarity = Math.floor(1 / rarity);
					storage.display.rare = true;
				}

				//determine if a pokemon is shiny
				var allten = false;

				if(storage.mode[2] == 10 && storage.mode[3] == 10)
				{
					if(storage.mode[4] == 10)
					{
						allten = true;
					}
				}

				if(allten)
				{
					var att = storage.mode[1];
					if(att == 2 || att == 3 || att == 6 || att == 7
						|| att == 10 || att == 11 || att == 14 || att == 15)
					{
						storage.shiny = true;
					}
				}
			}
		}
		else
		{
			storage.overwrite = false;
			storage.prompt = false;
		}

		/*
		* Generate lookup table for DVs 0 - 15 inclusive, for each stat. Performance expensive.. Makes 75 calls to math functions.
		* Code to generate lookup table should always run if a valid level is entered.
		* Check the cache for same level and pokemon before running again?
		*/
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

			if(valid)
			{
				calculateMaxStats();
				level = storage.stats.lvl;
			}
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
			saveid = "" + storage.current_pokemon[1] + "_" + ++storage.savecount[storage.current_pokemon[2]];
			storage.current_pokemon[0] = saveid;
		}

		//update number of tracked pokemon, used in calculating distribution of KOs
		//if numtracked somehow became 6 it would become impossible to untrack
		//because the decrement is nested within a conditional block enforcing the adding bounds
		var exists = isset(storage.savedpokemon[saveid]);
		if(storage.numtracked <= 5)
		{
			if(storage.track)
			{
				if(isset(storage.savedpokemon[saveid]))
				{
					if(!storage.savedpokemon[saveid]["track"])
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
				{
					if(storage.savedpokemon[saveid]["track"])
					{
						storage.numtracked--;
					}
				}
			}
		}
		else
		{
			if(exists)
			{
				storage.track = storage.savedpokemon[saveid].track;
			}
			else
			{
				storage.track = false;
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
	}//end of save routine

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
	storage.global.vitamins = [10, 10, 10, 10, 10];//should not be global
	storage.global.sortorder = 1;

	if(gen == 1)
	{
		storage.global.numpokemon = 151;
		storage.global.numstats = 5;
		storage.global.base_stats_col = 2;
		storage.global.numtypes = 15;
		storage.global.numzones = 48;
		storage.global.sortby = 'pokedex';
	}
	else if(gen == 2)
	{
		storage.global.numpokemon = 251;
		storage.global.numstats = 6;
		storage.global.base_stats_col = 3;
		storage.global.numtypes = 17;
		storage.global.numzones = 45;
		storage.global.sortby = 'johtodex';
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
			{
				inzone[j++] = pokemon[i];
			}
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
async function loadTable(path, title, index)
{
	var temp;

	if(navigator.userAgent.indexOf("Firefox") !== -1)
	{
		temp = fetch(path)
			.then(function(response) {
				return response.json();
			})
			.then(function(myJson) {
				return JSON.stringify(myJson);
			});
	}
	else
	{
		temp = JSON.parse(data);
		temp = JSON.stringify(temp[index]);
	}

	return temp;
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
