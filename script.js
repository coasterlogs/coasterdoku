const countryToContinent = {
  Austria:"Europe", Belgium: "Europe", Croatia: "Europe", Cyprus: "Europe", Estonia: "Europe", Czech: "Europe",
  UK: "Europe", Spain: "Europe", France: "Europe", Germany: "Europe", Denmark: "Europe", Finland: "Europe", Italy: "Europe",
  Netherlands: "Europe", Norway: "Europe", Poland: "Europe", Sweden: "Europe", Russia: "Europe", Ireland: "Europe",
  Hungary: "Europe", Luxembourg: "Europe", Portugal: "Europe", Romania: "Europe", Serbia: "Europe", Switzerland: "Europe",

  UAE: "Asia", China: "Asia", Japan: "Asia", Singapore: "Asia", Southkorea: "Asia", Taiwan: "Asia", Turkey: "Asia",
  Vietnam: "Asia", Israel: "Asia", Malaysia: "Asia", Qatar: "Asia", "Saudi Arabia": "Asia", Thailand: "Asia",

  USA: "North America", Canada: "North America", Mexico: "North America",

  Guatemala: "South America", Brazil: "South America", Colombia: "South America",

  Southafrica: "Africa", Tunisia: "Africa",

  Australia:"Oceania", Newzealand: "Oceania"
};
const ICONS_TO_PRELOAD = [
  "icons/copy.svg",
  "icons/new-game.svg",
  "icons/powered.svg",
  "icons/elevator.png",
  "icons/lift.png",
  "icons/launch.png",
  "icons/faster.svg",
  "icons/slower.svg",
  "icons/taller.svg",
  "icons/shorter.svg",
  "icons/length.svg",
  "icons/has-inversions.png",
  "icons/no-inversions.svg",
  "icons/steel.svg",
  "icons/wood.svg",
  "icons/park.svg",
  "icons/opening.svg",
  "icons/country.svg",
  "icons/continent.svg",
  "icons/manufacturer.svg",
  "icons/model.svg",
  "icons/sit-down.png",
  "icons/inverted.png",
  "icons/stand-up.png",
  "icons/flying.png",
  "icons/water-coaster.svg",
  "icons/spinning.svg",
  "icons/wing.png",
  "icons/lap-bar.png",
  "icons/shoulder.png",
  "icons/vest.png"
];
const attr = {
  FIRST_LETTER: 0,
  MATERIAL: 1,
  DESIGN: 2,
  MODEL: 3,
  SPEED: 4,
  HEIGHT: 5,
  LENGTH: 6,
  INVERSIONS: 7,
  MANUFACTURER: 8,
  RESTRAINT: 9,
  MODALITY: 10,
  PARK: 11,
  COUNTRY: 12,
  CONTINENT: 13,
  OPENING_YEAR: 14
};
const attributeIndex = {};
let usedCoasters = new Set();
let isRestoringState = false;
let activeDropdown;
let small_database = [];
let big_database = [];
const BASE_DATE = new Date(2026, 1, 25);
let currentPuzzleNumber = null;
let currentMode = localStorage.getItem("coasterdoku_mode") || "daily";
window.addEventListener("DOMContentLoaded", () => {
  updateModeUI();
});
let rand;
document.getElementById("dailyBtn").onclick = () => {
  if (currentMode === "daily") return;
  localStorage.setItem("coasterdoku_mode", "daily");
  location.reload();
};
document.getElementById("endlessBtn").onclick = () => {
  if (currentMode === "endless") return;
  localStorage.setItem("coasterdoku_mode", "endless");
  location.reload();
};

function preloadImages(list) {
  return Promise.all(
      list.map(src => {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = src;
        });
      })
  );
}

