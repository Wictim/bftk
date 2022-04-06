let radius; // number
let side; // number
let selectedRadius; // number
let selectedSkipZeros; // boolean
let skipZeros; // boolean
let selectedNoHelp; // boolean
let noHelp; // boolean
let selectedX; // number
let selectedY; // number
let selectedSeed; // number
let possibleMoveCoords; // number[2][]
let valueField; // number [][]
let nodeField; // element [][]
let reachableNodes; // number []
let movesTaken; // number
let rng; // RNG

const backgroundColor = "#1e1e1e";
const cellBackgroundInactive = "#c0c0c0";
const cellBackgroundInactiveUnreachable = "#909090";
const cellBackgroundEnd = "#808080";
const cellBackgroundSelected = "#ffffff";
const cellBackgroundSelectable = "#ffffff";

const cellBackgroundEndReachableEasy = [128, 255, 128];
const cellBackgroundEndReachableHard = [255, 128, 128];

const dimensionSigns = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
];

document.addEventListener('DOMContentLoaded', onLoad, false);

function onLoad() {
	setupUi();
    generateMaze();
}

function getNode(elementName) {
    return document.getElementById(elementName);
}

function getVal(coords) {
	return valueField[coords[0]][coords[1]];
}

function iterate(array, sideLength, handleRow, handleItem) {
    for (let x = 0; x < sideLength; x++) {
        const rowItem = handleRow(x);
        for (let y = 0; y < sideLength; y++) {
            handleItem(x, y, rowItem);
        }
    }
}

function isSelectable(x, y) {
    return possibleMoveCoords.some(coords => coords[0] === x && coords[1] === y);
}

function add(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
}

function sub(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
}

function mult(a, b) {
    return [a[0] * b, a[1] * b];
}

function toDimentionSignIndex(coords) {
	const signX = Math.sign(coords[0]);
	const signY = Math.sign(coords[1]);
	const result = dimensionSigns.findIndex(sign => sign[0] === signX && sign[1] === signY);
	return result >= 0 ? result : null;
}

function coordsToIndex(coords) {
    return coords[0] * side + coords[1];
}

function indexToCoords(i) {
    return [Math.floor(i / side), i % side];
}

function nonNullGreaterEqual(a, b) {
    return a !== null && a >= b;
}

function isValidCoords(coords, isMovableTile = false) {
    const [x, y] = coords;
    return x >= 0 && x < side && y >= 0 && y < side && nonNullGreaterEqual(valueField[x][y], isMovableTile ? 1 : 0);
}

function sequence(size, offset = 0) {
    return [...new Array(size)].map((v, i) => i + offset);
}

function addDimensionSign(coords, index = 0, multiplier = 1) {
    return add(coords, mult(dimensionSigns[index], multiplier));
}

function addDimensionSigns(coords, multiplier = 1) {
    return dimensionSigns.map(ds => add(coords, mult(ds, multiplier)));
}

function generatePossibleMoveCoords(forcedIndex = null) {
    possibleMoveCoords = getPossibleMoveCoordsFromPosition([selectedX, selectedY], forcedIndex);
}

function getPossibleMoveCoordsFromPosition(coords, forcedIndex = null) {
    const value = valueField[coords[0]][coords[1]];
	if(value === 0) return [];
	const signIndexes = forcedIndex !== null ? [forcedIndex] : sequence(4);
    return signIndexes.filter(dimIndex => (skipZeros ? [value] : sequence(value, 1))
			.every(i =>
				isValidCoords(addDimensionSign(coords, dimIndex, i), i !== value)))
			.map(dimIndex => addDimensionSign(coords, dimIndex, value));
}

function valueToColor(x, y, canBeSelected = true) {
    switch (valueField[x][y]) {
        case null:
            return backgroundColor;

        case 0:
            if (canBeSelected && isSelectable(x, y))
                return cellBackgroundSelectable;
			const node = reachableNodes[coordsToIndex([x, y])];
            return (!noHelp && node)
				? colorMixer(cellBackgroundEndReachableHard, cellBackgroundEndReachableEasy, node.rating)
				: cellBackgroundEnd;

        default:
            if (canBeSelected && x === selectedX && y === selectedY)
                return cellBackgroundSelected;
            if (!noHelp && canBeSelected && isSelectable(x, y))
                return cellBackgroundSelectable;
            return noHelp || reachableNodes[coordsToIndex([x, y])] ? cellBackgroundInactive : cellBackgroundInactiveUnreachable;
    }
}

