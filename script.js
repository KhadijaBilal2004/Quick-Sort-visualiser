// --- Visualizer State & Configuration ---
let array = [];
let originalArray = []; // To allow reset
let arraySize = 15;
let animationDelay = 400;
let pivotStrategy = 'last'; // 'last', 'first', 'random', 'median'
let activeView = 'array'; // 'array' or 'tree'

// Execution flow control
let isPlaying = false;
let isPaused = false;
let isStepRequested = false;
let resolveStepFunc = null;
let currentSortPromise = null;
let cancelController = { cancel: false };

// Recursion Tree variables
let treeNodes = {}; // map of node ID to TreeNode details
let nextNodeId = 0;
let treeRootId = null;

// --- DOM Elements ---
const arrayContainer = document.getElementById('array-container');
const btnGenerate = document.getElementById('btn-generate');
const sliderSize = document.getElementById('array-size');
const valSize = document.getElementById('val-size');
const sliderSpeed = document.getElementById('speed');
const valSpeed = document.getElementById('val-speed');
const selectPivot = document.getElementById('pivot-strategy');

const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const btnStep = document.getElementById('btn-step');
const btnReset = document.getElementById('btn-reset');

const logConsole = document.getElementById('log-console-messages');
const treeSvg = document.getElementById('tree-svg');

// --- Event Listeners ---
btnGenerate.addEventListener('click', () => {
    resetState();
    generateRandomArray();
});

sliderSize.addEventListener('input', (e) => {
    arraySize = parseInt(e.target.value);
    valSize.textContent = arraySize;
    resetState();
    generateRandomArray();
});

sliderSpeed.addEventListener('input', (e) => {
    animationDelay = parseInt(e.target.value);
    valSpeed.textContent = `${animationDelay}ms`;
});

selectPivot.addEventListener('change', (e) => {
    pivotStrategy = e.target.value;
    resetState();
});

btnPlay.addEventListener('click', startVisualization);
btnPause.addEventListener('click', pauseVisualization);
btnStep.addEventListener('click', stepVisualization);
btnReset.addEventListener('click', () => {
    resetState();
    restoreOriginalArray();
});

// --- Utility Functions ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Custom log console
function logMsg(message, type = 'system') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `log-msg ${type}`;
    msgDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logConsole.appendChild(msgDiv);
    logConsole.scrollTop = logConsole.scrollHeight;
}

// Highlight pseudocode line
function highlightLine(lineId) {
    document.querySelectorAll('.line').forEach(el => el.classList.remove('highlight'));
    if (lineId) {
        const lineEl = document.getElementById(lineId);
        if (lineEl) lineEl.classList.add('highlight');
    }
}

// View switching (Array vs Tree)
function switchView(view) {
    activeView = view;
    document.getElementById('btn-array-view').classList.toggle('active', view === 'array');
    document.getElementById('btn-tree-view').classList.toggle('active', view === 'tree');
    document.getElementById('array-view-panel').classList.toggle('active', view === 'array');
    document.getElementById('tree-view-panel').classList.toggle('active', view === 'tree');
    
    if (view === 'tree') {
        renderTree();
    }
}

// --- Visualizer Array Generation & Display ---
function generateRandomArray() {
    array = [];
    for (let i = 0; i < arraySize; i++) {
        array.push(Math.floor(Math.random() * 85) + 15); // values between 15 and 100
    }
    originalArray = [...array];
    renderArray();
    logMsg(`Generated new array of size ${arraySize}: [${array.join(', ')}]`);
}

function renderArray(highlightIndices = {}, customColors = {}) {
    arrayContainer.innerHTML = '';
    array.forEach((val, idx) => {
        const barWrapper = document.createElement('div');
        barWrapper.className = 'array-bar-wrapper';
        
        const bar = document.createElement('div');
        bar.className = 'array-bar';
        bar.style.height = `${val}%`;
        
        // Apply color classes
        if (highlightIndices[idx]) {
            bar.classList.add(highlightIndices[idx]);
        }
        
        const valSpan = document.createElement('span');
        valSpan.className = 'bar-val';
        valSpan.textContent = val;
        
        barWrapper.appendChild(bar);
        barWrapper.appendChild(valSpan);
        arrayContainer.appendChild(barWrapper);
    });
}