function getIconForAttributeValue(attrIndex, value) {
  switch (attrIndex) {
    case attr.FIRST_LETTER:
      const letter = value.trim().slice(-1);
      return { type: "letter", value: letter };

    case attr.MODALITY:
      if (value.includes("Powered")) return "icons/powered.svg";
      if (value.includes("Elevator")) return "icons/elevator.png";
      if (value.includes("Lift")) return "icons/lift.png";
      else return "icons/launch.png";

    case attr.SPEED:
      return value.includes("faster")
          ? "icons/faster.svg"
          : "icons/slower.svg";

    case attr.HEIGHT:
      return value.includes("taller")
          ? "icons/taller.svg"
          : "icons/shorter.svg";

    case attr.LENGTH:
      return "icons/length.svg";

    case attr.INVERSIONS:
      return value.includes("Has")
          ? "icons/has-inversions.png"
          : "icons/no-inversions.svg";

    case attr.MATERIAL:
      if (value === "Steel") return "icons/steel.svg";
      if (value === "Wood") return "icons/wood.svg";

    case attr.PARK:
      return "icons/park.svg";

    case attr.OPENING_YEAR:
      return "icons/opening.svg";

    case attr.COUNTRY:
      return "icons/country.svg"

    case attr.CONTINENT:
      return "icons/continent.svg";

    case attr.MANUFACTURER:
      return "icons/manufacturer.svg";

    case attr.MODEL:
      return "icons/model.svg";

    case attr.DESIGN:
      if (value === "Sit Down Coaster") return "icons/sit-down.png";
      if (value === "Inverted Coaster") return "icons/inverted.png";
      if (value === "Stand Up Coaster") return "icons/stand-up.png";
      if (value === "Flying Coaster") return "icons/flying.png";
      if (value === "Water Coaster") return "icons/water-coaster.svg";
      if (value === "Spinning Coaster") return "icons/spinning.svg";
      if (value === "Wing Coaster") return "icons/wing.png";

    case attr.RESTRAINT:
      if (value === "Lap Bar Restraint") return "icons/lap-bar.png";
      if (value === "Shoulder Restraint") return "icons/shoulder.png";
      if (value === "Vest Restraint") return "icons/vest.png";

    default:
      return null;
  }
}

function startGame(customSeed = null) {
  if (currentMode === "daily") {
    currentPuzzleNumber = getDailyPuzzleNumber();
    rand = mulberry32(currentPuzzleNumber + 8);
  } else {
    const seedToUse = customSeed ?? Date.now();
    rand = mulberry32(seedToUse);
  }
  usedCoasters.clear();
  const chosen = small_database[Math.floor(rand() * small_database.length)];
  const simplified = chosen._simplified;
  for (let i = 0; i < 1000; i++) {
    const [indices, values] = findUniqueAttributes(simplified);
    if (!indices) break;
    let difficultyLimit;
    if (i < 100) {
      difficultyLimit = 10;
    } else {
      difficultyLimit = 10 + Math.floor((i - 100) / 10) + 1;
    }
    const validGrid = generateValidGrid(indices, values, chosen, difficultyLimit);
    if (validGrid) {
      currentGrid = validGrid;
      renderGridWithHints(validGrid);
      if (currentMode === "daily") {
        const saved = loadDailyState();
        if (saved) {
          restoreDailyState(saved);
        }
      }
      break;
    }
  }
}

function updateModeUI() {
  const dailyBtn = document.getElementById("dailyBtn");
  const endlessBtn = document.getElementById("endlessBtn");
  dailyBtn.classList.remove("active");
  endlessBtn.classList.remove("active");
  if (currentMode === "daily") {
    dailyBtn.classList.add("active");
  } else {
    endlessBtn.classList.add("active");
  }
}

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function getDailyPuzzleNumber() {
  const today = new Date();
  const diff = today - BASE_DATE;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function loadDatabase(path) {
  const res = await fetch(path);
  return await res.json();
}

function saveDailyState() {
  if (currentMode !== "daily") return;
  const cells = document.querySelectorAll(".cell.locked");
  const placements = [];
  cells.forEach(cell => {
    const coasterDiv = cell.querySelector(".cell-coaster");
    if (!coasterDiv) return;
    const row = Number(coasterDiv.dataset.row);
    const col = Number(coasterDiv.dataset.col);
    const id = coasterDiv.dataset.id;
    if (!id) return;
    placements.push({
      row,
      col,
      id
    });
  });
  localStorage.setItem("coasterdoku_daily_state", JSON.stringify({
    puzzleId: currentPuzzleNumber,
    placements
  }));
}

function loadDailyState() {
  if (currentMode !== "daily") return null;
  const raw = localStorage.getItem("coasterdoku_daily_state");
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed.puzzleId !== currentPuzzleNumber) {
    localStorage.removeItem("coasterdoku_daily_state");
    return null;
  }
  return parsed;
}

function restoreDailyState(savedState) {
  isRestoringState = true;
  savedState.placements.forEach(p => {
    const cellInput = document.querySelector(
        `input[data-row="${p.row}"][data-col="${p.col}"]`
    );
    if (!cellInput) return;
    const coaster = big_database.find(c => c.id === Number(p.id));
    if (!coaster) return;
    evaluateSelection(cellInput, coaster);
  });
  isRestoringState = false;
}

