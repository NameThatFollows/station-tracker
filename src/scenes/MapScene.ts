import Manager, { IScene } from "../impl/Manager";
import { Circle, Container, FillStyle, Graphics, graphicsUtils, Loader, Point, Sprite, Texture } from "pixi.js";
import { Viewport } from 'pixi-viewport';

enum DotStyle {
  Visited,
  VisitedHover,
  Empty,
  EmptyHover,
}

interface IStationClickedCallback {
  (stationName: string): void;
}

export class MapScene extends Container implements IScene {
  private viewport: Viewport;
  private mapContainer: Container;
  private allStationsContainer: Container;
  private allStationContainersMap: {[stationId: string]: number} = {};
  private stationData = {};
  private maxZoom = 1;
  private dotRadius = 0;
  private isDragging = false;
  private stationClickedCallback: IStationClickedCallback = () => {
    console.error("No callback was passed");
  };

  constructor(stationClickedCallback: IStationClickedCallback = null) {
    super();

    if (stationClickedCallback) {
      this.stationClickedCallback = stationClickedCallback;
    }
    const mapMetadata = Loader.shared.resources["Metadata"].data;
    this.dotRadius = mapMetadata.dotRadius;
    this.maxZoom = mapMetadata.maxZoom;
    let map = Sprite.from("Map");
    this.viewport = new Viewport({
      worldHeight: mapMetadata.mapHeight,
      worldWidth: mapMetadata.mapWidth,
      screenHeight: Manager.height,
      screenWidth: Manager.width,
      interaction: Manager.app.renderer.plugins.interaction
    }).drag()
      .pinch()
      .wheel()
      .decelerate()
      // .clamp({
      //   left: -mapMetadata.mapWidth * 0.5,
      //   right: mapMetadata.mapWidth * 1.5,
      //   top: -mapMetadata.mapHeight * 0.5,
      //   bottom: mapMetadata.mapHeight * 1.5,
      //   underflow: 'center',
      // })
      .clampZoom({
        // minScale: 0.1,
        maxScale: mapMetadata.maxZoom,
      })
      .fitWorld(false)


      this.viewport.on("drag-start", () => this.isDragging = true);
      this.viewport.on("drag-end", () => this.isDragging = false);
      this.viewport.on("clicked", (event) => console.log(event.world));

      this.mapContainer = new Container();
      this.mapContainer.name = "Map Container";
    this.mapContainer.addChild(map);


    this.allStationsContainer = new Container();
    this.allStationsContainer.name = "Waypoint Container";

    const stationDataSource = Loader.shared.resources["Station Data"].data;
    for (const stationGroup of stationDataSource) {
      Object.entries(stationGroup).forEach(([stationId, data]) => {
        this.stationData[stationId] = data;
      });
    }

    Object.entries(this.stationData).forEach(([stationId, data]: [string, any]) => {
      const stationContainer = new Container();
      stationContainer.name = stationId;
      data.locations.forEach(([x, y]) => {
        stationContainer.addChild(this.createDot(x, y, Manager.visitedStations.has(stationId) ? DotStyle.Visited : DotStyle.Empty, data.dotRadius || this.dotRadius));
      });

      stationContainer.interactive = true;
      stationContainer.on("click", (event) => this.isDragging ? null : this.clickStation(event.currentTarget.name, true));
      stationContainer.on("tap", (event) => this.isDragging ? null : this.clickStation(event.currentTarget.name, false));
      stationContainer.on("mouseover", (event) => this.hoverStation(event.currentTarget.name));
      stationContainer.on("mouseout", (event) => this.unhoverStation(event.currentTarget.name));
      this.allStationContainersMap[stationId] = this.allStationsContainer.children.length;
      this.allStationsContainer.addChild(stationContainer);
    });


    this.viewport.addChild(this.mapContainer);
    this.viewport.addChild(this.allStationsContainer);
    this.addChild(this.viewport);
  }

  public zoomToDot(stationId: string) {
    const waypointsCoords: number[][] = this.stationData[stationId].locations;
    const total = waypointsCoords.reduce(((sum, cur) => {
      return [sum[0] + cur[0], sum[1] + cur[1]];
    }));
    this.viewport.animate({
      time: 500,
      width: 500,
      // scale: this.maxZoom,
      position: new Point(
        (total[0] / waypointsCoords.length) + (160 / this.maxZoom),
        (total[1] / waypointsCoords.length) * 2),
      ease: "easeInOutSine",
    })
  }

  private createCheck(x, y, size, tint) {
      const checkSprite = Sprite.from("check.svg");
      checkSprite.anchor.set(0.5);
      checkSprite.x = x;
      checkSprite.y = y;
      checkSprite.width = size;
      checkSprite.height = size;
      checkSprite.tint = tint;
      return checkSprite;
  }

  private createDot(x: number, y: number, type: DotStyle, dotRadius: number = this.dotRadius) {
    const waypoint = new Graphics();
    waypoint.cursor = "pointer";
    waypoint.interactive = true;
    waypoint.hitArea = new Circle(x, y, dotRadius);
    if (type === DotStyle.Empty) {
      return waypoint;
    }
    if (type === DotStyle.EmptyHover) {
      waypoint.beginFill(0x000000, 0.3);
    } else if (type === DotStyle.Visited) {
      waypoint.addChild(this.createCheck(x, y, dotRadius * 2, 0xFFFFFF));
    } else if (type === DotStyle.VisitedHover) {
      waypoint.addChild(this.createCheck(x, y, dotRadius * 2, 0xAAAAAA));
    }
    waypoint.drawCircle(x, y, dotRadius);
    waypoint.endFill();
    return waypoint;
  }

  private replaceDot(stationName: string, dotStyle: DotStyle): void {
    const waypointsCoords = this.stationData[stationName].locations;
    const dotRadius = this.stationData[stationName].dotRadius;
    const stationContainer = this.allStationsContainer.children[this.allStationContainersMap[stationName]] as Container;

    stationContainer.removeChildren();
    for (const coord of waypointsCoords) {
      stationContainer.addChild(this.createDot(coord[0], coord[1], dotStyle, dotRadius || this.dotRadius));
    }
  }

  private updateLocalStorage() {
    localStorage.setItem("visitedStations", Array.from(Manager.visitedStations).join(";"));
  }

  public clickStation(stationName: string, mouse: boolean): void {
    if (Manager.visitedStations.has(stationName)) {
      Manager.visitedStations.delete(stationName);
      this.replaceDot(stationName, mouse ? DotStyle.EmptyHover : DotStyle.Empty);
    } else {
      Manager.visitedStations.add(stationName);
      this.replaceDot(stationName, mouse ? DotStyle.VisitedHover : DotStyle.Visited);
    }
    this.updateLocalStorage();
    this.stationClickedCallback(stationName);
  }

  private hoverStation(stationName: string): void {
    if (Manager.visitedStations.has(stationName)) {
      this.replaceDot(stationName, DotStyle.VisitedHover);
    } else {
      this.replaceDot(stationName, DotStyle.EmptyHover);
    }
  }

  private unhoverStation(stationName: string): void {
    if (Manager.visitedStations.has(stationName)) {
      this.replaceDot(stationName, DotStyle.Visited);
    } else {
      this.replaceDot(stationName, DotStyle.Empty);
    }
  }

  public zoom(scale: number): void {

  }

  public cleanup(): void {

  }

  public update(framesPassed: number): void {

  }

  public resize(screenWidth: number, screenHeight: number): void {
    console.log("RESIZE TRIGGERED");
    this.viewport.resize(screenWidth, screenHeight);
  }
}
