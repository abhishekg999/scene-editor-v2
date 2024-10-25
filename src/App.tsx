"use client"

import { useState, useEffect, useContext, createContext, Dispatch, SetStateAction, ReactNode, useRef, useLayoutEffect } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { DndProvider, DragPreviewImage, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Rnd } from "react-rnd"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  FileIcon,
  Edit3Icon,
  EyeIcon,
  PlayIcon,
  PlugIcon,
  HelpCircleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  FolderIcon,
  PauseIcon
} from "lucide-react"
import { Project } from "./lib/project"
import { ImageElement, Keyframe } from "./lib/scene"
import { debounce, set } from "lodash"

type ProjectContextType = {
  project: Project; // Replace `any` with a more specific type if you know the shape of `project`
  setProject: Dispatch<SetStateAction<Project>> | null; // Replace `any` with the same type as above
};

const ProjectContext = createContext<ProjectContextType>({
  // @ts-expect-error - We don't want to provide any default values
  project: null,
  setProject: null,
});

type ProjectContextProviderProps = {
  init: any; // Replace `any` with the specific type of `project`
  children: ReactNode;
};

const ProjectContextProvider = ({ init, children }: ProjectContextProviderProps) => {
  const [project, setProject] = useState<Project>(init);

  return (
    <ProjectContext.Provider value={{ project, setProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

// ImageAsset Component
type ImageAssetProps = {
  name: string;
  image: string;
}
const ImageAsset = ({ name, image }: ImageAssetProps) => {
  const [metadata, setMetadata] = useState({ dimensions: [0, 0] })

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: "image_asset",
      item: { image, metadata },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [metadata]
  )

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setMetadata((prevMetadata) => ({
        ...prevMetadata,
        dimensions: [img.naturalWidth, img.naturalHeight],
      }))
    }
    img.src = image
  }, [image])

  return (
    <>
      <DragPreviewImage src="" connect={preview} />
      <div
        ref={drag}
        className={`w-24 flex flex-col items-center ${isDragging ? 'opacity-50' : 'opacity-100'}`}
        style={{ cursor: 'move' }}
      >
        <div className="w-24 aspect-video bg-muted rounded overflow-hidden">
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>
        <span className="text-xs mt-1 text-center">{name}</span>
      </div>
    </>
  )
}

// MenuBar Component
const MenuBar = () => {
  const menuItems = [
    { name: "FILE", icon: <FileIcon className="w-4 h-4 mr-2" /> },
    { name: "EDIT", icon: <Edit3Icon className="w-4 h-4 mr-2" /> },
    { name: "VIEW", icon: <EyeIcon className="w-4 h-4 mr-2" /> },
    { name: "GO", icon: <PlayIcon className="w-4 h-4 mr-2" /> },
    { name: "PLUGINS", icon: <PlugIcon className="w-4 h-4 mr-2" /> },
    { name: "HELP", icon: <HelpCircleIcon className="w-4 h-4 mr-2" /> },
  ]

  return (
    <div className="flex items-center p-2 bg-background border-b">
      {menuItems.map((item) => (
        <Button key={item.name} variant="ghost" className="text-xs">
          {item.icon}
          {item.name}
        </Button>
      ))}
    </div>
  )
}