function restoreOriginalArray() {
    array = [...originalArray];
    renderArray();
    logMsg("Restored original array.");
}

// --- Asynchronous Wait Mechanisms ---
async function wait() {
    if (cancelController.cancel) {
        throw new Error('cancelled');
    }
    
    if (isPaused) {
        await new Promise(resolve => {
            resolveStepFunc = resolve;
        });
    } else {
        await sleep(animationDelay);
    }
}

// --- Tree Node Structures ---
class TreeNode {
    constructor(id, low, high, parentId = null) {
        this.id = id;
        this.low = low;
        this.high = high;
        this.parentId = parentId;
        this.pivotIdx = null;
        this.pivotVal = null;
        this.state = 'pending'; // 'pending', 'active', 'done'
        this.leftChildId = null;
        this.rightChildId = null;
        this.arraySnapshot = [];
        this.x = 0;
        this.y = 0;
    }
}

// Render dynamic recursion tree with SVG
function renderTree() {
    treeSvg.innerHTML = '';
    if (Object.keys(treeNodes).length === 0) return;

    const svgWidth = treeSvg.clientWidth || treeSvg.parentElement.clientWidth || 800;
    const padding = 50;
    const levelHeight = 70;
    
    // Calculate stable layout coordinates based on the midpoint of the node's index range
    const maxIndex = arraySize - 1;
    const elementWidth = maxIndex > 0 ? (svgWidth - 2 * padding) / maxIndex : 0;
    
    // Assign coordinates
    Object.values(treeNodes).forEach(node => {
        // Calculate depth by traversing up parents
        let depth = 0;
        let pId = node.parentId;
        while (pId !== null && treeNodes[pId]) {
            depth++;
            pId = treeNodes[pId].parentId;
        }
        
        const mid = (node.low + node.high) / 2;
        node.x = maxIndex > 0 ? padding + mid * elementWidth : svgWidth / 2;
        node.y = 40 + depth * levelHeight;
    });

    const maxDepth = Math.max(...Object.values(treeNodes).map(n => {
        let depth = 0;
        let pId = n.parentId;
        while (pId !== null && treeNodes[pId]) {
            depth++;
            pId = treeNodes[pId].parentId;
        }
        return depth;
    }), 0);
    
    const requiredHeight = 80 + maxDepth * levelHeight;
    treeSvg.setAttribute('width', '100%');
    treeSvg.setAttribute('height', `${requiredHeight}px`);

    // Draw Links
    Object.values(treeNodes).forEach(node => {
        if (node.parentId !== null) {
            const parent = treeNodes[node.parentId];
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', parent.x);
            line.setAttribute('y1', parent.y);
            line.setAttribute('x2', node.x);
            line.setAttribute('y2', node.y);
            
            let linkClass = 'tree-link';
            if (node.state === 'active') linkClass += ' active';
            if (node.state === 'done') linkClass += ' done';
            line.setAttribute('class', linkClass);
            treeSvg.appendChild(line);
        }
    });

    // Draw Nodes
    Object.values(treeNodes).forEach(node => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', node.x);
        circle.setAttribute('cy', node.y);
        circle.setAttribute('r', '22');
        
        let circleClass = 'tree-node-circle';
        if (node.state === 'active') circleClass += ' active';
        if (node.state === 'done') circleClass += ' done';
        circle.setAttribute('class', circleClass);
        g.appendChild(circle);
        
        // Node text indices [low..high]
        const textIndices = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textIndices.setAttribute('x', node.x);
        textIndices.setAttribute('y', node.y - 2);
        textIndices.setAttribute('class', 'tree-text-indices');
        textIndices.textContent = `[${node.low}..${node.high}]`;
        g.appendChild(textIndices);

        // Node text subarray contents
        const textArray = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textArray.setAttribute('x', node.x);
        textArray.setAttribute('y', node.y + 11);
        textArray.setAttribute('class', 'tree-text-array');
        
        let arrayStr = node.arraySnapshot.slice(node.low, node.high + 1).join(',');
        if (arrayStr.length > 8) {
            arrayStr = arrayStr.substring(0, 7) + '..';
        }
        textArray.textContent = arrayStr;
        g.appendChild(textArray);

        // Tooltip for detailed view on hover
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `Range: [${node.low} ... ${node.high}]\nSubarray: [${node.arraySnapshot.slice(node.low, node.high + 1).join(', ')}]\nPivot: ${node.pivotVal !== null ? node.pivotVal : 'Pending'}`;
        g.appendChild(title);
        
        treeSvg.appendChild(g);
    });
}

