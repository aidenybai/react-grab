"use client";

import { useState, useEffect, useCallback } from "react";

interface WindowState {
  id: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

interface DockItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

interface WindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  onFocus: () => void;
  onDrag: (id: string, position: { x: number; y: number }) => void;
}

const TrafficLights = ({ onClose }: { onClose?: () => void }) => (
  <div className="flex gap-2 group">
    <button
      onClick={onClose}
      className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors"
      style={{
        boxShadow:
          "inset 0 -1px 2px rgba(0,0,0,0.2), 0 0 2px rgba(255,95,87,0.5)",
      }}
    />
    <div
      className="w-3 h-3 rounded-full bg-[#febc2e]"
      style={{
        boxShadow:
          "inset 0 -1px 2px rgba(0,0,0,0.2), 0 0 2px rgba(254,188,46,0.5)",
      }}
    />
    <div
      className="w-3 h-3 rounded-full bg-[#28c840]"
      style={{
        boxShadow:
          "inset 0 -1px 2px rgba(0,0,0,0.2), 0 0 2px rgba(40,200,64,0.5)",
      }}
    />
  </div>
);

const LiquidGlassWindow = ({
  id,
  title,
  children,
  position,
  size,
  zIndex,
  onFocus,
  onDrag,
}: WindowProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if ((event.target as HTMLElement).closest("button")) return;
      event.preventDefault();
      onFocus();
      setIsDragging(true);
      setDragOffset({
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      });
    },
    [position, onFocus],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const newX = Math.max(0, event.clientX - dragOffset.x);
      const newY = Math.max(28, event.clientY - dragOffset.y);
      onDrag(id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, id, onDrag]);

  return (
    <div
      onMouseDown={onFocus}
      className="absolute select-none"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex,
      }}
    >
      <div
        className="w-full h-full rounded-2xl overflow-hidden"
        style={{
          background: "rgba(60, 60, 80, 0.65)",
          backdropFilter: "blur(50px) saturate(180%)",
          WebkitBackdropFilter: "blur(50px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.25)",
          boxShadow: `
            0 25px 60px -15px rgba(0,0,0,0.5),
            0 10px 30px -10px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.2),
            inset 0 -1px 0 rgba(255,255,255,0.05)
          `,
        }}
      >
        <div
          className="h-12 flex items-center px-4 gap-4 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <TrafficLights />
          <span className="text-white/90 text-[13px] font-medium flex-1 text-center pr-12">
            {title}
          </span>
        </div>
        <div className="p-4 h-[calc(100%-48px)] overflow-auto">{children}</div>
      </div>
    </div>
  );
};