function simplifyCoaster(coaster) {
  const firstLetter = coaster.name ? "Starts With " + coaster.name[0] : "";
  const material = coaster.material ?? "";
  const design = coaster.design ?? "";
  const model = coaster.model ?? "";
  const speed = coaster.speed !== "" ? (coaster.speed >= 100 ? "100 km/h or faster" : "Slower than<br>100 km/h") : "";
  const height = coaster.height !== "" ? (coaster.height >= 50 ? "50 m or taller" : "Shorter than<br>50 m") : "";
  const length = coaster.length !== "" ? (coaster.length >= 1000 ? "1000 m of track or longer" : "Less than<br>1000 m of track") : "";
  const inversions = coaster.inversions !== "" ? (coaster.inversions > 0 ? "Has Inversions" : "No Inversions") : "";
  const manufacturer = coaster.manufacturer ?? "";
  const restraint = coaster.restraint ?? "";
  const modality = coaster.modality ?? "";
  const park = coaster.park ?? "";
  const country = coaster.country ?? "";
  const continent = countryToContinent[country] ?? "";
  const openingYear = coaster.opening_year ? String(coaster.opening_year).slice(0,3) + "0s" : "";
  return [firstLetter, material, design, model, speed, height, length, inversions, manufacturer, restraint, modality, park, country, continent, openingYear];
}

