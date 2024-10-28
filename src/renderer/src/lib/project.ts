/**
 * Defines the structure of a Project.
 * Tracks all assets, resources, and saved progress of a current project.
 *
 * Structure is defined as follows:
 *      loadedAssets = [Assets] - assets such as images that are loaded, does not necessarily need to be used
 *      timeline = Timeline
 *
 * Timeline maintains AssetObject - Lifecycle
 *
 * that should be it basically surely
 */

import { Scene, ImageElement, Keyframe, Remote } from './scene'

export class Asset {
  // Define any properties common to all assets here if needed
}

export class ImageAsset extends Asset {
  src: string

  constructor(src: string) {
    super()
    this.src = src
  }
}

export class TimelineObject {
  asset: Asset
  lifecycle: Keyframe[] // Assuming lifecycle is an array of Keyframe objects

  /**
   *
   * @param asset Asset instance
   * @param lifecycle Array of Keyframe objects defining the lifecycle of the asset
   */
  constructor(asset: Asset, lifecycle: Keyframe[]) {
    this.asset = asset
    this.lifecycle = lifecycle
  }
}

export class Timeline {
  timeline: TimelineObject[]

  constructor() {
    this.timeline = []
  }

  /**
   * @param assetObject TimelineObject to add to the timeline
   * Adds assetObject to Timeline.
   */
  addAssetObject(assetObject: TimelineObject) {
    this.timeline.push(assetObject)
  }
}

export class Project {
  loadedAssets: Asset[]
  scene: Scene
  remote: Remote
  element: HTMLDivElement
  sceneElements: ImageElement[]
  cursorPos: number

  constructor(loadedAssets: Asset[], length: number) {
    this.loadedAssets = loadedAssets
    this.scene = new Scene(600, 480, length)
    const [remote, element] = this.scene.create()
    this.remote = remote
    this.element = element
    this.sceneElements = []
    this.cursorPos = 0
  }

  addLoadedAsset(asset: Asset) {
    this.loadedAssets.push(asset)
  }

  build(): [Remote, HTMLDivElement] {
    ;[this.remote, this.element] = this.scene.create()
    return [this.remote, this.element]
  }
}
