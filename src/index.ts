import Manager from './impl/Manager';
import { MapScene } from './scenes/MapScene';
import { MAP_DATA } from './mapData';
import { Loader } from 'pixi.js';

let currentMap = null;
let currentMapScene = null;

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
}

function populateStationsList() {
    stationsList.innerHTML = "";
    const stationDataGroups = Loader.shared.resources["Station Data"].data;
    const stationsByLine: { [line: string]: Set<[string, any]> }[] = [];
    stationDataGroups.forEach((stationDataGroup, index) => {
        stationsByLine.push({});
        Object.entries(stationDataGroup).forEach(([stationId, stationData]: [string, any]) => {
            const stationLines = stationData.lines;
            stationLines.forEach((line) => {
                line = line as string;
                if (!(line in stationsByLine[index])) {
                    stationsByLine[index][line] = new Set();
                }
                stationsByLine[index][line].add([stationId, stationData]);
            });
        });
    });

    const stationGroups: {key: string, name: string}[][] = Loader.shared.resources["Metadata"].data.lines;
    for (let stationGroupNum = 0; stationGroupNum < stationGroups.length; stationGroupNum++) {
        const stationGroupDiv = document.createElement("div");
        stationsList.appendChild(stationGroupDiv);
        const groupHeader = document.createElement("h1");
        stationGroupDiv.appendChild(groupHeader);
        groupHeader.innerHTML = stationGroupNum === 0 ? "Stations" : "Other Systems";

        const stationGroupLines = stationGroups[stationGroupNum];
        console.log(stationGroupLines);
        for (const stationGroupLine of stationGroupLines) {
            const stationsGroupData: { [line: string]: Set<[string, any]> } = stationsByLine[stationGroupNum];

            if (!stationsGroupData || !(stationGroupLine.key in stationsGroupData)) {
                continue;
            }

            const stationsData = stationsGroupData[stationGroupLine.key];

            const lineGroupDiv = document.createElement("div");
            stationGroupDiv.appendChild(lineGroupDiv);

            const lineGroupHeader = document.createElement("h2");
            lineGroupDiv.appendChild(lineGroupHeader);
            lineGroupHeader.innerHTML = stationGroupLine.name;

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

                const locateButton = document.createElement("div");
                locateButton.addEventListener("click", (event) => {
                    event.stopPropagation();
                    currentMapScene.zoomToDot(stationId);
                });
                locateButton.className = "locate-button";
                locateButton.style.backgroundImage = "url(map-pin-point.svg)"
                stationElement.appendChild(locateButton);
            });
        }
    }
}

function changeScene(region, mapName) {
    loadingShade.className = "";
    setTimeout(() => {
        Manager.changeScene(null);
        Loader.shared.reset();
        Loader.shared.add(MAP_DATA[region][mapName].data);
        Loader.shared.onComplete.once(() => {
            currentMap = `${region}-${mapName}`;
            const mapScene = new MapScene((stationName) => {
                clickStation(stationName);
            });
            currentMapScene = mapScene;
            loadingShade.className = "done";
            populateStationsList();
            Manager.changeScene(mapScene);
        }, this);
        Loader.shared.load();
    }, 250);
}

const mapsLoadingIndicator = document.getElementById("maps-loading-indicator");
mapsLoadingIndicator.remove();
for (const [region, mapsMap] of Object.entries(MAP_DATA)) {
    const regionMenuHeader = document.createElement('div');
    regionMenuHeader.innerHTML = `<h2>${region}</h2>`;
    regionMenuHeader.className = "menu-header";
    menu.appendChild(regionMenuHeader);

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
        menu.appendChild(mapMenuItem);
    }
}