function combinations(arr, k) {
  const result = [];
  function helper(start, combo) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function findUniqueAttributes(chosenSimplified) {
  const attrIndices = [...Array(chosenSimplified.length).keys()];
  const allCombos = combinations(attrIndices, 6).filter(isValidAttributeCombo);
  shuffle(allCombos);
  for (const indices of allCombos) {
    const candidateSubset =
      indices.map(i => chosenSimplified[i]);
    if (candidateSubset.includes(""))
    continue;
    let count = 0;
    for (const coaster of big_database) {
      const simplified = coaster._simplified;
      const otherSubset = indices.map(i => simplified[i]);
      if (arraysEqual(otherSubset,candidateSubset)) {
        count++;
        if (count === 2) break;
      }
    }
    if (count === 1)
      return [indices, candidateSubset];
  }
  return [null, null];
}

function isValidAttributeCombo(indices) {
  const hasManufacturer = indices.includes(attr.MANUFACTURER);
  const hasModel = indices.includes(attr.MODEL);
  const hasMaterial = indices.includes(attr.MATERIAL);
  const hasDesign = indices.includes(attr.DESIGN);
  const hasCountry = indices.includes(attr.COUNTRY);
  const hasModality = indices.includes(attr.MODALITY);
  const hasPark = indices.includes(attr.PARK);
  const hasContinent = indices.includes(attr.CONTINENT);
  if (hasManufacturer && hasModel) return false;
  if (hasDesign && hasModel) return false;
  if (hasModality && hasModel) return false;
  if (hasMaterial && hasModel) return false;
  const geoCount = [hasCountry, hasPark, hasContinent].filter(Boolean).length;
  return geoCount <= 1;
}

function calculateDifficulty(gridCandidates) {
  let total = 0;
  for (let i=0;i<3;i++){
    for (let j=0;j<3;j++){
      const count = gridCandidates[i][j].length;
      total += count;
    }
  }
  return total / 9
}

function hasSolution(gridCandidates) {
  const used = new Set();
  const positions = [];
  for (let i=0;i<3;i++)
    for (let j=0;j<3;j++)
      positions.push([i,j]);
  positions.sort(
    (a,b)=>
      gridCandidates[a[0]][a[1]].length -
      gridCandidates[b[0]][b[1]].length
  );
  function backtrack(idx) {
    if (idx === 9) return true;
    const [i,j] = positions[idx];
    for (const coaster of gridCandidates[i][j]) {
      const key = coaster[0];
      if (used.has(key)) continue;
      used.add(key);
      if (backtrack(idx+1)) return true;
      used.delete(key);
    }
    return false;
  }
  return backtrack(0);
}

function arraysEqual(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function generateValidGrid(indices, chosenValues, chosen, difficultyLimit) {
  const paired = indices.map((v,i)=>[v,chosenValues[i]]);
  const rowCombinations = combinations(paired,3);
  shuffle(rowCombinations);
  for (const rowAttrs of rowCombinations) {
    const colAttrs =
      paired.filter(p => !rowAttrs.includes(p));
    let valid = true;
    const gridCandidates =
      Array.from({length:3},()=>Array.from({length:3}, ()=>[[chosen.id, chosen.name]]));
    for (let i=0;i<3;i++) {
      const [rowIdx,rowVal] = rowAttrs[i];
      for (let j=0;j<3;j++) {
        const [colIdx,colVal] = colAttrs[j];
        let foundAny=false;
        const rowMatches = attributeIndex[rowIdx].get(rowVal) || [];
        for (const coaster of rowMatches) {
          if (coaster.id === chosen.id) continue;
          if (coaster._simplified[colIdx] === colVal) {
            foundAny = true;
            gridCandidates[i][j].push([coaster.id, coaster.name]);
          }
        }
        if(!foundAny){
          valid=false;
          break;
        }
      }
      if(!valid) break;
    }
    if (valid && calculateDifficulty(gridCandidates) < difficultyLimit && hasSolution(gridCandidates)) {
      return {
        rows: rowAttrs,
        cols: colAttrs,
        candidates: gridCandidates
      };
    }
  }
  return null;
}

function renderGridWithHints(grid) {
  const gridEl = document.getElementById("grid");
  gridEl.innerHTML = "";
  const actionBtn = document.createElement("button");
  actionBtn.id = "giveUpBtn";
  if (currentMode === "daily") {
    actionBtn.innerHTML = `<img src="icons/copy.svg" alt="Restart">`;
    actionBtn.onclick = () => showEndScreen(false);
  } else {
    actionBtn.innerHTML = `<img src="icons/new-game.svg" alt="Copy result">`;
    actionBtn.onclick = () => showSeedScreen();
  }
  gridEl.appendChild(actionBtn);
  grid.cols.forEach(([colIdx, colVal]) => {
    const label = document.createElement("div");
    label.className = "label";
    const icon = getIconForAttributeValue(colIdx, colVal);
    let iconHTML = "";
    if (icon) {
      if (typeof icon === "string") {
        iconHTML = `<img class="label-icon" src="${icon}" alt="">`;
      } else if (icon.type === "letter") {
        iconHTML = `<div class="label-letter">${icon.value}</div>`;
      }
    }
    let labelText = colVal;
    if (icon && icon.type === "letter") {
      const regex = new RegExp(`\\s*${icon.value}\\s*$`, "i");
      labelText = colVal.replace(regex, "");
    }
    label.innerHTML = `
  <div class="label-text">${labelText}</div>
  ${iconHTML}
`;
    gridEl.appendChild(label);
  });
  for (let i = 0; i < 3; i++) {
    const rowLabel = document.createElement("div");
    rowLabel.className = "label";
    const [rowIdx, rowVal] = grid.rows[i];
    const icon = getIconForAttributeValue(rowIdx, rowVal);

    let iconHTML = "";

    if (icon) {
      if (typeof icon === "string") {
        iconHTML = `<img class="label-icon" src="${icon}" alt="">`;
      } else if (icon.type === "letter") {
        iconHTML = `<div class="label-letter">${icon.value}</div>`;
      }
    }
    let labelText = rowVal;
    if (icon && icon.type === "letter") {
      const regex = new RegExp(`\\s*${icon.value}\\s*$`, "i");
      labelText = rowVal.replace(regex, "");
    }
    rowLabel.innerHTML = `
  <div class="label-text">${labelText}</div>
  ${iconHTML}
`;
    gridEl.appendChild(rowLabel);
    for (let j = 0; j < 3; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      const input = document.createElement("input");
      input.dataset.row = i;
      input.dataset.col = j;
      input.dataset.rowAttr = grid.rows[i][0];
      input.dataset.colAttr = grid.cols[j][0];
      input.addEventListener("input", onInputTyping);
      input.addEventListener("blur", () => {
        setTimeout(() => {
          removeDropdown();
          if (input.isConnected) input.value = "";
        }, 120);
      });
      cell.appendChild(input);
      gridEl.appendChild(cell);

    }
  }
  const wrapper = document.getElementById("grid-wrapper");
  wrapper.classList.remove("fade-in");
  void wrapper.offsetWidth;
  wrapper.classList.add("fade-in");
}

function onInputTyping(e) {
  const input = e.target;
  const text = input.value.toLowerCase();
  removeDropdown();
  if (!text) return;
  const rowAttr = Number(input.dataset.rowAttr);
  const colAttr = Number(input.dataset.colAttr);
  const suggestions = getSuggestions(text, rowAttr, colAttr);
  if (suggestions.length)
    showDropdown(input, suggestions);
}

function getSuggestions(text, rowAttr, colAttr) {
  const specialCharMap = {
    "ł": "l",
    "Ł": "l",
    "ś": "s",
    "Ś": "s",
    "ø": "o",
    "Ø": "o",
    "æ": "ae",
    "Æ": "ae"
  };
  if (!text || text.length < 3) {
    return [];
  }
  return big_database
      .filter(coaster => {
        const simplified = coaster._simplified;
        if (simplified[rowAttr] === "") return false;
        if (simplified[colAttr] === "") return false;
        return coaster.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g, char => specialCharMap[char] || "")
            .includes(text.toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g, char => specialCharMap[char] || ""));
      }).slice(0, 20);
}