function setupUi() {
	document.body.style.background = backgroundColor;

    getNode("generate-new-button").onclick = () => generateMaze();
    getNode("generate-from-seed-button").onclick = () => generateMaze(selectedSeed);

    selectedRadius = 10;

    getNode("maze-radius-label").style.color = cellBackgroundInactive;
    getNode("maze-radius-input").value = selectedRadius;
    getNode("maze-radius-input").onchange = (event) => {
        const value = Number(event.target.value);
        selectedRadius = Math.max(Math.min(value, 100), 1);
        getNode("maze-radius-input").value = selectedRadius;
    };
	
	getNode("maze-seed-label").style.color = cellBackgroundInactive;
    getNode("maze-seed-input").onchange = (event) => {
        const value = Number(event.target.value);
        selectedSeed = Math.max(Math.min(value, MAX_RNG_VALUE), 1);
        getNode("maze-seed-input").value = selectedSeed;
    };
	
	getNode("moves-taken-counter-label").style.color = cellBackgroundInactive;
	getNode("moves-taken-counter").style.color = cellBackgroundInactive;
	getNode("completion-message-label").style.color = cellBackgroundInactive;
	
	getNode("skip-zeros-label").style.color = cellBackgroundInactive;
	getNode("skip-zeros-switch").onchange = (e) => {
		selectedSkipZeros = e.target.checked;
	};
	
	getNode("no-help-label").style.color = cellBackgroundInactive;
	getNode("no-help-switch").onchange = (e) => {
		selectedNoHelp = e.target.checked;
	};
	
	getNode("load-file-input").style.color = cellBackgroundInactive;
	getNode("load-file-input").onclick = () => { 
		getNode("load-file-input").value = ""; 
	}
	getNode("load-file-input").onchange = (e) => {
		const files = e.target.files;
		if(files[0]) {
			const file = files[0];
			const promise = file.text()
			promise.then(data => {
				resetData();
				
				const lines = data.split(/\n/g);
				
				radius = (lines.length - 1) / 2;
				side = lines.length;
				selectedX = radius;
				selectedY = radius;
				
				iterate(valueField, side, (x) => 
					valueField.push(lines[x].split(/,/g).map(x=>x.trim()).map(x => x ? Number(x) : null)), (x, y) => {});
				
				discoverData();
				setupTable();
				
				move(selectedX, selectedY);
			})
		}
	};
}

function resetData(seed) {
	radius = (selectedRadius + 1);
    side = radius * 2 + 1;
    selectedX = radius;
    selectedY = radius;
    valueField = [];
    nodeField = [];
	possibleMoveCoords = [];
    reachableNodes = new Array(side * side);
	movesTaken = -1;
	skipZeros = !!selectedSkipZeros;
	noHelp = !!selectedNoHelp;
	
	selectedSeed = seed > 0 ? seed : new RNG().nextInt();
	rng = new RNG(selectedSeed);
}

function generateData() {
	
	// generate random data
	
	iterate(valueField, side, (x) => valueField.push(new Array(side)), (x, y) => {
        const distance = Math.round(Math.sqrt((x - radius) * (x - radius) + (y - radius) * (y - radius)));
        const value = distance < radius ? Math.floor(rng.nextFloat() * 0.9 * radius + 1) : null;
        valueField[x][y] = value;
    });

	// generate bounding zeros

    iterate(valueField, side, () => {}, (x, y) => {
        if (valueField[x][y] === null && dimensionSigns.some(shift => isValidCoords(add([x, y], shift), true))) {
            valueField[x][y] = 0;
        }
    });
}

function discoverData() {
	const nodesToExplore = [
		{ coords: [selectedX, selectedY], depth: 0, previousCoords: null }
    ];
    reachableNodes[coordsToIndex([selectedX, selectedY])] = { coords: [selectedX, selectedY], depth: 0, rating: 0 };
    const reachableEndNodes = [];
    while (nodesToExplore.length) {
        const node = nodesToExplore.shift();
        getPossibleMoveCoordsFromPosition(node.coords).forEach(moveCoords => {
            const index = coordsToIndex(moveCoords);
			
            if (!reachableNodes[index]) {
				const newNode = { coords: moveCoords, depth: node.depth + 1, previousCoords: node.coords };
                reachableNodes[index] = newNode;
                nodesToExplore.push(newNode);
				
                if (getVal(moveCoords) === 0) {
                    reachableEndNodes.push(newNode);
                }
            }
        })
    }
	
	const maxDepth = reachableEndNodes.reduce((p, c) => c.depth > p ? c.depth : p, 1);
    reachableEndNodes.forEach((node, i) => node.rating = node.depth / maxDepth);
}

function setupTable() {
	getNode("maze-seed-input").value = selectedSeed;
	getNode("completion-message-label").innerHTML = "";
	getNode("moves-taken-counter").innerHTML = movesTaken;

    const mazeDiv = getNode("maze-div");
    mazeDiv.innerHTML = "";

    const table = document.createElement('table');
    table.setAttribute('border', '0');

    const tableBody = document.createElement('tbody');

    iterate(nodeField, side, (x) => {
        nodeField.push(new Array(side));
        const tableRow = document.createElement('tr');
        tableBody.appendChild(tableRow);
        return tableRow;
    }, (x, y, tableRow) => {
        const cell = document.createElement('td');
        const value = valueField[x][y];
        const validField = value !== null;
        cell.appendChild(document.createTextNode(validField ? value : ""));
        cell.width = "30px";
        cell.style.minWidth = "30px";
        cell.height = "30px";
        cell.style.textAlign = "center";
        cell.onmouseover = (event) => {
            if (isSelectable(x, y)) {
                move(x, y);
            }
        };

        // TODO debug stuff
        /*cell.onclick = (event) => {
            if (isValidCoords([x, y]))
                move(x, y);
        };*/
		cell.onclick = (event) => {
            if (isValidCoords([x, y]))
                explain(x, y);
        };
        cell.style.background = valueToColor(x, y);
        tableRow.appendChild(cell);
        nodeField[x][y] = cell;
    })

    table.appendChild(tableBody);
    mazeDiv.appendChild(table);
}