const DockItem = ({ icon, label, isActive }: DockItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      {isHovered && (
        <div
          className="absolute -top-10 px-3 py-1.5 rounded-lg text-xs text-white whitespace-nowrap"
          style={{
            background: "rgba(30, 30, 40, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          {label}
        </div>
      )}
      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ease-out hover:scale-[1.3] hover:-translate-y-4"
      >
        {icon}
      </button>
      {isActive && (
        <div
          className="w-1 h-1 rounded-full mt-1"
          style={{
            background: "rgba(255,255,255,0.8)",
            boxShadow: "0 0 6px rgba(255,255,255,0.5)",
          }}
        />
      )}
    </div>
  );
};

const Dock = () => {
  const dockItems = [
    { icon: <FinderIcon />, label: "Finder", isActive: true },
    { icon: <SafariIcon />, label: "Safari", isActive: true },
    { icon: <MessagesIcon />, label: "Messages" },
    { icon: <MailIcon />, label: "Mail" },
    { icon: <MusicIcon />, label: "Music", isActive: true },
    { icon: <NotesIcon />, label: "Notes", isActive: true },
    { icon: <SettingsIcon />, label: "System Settings" },
    { icon: <TrashIcon />, label: "Trash" },
  ];

  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-1 px-2 py-1.5 rounded-2xl"
      style={{
        background: "rgba(50, 50, 60, 0.45)",
        backdropFilter: "blur(50px) saturate(180%)",
        WebkitBackdropFilter: "blur(50px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.2)",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      {dockItems.map((item) => (
        <DockItem key={item.label} {...item} />
      ))}
    </div>
  );
};

const MenuBar = () => {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-7 flex items-center justify-between px-4 z-100"
      style={{
        background: "rgba(40, 40, 50, 0.7)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex items-center gap-5">
        <AppleIcon />
        <span className="text-white/90 text-[13px] font-semibold">Finder</span>
        <span className="text-white/70 text-[13px]">File</span>
        <span className="text-white/70 text-[13px]">Edit</span>
        <span className="text-white/70 text-[13px]">View</span>
        <span className="text-white/70 text-[13px]">Go</span>
        <span className="text-white/70 text-[13px]">Window</span>
        <span className="text-white/70 text-[13px]">Help</span>
      </div>
      <div className="flex items-center gap-3 text-white/80 text-[13px]">
        <BatteryIcon />
        <WifiIcon />
        <span className="font-medium">{currentTime}</span>
      </div>
    </div>
  );
};

const FinderContent = () => {
  const sidebarItems = [
    { name: "AirDrop", icon: <AirDropIcon /> },
    { name: "Applications", icon: <ApplicationsIcon /> },
    { name: "Desktop", icon: <DesktopIcon /> },
    { name: "Documents", icon: <DocumentIcon /> },
    { name: "Downloads", icon: <DownloadIcon /> },
    { name: "Movies", icon: <MovieIcon /> },
    { name: "Music", icon: <MusicFolderIcon /> },
    { name: "Pictures", icon: <PicturesIcon /> },
  ];

  const files = [
    { name: "Project Alpha", icon: <FolderIcon color="#3b9dff" /> },
    { name: "Budget 2024.xlsx", icon: <ExcelIcon /> },
    { name: "Presentation.key", icon: <KeynoteIcon /> },
    { name: "Screenshot.png", icon: <ImageIcon /> },
    { name: "Notes.txt", icon: <TextIcon /> },
    { name: "Archive.zip", icon: <ZipIcon /> },
  ];

  return (
    <div className="flex h-full">
      <div
        className="w-44 h-full border-r border-white/10 py-1 -ml-4 pl-2"
        style={{ background: "rgba(0,0,0,0.2)" }}
      >
        <div className="text-white/50 text-[10px] uppercase tracking-wider mb-2 px-3 pt-1 font-semibold">
          Favorites
        </div>
        {sidebarItems.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-2.5 px-3 py-1 rounded-md hover:bg-white/10 cursor-pointer transition-colors"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {item.icon}
            </div>
            <span className="text-white/80 text-[13px]">{item.name}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 p-4 grid grid-cols-3 gap-3 content-start">
        {files.map((file) => (
          <div
            key={file.name}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <div className="w-14 h-14 flex items-center justify-center">
              {file.icon}
            </div>
            <span className="text-white/85 text-[11px] text-center leading-tight w-full">
              {file.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const NotesContent = () => {
  const [noteText, setNoteText] = useState(`Welcome to Liquid Glass Notes ✨

This demo showcases the liquid glass aesthetic for macOS.

Features:
• Frosted glass blur effects
• Subtle gradients and highlights
• Realistic window chrome
• Smooth animations
• Draggable windows

"Design is not just what it looks like and feels like. Design is how it works."
– Steve Jobs`);

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 mb-3">
        <button
          className="px-3 py-1.5 rounded-lg text-[12px] text-white/60 hover:bg-white/10 transition-colors"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          All Notes
        </button>
        <button
          className="px-3 py-1.5 rounded-lg text-[12px] text-white/90"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Personal
        </button>
        <button
          className="px-3 py-1.5 rounded-lg text-[12px] text-white/60 hover:bg-white/10 transition-colors"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          Work
        </button>
      </div>
      <textarea
        value={noteText}
        onChange={(event) => setNoteText(event.target.value)}
        className="flex-1 w-full bg-transparent text-white/85 text-[13px] leading-relaxed resize-none outline-none placeholder:text-white/30"
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        }}
      />
    </div>
  );
};

const MusicContent = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress] = useState(35);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-5">
      <div
        className="w-32 h-32 rounded-xl flex items-center justify-center relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          boxShadow: "0 16px 40px rgba(102, 126, 234, 0.5)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)",
          }}
        />
        <MusicNoteIcon />
      </div>
      <div className="text-center">
        <h3 className="text-white/95 font-semibold text-[15px]">
          Liquid Dreams
        </h3>
        <p className="text-white/50 text-[13px]">Glass Symphony</p>
      </div>
      <div className="w-full max-w-[200px]">
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.9) 100%)",
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/40 mt-1.5">
          <span>1:24</span>
          <span>4:02</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <button className="text-white/50 hover:text-white/80 transition-colors">
          <SkipBackIcon />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow:
              "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className="text-white/50 hover:text-white/80 transition-colors">
          <SkipForwardIcon />
        </button>
      </div>
    </div>
  );
};

