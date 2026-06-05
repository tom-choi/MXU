import { Bot, Crosshair, Route, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

const strategyStages = [
  {
    title: '1阶段',
    text: '先看右下观星：泉水 + 露露可占观星璐璐；三幻灵可转皎月或龙王。',
  },
  {
    title: '2-1',
    text: '远征直接定龙王；武器专属可走武器；女枪早来且装备合适可吃分。',
  },
  {
    title: '3-2',
    text: '强经济且血量可控冲新星95；强战力但经济一般，4-1抢龙王和加里奥。',
  },
];

const mainLineups = ['新星九五', '机甲龙王', '观星璐璐', '幻灵皎月', '魔术师女枪'];

export function GoldenSpatulaStrategyPanel() {
  const { projectInterface, activeInstanceId, instances } = useAppStore();

  if (projectInterface?.name !== 'GoldenSpatulaMuMu') {
    return null;
  }

  const activeInstance = instances.find((item) => item.id === activeInstanceId);
  const selectedGuideTask = activeInstance?.selectedTasks.some(
    (task) =>
      [
        'GuideModeClickTest',
        'GuideModeSelectBeginnerOnly',
        'GuideModeStartButtonOnly',
        'BeginnerTutorialFullRun',
      ].includes(task.taskName) && task.enabled,
  );

  return (
    <div className="bg-bg-secondary rounded-lg ring-1 ring-inset ring-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">17.4 策略面板</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-accent/10 text-accent shrink-0">
            文章优先
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="rounded-md bg-bg-tertiary p-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
            <Target className="w-3.5 h-3.5 text-success" />
            当前测试阶段
          </div>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            新手教学完整闭环：从玩法页进入教程，完成升级、上阵、升星、羁绊、装备、选秀和三星。
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-bg-primary text-text-secondary">
              引导点位 730,445
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-bg-primary text-text-secondary">
              开始点位 1123,641
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-bg-primary text-text-secondary">
              教程专用买卖
            </span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded ${
                selectedGuideTask ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}
            >
              {selectedGuideTask ? '任务已勾选' : '任务未勾选'}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-text-primary mb-2">
            <Route className="w-3.5 h-3.5 text-text-secondary" />
            林小北 17.4 决策节奏
          </div>
          <div className="space-y-2">
            {strategyStages.map((stage) => (
              <div key={stage.title} className="rounded-md border border-border/70 p-2">
                <div className="text-xs font-medium text-text-primary">{stage.title}</div>
                <div className="mt-1 text-xs leading-relaxed text-text-secondary">{stage.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-text-primary mb-2">
            <Sparkles className="w-3.5 h-3.5 text-text-secondary" />
            主线阵容池
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mainLineups.map((name) => (
              <span
                key={name}
                className="text-[11px] px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2 rounded-md border border-warning/30 bg-warning/5 p-2.5">
          <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-text-secondary">
            全自动对局会分阶段解锁；当前买卖、刷新和出售只允许发生在固定的新手教学脚本内。
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <Crosshair className="w-3 h-3" />
          下一步：接入玩法页模板识别，避免固定点位误触。
        </div>
      </div>
    </div>
  );
}
