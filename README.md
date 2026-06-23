# QuickSort Studio ⚡

An interactive, high-fidelity Quick Sort visualizer built with modern, dark-themed vanilla CSS and pure JavaScript. Experience the step-by-step partitioning process with real-time updates of both **Array Bars** and the **Recursion Tree**.

## Features

- **Double Visualization Views**:
  - **Array View**: Displays vertical bars representing array element magnitudes. Highlights partition boundaries, comparing elements (cyan), swapping elements (pink), pivots (orange), and sorted zones (emerald).
  - **Recursion Tree View**: A dynamically calculated binary tree rendered in SVG. Visualizes recursive call frames (low, high index range, current subarray values, and chosen pivots).
- **Interactive Control Deck**:
  - Start, pause, or step forward incrementally.
  - Dynamically adjust array size (5 to 30 elements).
  - Fine-tune speed (50ms animation delay for quick runs, up to 2000ms for manual analysis).
  - Pivot strategy selectors (Last Element, First Element, Random Element, Median of Three).
- **Educational Enhancements**:
  - Side-by-side pseudocode panel highlighting currently active lines.
  - Interactive logs console recording detailed algorithm steps.
  - Quick Sort complexity analytics card.

## How to Run Locally

You can launch this application directly on your browser without any installation, backend, or build step.

### Method 1: Direct File Launch
Double-click on the `index.html` file inside the directory to open it in your default web browser.

### Method 2: Simple Local HTTP Server
If you prefer running it via a local server (recommended for smooth resource loading):
Using Node.js/npx:
```bash
npx serve
```
Or using Python:
```bash
python -m http.server 8000
```
Then navigate to `http://localhost:8000` or the port output in the console.

## Algorithm Complexity Reference

- **Time Complexity**:
  - **Best Case**: $O(n \log n)$ (when partitioning results in balanced halves)
  - **Average Case**: $O(n \log n)$
  - **Worst Case**: $O(n^2)$ (when partitioning is extremely unbalanced, e.g., already sorted array with first/last element as pivot)
- **Space Complexity**: $O(\log n)$ (due to recursion stack frame depth)