const ExampleTestPage = () => {
  const [windows, setWindows] = useState<WindowState[]>([
    {
      id: "finder",
      title: "Finder",
      position: { x: 80, y: 80 },
      size: { width: 580, height: 380 },
      zIndex: 1,
    },
    {
      id: "notes",
      title: "Notes",
      position: { x: 280, y: 240 },
      size: { width: 380, height: 340 },
      zIndex: 2,
    },
    {
      id: "music",
      title: "Music",
      position: { x: 720, y: 120 },
      size: { width: 300, height: 400 },
      zIndex: 3,
    },
  ]);
  const [topZIndex, setTopZIndex] = useState(3);

  const handleFocus = useCallback(
    (windowId: string) => {
      setWindows((prevWindows) =>
        prevWindows.map((window) =>
          window.id === windowId
            ? { ...window, zIndex: topZIndex + 1 }
            : window,
        ),
      );
      setTopZIndex((prevZIndex) => prevZIndex + 1);
    },
    [topZIndex],
  );

  const handleDrag = useCallback(
    (windowId: string, newPosition: { x: number; y: number }) => {
      setWindows((prevWindows) =>
        prevWindows.map((window) =>
          window.id === windowId
            ? { ...window, position: newPosition }
            : window,
        ),
      );
    },
    [],
  );

  const getWindowContent = (windowId: string) => {
    switch (windowId) {
      case "finder":
        return <FinderContent />;
      case "notes":
        return <NotesContent />;
      case "music":
        return <MusicContent />;
      default:
        return null;
    }
  };

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        This page is only available in development mode.
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 10% 10%, rgba(120, 80, 180, 0.7) 0%, transparent 45%),
          radial-gradient(ellipse at 90% 20%, rgba(59, 130, 246, 0.5) 0%, transparent 45%),
          radial-gradient(ellipse at 60% 90%, rgba(200, 80, 140, 0.5) 0%, transparent 45%),
          radial-gradient(ellipse at 95% 95%, rgba(34, 180, 140, 0.4) 0%, transparent 40%),
          linear-gradient(145deg, #1a0e2e 0%, #151030 30%, #0c1929 70%, #0a1420 100%)
        `,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: 0.03,
        }}
      />

      <MenuBar />

      {windows.map((window) => (
        <LiquidGlassWindow
          key={window.id}
          id={window.id}
          title={window.title}
          position={window.position}
          size={window.size}
          zIndex={window.zIndex}
          onFocus={() => handleFocus(window.id)}
          onDrag={handleDrag}
        >
          {getWindowContent(window.id)}
        </LiquidGlassWindow>
      ))}

      <Dock />
    </div>
  );
};

ExampleTestPage.displayName = "ExampleTestPage";

export default ExampleTestPage;

const AppleIcon = () => (
  <svg
    className="w-4 h-4 text-white/90"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const BatteryIcon = () => (
  <svg className="w-6 h-4" viewBox="0 0 28 14" fill="none">
    <rect
      x="1"
      y="1"
      width="23"
      height="12"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <rect
      x="25"
      y="4"
      width="2"
      height="6"
      rx="1"
      fill="currentColor"
      opacity="0.5"
    />
    <rect
      x="3"
      y="3"
      width="19"
      height="8"
      rx="1.5"
      fill="currentColor"
      opacity="0.9"
    />
  </svg>
);

const WifiIcon = () => (
  <svg className="w-5 h-4" viewBox="0 0 20 16" fill="currentColor">
    <path d="M10 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    <path
      fillRule="evenodd"
      d="M6.343 9.657a5.5 5.5 0 017.314 0 .75.75 0 001.06-1.06 7 7 0 00-9.434 0 .75.75 0 001.06 1.06z"
    />
    <path
      fillRule="evenodd"
      d="M3.515 6.829a9 9 0 0112.97 0 .75.75 0 101.06-1.06 10.5 10.5 0 00-15.09 0 .75.75 0 001.06 1.06z"
    />
    <path
      fillRule="evenodd"
      d="M.686 4a12.5 12.5 0 0118.628 0 .75.75 0 101.06-1.06 14 14 0 00-20.748 0A.75.75 0 00.686 4z"
    />
  </svg>
);

const FinderIcon = () => (
  <svg className="w-11 h-11" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="finderBlue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6de0fb" />
        <stop offset="100%" stopColor="#1a9bfc" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="112" height="112" rx="26" fill="#fff" />
    <path
      d="M20 35 L20 95 Q20 105 30 105 L55 105 L55 35 Q55 25 45 25 L30 25 Q20 25 20 35"
      fill="#f5f5f7"
    />
    <rect x="36" y="45" width="5" height="16" rx="2.5" fill="#1d1d1f" />
    <path
      d="M55 35 L55 105 L90 105 Q100 105 100 95 L100 50 Q100 40 90 35 L75 25 Q65 20 65 30 L65 35 Q65 45 75 45 L90 45"
      fill="url(#finderBlue)"
    />
    <rect x="78" y="45" width="5" height="16" rx="2.5" fill="#0066cc" />
    <path
      d="M30 78 Q45 95 60 78 Q75 95 90 78"
      fill="none"
      stroke="#1d1d1f"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

const SafariIcon = () => (
  <svg className="w-11 h-11" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="safariBlue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#5ac8fa" />
        <stop offset="100%" stopColor="#007aff" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="112" height="112" rx="26" fill="#fff" />
    <circle cx="60" cy="60" r="46" fill="url(#safariBlue)" />
    {[...Array(72)].map((_, i) => (
      <line
        key={i}
        x1="60"
        y1="17"
        x2="60"
        y2={i % 6 === 0 ? "24" : "20"}
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={i % 6 === 0 ? "2" : "1"}
        strokeLinecap="round"
        transform={`rotate(${i * 5} 60 60)`}
      />
    ))}
    <polygon points="60,22 68,60 60,98" fill="#ff3b30" />
    <polygon points="60,22 52,60 60,98" fill="#fff" />
  </svg>
);

const MessagesIcon = () => (
  <svg className="w-11 h-11" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="msgBlue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#5ac8fa" />
        <stop offset="100%" stopColor="#007aff" />
      </linearGradient>
      <linearGradient id="bubbleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="100%" stopColor="#e8f4fc" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="112" height="112" rx="26" fill="url(#msgBlue)" />
    <ellipse cx="60" cy="54" rx="40" ry="32" fill="url(#bubbleGrad)" />
    <path d="M28 70 Q20 90 24 94 Q35 85 45 80" fill="url(#bubbleGrad)" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-11 h-11" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="mailBlue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#5ac8fa" />
        <stop offset="100%" stopColor="#007aff" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="112" height="112" rx="26" fill="url(#mailBlue)" />
    <rect x="16" y="32" width="88" height="56" rx="6" fill="#fff" />
    <path
      d="M16 38l44 28 44-28"
      fill="none"
      stroke="#007aff"
      strokeWidth="4"
      strokeLinejoin="round"
    />
  </svg>
);

const MusicIcon = () => (
  <svg className="w-11 h-11" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="musicRed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fc5c7d" />
        <stop offset="50%" stopColor="#fa3c5a" />
        <stop offset="100%" stopColor="#e61739" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="112" height="112" rx="26" fill="url(#musicRed)" />
    <path
      d="M85 20v58c0 12-10 18-20 18s-18-6-18-16c0-12 10-18 20-18 4 0 7 1 10 2V32L45 40v50c0 12-10 18-20 18s-18-6-18-16c0-12 10-18 20-18 4 0 7 1 10 2V24l48-12z"
      fill="#fff"
    />
  </svg>
);

const NotesIcon = () => (
  <svg className="w-11 h-11" viewBox="0 0 120 120">
    <rect x="4" y="4" width="112" height="112" rx="26" fill="#fff" />
    <rect x="4" y="4" width="112" height="40" rx="26" fill="#ffcc02" />
    <rect x="4" y="30" width="112" height="14" fill="#ffcc02" />
    {[...Array(15)].map((_, i) => (
      <circle key={i} cx={16 + i * 6.5} cy="46" r="2.5" fill="#8e8e93" />
    ))}
    <line
      x1="24"
      y1="64"
      x2="96"
      y2="64"
      stroke="#c7c7cc"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="24"
      y1="82"
      x2="96"
      y2="82"
      stroke="#c7c7cc"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="24"
      y1="100"
      x2="70"
      y2="100"
      stroke="#c7c7cc"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-11 h-11" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="settingsGray" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#c7c7cc" />
        <stop offset="100%" stopColor="#8e8e93" />
      </linearGradient>
      <linearGradient id="gearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#8e8e93" />
        <stop offset="100%" stopColor="#48484a" />
      </linearGradient>
    </defs>
    <rect
      x="4"
      y="4"
      width="112"
      height="112"
      rx="26"
      fill="url(#settingsGray)"
    />
    <g fill="url(#gearGrad)">
      <circle cx="60" cy="60" r="38" />
      {[...Array(12)].map((_, i) => (
        <rect
          key={i}
          x="56"
          y="18"
          width="8"
          height="14"
          rx="2"
          transform={`rotate(${i * 30} 60 60)`}
        />
      ))}
    </g>
    <circle cx="60" cy="60" r="28" fill="url(#settingsGray)" />
    {[...Array(48)].map((_, i) => (
      <line
        key={i}
        x1="60"
        y1="34"
        x2="60"
        y2="38"
        stroke="#636366"
        strokeWidth="1.5"
        transform={`rotate(${i * 7.5} 60 60)`}
      />
    ))}
    <circle cx="60" cy="60" r="18" fill="url(#gearGrad)" />
    <path
      d="M50 54 L60 60 L50 66 M60 60 L75 50 M60 60 L75 70"
      stroke="url(#settingsGray)"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="60" cy="60" r="4" fill="#3a3a3c" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-11 h-11" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="trashBody" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgba(200,200,210,0.9)" />
        <stop offset="50%" stopColor="rgba(240,240,245,0.95)" />
        <stop offset="100%" stopColor="rgba(180,180,190,0.9)" />
      </linearGradient>
      <linearGradient id="trashInner" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(100,100,110,0.6)" />
        <stop offset="100%" stopColor="rgba(60,60,70,0.8)" />
      </linearGradient>
    </defs>
    <path
      d="M30 25 L26 100 Q26 110 36 110 L84 110 Q94 110 94 100 L90 25 Z"
      fill="url(#trashBody)"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="1"
    />
    <ellipse
      cx="60"
      cy="25"
      rx="32"
      ry="10"
      fill="url(#trashBody)"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="1"
    />
    <ellipse cx="60" cy="25" rx="24" ry="7" fill="url(#trashInner)" />
    <path d="M34 40 L38 100" stroke="rgba(150,150,160,0.4)" strokeWidth="2" />
    <path d="M50 40 L51 100" stroke="rgba(150,150,160,0.4)" strokeWidth="2" />
    <path d="M70 40 L69 100" stroke="rgba(150,150,160,0.4)" strokeWidth="2" />
    <path d="M86 40 L82 100" stroke="rgba(150,150,160,0.4)" strokeWidth="2" />
  </svg>
);

const AirDropIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="16" r="4" fill="#007aff" />
    <path
      d="M12 4c-5 0-9 4-9 9"
      stroke="#007aff"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M21 13c0-5-4-9-9-9"
      stroke="#007aff"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M12 8c-3 0-5 2-5 5"
      stroke="#007aff"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M17 13c0-3-2-5-5-5"
      stroke="#007aff"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const ApplicationsIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="8" height="8" rx="2" fill="#007aff" />
    <rect x="13" y="3" width="8" height="8" rx="2" fill="#34c759" />
    <rect x="3" y="13" width="8" height="8" rx="2" fill="#ff9500" />
    <rect x="13" y="13" width="8" height="8" rx="2" fill="#ff2d55" />
  </svg>
);

const FolderIcon = ({ color = "#3b9dff" }: { color?: string }) => (
  <svg className="w-14 h-12" viewBox="0 0 64 52">
    <defs>
      <linearGradient id={`folder-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="1" />
        <stop offset="100%" stopColor={color} stopOpacity="0.75" />
      </linearGradient>
    </defs>
    <path
      d="M4 12a4 4 0 014-4h14l6 6h28a4 4 0 014 4v26a4 4 0 01-4 4H8a4 4 0 01-4-4V12z"
      fill={`url(#folder-${color})`}
    />
    <path
      d="M4 18h56v24a4 4 0 01-4 4H8a4 4 0 01-4-4V18z"
      fill={color}
      fillOpacity="0.9"
    />
    <path d="M4 18h56v2H4z" fill="#fff" fillOpacity="0.3" />
  </svg>
);

const DesktopIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="13" rx="2" fill="#5856d6" />
    <rect x="4" y="6" width="16" height="9" rx="1" fill="#1c1c1e" />
    <rect x="8" y="17" width="8" height="1" fill="#5856d6" />
    <rect x="6" y="19" width="12" height="1" rx="0.5" fill="#5856d6" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <path
      d="M6 2h8l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
      fill="#ff9500"
    />
    <path d="M14 2v6h6" fill="#cc7700" />
    <rect
      x="6"
      y="12"
      width="10"
      height="1"
      rx="0.5"
      fill="#fff"
      fillOpacity="0.7"
    />
    <rect
      x="6"
      y="15"
      width="8"
      height="1"
      rx="0.5"
      fill="#fff"
      fillOpacity="0.7"
    />
    <rect
      x="6"
      y="18"
      width="6"
      height="1"
      rx="0.5"
      fill="#fff"
      fillOpacity="0.7"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#34c759" />
    <path
      d="M12 6v8m0 0l-3-3m3 3l3-3"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M7 16h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MovieIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="3" fill="#af52de" />
    <rect x="4" y="4" width="3" height="4" fill="#1c1c1e" />
    <rect x="17" y="4" width="3" height="4" fill="#1c1c1e" />
    <rect x="4" y="16" width="3" height="4" fill="#1c1c1e" />
    <rect x="17" y="16" width="3" height="4" fill="#1c1c1e" />
    <circle cx="12" cy="12" r="4" fill="#fff" fillOpacity="0.9" />
    <polygon points="11,10 11,14 14,12" fill="#af52de" />
  </svg>
);

const MusicFolderIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#ff2d55" />
    <path
      d="M15 6v9a3 3 0 11-2-2.83V8l-4 1v7a3 3 0 11-2-2.83V6l8-2z"
      fill="#fff"
    />
  </svg>
);

const PicturesIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="3" fill="#30b0c7" />
    <circle cx="8" cy="9" r="2" fill="#ffcc00" />
    <path
      d="M2 16l5-4 4 3 5-5 6 6v4a3 3 0 01-3 3H5a3 3 0 01-3-3v-4z"
      fill="#007aff"
      fillOpacity="0.6"
    />
  </svg>
);

const ExcelIcon = () => (
  <svg className="w-14 h-16" viewBox="0 0 56 64">
    <path
      d="M8 4h28l12 12v44a4 4 0 01-4 4H8a4 4 0 01-4-4V8a4 4 0 014-4z"
      fill="#21a366"
    />
    <path d="M36 4v12h12" fill="#107c41" />
    <rect x="12" y="26" width="32" height="24" rx="2" fill="#fff" />
    <line x1="12" y1="34" x2="44" y2="34" stroke="#21a366" strokeWidth="1" />
    <line x1="12" y1="42" x2="44" y2="42" stroke="#21a366" strokeWidth="1" />
    <line x1="22" y1="26" x2="22" y2="50" stroke="#21a366" strokeWidth="1" />
    <line x1="34" y1="26" x2="34" y2="50" stroke="#21a366" strokeWidth="1" />
  </svg>
);