function generateMaze(seed) {
	resetData(seed);
	generateData();
	discoverData();
	setupTable();
	
	move(selectedX, selectedY);
}

function move(x, y, nextIndex = null) {
	
	// counter
	
	movesTaken++;
	getNode("moves-taken-counter").innerHTML = movesTaken;

    // unflag previous state

    nodeField[selectedX][selectedY].style.background = valueToColor(selectedX, selectedY, false);

    possibleMoveCoords.forEach(coords => {
        nodeField[coords[0]][coords[1]].classList.remove('blink-bg');
    });

    // prepare new state

    selectedX = x;
    selectedY = y;

    nodeField[x][y].style.background = valueToColor(x, y);

    generatePossibleMoveCoords(nextIndex);

    possibleMoveCoords.forEach(coords => {
        nodeField[coords[0]][coords[1]].classList.add("blink-bg");
    });
	
	if(valueField[x][y] === 0) {
		const node = reachableNodes[coordsToIndex([x,y])];
		const difficulty = Math.round(node.rating * 100)
		getNode("completion-message-label").innerHTML = "--- FINISH REACHED! DIFFICULTY: "+difficulty+"%, OPTIMAL ROUTE: " + node.depth + " MOVES ---"
	}
}

function explain(x, y) {

	if(noHelp) return;
	
	let coords = [x, y];
	const coordsPath = [coords];
	let node;
	
	if(!reachableNodes[coordsToIndex(coords)]) return;
	
	do {
		node = reachableNodes[coordsToIndex(coords)];
		if (node && node.previousCoords) {
			coords = node.previousCoords;
			coordsPath.push(coords);
		}
	} while(node && node.previousCoords);

	const paths = coordsPath.reverse();
	paths.forEach((coords, i) => {
		setTimeout(() => {
			const nextExists = i < coordsPath.length - 1;
			const nextIndex = nextExists ? toDimentionSignIndex(sub(paths[i + 1], coords)) : null;
			move(coords[0], coords[1], nextIndex);
		}, 1000 * i);
	});
	
}

// ---

// from: https://stackoverflow.com/a/32171077

//colorChannelA and colorChannelB are ints ranging from 0 to 255
function colorChannelMixer(colorChannelA, colorChannelB, amountToMix) {
    var channelA = colorChannelA * amountToMix;
    var channelB = colorChannelB * (1 - amountToMix);
    return parseInt(channelA + channelB);
}
//rgbA and rgbB are arrays, amountToMix ranges from 0.0 to 1.0
//example (red): rgbA = [255,0,0]
function colorMixer(rgbA, rgbB, amountToMix) {
    var r = colorChannelMixer(rgbA[0], rgbB[0], amountToMix);
    var g = colorChannelMixer(rgbA[1], rgbB[1], amountToMix);
    var b = colorChannelMixer(rgbA[2], rgbB[2], amountToMix);
    return "rgb(" + r + "," + g + "," + b + ")";
}

// ---

const MAX_RNG_VALUE = 2147483648;

// ---

// from: https://stackoverflow.com/a/424445

function RNG(seed) {
  // LCG using GCC's constants
  this.m = 0x80000000; // 2**31;
  this.a = 1103515245;
  this.c = 12345;

  this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
}

RNG.prototype.nextInt = function() {
  this.state = (this.a * this.state + this.c) % this.m;
  return this.state;
}

RNG.prototype.nextFloat = function() {
  // returns in range [0,1]
  return this.nextInt() / (this.m - 1);
}

RNG.prototype.nextRange = function(start, end) {
  // returns in range [start, end): including start, excluding end
  // can't modulu nextInt because of weak randomness in lower bits
  var rangeSize = end - start;
  var randomUnder1 = this.nextInt() / this.m;
  return start + Math.floor(randomUnder1 * rangeSize);
}

RNG.prototype.choice = function(array) {
  return array[this.nextRange(0, array.length)];
}

// example

/*
var rng = new RNG(20);
for (var i = 0; i < 10; i++)
  console.log(rng.nextRange(10, 50));

var digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
for (var i = 0; i < 10; i++)
  console.log(rng.choice(digits));
*/

// ---

// useful stuff
// https://beautifier.io/
// https://www.google.com/search?q=hex+color&oq=hex+color+&aqs=chrome.0.69i59j0i512l9.2274j0j7&sourceid=chrome&ie=UTF-8
