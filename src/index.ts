import Manager from './impl/Manager';
import { MapScene } from './scenes/MapScene';
import { MAP_DATA } from './mapData';
import { Loader } from 'pixi.js';

const STATION_LIST_TITLE = "All Stations";

let currentMap = null;
let currentMapScene = null;
let stationCountBadgeContent: { [badgeName: string]: HTMLElement } = {};
let stationAssociatedListCategories = {};
let stationGroupStationLists: { [badgeName: string]: Set<string> } = {};

Manager.initialize(0xDDDDDD);

const menu = document.getElementById("menu");
const menuShade = document.getElementById("menu-shade");
menuShade.addEventListener("click", () => {
  closeMapsMenu();
});
const menuButton = document.getElementById("menu-button");
menuButton.style.backgroundImage = "url(map.svg)";
menuButton.addEventListener("click", () => {
  openMapsMenu();
});

const introScreen = document.getElementById("intro-screen");
const homeButton = document.getElementById("home-button");
homeButton.style.backgroundImage = "url(home.svg)";
homeButton.addEventListener("click", () => {
  closeMapsMenu();
  introScreen.style.opacity = "1";
  introScreen.style.visibility = "visible";
  setTimeout(() => {
    currentMapScene = null;
    currentMap = null;
    Manager.changeScene(null);
  }, 1000);
});

const loadingShade = document.getElementById("loading-shade");

const stationsListContainer = document.getElementById("stations-list-container");
const stationsButton = document.getElementById("stations-list-button");
const stationsList = document.getElementById("stations-list");
stationsButton.style.backgroundImage = "url(list-square-bullet.svg)";
stationsButton.addEventListener("click", () => {
  if (stationsListContainer.className === "closed") {
    openStationsList();
  } else {
    closeStationsList();
  }
});

const totalStationsCountElement = document.getElementById("total-station-count");

function updateTotalStationCount() {
  totalStationsCountElement.innerHTML = "" + Manager.visitedStations.size;
}

function updateStationListCounts() {
  for (const [badgeName, headerDiv] of Object.entries(stationCountBadgeContent)) {
    if (!(badgeName in stationGroupStationLists)) {
      continue;
    }
    const stationGroupList = stationGroupStationLists[badgeName];
    const visitedStations = new Set(Array.from(stationGroupList).filter(x => Manager.visitedStations.has(x)));
    headerDiv.innerHTML = `${visitedStations.size}/${stationGroupList.size}`;
  }
}

function closeMapsMenu() {
  menu.className = "closed";
  menuShade.className = "closed";
}

function openMapsMenu() {
  menu.className = "";
  menuShade.className = "";
}

function closeStationsList() {
  stationsListContainer.className = "closed";
}

function openStationsList() {
  stationsListContainer.className = "";
}

function clickStation(stationName) {
  const elements = document.querySelectorAll(`#${stationName} > div.icon-container`);
  for (const element of elements) {
    if (Manager.visitedStations.has(stationName)) {
      element.children[0].classList.remove("hidden");
    } else {
      element.children[0].classList.add("hidden");
    }
  }
  updateStationListCounts();
  updateTotalStationCount();
}

function createStationListHeader(header: number, content: string, key: string) {
  const containerDiv = document.createElement("div");
  containerDiv.className = "header";

  const headerElement = document.createElement(`h${header}`);
  headerElement.innerHTML = content;
  containerDiv.appendChild(headerElement);

  const counterElement = document.createElement("div");
  counterElement.className = "counter";

  const counterHeaderElement = document.createElement(`h${header + 1}`);
  stationCountBadgeContent[key] = counterHeaderElement;

  counterHeaderElement.innerHTML = "0/0";
  counterElement.appendChild(counterHeaderElement);

  containerDiv.appendChild(counterElement);

  return containerDiv;
}