// --- Quick Sort Implementation (Visualized) ---

async function quickSort(low, high, parentNodeId = null) {
    if (low >= high) {
        if (low === high) {
            // Element is already sorted
            renderArray({ [low]: 'sorted' });
            logMsg(`Element at index ${low} (${array[low]}) is sorted.`, 'sorted');
            await wait();
        }
        return;
    }

    highlightLine('code-qs');
    await wait();

    // Create Tree Node
    const nodeId = nextNodeId++;
    const node = new TreeNode(nodeId, low, high, parentNodeId);
    node.arraySnapshot = [...array];
    node.state = 'active';
    treeNodes[nodeId] = node;
    
    if (parentNodeId !== null) {
        if (treeNodes[parentNodeId].low === low) {
            treeNodes[parentNodeId].leftChildId = nodeId;
        } else {
            treeNodes[parentNodeId].rightChildId = nodeId;
        }
    } else {
        treeRootId = nodeId;
    }
    
    renderTree();

    highlightLine('code-cond');
    logMsg(`Invoking Quick Sort on subarray index range [${low} ... ${high}]`);
    await wait();

    highlightLine('code-part');
    await wait();
    
    // Run Partition
    const pi = await partition(low, high, node);
    
    node.pivotIdx = pi;
    node.pivotVal = array[pi];
    renderTree();

    // Recurse left partition
    highlightLine('code-left');
    logMsg(`Recursing left partition: [${low} ... ${pi - 1}]`);
    await wait();
    await quickSort(low, pi - 1, nodeId);

    // Recurse right partition
    highlightLine('code-right');
    logMsg(`Recursing right partition: [${pi + 1} ... ${high}]`);
    await wait();
    await quickSort(pi + 1, high, nodeId);

    // Node partition fully completed
    node.state = 'done';
    renderTree();
    highlightLine('code-end');
    await wait();
}

