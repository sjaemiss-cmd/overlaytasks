import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import CustomTitleBar from "./components/CustomTitleBar";
import SortableTaskItem from "./components/SortableTaskItem";
import TaskItem from "./components/TaskItem";
import { useTaskStore } from "./hooks/useTaskStore";
import { useTimeCheck } from "./hooks/useTimeCheck";
import { createId } from "./utils/id";
import { sortTasks } from "./utils/sortTasks";
import type { AppSettings, FontSize, Language, SortMode, Task, ThemeMode } from "./types";

const defaultSettings: AppSettings = {
  startMode: "normal",
  alwaysOnTop: true,
  launchOnStartup: false,
  language: "ko",
  panelOpacity: 0.8,
  panelBlur: 16,
  notifyThresholds: [60, 30, 15],
  heartbeatThreshold: 180,
  soundEnabled: false,
  defaultSort: "deadline",
  manualOrderPriority: true,
  hideCompletedTab: false,
  hideHoldTab: false,
  autoSave: true,
  theme: "ocean",
  fontSize: "md"
};

const App = () => {
  const now = useTimeCheck();
  const sensors = useSensors(useSensor(PointerSensor));
  const {
    tasks,
    manualOrder,
    order,
    hydrateTasks,
    hydrateOrder,
    setAutoSave,
    addTask,
    updateStatus,
    updateTask,
    removeTask,
    setOrder
  } = useTaskStore();

  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState(
    dayjs().add(2, "hour").format("YYYY-MM-DDTHH:mm")
  );
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "on-hold">(
    "active"
  );
  const [miniMode, setMiniMode] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const notifiedRef = useRef<Map<string, Set<number>>>(new Map());
  const t = useMemo(() => {
    const dictionary: Record<Language, Record<string, string>> = {
      ko: {
        overlayTasks: "오버레이 태스크",
        noActiveTasks: "진행 중 일정 없음",
        progress: "진행",
        completed: "완료",
        hold: "보류",
        addTask: "일정 추가",
        newTask: "새 일정",
        taskTitle: "일정 제목",
        openCalendar: "캘린더 열기",
        resetNow: "지금",
        timeRemaining: "남은 시간",
        minLeft: "분 남음",
        minShort: "분",
        expired: "마감 지남",
        noTasksActive: "등록된 일정이 없습니다. 먼저 일정을 추가하세요.",
        noTasksOther: "해당 탭에 일정이 없습니다.",
        settings: "설정",
        windowAppearance: "창/테마",
        startMode: "시작 모드",
        normal: "일반",
        mini: "미니",
        alwaysOnTop: "항상 위",
        launchOnStartup: "윈도우 시작 시 실행",
        panelOpacity: "패널 투명도",
        blur: "블러",
        theme: "테마",
        fontSize: "글자 크기",
        resetWindow: "창 크기 초기화",
        language: "언어",
        notifications: "알림",
        thresholds: "임계값",
        heartbeat: "하트비트 기준",
        sound: "사운드",
        sortingVisibility: "정렬/표시",
        defaultSort: "기본 정렬",
        manualOrderPriority: "수동 정렬 우선",
        hideCompletedTab: "완료 탭 숨김",
        hideHoldTab: "보류 탭 숨김",
        autoSave: "자동 저장",
        data: "데이터",
        resetAll: "전체 초기화",
        exportSettings: "설정 내보내기",
        generate: "생성",
        copy: "복사",
        importSettings: "설정 가져오기",
        import: "가져오기",
        save: "저장",
        close: "닫기",
        delete: "삭제",
        edit: "수정",
        complete: "완료",
        resume: "복원",
        restore: "복원",
        holdAction: "보류",
        deadline: "마감",
        created: "생성",
        deadlineApproaching: "마감 임박"
      },
      en: {
        overlayTasks: "OVERLAY TASKS",
        noActiveTasks: "No active tasks",
        progress: "Progress",
        completed: "Completed",
        hold: "Hold",
        addTask: "Add task",
        newTask: "New task",
        taskTitle: "Task title",
        openCalendar: "Open calendar",
        resetNow: "Now",
        timeRemaining: "Time remaining",
        minLeft: "min left",
        minShort: "min",
        expired: "Expired",
        noTasksActive: "No tasks yet. Add one to start tracking deadlines.",
        noTasksOther: "No tasks in this tab.",
        settings: "Settings",
        windowAppearance: "Window & Appearance",
        startMode: "Start mode",
        normal: "Normal",
        mini: "Mini",
        alwaysOnTop: "Always on top",
        launchOnStartup: "Launch on startup",
        panelOpacity: "Panel opacity",
        blur: "Blur",
        theme: "Theme",
        fontSize: "Font size",
        resetWindow: "Reset window size",
        language: "Language",
        notifications: "Notifications",
        thresholds: "Thresholds",
        heartbeat: "Heartbeat threshold",
        sound: "Sound",
        sortingVisibility: "Sorting & Visibility",
        defaultSort: "Default sort",
        manualOrderPriority: "Manual order priority",
        hideCompletedTab: "Hide completed tab",
        hideHoldTab: "Hide hold tab",
        autoSave: "Auto save",
        data: "Data",
        resetAll: "Reset all tasks",
        exportSettings: "Export settings",
        generate: "Generate",
        copy: "Copy",
        importSettings: "Import settings",
        import: "Import",
        save: "Save",
        close: "Close",
        delete: "Delete",
        edit: "Edit",
        complete: "Complete",
        resume: "Resume",
        restore: "Restore",
        holdAction: "Hold",
        deadline: "Deadline",
        created: "Created",
        deadlineApproaching: "Deadline approaching"
      }
    };
    return dictionary[settings.language];
  }, [settings.language]);
  const previousSizeRef = useRef<{ width: number; height: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragStateRef = useRef({ isDragging: false, startY: 0, startScrollTop: 0 });
  const scrollHideTimerRef = useRef<number | null>(null);
  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    scrollHeight: 1,
    clientHeight: 1
  });
  const [showScrollBar, setShowScrollBar] = useState(false);

  useEffect(() => {
    if (!window.api) return;
    const load = async () => {
      try {
        const [tasksData, orderState, settingsData] = await Promise.all([
          window.api.getTasks(),
          window.api.getTaskOrder(),
          window.api.getSettings()
        ]);
        hydrateTasks(tasksData);
        hydrateOrder(orderState.order, orderState.manualOrder);
        setSettings(settingsData);
        setSettingsDraft(settingsData);
        setAutoSave(settingsData.autoSave);
      } catch {
        return;
      }
    };
    void load();
  }, [hydrateTasks, hydrateOrder, setAutoSave]);

  useEffect(() => {
    document.body.classList.toggle("mini-mode", miniMode);
    return () => {
      document.body.classList.remove("mini-mode");
    };
  }, [miniMode]);

  useEffect(() => {
    document.body.dataset.theme = settings.theme;
    document.documentElement.style.setProperty("--panel-opacity", String(settings.panelOpacity));
    const softOpacity = Math.max(0.4, settings.panelOpacity - 0.2);
    const strongOpacity = Math.max(0.5, settings.panelOpacity - 0.1);
    document.documentElement.style.setProperty("--panel-opacity-soft", String(softOpacity));
    document.documentElement.style.setProperty("--panel-opacity-strong", String(strongOpacity));
    document.documentElement.style.setProperty("--panel-blur", `${settings.panelBlur}px`);
    const scaleMap: Record<FontSize, number> = { sm: 0.92, md: 1, lg: 1.08 };
    document.documentElement.style.setProperty("--font-scale", String(scaleMap[settings.fontSize]));
    setAutoSave(settings.autoSave);
    if (window.api) {
      void window.api.setAlwaysOnTop(settings.alwaysOnTop);
    }
  }, [settings, setAutoSave]);

  useEffect(() => {
    if (!window.api) return;
    if (!settings.autoSave) return;
    void window.api.saveTasks(tasks);
    void window.api.saveTaskOrder({ order, manualOrder });
  }, [settings.autoSave]);

  useEffect(() => {
    if (settings.hideCompletedTab && activeTab === "completed") {
      setActiveTab("active");
    }
    if (settings.hideHoldTab && activeTab === "on-hold") {
      setActiveTab("active");
    }
  }, [settings.hideCompletedTab, settings.hideHoldTab, activeTab]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen]);

  useEffect(() => {
    if (!window.api) return;
    const unsubscribe = window.api.onWindowModeChanged((mode) => {
      setMiniMode(mode === "mini");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setScrollState({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      });
    };
    update();
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(update) : null;
    if (resizeObserver) {
      resizeObserver.observe(el);
    }
    const handleResize = () => update();
    window.addEventListener("resize", handleResize);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [miniMode, tasks.length, activeTab]);

  const handleScroll = () => {
    setShowScrollBar(true);
    if (scrollHideTimerRef.current) {
      window.clearTimeout(scrollHideTimerRef.current);
    }
    scrollHideTimerRef.current = window.setTimeout(() => {
      setShowScrollBar(false);
    }, 1200);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      setScrollState({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      });
    });
  };

  const orderedTasks = useMemo(() => {
    const sorted = sortTasks(tasks, settings.defaultSort);
    if (!settings.manualOrderPriority || !manualOrder || order.length === 0) return sorted;
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const orderSet = new Set(order);
    const ordered = order
      .map((id) => byId.get(id))
      .filter((task): task is Task => Boolean(task));
    const remaining = sorted.filter((task) => !orderSet.has(task.id));
    return [...ordered, ...remaining];
  }, [tasks, settings.defaultSort, settings.manualOrderPriority, manualOrder, order]);

  const visibleTasks = useMemo(() => {
    return orderedTasks.filter((task) => task.status === activeTab);
  }, [orderedTasks, activeTab]);

  const nextTask = useMemo(() => {
    const activeTasks = orderedTasks.filter((task) => task.status === "active");
    if (activeTasks.length === 0) return null;
    return activeTasks.reduce((soonest, task) => {
      const soonestTime = dayjs(soonest.deadline).valueOf();
      const taskTime = dayjs(task.deadline).valueOf();
      return taskTime < soonestTime ? task : soonest;
    }, activeTasks[0]);
  }, [orderedTasks]);

  const miniProgress = useMemo(() => {
    if (!nextTask) return 0;
    const minutesLeft = dayjs(nextTask.deadline).diff(now, "minute");
    const thresholdMinutes = 1440;
    return Math.max(0, Math.min(100, (minutesLeft / thresholdMinutes) * 100));
  }, [nextTask, now]);

  const miniUrgent = useMemo(() => {
    if (!miniMode || !nextTask) return false;
    const minutesLeft = dayjs(nextTask.deadline).diff(now, "minute");
    return minutesLeft < settings.heartbeatThreshold;
  }, [miniMode, nextTask, now, settings.heartbeatThreshold]);

  const updateSettingsDraft = (next: Partial<AppSettings>) => {
    setSettingsDraft((prev) => ({ ...prev, ...next }));
  };

  const toggleThreshold = (value: number) => {
    const current = new Set(settingsDraft.notifyThresholds);
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    const next = Array.from(current).sort((a, b) => b - a);
    updateSettingsDraft({ notifyThresholds: next });
  };

  const handleResetWindow = async () => {
    await window.api?.resetWindowSize();
  };

  const handleOpenSettings = () => {
    setSettingsDraft(settings);
    setSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    setSettings(settingsDraft);
    if (window.api) {
      await window.api.saveSettings(settingsDraft);
    }
    setSettingsOpen(false);
  };

  const playBeep = () => {
    if (!settings.soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.04;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, 120);
    } catch {
      return;
    }
  };

  useEffect(() => {
    if (settings.notifyThresholds.length === 0) return;
    const activeTasks = tasks.filter((task) => task.status === "active");
    const activeIds = new Set(activeTasks.map((task) => task.id));
    for (const key of notifiedRef.current.keys()) {
      if (!activeIds.has(key)) notifiedRef.current.delete(key);
    }
    activeTasks.forEach((task) => {
      const minutesLeft = dayjs(task.deadline).diff(now, "minute");
      settings.notifyThresholds.forEach((threshold) => {
        if (minutesLeft > threshold || minutesLeft < 0) return;
        const entry = notifiedRef.current.get(task.id) ?? new Set<number>();
        if (entry.has(threshold)) return;
        entry.add(threshold);
        notifiedRef.current.set(task.id, entry);
        playBeep();
        if ("Notification" in window) {
          try {
            if (Notification.permission === "granted") {
              new Notification(t.deadlineApproaching, {
                body: `${task.title} - ${minutesLeft} ${t.minLeft}`
              });
            } else if (Notification.permission === "default") {
              void Notification.requestPermission();
            }
          } catch {
            return;
          }
        }
      });
    });
  }, [tasks, now, settings.notifyThresholds, settings.soundEnabled, t.deadlineApproaching, t.minLeft]);

  const scrollMetrics = useMemo(() => {
    const maxScrollTop = Math.max(0, scrollState.scrollHeight - scrollState.clientHeight);
    if (maxScrollTop <= 0) {
      return { maxScrollTop, thumbHeight: 0, thumbTop: 0, show: false };
    }
    const trackHeight = scrollState.clientHeight;
    const thumbHeight = Math.max(28, (scrollState.clientHeight / scrollState.scrollHeight) * trackHeight);
    const thumbTop = (scrollState.scrollTop / maxScrollTop) * (trackHeight - thumbHeight);
    return { maxScrollTop, thumbHeight, thumbTop, show: true };
  }, [scrollState]);

  useEffect(() => {
    if (!scrollMetrics.show) return;
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current.isDragging) return;
      setShowScrollBar(true);
      if (scrollHideTimerRef.current) {
        window.clearTimeout(scrollHideTimerRef.current);
      }
      const el = scrollRef.current;
      if (!el) return;
      const { maxScrollTop, thumbHeight } = scrollMetrics;
      const trackHeight = scrollState.clientHeight;
      const movable = Math.max(1, trackHeight - thumbHeight);
      const deltaY = event.clientY - dragStateRef.current.startY;
      const nextScrollTop =
        dragStateRef.current.startScrollTop + (deltaY / movable) * maxScrollTop;
      el.scrollTop = Math.max(0, Math.min(maxScrollTop, nextScrollTop));
    };
    const handlePointerUp = () => {
      dragStateRef.current.isDragging = false;
      if (scrollHideTimerRef.current) {
        window.clearTimeout(scrollHideTimerRef.current);
      }
      scrollHideTimerRef.current = window.setTimeout(() => {
        setShowScrollBar(false);
      }, 800);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [scrollMetrics, scrollState.clientHeight]);

  const handleAddTask = () => {
    if (!title.trim()) return;
    if (!deadline) return;

    addTask({
      id: createId(),
      title: title.trim(),
      deadline: dayjs(deadline).toISOString(),
      status: "active",
      createdAt: dayjs().toISOString()
    });

    setTitle("");
    setIsAddOpen(false);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!settings.manualOrderPriority) return;
    if (!over || active.id === over.id) return;
    const sortedIds = sortTasks(tasks, settings.defaultSort).map((task) => task.id);
    const orderSet = new Set(order);
    const baseOrder = manualOrder
      ? [...order, ...sortedIds.filter((id) => !orderSet.has(id))]
      : sortedIds;
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const visibleIds = baseOrder.filter(
      (id) => taskById.get(id)?.status === activeTab
    );
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeIndex = visibleIds.indexOf(activeId);
    const overIndex = visibleIds.indexOf(overId);
    if (activeIndex < 0 || overIndex < 0) return;
    const nextVisible = arrayMove(visibleIds, activeIndex, overIndex);
    let visibleIndex = 0;
    const nextOrder = baseOrder.map((id) => {
      const task = taskById.get(id);
      if (task?.status !== activeTab) return id;
      const nextId = nextVisible[visibleIndex];
      visibleIndex += 1;
      return nextId;
    });
    setOrder(nextOrder);
  };

  const tabButton = (tab: "active" | "completed" | "on-hold", label: string) => {
    const isActive = activeTab === tab;
    return (
      <button
        type="button"
        className={`no-drag flex-1 rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
          isActive
            ? "accent-pill"
            : "bg-white/5 text-slate-300 hover:bg-white/10"
        }`}
        onClick={() => setActiveTab(tab)}
      >
        {label}
      </button>
    );
  };

  const toggleMiniMode = async () => {
    const targetHeight = 78;
    if (!miniMode) {
      const state = await window.api?.getWindowBounds();
      previousSizeRef.current = {
        width: state?.width ?? window.innerWidth,
        height: state?.height ?? window.innerHeight
      };
      await window.api?.setWindowMode("mini");
      void window.api?.resizeWindow({ height: targetHeight });
      setMiniMode(true);
      return;
    }

    const previous = previousSizeRef.current;
    if (previous) {
      void window.api?.resizeWindow({ width: previous.width, height: previous.height });
    }
    await window.api?.setWindowMode("normal");
    setMiniMode(false);
  };

  const setDeadlineByMinutes = (minutes: number) => {
    setDeadline(dayjs().add(minutes, "minute").format("YYYY-MM-DDTHH:mm"));
  };

  const resetDeadlineToNow = () => {
    setDeadline(dayjs().format("YYYY-MM-DDTHH:mm"));
  };

  const deadlineInputRef = useRef<HTMLInputElement | null>(null);

  const openCalendar = () => {
    const input = deadlineInputRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    input.focus();
  };

  return (
    <div className={`relative h-full w-full ${miniMode ? "p-2" : "p-6"}`}>
      <div className="relative h-full w-full">
        {!miniMode && scrollMetrics.show ? (
          <div
            className={`no-drag absolute right-2 top-3 bottom-3 z-30 w-2 transition-opacity duration-300 ${
              showScrollBar ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div
              className="relative h-full rounded-full bg-white/5"
              onPointerDown={(event) => {
                if (event.target !== event.currentTarget) return;
                const el = scrollRef.current;
                if (!el) return;
                const trackRect = event.currentTarget.getBoundingClientRect();
                const clickY = event.clientY - trackRect.top;
                const { maxScrollTop, thumbHeight } = scrollMetrics;
                const nextRatio = (clickY - thumbHeight / 2) / (trackRect.height - thumbHeight);
                const nextTop = Math.max(0, Math.min(1, nextRatio));
                el.scrollTop = nextTop * maxScrollTop;
              }}
            >
                <button
                  type="button"
                  className="scroll-thumb absolute left-0 right-0 rounded-full transition-opacity"
                  style={{
                    height: `${scrollMetrics.thumbHeight}px`,
                    transform: `translateY(${scrollMetrics.thumbTop}px)`
                  }}
                onPointerDown={(event) => {
                  const el = scrollRef.current;
                  if (!el) return;
                  dragStateRef.current = {
                    isDragging: true,
                    startY: event.clientY,
                    startScrollTop: el.scrollTop
                  };
                }}
              />
            </div>
          </div>
        ) : null}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`scroll-area h-full w-full ${
            miniMode ? "overflow-hidden" : "overflow-y-auto"
          } ${miniMode ? "" : "px-4"}`}
        >
          <div
            className={`flex min-h-full w-full ${
              miniMode ? "items-start justify-start" : "items-start justify-center"
            }`}
          >
            <div
              className={`relative mx-auto flex w-full max-w-md flex-col ${
                miniMode ? "gap-2" : "gap-4"
              }`}
            >
              {!miniMode ? (
                <div className="pointer-events-none absolute inset-0 -z-10 rounded-[32px] bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(34,197,94,0.14),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.75),rgba(2,6,23,0.85))]" />
              ) : null}
              <CustomTitleBar
          title={miniMode ? "" : t.overlayTasks}
                titleContent={
                  miniMode ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-xs font-semibold tracking-normal text-slate-100">
                    {nextTask ? nextTask.title : t.noActiveTasks}
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                      {nextTask
                        ? `${Math.max(0, dayjs(nextTask.deadline).diff(now, "minute"))} ${
                            t.minShort
                          }`
                        : "--"}
                      </span>
                    </div>
                  ) : undefined
                }
                progress={miniMode ? miniProgress : undefined}
                className={
                  miniMode
                    ? `w-full px-2 py-2${miniUrgent ? " heartbeat" : ""}`
                    : "min-h-[52px]"
                }
                actions={
                <div
                    className={miniMode ? "flex items-center gap-1" : "flex items-center gap-2"}
                  >
                    {!miniMode ? (
                      <button
                        type="button"
                        className="no-drag rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:bg-white/10"
                        onClick={handleOpenSettings}
                      >
                        {t.settings}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-2.5 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                      onClick={toggleMiniMode}
                      aria-label={miniMode ? "Exit mini mode" : "Enter mini mode"}
                    >
                      {miniMode ? "▢" : "▣"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                      onClick={() => window.api?.minimize()}
                    >
                      —
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                      onClick={() => window.api?.close()}
                    >
                      ×
                    </button>
                  </div>
                }
              />

              {!miniMode ? (
                <div className="panel-glass rounded-3xl border border-white/10 p-3">
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isAddOpen ? "max-h-[420px] opacity-100" : "max-h-[64px] opacity-90"
                    }`}
                  >
                    <button
                      type="button"
                      className={`no-drag flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10 ${
                        isAddOpen ? "mb-3" : ""
                      }`}
                      onClick={() => setIsAddOpen((prev) => !prev)}
                      aria-label="Toggle add task form"
                    >
                      <span>{isAddOpen ? t.newTask : t.addTask}</span>
                      <span className="accent-button flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-lg text-white">
                        {isAddOpen ? "—" : "+"}
                      </span>
                    </button>
                    <div
                      className={`grid gap-3 overflow-hidden transition-all duration-300 ease-out ${
                        isAddOpen ? "max-h-[360px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder={t.taskTitle}
                        className="accent-focus no-drag w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                          onClick={() => setDeadlineByMinutes(60)}
                        >
                          +1h
                        </button>
                        <button
                          type="button"
                          className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                          onClick={() => setDeadlineByMinutes(120)}
                        >
                          +2h
                        </button>
                        <button
                          type="button"
                          className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                          onClick={() => setDeadlineByMinutes(240)}
                        >
                          +4h
                        </button>
                        <button
                          type="button"
                          className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                          onClick={() => setDeadlineByMinutes(1440)}
                        >
                          +1d
                        </button>
                        <button
                          type="button"
                          className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                          onClick={openCalendar}
                          aria-label={t.openCalendar}
                        >
                          CAL
                        </button>
                        <button
                          type="button"
                          className="no-drag rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10"
                          onClick={resetDeadlineToNow}
                          aria-label="Reset to now"
                        >
                          {t.resetNow}
                        </button>
                        <div className="ml-auto text-[11px] uppercase tracking-[0.2em] text-slate-300">
                          {dayjs(deadline).format("YYYY/MM/DD HH:mm")}
                        </div>
                        <input
                          ref={deadlineInputRef}
                          type="datetime-local"
                          value={deadline}
                          onChange={(event) => setDeadline(event.target.value)}
                          className="sr-only"
                        />
                        <button
                          type="button"
                        className="accent-button no-drag flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 text-lg font-semibold text-white transition"
                        onClick={handleAddTask}
                      >
                        +
                      </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {!miniMode ? (
                <>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={visibleTasks.map((task) => task.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-3 pb-16">
                        {visibleTasks.length === 0 ? (
                          <div className="panel-glass-soft rounded-3xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-slate-200/70">
                            {activeTab === "active"
                              ? t.noTasksActive
                              : t.noTasksOther}
                          </div>
                        ) : (
                          visibleTasks.map((task) => (
                            <SortableTaskItem key={task.id} id={task.id}>
                              {(dragHandleProps) => (
                                <TaskItem
                                  task={task}
                                  now={now}
                                  onStatusChange={updateStatus}
                                  onUpdateTask={updateTask}
                                  onRemove={removeTask}
                                  labels={{
                                    deadline: t.deadline,
                                    timeRemaining: t.timeRemaining,
                                    minLeft: t.minLeft,
                                    expired: t.expired,
                                    delete: t.delete,
                                    edit: t.edit,
                                    holdAction: t.holdAction,
                                    resume: t.resume,
                                    restore: t.restore,
                                    complete: t.complete
                                  }}
                                  dragHandleProps={dragHandleProps}
                                />
                              )}
                            </SortableTaskItem>
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {!miniMode ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center">
          <div className="pointer-events-auto w-full max-w-md px-4">
            <div className="panel-glass-strong rounded-3xl border border-white/10 p-3">
              <div className="flex items-center gap-2">
                {tabButton("active", t.progress)}
                {settings.hideCompletedTab ? null : tabButton("completed", t.completed)}
                {settings.hideHoldTab ? null : tabButton("on-hold", t.hold)}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {settingsOpen ? (
        <div
          className="no-drag fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSettingsOpen(false);
            }
          }}
        >
          <div className="panel-glass w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
                {t.settings}
              </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="no-drag rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                    onClick={() => setSettingsOpen(false)}
                  >
                    {t.close}
                  </button>
                  <button
                    type="button"
                    className="accent-button no-drag rounded-full border border-white/20 px-3 py-1 text-xs text-white transition"
                    onClick={handleSaveSettings}
                  >
                    {t.save}
                  </button>
                </div>
            </div>
            <div className="max-h-[78vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-6">
                <section className="grid gap-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                    {t.windowAppearance}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.startMode}
                      <select
                        className="no-drag rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                        value={settingsDraft.startMode}
                        onChange={(event) =>
                          updateSettingsDraft({ startMode: event.target.value as "normal" | "mini" })
                        }
                      >
                        <option value="normal">{t.normal}</option>
                        <option value="mini">{t.mini}</option>
                      </select>
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.alwaysOnTop}
                      <input
                        type="checkbox"
                        checked={settingsDraft.alwaysOnTop}
                        onChange={(event) => updateSettingsDraft({ alwaysOnTop: event.target.checked })}
                      />
                    </label>
                    <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.panelOpacity} ({settingsDraft.panelOpacity.toFixed(2)})
                      <input
                        type="range"
                        min="0.6"
                        max="0.95"
                        step="0.01"
                        value={settingsDraft.panelOpacity}
                        onChange={(event) =>
                          updateSettingsDraft({ panelOpacity: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.blur} ({settingsDraft.panelBlur}px)
                      <input
                        type="range"
                        min="8"
                        max="24"
                        step="1"
                        value={settingsDraft.panelBlur}
                        onChange={(event) =>
                          updateSettingsDraft({ panelBlur: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.theme}
                      <select
                        className="no-drag rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                        value={settingsDraft.theme}
                        onChange={(event) =>
                          updateSettingsDraft({ theme: event.target.value as ThemeMode })
                        }
                      >
                        <option value="ocean">Ocean</option>
                        <option value="emerald">Emerald</option>
                        <option value="mono">Mono</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.fontSize}
                      <select
                        className="no-drag rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                        value={settingsDraft.fontSize}
                        onChange={(event) =>
                          updateSettingsDraft({ fontSize: event.target.value as FontSize })
                        }
                      >
                        <option value="sm">Small</option>
                        <option value="md">Medium</option>
                        <option value="lg">Large</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="no-drag rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                      onClick={handleResetWindow}
                    >
                      {t.resetWindow}
                    </button>
                    <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.language}
                      <select
                        className="no-drag rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                        value={settingsDraft.language}
                        onChange={(event) =>
                          updateSettingsDraft({ language: event.target.value as Language })
                        }
                      >
                        <option value="ko">한국어</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.launchOnStartup}
                      <input
                        type="checkbox"
                      checked={settingsDraft.launchOnStartup}
                      onChange={(event) =>
                          updateSettingsDraft({ launchOnStartup: event.target.checked })
                      }
                    />
                  </label>
                  </div>
                </section>

                <section className="grid gap-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                    {t.notifications}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.thresholds}
                      <div className="flex flex-wrap gap-2">
                        {[120, 60, 30, 15].map((value) => (
                          <label
                            key={value}
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200"
                          >
                            <input
                              type="checkbox"
                              checked={settingsDraft.notifyThresholds.includes(value)}
                              onChange={() => toggleThreshold(value)}
                            />
                            {value}m
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.heartbeat} ({settingsDraft.heartbeatThreshold}m)
                      <input
                        type="range"
                        min="60"
                        max="300"
                        step="10"
                        value={settingsDraft.heartbeatThreshold}
                        onChange={(event) =>
                          updateSettingsDraft({ heartbeatThreshold: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.sound}
                      <input
                        type="checkbox"
                      checked={settingsDraft.soundEnabled}
                      onChange={(event) => updateSettingsDraft({ soundEnabled: event.target.checked })}
                    />
                  </label>
                  </div>
                </section>

                <section className="grid gap-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                    {t.sortingVisibility}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.defaultSort}
                      <select
                        className="no-drag rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                        value={settingsDraft.defaultSort}
                        onChange={(event) =>
                          updateSettingsDraft({ defaultSort: event.target.value as SortMode })
                        }
                      >
                        <option value="deadline">{t.deadline}</option>
                        <option value="created">{t.created}</option>
                      </select>
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.manualOrderPriority}
                      <input
                        type="checkbox"
                      checked={settingsDraft.manualOrderPriority}
                      onChange={(event) =>
                          updateSettingsDraft({ manualOrderPriority: event.target.checked })
                      }
                    />
                  </label>
                    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.hideCompletedTab}
                      <input
                        type="checkbox"
                      checked={settingsDraft.hideCompletedTab}
                      onChange={(event) =>
                          updateSettingsDraft({ hideCompletedTab: event.target.checked })
                      }
                    />
                  </label>
                    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.hideHoldTab}
                      <input
                        type="checkbox"
                      checked={settingsDraft.hideHoldTab}
                      onChange={(event) => updateSettingsDraft({ hideHoldTab: event.target.checked })}
                    />
                  </label>
                    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {t.autoSave}
                      <input
                        type="checkbox"
                      checked={settingsDraft.autoSave}
                      onChange={(event) => updateSettingsDraft({ autoSave: event.target.checked })}
                    />
                  </label>
                  </div>
                </section>

              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default App;