function showDropdown(input, suggestions) {
  removeDropdown();
  const rect = input.getBoundingClientRect();
  const dropdown = document.createElement("div");
  dropdown.className = "autocomplete";
  dropdown.style.left = rect.left + window.scrollX + "px";
  dropdown.style.top = rect.bottom + window.scrollY + "px";
  dropdown.style.width = rect.width + "px";
  suggestions.forEach(coaster => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    const isUsed = usedCoasters.has(coaster.id);
    if (isUsed) {
      item.classList.add("disabled");
      item.innerHTML = ` <div class="autocomplete-name">${coaster.name}</div><div class="autocomplete-park">Already used</div>`;
    } else {
      item.innerHTML = `<div class="autocomplete-name">${coaster.name}</div><div class="autocomplete-park">${coaster.park ?? ""}</div>`;
      item.addEventListener("mousedown", () => {
        input.value = coaster.name;
        removeDropdown();
        evaluateSelection(input, coaster);
      });
    }
    dropdown.appendChild(item);
  });
  document.body.appendChild(dropdown);
  activeDropdown = dropdown;
}

function removeDropdown() {
  if (!activeDropdown) return;
  activeDropdown.remove();
  activeDropdown = null;
}

function evaluateSelection(input, coaster) {
  const row = Number(input.dataset.row);
  const col = Number(input.dataset.col);
  const rowAttrIndex = Number(input.dataset.rowAttr);
  const colAttrIndex = Number(input.dataset.colAttr);
  const cell = input.parentElement;
  const simplified = coaster._simplified;
  const expectedRowValue = currentGrid.rows[row][1];
  const expectedColValue = currentGrid.cols[col][1];
  const matchesRow = simplified[rowAttrIndex] === expectedRowValue;
  const matchesCol = simplified[colAttrIndex] === expectedColValue;
  const isValid = matchesRow && matchesCol;
  const chosenId = currentGrid.candidates[0][0][0][0];
  const isTarget = coaster.id === chosenId;
  usedCoasters.add(coaster.id);
  input.remove();
  cell.classList.add("locked");
  const nameDiv = document.createElement("div");
  nameDiv.className = "cell-coaster";
  nameDiv.textContent = coaster.name;
  nameDiv.dataset.row = row;
  nameDiv.dataset.col = col;
  nameDiv.dataset.id = coaster.id;
  const parkDiv = document.createElement("div");
  parkDiv.className = "cell-park";
  parkDiv.textContent = coaster.park ?? "";
  cell.innerHTML = "";
  cell.appendChild(nameDiv);
  cell.appendChild(parkDiv);
  if (isTarget) {
    cell.classList.add("target");
  } else if (isValid) {
    cell.classList.add("correct");
  } else {
    cell.classList.add("wrong");
    let errorText = [];
    if (!matchesRow) {
      errorText.push(getRawAttributeValue(coaster, rowAttrIndex));
    }
    if (!matchesCol) {
      errorText.push(getRawAttributeValue(coaster, colAttrIndex));
    }
    const errorDiv = document.createElement("div");
    errorDiv.className = "cell-error";
    errorDiv.innerHTML = errorText.join("<br>");
    cell.appendChild(errorDiv);
  }
  checkGameEnd();
  if (currentMode === "daily") {
    saveDailyState();
  }
}