// Asset Library Component
const AssetLibrary = () => {
  const images = [
    ['0', 'a', 'https://picsum.photos/seed/a/200/300'],
    ['1', 'b', 'https://picsum.photos/seed/b/200/300'],
    ['2', 'c', 'https://picsum.photos/seed/c/200/300'],
    ['3', 'd', 'https://picsum.photos/seed/d/200/300'],
    ['4', 'e', 'https://picsum.photos/seed/e/200/300'],
    ['5', 'f', 'https://picsum.photos/seed/f/200/300'],
    ['6', 'g', 'https://picsum.photos/seed/g/200/300'],
    ['7', 'h', 'https://picsum.photos/seed/h/200/300'],
  ]

  return (
    <div className="flex flex-col h-full border-r">
      <AssetSources />
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-3 gap-4 p-4 auto-rows-max">
          {images.map(([id, name, url]) => (
            <ImageAsset key={id} name={name} image={url} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// Asset Sources Component
const AssetSources = () => {
  return (
    <div className="p-2 bg-muted">
      <Button variant="outline" size="sm" className="w-full">
        <FolderIcon className="w-4 h-4 mr-2" />
        Asset Sources
      </Button>
    </div>
  )
}

// Preview Panel Component
const resizeInnerToFitOuter = (outer: any, inner: any) => {
  // Get the dimensions of the outer and inner elements
  const outerWidth = outer.clientWidth;
  const outerHeight = outer.clientHeight;
  const innerWidth = inner.offsetWidth;
  const innerHeight = inner.offsetHeight;

  // Calculate the scale factor to fit the inner element within the outer element
  let scaleFactor = Math.min(outerWidth / innerWidth, outerHeight / innerHeight);

  // Scale the inner element
  inner.style.transform = `scale(${scaleFactor})`;
  inner.style.position = "absolute";
  inner.style.margin = "0";
  inner.style.top = "";
};

const PreviewPanel = () => {
  const { project, setProject } = useContext(ProjectContext);
  const sceneContainer = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [playState, setPlayState] = useState(project.remote.playState);


  useEffect(() => {
    const container = sceneContainer.current;
    if (!container) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.unobserve(container);
    };
  }, []);

  useLayoutEffect(() => {
    const container = sceneContainer.current;
    if (!container) {
      return;
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const [_, element] = project.build();
    project.remote.seek(project.cursorPos);
    container.appendChild(element);

    resizeInnerToFitOuter(sceneContainer.current, project.element);
    resizeInnerToFitOuter(sceneContainer.current, project.element);

  }, [project]);

  if (sceneContainer.current && project.element) resizeInnerToFitOuter(sceneContainer.current, project.element);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 flex items-center justify-center border">
        <div className="w-3/4 h-3/4 bg-muted flex items-center justify-center">
          <div ref={sceneContainer} className="w-full h-full relative grid place-items-center"></div>
        </div>
      </div>
      <div className="h-12 bg-muted flex items-center justify-center space-x-4">
        <Button size="icon" variant="outline" onClick={() => {
          project.remote.seek(0);
        }}>
          <SkipBackIcon className="h-4 w-4" />
        </Button>

        {playState == "running" ? (
          <Button size="icon" variant="outline" onClick={() => {
            project.remote.pause();
            setPlayState("paused");
          }}>
            <PauseIcon className="h-4 w-4" />
          </Button>

        ) :
          <Button size="icon" variant="outline" onClick={() => {
            project.remote.play();
            setPlayState("running");
          }}>
            <PlayIcon className="h-4 w-4" />
          </Button>
        }


      </div>
      <AnimationPlaybar />
    </div>
  );
};


const AnimationPlaybar = () => {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const { project } = useContext(ProjectContext);

  useEffect(() => {
    if (project.remote && project.remote.animations[0]) {
      setDuration((project.remote.animations[0].effect?.getTiming().duration as number));

      const updateProgress = () => {
        setCurrentTime((project.remote.animations[0].currentTime as number));
        project.cursorPos = (project.remote.animations[0].currentTime as number);
        requestAnimationFrame(updateProgress);
      };

      requestAnimationFrame(updateProgress);
    }
  }, [project]);


  const millisecondsToDisplayTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedMilliseconds = String(milliseconds).padStart(3, '0');

    return `${formattedMinutes}:${formattedSeconds}:${formattedMilliseconds}`;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full p-2">
      <div
        className="relative w-full h-4 bg-muted cursor-pointer"
        onClick={(event) => {
          const dist = event.pageX - event.currentTarget.offsetLeft;
          const clickedTime = (dist / event.currentTarget.offsetWidth) * duration;
          project.remote.seek(clickedTime);
        }}
      >
        <div
          className="absolute top-0 left-0 h-full bg-primary"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
      </div>
      <span className="text-xs mt-1">
        {millisecondsToDisplayTime(currentTime)}
      </span>
    </div>
  );


}

// ElementLifecycle Component
type ElementLifecycleProps = {
  element: { id: string; src?: string; start: number; length: number };
}
const ElementLifecycle = ({ element }: ElementLifecycleProps) => {
  const { setProject } = useContext(ProjectContext)

  const [state, setState] = useState({
    width: element.length,
    height: 60,
    x: element.start,
    y: 0,
  })

  useEffect(() => {
    element.start = state.x;
    element.length = state.width;
    // @ts-expect-error
    setProject((prevProject) => Object.assign(Object.create(prevProject.__proto__), prevProject, {}));
  }, [state])

  return (
    <div className="relative w-full h-[74px] mb-5">
      <Rnd
        position={{ x: state.x, y: state.y }}
        size={{ width: state.width, height: state.height }}
        minHeight={state.height}
        maxHeight={state.height}
        bounds="parent"
        dragAxis="x"
        onDragStop={(_e, d) => {
          setState((prev) => ({ ...prev, x: d.x, y: d.y }))
        }}
        onResizeStop={(_e, _direction, ref, _delta, position) => {
          setState((prev) => {
            return {
              ...prev,
              width: ref.offsetWidth,
              x: position.x,
              y: position.y,
            }
          })
        }}
        className="bg-gray-300"
        resizeHandleStyles={{
          left: { width: '8px', height: '100%', background: 'hsl(var(--primary))' },
          right: { width: '8px', height: '100%', background: 'hsl(var(--primary))' },
        }}
        enableResizing={{
          top: false, right: true, bottom: false, left: true,
          topRight: false, bottomRight: false, bottomLeft: false, topLeft: false
        }}
      >
        <div
          className="flex-grow h-full bg-contain bg-repeat-x p-1 rounded"
          style={{ backgroundImage: `url(${element?.src})` }}
        />
      </Rnd>
    </div>
  )
}

const Timeline = () => {
  const { project, setProject } = useContext(ProjectContext)

  const [{ }, drop] = useDrop(
    () => ({
      accept: 'image_asset',
      canDrop: () => true,
      drop: (item: any) => {
        const new_asset = new ImageElement(project.scene, item.metadata.dimensions[0], item.metadata.dimensions[1], 0, 1000, item.image);
        const k = [
          {
            top: "50%",
            left: "50%",
            opacity: 1,
            transform: "rotate(0deg) translate3D(-50%, -50%, 0)",

          },
          {
            top: "50%",
            left: "50%",
            opacity: 1,
            transform: "rotate(30deg) translate3D(-50%, -50%, 0)",
          },
          {
            top: "50%",
            left: "50%",
            opacity: 1,
            transform: "rotate(-30deg) translate3D(-50%, -50%, 0)",
          },
          {
            top: "20%",
            left: "80%",
            opacity: 1,
            transform: "rotate(180deg) translate3D(-50%, -50%, 0)",
          }
        ]


        new_asset.addKeyFrame(0, k[1]);
        new_asset.addKeyFrame(400, k[2]);
        new_asset.addKeyFrame(800, k[3]);
        new_asset.scale = 1;

        project.scene.addChild(new_asset);

        // @ts-expect-error
        setProject((prevProject) => {
          // @ts-expect-error
          return Object.assign(Object.create(prevProject.__proto__), prevProject, {});
        });
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    })
  )

  return (
    <div
      ref={drop}
      className="block w-full h-full bg-muted overflow-auto relative"
    >
      <div className="w-[calc(100%-40px)] pt-5 relative h-full mx-auto">
        <div className="w-full">
          {project.scene.children && project.scene.children.map((e) => (
            <ElementLifecycle element={e} key={e.id} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Main Video Editor Component
export default function VideoEditor() {
  return (
    <ProjectContextProvider init={new Project([], 5000)}>
      <DndProvider backend={HTML5Backend}>
        <div className="flex flex-col h-screen bg-background text-foreground">
          <MenuBar />
          <PanelGroup direction="vertical">
            <Panel>
              <PanelGroup direction="horizontal" className="flex-1">
                <Panel defaultSize={20} minSize={15}>
                  <AssetLibrary />
                </Panel>
                <PanelResizeHandle className="w-1 bg-muted-foreground hover:bg-primary transition-colors" />
                <Panel minSize={30}>
                  <PreviewPanel />
                </Panel>
              </PanelGroup>
            </Panel>
            <PanelResizeHandle className="h-1 bg-muted-foreground hover:bg-primary transition-colors" />
            <Panel defaultSize={30} minSize={20}>
              <Timeline />
            </Panel>
          </PanelGroup>
        </div>
      </DndProvider>
    </ProjectContextProvider>
  );
}