const KeynoteIcon = () => (
  <svg className="w-14 h-16" viewBox="0 0 56 64">
    <path
      d="M8 4h28l12 12v44a4 4 0 01-4 4H8a4 4 0 01-4-4V8a4 4 0 014-4z"
      fill="#007aff"
    />
    <path d="M36 4v12h12" fill="#0051a8" />
    <rect x="14" y="24" width="28" height="20" rx="2" fill="#fff" />
    <polygon points="28,28 38,36 28,44 18,36" fill="#007aff" />
    <rect x="24" y="46" width="8" height="6" fill="#fff" />
    <rect x="18" y="50" width="20" height="2" rx="1" fill="#fff" />
  </svg>
);

const ImageIcon = () => (
  <svg className="w-14 h-16" viewBox="0 0 56 64">
    <path
      d="M8 4h28l12 12v44a4 4 0 01-4 4H8a4 4 0 01-4-4V8a4 4 0 014-4z"
      fill="#5856d6"
    />
    <path d="M36 4v12h12" fill="#3634a3" />
    <rect x="12" y="24" width="32" height="24" rx="3" fill="#fff" />
    <circle cx="20" cy="32" r="4" fill="#ffcc00" />
    <path
      d="M12 42l8-6 6 5 8-8 10 10v5a3 3 0 01-3 3H15a3 3 0 01-3-3v-6z"
      fill="#34c759"
      fillOpacity="0.7"
    />
  </svg>
);

