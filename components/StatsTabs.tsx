"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faGamepad,
  faTrophy,
  faTriangleExclamation,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import StreakCalendar from "@/components/StreakCalendar";
import BadgeGallery from "@/components/BadgeGallery";
import NemesisCard from "@/components/NemesisCard";
import DailyChallengeStats from "@/components/DailyChallengeStats";
import PersonalBestsCard from "@/components/PersonalBestsCard";
import FingerLoadCard from "@/components/FingerLoadCard";
import WeeklyDigestCard from "@/components/WeeklyDigestCard";
import KeyboardHeatmap, { type HeatmapCase } from "@/components/KeyboardHeatmap";
import Switch from "@/components/Switch";
import WpmChart from "@/components/charts/WpmChart";
import AccuracyChart from "@/components/charts/AccuracyChart";
import SessionsPerWeek from "@/components/charts/SessionsPerWeek";
import ModeBreakdown from "@/components/charts/ModeBreakdown";
import ErrorDistribution from "@/components/charts/ErrorDistribution";
import BigramChart from "@/components/charts/BigramChart";
import AnalyticsSummary from "@/components/charts/AnalyticsSummary";
import DeepAnalytics from "@/components/charts/DeepAnalytics";
import {
  parseTabSlug,
  resolveInitialTab,
  writePersistedTab,
  type TabSlug,
} from "@/lib/stats-tabs";
import { Panel, BigStat, EmptyState, TipItem } from "@/components/stats/PanelHelpers";
import type { ProgressData } from "@/lib/progress";
import type { EnrichedSessionSummary } from "@/lib/types";
import { faGauge, faBullseye, faFire, faKeyboard, faTrash } from "@fortawesome/free-solid-svg-icons";

// ─── Generic <Tabs> primitive ────────────────────────────────────────────────

type TabId = string;

interface TabsContextValue {
  activeTab: TabId;
  registerTab: (tabId: TabId, el: HTMLButtonElement | null) => void;
  onTabActivate: (tabId: TabId, fromKeyboard: boolean) => void;
  orderedTabIds: ReadonlyArray<TabId>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tab/TabPanel must be rendered inside <Tabs>");
  return ctx;
}

interface TabsProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  /** ordered list of tab ids; used by keyboard navigation for prev/next/Home/End */
  tabOrder: ReadonlyArray<TabId>;
  children: ReactNode;
}