async function partition(low, high, treeNode) {
    highlightLine('code-partition-def');
    await wait();

    // Choose Pivot Strategy
    let pivotIndex = selectPivotIndex(low, high);
    let pivotValue = array[pivotIndex];
    
    highlightLine('code-pivot');
    logMsg(`Pivot selected: element at index ${pivotIndex} (value: ${pivotValue}) using ${pivotStrategy} strategy.`, 'info');
    
    // Swap chosen pivot to high to standard partition
    if (pivotIndex !== high) {
        swapElements(pivotIndex, high);
        renderArray({ [high]: 'pivot' });
        await wait();
    }
    
    let pivot = array[high];
    treeNode.pivotVal = pivot;
    renderTree();
    
    let i = low - 1;
    highlightLine('code-i-ptr');
    await wait();

    for (let j = low; j < high; j++) {
        highlightLine('code-loop');
        await wait();

        highlightLine('code-compare');
        renderArray({
            [high]: 'pivot',
            [j]: 'comparing',
            [i >= low ? i : low]: 'swapped'
        });
        logMsg(`Comparing index ${j} (${array[j]}) with pivot (${pivot})`, 'comparing');
        await wait();

        if (array[j] < pivot) {
            i++;
            highlightLine('code-increment');
            await wait();

            highlightLine('code-swap-inner');
            swapElements(i, j);
            renderArray({
                [high]: 'pivot',
                [i]: 'swapped',
                [j]: 'swapped'
            });
            logMsg(`Swapped elements at index ${i} (${array[i]}) and index ${j} (${array[j]})`, 'swapped');
            await wait();
        }
    }

    highlightLine('code-swap-pivot');
    swapElements(i + 1, high);
    renderArray({
        [i + 1]: 'pivot',
        [high]: 'swapped'
    });
    logMsg(`Placed pivot at correct position ${i + 1} by swapping with index ${high}`, 'swapped');
    await wait();

    // Finalize partition returns
    highlightLine('code-return');
    renderArray({ [i + 1]: 'sorted' });
    await wait();

    return i + 1;
}

function selectPivotIndex(low, high) {
    switch (pivotStrategy) {
        case 'first':
            return low;
        case 'random':
            return Math.floor(Math.random() * (high - low + 1)) + low;
        case 'median':
            const mid = Math.floor((low + high) / 2);
            const a = array[low];
            const b = array[mid];
            const c = array[high];
            if ((a - b) * (c - a) >= 0) return low;
            if ((b - a) * (c - b) >= 0) return mid;
            return high;
        case 'last':
        default:
            return high;
    }
}

function swapElements(i, j) {
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
}

// --- View State Control Methods ---

function resetState() {
    isPlaying = false;
    isPaused = false;
    isStepRequested = false;
    resolveStepFunc = null;
    cancelController.cancel = true; // Signal current async function to abort
    cancelController = { cancel: false }; // Create new controller
    
    // Reset recursion tree state
    treeNodes = {};
    nextNodeId = 0;
    treeRootId = null;
    
    // UI state
    btnPlay.disabled = false;
    btnPause.disabled = true;
    btnStep.disabled = false;
    btnPlay.querySelector('span').textContent = 'Start';
    highlightLine(null);
    renderTree();
}

async function startVisualization() {
    if (isPlaying && isPaused) {
        // Resume
        isPaused = false;
        btnPlay.disabled = true;
        btnPause.disabled = false;
        if (resolveStepFunc) resolveStepFunc();
        logMsg("Sorting resumed.");
        return;
    }

    resetState();
    isPlaying = true;
    btnPlay.disabled = true;
    btnPause.disabled = false;
    btnPlay.querySelector('span').textContent = 'Resume';
    
    logMsg("Starting Quick Sort visualization...");
    
    try {
        await quickSort(0, array.length - 1);
        
        // Highlight all elements sorted
        const allSorted = {};
        for(let i=0; i<array.length; i++) allSorted[i] = 'sorted';
        renderArray(allSorted);
        logMsg("Quick Sort complete! Array fully sorted.", "sorted");
        
        // Mark all tree nodes done
        Object.keys(treeNodes).forEach(k => treeNodes[k].state = 'done');
        renderTree();
        
        isPlaying = false;
        btnPlay.disabled = false;
        btnPause.disabled = true;
        btnPlay.querySelector('span').textContent = 'Start';
    } catch (err) {
        if (err.message !== 'cancelled') {
            console.error(err);
        }
    }
}

function pauseVisualization() {
    if (!isPlaying || isPaused) return;
    isPaused = true;
    btnPlay.disabled = false;
    btnPause.disabled = true;
    logMsg("Sorting paused.");
}

function stepVisualization() {
    if (!isPlaying) {
        startVisualization();
        pauseVisualization();
    } else if (isPaused) {
        if (resolveStepFunc) {
            resolveStepFunc();
        }
    }
}

// Initial setup
generateRandomArray();
renderTree();