function getRawAttributeValue(coaster, attrIndex) {
  switch (attrIndex) {
    case attr.FIRST_LETTER:
      return `First Letter: ${coaster.name[0]}`;
    case attr.MATERIAL:
      return `Material: ${coaster.material}`;
    case attr.DESIGN:
      return `Design: ${coaster.design}`;
    case attr.MODEL:
      return `Model: ${coaster.model}`;
    case attr.SPEED:
      return `Speed: ${coaster.speed + " km/h"}`;
    case attr.HEIGHT:
      return `Height: ${coaster.height + "m"}`;
    case attr.LENGTH:
      return `Length: ${coaster.length + "m"}`;
    case attr.INVERSIONS:
      return `Inversions: ${coaster.inversions}`;
    case attr.MANUFACTURER:
      return `Manufacturer: ${coaster.manufacturer}`;
    case attr.RESTRAINT:
      return `${coaster.restraint}`;
    case attr.MODALITY:
      return `Modality: ${coaster.modality}`;
    case attr.COUNTRY:
      return `Country: ${coaster.country}`;
    case attr.CONTINENT:
      return `Continent: ${countryToContinent[coaster.country]}`;
    case attr.OPENING_YEAR:
      return `Opening: ${coaster.opening_year}`;
  }
}

function checkGameEnd() {
  const lockedCells = document.querySelectorAll(".cell.locked");
  if (lockedCells.length !== 9) return;
  if (!isRestoringState) showEndScreen(false);
}

function generateResultText() {
  const gridCells = [...document.querySelectorAll("#grid .cell")];
  let greens = 0;
  let emojiRows = [];
  for (let i = 0; i < 3; i++) {
    const row = gridCells.slice(i * 3, i * 3 + 3);
    emojiRows.push(
        row.map(cell => {
          if (!cell.classList.contains("locked")) return "⬛";
          if (cell.classList.contains("correct")) {
            greens++;
            return "🟩";
          }
          if (cell.classList.contains("target")) {
            greens++;
            return "⭐";
          }
          return "🟥";
        }).join("")
    );
  }
  let header;
  if (currentMode === "daily") {
    header = `Coasterdoku #${currentPuzzleNumber}`;
  } else {
    header = `Coasterdoku Endless`;
  }
  return `${header} (${greens}/9)
${emojiRows.join("\n")}`;
}

function showEndScreen(gaveUp = false) {
  const existing = document.getElementById("overlay");
  if (existing) existing.remove();
  const resultText = generateResultText();
  const overlay = document.createElement("div");
  overlay.id = "overlay";
  overlay.className = "overlay";
  const title = document.createElement("h2");
  title.className = "overlay-title";
  title.textContent = gaveUp ? "Giving up?" : "Game finished!";
  const box = document.createElement("div");
  box.className = "overlay-box";
  const pre = document.createElement("pre");
  pre.textContent = resultText;
  const button = document.createElement("button");
  button.className = "overlay-button";
  button.textContent = "Copy Result";
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(resultText);
    button.textContent = "Copied!";
  });
  box.appendChild(pre);
  box.appendChild(button);
  overlay.appendChild(title);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function showSeedScreen() {
  const existing = document.getElementById("overlay");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "overlay";
  overlay.className = "overlay";
  const title = document.createElement("h2");
  title.className = "overlay-title";
  title.textContent = "Endless Mode";
  const box = document.createElement("div");
  box.className = "overlay-box";
  const label = document.createElement("div");
  label.className = "overlay-subtext";
  label.textContent = "Enter a seed to play against a friend!";
  const input = document.createElement("input");
  input.className = "overlay-input";
  input.placeholder = "(or leave empty for random)";
  const button = document.createElement("button");
  button.className = "overlay-button";
  button.textContent = "Start Game";
  button.addEventListener("click", () => {
    let seedValue;
    if (input.value.trim() === "") {
      seedValue = Date.now();
    } else {
      seedValue = hashStringToNumber(input.value);
    }
    overlay.remove();
    startGame(seedValue);
  });
  box.appendChild(label);
  box.appendChild(input);
  box.appendChild(button);
  overlay.appendChild(title);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
      startGame();
    }
  });
}

function hashStringToNumber(str) {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    let k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
}

async function main() {
  await preloadImages(ICONS_TO_PRELOAD);
  big_database = await loadDatabase("database.json");
  small_database = big_database.filter(coaster => coaster.eligible === "Yes");
  for (const coaster of big_database) {
    coaster._simplified = simplifyCoaster(coaster);
  }
  for (let i = 0; i < 15; i++) {
    attributeIndex[i] = new Map();
  }
  for (const coaster of small_database) {
    const simplified = coaster._simplified;
    for (let i = 0; i < simplified.length; i++) {
      const value = simplified[i];
      if (!value) continue;
      if (!attributeIndex[i].has(value)) {
        attributeIndex[i].set(value, []);
      }
      attributeIndex[i].get(value).push(coaster);
    }
  }
  if (currentMode === "endless") {
    showSeedScreen();
    return;
  }
  startGame();
}

main();