export function Tabs({ activeTab, onChange, tabOrder, children }: TabsProps) {
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());

  const registerTab = useCallback((tabId: TabId, el: HTMLButtonElement | null) => {
    if (el) tabRefs.current.set(tabId, el);
    else tabRefs.current.delete(tabId);
  }, []);

  const onTabActivate = useCallback(
    (tabId: TabId, fromKeyboard: boolean) => {
      onChange(tabId);
      if (fromKeyboard) {
        // Move focus along with selection (manual-activation pattern)
        // Defer to next frame so the tab has rerendered with tabIndex=0
        requestAnimationFrame(() => {
          tabRefs.current.get(tabId)?.focus();
        });
      }
    },
    [onChange],
  );

  const value: TabsContextValue = useMemo(
    () => ({
      activeTab,
      registerTab,
      onTabActivate,
      orderedTabIds: tabOrder,
    }),
    [activeTab, registerTab, onTabActivate, tabOrder],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

interface TabListProps {
  ariaLabel: string;
  children: ReactNode;
  /** ref to the scrollable container, used by parent for scroll-into-view logic */
  containerRef?: React.Ref<HTMLDivElement>;
}

export function TabList({ ariaLabel, children, containerRef }: TabListProps) {
  const { orderedTabIds, activeTab, onTabActivate } = useTabsContext();

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = orderedTabIds.indexOf(activeTab);
    if (idx < 0) return;
    let next: TabId | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = orderedTabIds[(idx + 1) % orderedTabIds.length];
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = orderedTabIds[(idx - 1 + orderedTabIds.length) % orderedTabIds.length];
        break;
      case "Home":
        next = orderedTabIds[0];
        break;
      case "End":
        next = orderedTabIds[orderedTabIds.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next && next !== activeTab) onTabActivate(next, true);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className="flex flex-nowrap overflow-x-auto border-b border-neutral-800/60 -mx-2 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}

interface TabProps {
  tabId: TabId;
  icon?: IconDefinition;
  children: ReactNode;
}

export function Tab({ tabId, icon, children }: TabProps) {
  const { activeTab, registerTab, onTabActivate } = useTabsContext();
  const isActive = tabId === activeTab;
  return (
    <button
      type="button"
      role="tab"
      id={`stats-tab-${tabId}`}
      aria-controls={`stats-panel-${tabId}`}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      ref={(el) => registerTab(tabId, el)}
      onClick={() => onTabActivate(tabId, false)}
      className={[
        "flex items-center gap-2 min-h-[44px] min-w-[44px] px-4 py-3 shrink-0",
        "text-sm font-medium motion-safe:transition-colors",
        "border-b-2 -mb-px",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d] rounded-t-md",
        isActive
          ? "text-[#00ff88] border-[#00ff88]"
          : "text-neutral-400 border-transparent hover:text-neutral-200",
      ].join(" ")}
    >
      {icon && <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" />}
      <span>{children}</span>
    </button>
  );
}

interface TabPanelProps {
  tabId: TabId;
  children: ReactNode;
}

export function TabPanel({ tabId, children }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  const isActive = tabId === activeTab;
  return (
    <div
      role="tabpanel"
      id={`stats-panel-${tabId}`}
      aria-labelledby={`stats-tab-${tabId}`}
      tabIndex={-1}
      hidden={!isActive}
    >
      {isActive && children}
    </div>
  );
}

// ─── The assembled <StatsTabs> for the /stats page ───────────────────────────

interface TabDescriptor {
  readonly slug: TabSlug;
  readonly label: string;
  readonly icon: IconDefinition;
}

const TABS: ReadonlyArray<TabDescriptor> = [
  { slug: "overview", label: "Overview", icon: faChartLine },
  { slug: "gamification", label: "Game", icon: faGamepad },
  { slug: "performance", label: "Performance", icon: faTrophy },
  { slug: "weaknesses", label: "Weaknesses", icon: faTriangleExclamation },
  { slug: "history", label: "History", icon: faClockRotateLeft },
];

const TAB_ORDER: ReadonlyArray<TabSlug> = TABS.map((t) => t.slug);

export interface StatsTabsProps {
  progress: ProgressData;
  sessions: EnrichedSessionSummary[];
  loadingHistory: boolean;
  heatmapCase: HeatmapCase;
  onHeatmapCaseChange: (next: HeatmapCase) => void;
  onDeleteSession: (session: EnrichedSessionSummary) => void;
}

export default function StatsTabs(props: StatsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabSlug>(() => resolveInitialTab());
  const tabListRef = useRef<HTMLDivElement>(null);
  const isFirstRenderRef = useRef(true);

  // Persist + sync URL hash on every change. Skip on first render so we don't
  // overwrite a freshly-pasted hash that we already honored via resolveInitialTab.
  useEffect(() => {
    writePersistedTab(activeTab);
    const desiredHash = `#${activeTab}`;
    if (typeof window !== "undefined" && window.location.hash !== desiredHash) {
      window.history.replaceState(null, "", desiredHash);
    }
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    scrollActiveTabIntoView(tabListRef.current, activeTab);
  }, [activeTab]);

  // Listen for external hash changes (back/forward, manual paste).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const next = parseTabSlug(window.location.hash);
      if (next && next !== activeTab) setActiveTab(next);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [activeTab]);

  const handleChange = useCallback((next: string) => {
    setActiveTab(next as TabSlug);
  }, []);

  return (
    <Tabs activeTab={activeTab} onChange={handleChange} tabOrder={TAB_ORDER}>
      <TabList ariaLabel="Stats sections" containerRef={tabListRef}>
        {TABS.map((t) => (
          <Tab key={t.slug} tabId={t.slug} icon={t.icon}>
            {t.label}
          </Tab>
        ))}
      </TabList>

      <div className="pt-6 space-y-6">
        <TabPanel tabId="overview">
          <OverviewPanel {...props} />
        </TabPanel>
        <TabPanel tabId="gamification">
          <GamificationPanel {...props} />
        </TabPanel>
        <TabPanel tabId="performance">
          <PerformancePanel {...props} />
        </TabPanel>
        <TabPanel tabId="weaknesses">
          <WeaknessesPanel {...props} />
        </TabPanel>
        <TabPanel tabId="history">
          <HistoryPanel {...props} />
        </TabPanel>
      </div>
    </Tabs>
  );
}

// ─── scroll-into-view helper ─────────────────────────────────────────────────

function scrollActiveTabIntoView(container: HTMLDivElement | null, slug: TabSlug) {
  if (!container || typeof window === "undefined") return;
  const activeEl = container.querySelector<HTMLButtonElement>(
    `#stats-tab-${slug}`,
  );
  if (!activeEl) return;
  const containerRect = container.getBoundingClientRect();
  const tabRect = activeEl.getBoundingClientRect();
  const fullyVisible =
    tabRect.left >= containerRect.left && tabRect.right <= containerRect.right;
  if (fullyVisible) return;
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  activeEl.scrollIntoView({
    inline: "center",
    block: "nearest",
    behavior: reduced ? "auto" : "smooth",
  });
}

// ─── Panel components ────────────────────────────────────────────────────────

function OverviewPanel({
  progress,
  sessions,
  onDeleteSession,
}: StatsTabsProps) {
  const avgWpm =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.wpm, 0) / sessions.length)
      : 0;
  const hasTips = !!progress.tips && progress.tips.length > 0;
  const hasSessions = sessions.length > 0;

  if (!hasSessions && !hasTips) {
    return (
      <EmptyState message="Complete a typing session to populate your overview." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Panel className="col-span-2 sm:col-span-1">
          <BigStat icon={faKeyboard} value={progress.totalSessions} label="Sessions" />
        </Panel>
        <Panel className="col-span-1">
          <BigStat
            icon={faGauge}
            value={progress.bestWpm}
            label="Best WPM"
            color="text-[#00ff88]"
          />
        </Panel>
        <Panel className="col-span-1">
          <BigStat
            icon={faBullseye}
            value={`${progress.bestAccuracy}%`}
            label="Best Accuracy"
            color="text-[#00ff88]"
          />
        </Panel>
        <Panel className="col-span-1">
          <BigStat
            icon={faFire}
            value={progress.currentStreak}
            label="Day Streak"
            color="text-orange-400"
          />
        </Panel>
        <Panel className="col-span-1">
          <BigStat value={avgWpm} label="Avg WPM" />
        </Panel>
      </div>

      {(hasSessions || hasTips) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {hasSessions && (
            <Panel className={!hasTips ? "lg:col-span-2" : ""}>
              <h2 className="text-sm text-neutral-400 uppercase tracking-wider mb-3">
                Recent Sessions
              </h2>
              <div
                className="space-y-1.5 max-h-72 overflow-y-auto"
                tabIndex={0}
                role="region"
                aria-label="Recent sessions list"
              >
                {sessions.slice(0, 15).map((session, i) => (
                  <div
                    key={session.id || i}
                    className="flex items-center justify-between px-3 py-1.5 rounded bg-neutral-800/40 group"
                  >
                    <span className="text-xs text-neutral-400 w-20">{session.date}</span>
                    <span className="text-xs text-neutral-300 w-28 truncate">{session.mode}</span>
                    {session.duration > 0 && (
                      <span className="text-xs text-neutral-400 w-10">
                        {Math.round(session.duration / 1000)}s
                      </span>
                    )}
                    <span className="text-sm font-bold text-neutral-200 w-16 text-right">
                      {session.wpm} WPM
                    </span>
                    <span
                      className={`text-sm font-bold w-12 text-right ${
                        session.accuracy >= 95
                          ? "text-[#00ff88]"
                          : session.accuracy >= 80
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    >
                      {session.accuracy}%
                    </span>
                    {session.id && (
                      <button
                        onClick={() => onDeleteSession(session)}
                        className="p-4 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 motion-safe:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-800 rounded"
                        aria-label={`Delete session from ${session.date} — ${session.wpm} WPM`}
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {hasTips && (
            <Panel className={!hasSessions ? "lg:col-span-2" : ""}>
              <h2 className="text-sm text-neutral-400 uppercase tracking-wider mb-3">
                AI Tips
              </h2>
              <div
                className="space-y-2 max-h-80 overflow-y-auto"
                tabIndex={0}
                role="region"
                aria-label="AI tips list"
              >
                {progress.tips!.slice(0, 10).map((tip, i) => (
                  <TipItem
                    key={i}
                    text={tip.text}
                    explanation={tip.explanation}
                    date={tip.createdAt.split("T")[0]}
                  />
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function GamificationPanel({ progress, sessions }: StatsTabsProps) {
  const hasErrors = Object.keys(progress.errorHeatmap).length > 0;
  return (
    <div className="space-y-6">
      <Panel>
        <StreakCalendar sessions={sessions} />
      </Panel>
      <Panel>
        <BadgeGallery badges={progress.badges || []} />
      </Panel>
      {hasErrors && (
        <Panel>
          <NemesisCard errorHeatmap={progress.errorHeatmap} />
        </Panel>
      )}
      <Panel>
        <DailyChallengeStats />
      </Panel>
    </div>
  );
}

function PerformancePanel({ progress, sessions }: StatsTabsProps) {
  const hasSessions = sessions.length > 0;
  const hasErrors = Object.keys(progress.errorHeatmap).length > 0;
  const hasDigest = sessions.length >= 3;
  const hasAnalytics = sessions.length >= 3;
  const hasDeep = sessions.length >= 5;
  const hasCharts = sessions.length >= 2;

  if (!hasSessions && !hasErrors && !hasDigest) {
    return (
      <EmptyState message="Complete more sessions to unlock performance insights." />
    );
  }

  return (
    <div className="space-y-6">
      {hasSessions && (
        <Panel>
          <PersonalBestsCard sessions={sessions} />
        </Panel>
      )}
      {hasErrors && (
        <Panel>
          <FingerLoadCard errorHeatmap={progress.errorHeatmap} />
        </Panel>
      )}
      {hasDigest && (
        <Panel>
          <WeeklyDigestCard sessions={sessions} />
        </Panel>
      )}
      {hasAnalytics && (
        <Panel>
          <AnalyticsSummary sessions={sessions} />
        </Panel>
      )}
      {hasDeep && (
        <Panel>
          <DeepAnalytics sessions={sessions} />
        </Panel>
      )}
      {hasCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel>
            <WpmChart sessions={sessions} />
          </Panel>
          <Panel>
            <AccuracyChart sessions={sessions} />
          </Panel>
        </div>
      )}
    </div>
  );
}

function WeaknessesPanel({
  progress,
  sessions,
  heatmapCase,
  onHeatmapCaseChange,
}: StatsTabsProps) {
  const hasErrors = Object.keys(progress.errorHeatmap).length > 0;
  const hasBigramData = sessions.some(
    (s) =>
      s.timingMetadata?.slowestBigrams &&
      s.timingMetadata.slowestBigrams.length > 0,
  );

  if (!hasErrors && !hasBigramData) {
    return (
      <EmptyState message="No errors or slow bigrams recorded yet — make a few mistakes and come back." />
    );
  }

  return (
    <div className="space-y-6">
      {hasErrors && (
        <Panel>
          <div className="flex items-center justify-between mb-3 gap-3">
            <h2 className="text-sm text-neutral-400 uppercase tracking-wider">
              Error Heatmap
            </h2>
            <Switch
              checked={heatmapCase === "upper"}
              onChange={(c) => onHeatmapCaseChange(c ? "upper" : "lower")}
              labelLeft="abc"
              labelRight="ABC"
              ariaLabel="Toggle between lowercase and uppercase error heatmap"
            />
          </div>
          <KeyboardHeatmap errorHeatmap={progress.errorHeatmap} caseMode={heatmapCase} />
        </Panel>
      )}

      {(hasErrors || hasBigramData) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {hasErrors && (
            <Panel className={!hasBigramData ? "lg:col-span-2" : ""}>
              <ErrorDistribution errorHeatmap={progress.errorHeatmap} />
            </Panel>
          )}
          {hasBigramData && (
            <Panel className={!hasErrors ? "lg:col-span-2" : ""}>
              <BigramChart sessions={sessions} />
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ sessions }: StatsTabsProps) {
  const hasCharts = sessions.length >= 2;
  if (!hasCharts && sessions.length === 0) {
    return <EmptyState message="No sessions recorded yet." />;
  }
  return (
    <div className="space-y-6">
      {hasCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel>
            <SessionsPerWeek sessions={sessions} />
          </Panel>
        </div>
      )}
      <Panel>
        <ModeBreakdown sessions={sessions} />
      </Panel>
    </div>
  );
}