const TextIcon = () => (
  <svg className="w-14 h-16" viewBox="0 0 56 64">
    <path
      d="M8 4h28l12 12v44a4 4 0 01-4 4H8a4 4 0 01-4-4V8a4 4 0 014-4z"
      fill="#f5f5f7"
    />
    <path d="M36 4v12h12" fill="#d1d1d6" />
    <path
      d="M8 4h28l12 12v44a4 4 0 01-4 4H8a4 4 0 01-4-4V8a4 4 0 014-4z"
      fill="none"
      stroke="#c7c7cc"
      strokeWidth="1"
    />
    <rect x="14" y="24" width="28" height="2" rx="1" fill="#8e8e93" />
    <rect x="14" y="30" width="24" height="2" rx="1" fill="#8e8e93" />
    <rect x="14" y="36" width="26" height="2" rx="1" fill="#8e8e93" />
    <rect x="14" y="42" width="20" height="2" rx="1" fill="#8e8e93" />
  </svg>
);

const ZipIcon = () => (
  <svg className="w-14 h-16" viewBox="0 0 56 64">
    <path
      d="M8 4h28l12 12v44a4 4 0 01-4 4H8a4 4 0 01-4-4V8a4 4 0 014-4z"
      fill="#8e8e93"
    />
    <path d="M36 4v12h12" fill="#636366" />
    <g fill="#fff">
      <rect x="24" y="8" width="8" height="5" />
      <rect x="24" y="17" width="8" height="5" />
      <rect x="24" y="26" width="8" height="5" />
      <rect x="24" y="35" width="8" height="5" />
      <rect x="24" y="44" width="8" height="10" rx="2" />
      <circle cx="28" cy="50" r="2" fill="#8e8e93" />
    </g>
  </svg>
);

const MusicNoteIcon = () => (
  <svg
    className="w-14 h-14 text-white relative"
    viewBox="0 0 48 48"
    fill="currentColor"
  >
    <path d="M36 6v24a6 6 0 11-4-5.66V12l-16 4v18a6 6 0 11-4-5.66V10l24-6z" />
  </svg>
);

const SkipBackIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
  </svg>
);

const PlayIcon = () => (
  <svg
    className="w-5 h-5 ml-0.5 text-white/90"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M8 5v14l11-7L8 5z" />
  </svg>
);

const PauseIcon = () => (
  <svg
    className="w-5 h-5 text-white/90"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

const SkipForwardIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zm10 0V6h2v12h-2z" />
  </svg>
);
