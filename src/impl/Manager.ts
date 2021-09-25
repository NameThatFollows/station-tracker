import { Application, DisplayObject, Renderer } from "pixi.js";

export default class Manager {
  private constructor() {}
  public static app: Application;
  private static currentScene: IScene;
  public static visitedStations: Set<string>;

  public static get width(): number {
    return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  }

  public static get height(): number {
    return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  }

  public static initialize(backgroundColor: number): void {
    Manager.app = new Application({
      view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
      resolution: window.devicePixelRatio || 1,
      backgroundColor,
      antialias: true,
    });

    const storage: string = localStorage.getItem("visitedStations");
    if (storage) {
      this.visitedStations = new Set(storage.split(";"));
    } else {
      this.visitedStations = new Set();
    }
    console.log(this.visitedStations);

    Manager.app.ticker.add(Manager.update)

    window.addEventListener("resize", Manager.resize);

    this.resize();
  }

  public static changeScene(newScene: IScene): void {
    console.log("CHANGING SCENE TO ", newScene);
    if (Manager.currentScene) {
      Manager.currentScene.cleanup();
      Manager.app.stage.removeChild(Manager.currentScene);
      Manager.currentScene.destroy();
    }

    if (newScene) {
      Manager.currentScene = newScene;
      Manager.app.stage.addChild(Manager.currentScene);
    }
  }

  private static update(framesPassed): void {
    // console.log(framesPassed);
    if (Manager.currentScene) {
      Manager.currentScene.update(framesPassed);
    }
  }

  public static resize(): void {
    console.log("MANAGER RESIZE TRIGGERED");
    if (Manager.currentScene) {
      Manager.currentScene.resize(Manager.width, Manager.height);
    }
    Manager.app.renderer.resize(Manager.width, Manager.height);
  }
}

export interface IScene extends DisplayObject {
  resize(screenWidth: number, screenHeight: number): void;
  update(framesPassed: number): void;
  cleanup(): void;
}
