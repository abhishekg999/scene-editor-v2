const CLASS_PREFIX = 'Scene__'

function prefixClass(name: string): string {
  return `${CLASS_PREFIX}${name}`
}

export interface KeyframeProperties {
  [key: string]: string | number
}

interface SceneRenderer {
  (el: HTMLElement): HTMLElement
}

class Remote {
  public scene: Scene
  public animations: Animation[]
  public playState: 'paused' | 'running' | 'finished'

  constructor(scene: Scene, options: KeyframeEffectOptions) {
    this.scene = scene
    this.animations = []
    this.playState = 'paused'

    this.scene.children.forEach((el) => {
      if (el.HTMLElement) {
        const effect = new KeyframeEffect(el.HTMLElement, el.createLifecycle(), options)
        this.animations.push(new Animation(effect))
      }
    })

    this.animations.forEach((animation) => animation.pause())
  }

  play(): void {
    if (this.animations.length === 0) return

    this.animations.forEach((animation) => animation.play())
    this.playState = 'running'

    if (this.animations[0]) {
      this.animations[0].onfinish = () => {
        this.playState = 'finished'
      }
    }
  }

  pause(): void {
    this.animations.forEach((animation) => animation.pause())
    this.playState = 'paused'
  }

  setPlaybackRate(rate: number): void {
    this.animations.forEach((animation) => (animation.playbackRate = rate))
  }

  start(): void {
    this.seek(0)
  }

  seek(pos: number): void {
    this.animations.forEach((animation) => (animation.currentTime = pos))
  }
}

class Scene {
  public width: number
  public height: number
  public class: string
  public id: string
  public length: number
  public children: Element[]
  public background: string
  public HTMLElement: HTMLDivElement | null
  private renderer: SceneRenderer

  constructor(width: number, height: number, length: number, renderer?: SceneRenderer) {
    this.width = width
    this.height = height
    this.length = length
    this.renderer = renderer || ((el: HTMLElement) => el)

    this.class = prefixClass('scene')
    this.id = crypto.randomUUID()
    this.children = []
    this.background = 'transparent'
    this.HTMLElement = null
  }

  setBackgroundImage(url: string): void {
    this.background = `url(${url})`
  }

  addChild(el: Element): void {
    this.children.push(el)
  }

  clearChildren(): void {
    this.children = []
  }

  create(): [Remote, HTMLDivElement] {
    const output = document.createElement('div')

    output.classList.add(this.class)
    output.id = this.id
    output.style.height = `${this.height}px`
    output.style.width = `${this.width}px`
    output.style.borderWidth = `2px`
    output.style.borderColor = `#595959`
    output.style.borderStyle = `solid`
    output.style.position = `relative`
    output.style.overflow = `hidden`
    output.style.background = this.background
    output.style.backgroundSize = `cover`

    this.children.forEach((el) => {
      const child = this.renderer(el.create())
      if (child) output.appendChild(child)
    })

    this.HTMLElement = output

    const remote = new Remote(this, { duration: this.length, iterations: 1, fill: 'forwards' })
    return [remote, this.HTMLElement]
  }
}

interface Origin {
  x: number
  y: number
}

class Element {
  protected _length: number
  public id: string
  public width: number
  public height: number
  public scene: Scene
  public keyframes: Keyframe[]
  public class: string
  public scale: number
  public origin: Origin
  public start: number
  public HTMLElement: HTMLDivElement | null

  constructor(scene: Scene, width: number, height: number, start: number, length: number) {
    this.id = crypto.randomUUID()
    this.width = width
    this.height = height
    this.scene = scene
    this.keyframes = []
    this.class = prefixClass('element')
    this.scale = 1
    this.origin = { x: 0, y: 0 }
    this.start = start
    this._length = length
    this.HTMLElement = null
  }

  set length(length: number) {
    const ratio = length / this._length
    this.keyframes.forEach((keyframe) => {
      keyframe.time *= ratio
    })
    this._length = length
  }

  get length(): number {
    return this._length
  }

  create(): HTMLDivElement {
    const output = document.createElement('div')
    output.classList.add(this.class)
    output.id = this.id

    output.style.transformOrigin = `${this.origin.x}px ${this.origin.y}px`
    output.style.height = `${this.height}px`
    output.style.width = `${this.width}px`
    output.style.position = 'absolute'
    output.style.visibility = 'hidden'

    this.HTMLElement = output
    return output
  }

  protected _prepareFrame(keyframe: Keyframe): KeyframeProperties {
    return {
      ...keyframe.properties,
      visibility: 'visible',
      offset: (this.start + keyframe.time) / this.scene.length
    }
  }

  createLifecycle(): KeyframeProperties[] {
    if (this.keyframes.length === 0) return []

    const output: KeyframeProperties[] = []

    // Add initial hidden state
    output.push({
      ...this.keyframes[0].properties,
      visibility: 'hidden',
      offset: 0
    })

    // Add starting keyframe
    output.push({
      ...this.keyframes[0].properties,
      visibility: 'hidden',
      offset: this.start / this.scene.length
    })

    // Add all keyframes
    this.keyframes.forEach((keyframe) => {
      output.push(this._prepareFrame(keyframe))
    })

    // Add ending keyframes
    const lastProperties = this.keyframes[this.keyframes.length - 1].properties
    output.push({
      ...lastProperties,
      visibility: 'hidden',
      offset: (this.start + this.length) / this.scene.length
    })

    output.push({
      ...lastProperties,
      visibility: 'hidden',
      offset: 1
    })

    return output
  }

  addKeyFrame(time: number, properties: KeyframeProperties = {}): void {
    if (time > this.length) {
      throw new Error('Invalid keyframe time provided')
    }

    const keyframe = new Keyframe(time, properties)

    // Insert keyframe in sorted order
    const insertIndex = this.keyframes.findIndex((k) => k.time > time)
    if (insertIndex === -1) {
      this.keyframes.push(keyframe)
    } else {
      this.keyframes.splice(insertIndex, 0, keyframe)
    }
  }
}

class ImageElement extends Element {
  private src: string

  constructor(
    scene: Scene,
    width: number,
    height: number,
    start: number,
    length: number,
    src: string
  ) {
    super(scene, width, height, start, length)
    this.src = src
    this.class = prefixClass('imageelement')
  }

  create(): HTMLDivElement {
    const output = super.create()
    output.style.backgroundImage = `url(${this.src})`
    output.style.backgroundSize = 'contain'
    output.style.backgroundRepeat = 'no-repeat'
    output.style.scale = this.scale.toString()

    this.HTMLElement = output
    return output
  }
}

class Keyframe {
  public time: number
  public properties: KeyframeProperties

  constructor(time: number, properties: KeyframeProperties) {
    this.time = time
    this.properties = properties
  }
}

export { Scene, Element, ImageElement, Keyframe, Remote }