function populateStationsList() {
  stationsList.innerHTML = "";
  stationsList.appendChild(createStationListHeader(1, STATION_LIST_TITLE, STATION_LIST_TITLE));
  const stationDataGroups = Loader.shared.resources["Station Data"].data;
  const stationsByLine: { [line: string]: Set<[string, any]> }[] = [];
  stationGroupStationLists[STATION_LIST_TITLE] = new Set();
  stationDataGroups.forEach((stationDataGroup, index) => {
    stationsByLine.push({});
    stationGroupStationLists[`StationGroup${index}`] = new Set();
    Object.entries(stationDataGroup).forEach(([stationId, stationData]: [string, any]) => {
      const stationLines = stationData.lines;
      stationLines.forEach((line) => {
        line = line as string;
        if (!(line in stationsByLine[index])) {
          stationGroupStationLists[line] = new Set();
          stationsByLine[index][line] = new Set();
        }
        stationsByLine[index][line].add([stationId, stationData]);
        stationGroupStationLists[STATION_LIST_TITLE].add(stationId);
        stationGroupStationLists[`StationGroup${index}`].add(stationId);
        stationGroupStationLists[line].add(stationId);
      });
    });
  });


  const stationGroups: { key: string, name: string }[][] = Loader.shared.resources["Metadata"].data.lines;
  for (let stationGroupNum = 0; stationGroupNum < stationGroups.length; stationGroupNum++) {
    const stationGroupDiv = document.createElement("div");
    stationsList.appendChild(stationGroupDiv);
    let headerTitle = stationGroupNum === 0 ? "Stations" : "Other Systems";
    stationGroupDiv.appendChild(createStationListHeader(2, headerTitle, `StationGroup${stationGroupNum}`));

    const stationGroupLines = stationGroups[stationGroupNum];
    for (const stationGroupLine of stationGroupLines) {
      const stationsGroupData: { [line: string]: Set<[string, any]> } = stationsByLine[stationGroupNum];

      if (!stationsGroupData || !(stationGroupLine.key in stationsGroupData)) {
        continue;
      }

      const stationsData = stationsGroupData[stationGroupLine.key];

      const lineGroupDiv = document.createElement("div");
      stationGroupDiv.appendChild(lineGroupDiv);


      lineGroupDiv.appendChild(createStationListHeader(3, stationGroupLine.name, stationGroupLine.key));

      const lineStations = document.createElement("div");
      lineGroupDiv.appendChild(lineStations);
      Array.from(stationsData).sort((a, b) => a[1].name.localeCompare(b[1].name, "en", { numeric: true })).forEach(([stationId, stationData]) => {
        const stationElement = document.createElement("div");
        stationElement.addEventListener("click", () => {
          currentMapScene.clickStation(stationId, true);
        });
        stationElement.addEventListener("mouseover", () => {
          currentMapScene.hoverStation(stationId);
        });
        stationElement.addEventListener("mouseleave", () => {
          currentMapScene.unhoverStation(stationId);
        });
        stationElement.id = stationId;
        stationElement.className = "stations-list-item";
        lineStations.appendChild(stationElement);

        const iconContainer = document.createElement("div");
        iconContainer.className = "icon-container";
        stationElement.appendChild(iconContainer);

        const checkElement = document.createElement("div");
        checkElement.classList.add("icon");
        if (!Manager.visitedStations.has(stationId)) {
          checkElement.classList.add("hidden");
        }
        checkElement.style.backgroundImage = "url(check.svg)";
        iconContainer.appendChild(checkElement);

        const stationName = document.createElement("div");
        stationName.className = "name";
        stationName.innerHTML = stationData.name;
        stationElement.appendChild(stationName);

        stationAssociatedListCategories[stationId] = [STATION_LIST_TITLE, `StationGroup${stationGroupNum}`, stationGroupLine.key]
      });
    }
  }
}

function changeScene(region, mapName) {
  stationCountBadgeContent = {};
  stationAssociatedListCategories = {};
  stationGroupStationLists = {};
  loadingShade.className = "";
  introScreen.style.opacity = "0";
  introScreen.style.visibility = "hidden";
  setTimeout(() => {
    Manager.changeScene(null);
    Loader.shared.reset();
    Loader.shared.add(MAP_DATA[region][mapName].data);

    const processElement = document.getElementById("progress-text")
    Loader.shared.onProgress.add((loader) => {
      processElement.textContent = `Loading Assets: ${Math.round(loader.progress)}%`
    })
    Loader.shared.onComplete.once(() => {
      currentMap = `${region}-${mapName}`;
      const mapScene = new MapScene((stationName) => {
        clickStation(stationName);
      });
      currentMapScene = mapScene;
      loadingShade.className = "done";
      populateStationsList();
      Manager.changeScene(mapScene);
      updateStationListCounts();
      setTimeout(() => {
        processElement.textContent = `Loading Assets: 0%`;
      }, 1000)
    }, this);
    Loader.shared.load();
  }, 250);
}

updateTotalStationCount();
const mapsLoadingIndicator = document.getElementById("maps-loading-indicator");
mapsLoadingIndicator.remove();
for (const [region, mapsMap] of Object.entries(MAP_DATA)) {
  const mapList = document.getElementById("map-list");
  const regionMenuHeader = document.createElement('div');
  regionMenuHeader.innerHTML = `<h2>${region}</h2>`;
  regionMenuHeader.className = "menu-header";
  mapList.appendChild(regionMenuHeader);

  for (const [mapName, mapData] of Object.entries(mapsMap)) {
    const mapMenuItem = document.createElement('div');
    mapMenuItem.className = "menu-item";
    mapMenuItem.innerHTML = mapData.name;
    mapMenuItem.style.color = "white";
    mapMenuItem.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.6)), url(${mapData.thumbnail})`;
    mapMenuItem.style.backgroundSize = "cover";
    mapMenuItem.style.backgroundPosition = "center";
    mapMenuItem.addEventListener("click", () => {
      closeMapsMenu();
      if (`${region}-${mapName}` !== currentMap) {
        setTimeout(() => changeScene(region, mapName), 250);
      }
    });
    mapList.appendChild(mapMenuItem);
  }
}
