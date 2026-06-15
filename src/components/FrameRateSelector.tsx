import { useState, useEffect, useRef, useId, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Timer, ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/stores/appStore';
import { normalizeScreenshotFrameRate, type ScreenshotFrameRate } from '@/types/config';

interface FrameRateSelectorProps {
  /** 紧凑模式：用于中控台底部工具栏 */
  compact?: boolean;
  /** 额外的 className */
  className?: string;
}

// 截图间隔选项配置
const FRAME_RATE_OPTIONS: { value: ScreenshotFrameRate; labelKey: string }[] = [
  { value: '0.25', labelKey: 'screenshot.frameRate.every025s' },
  { value: '0.5', labelKey: 'screenshot.frameRate.every05s' },
  { value: '1', labelKey: 'screenshot.frameRate.every1s' },
];

/** 根据截图间隔设置计算帧间隔（毫秒） */
export function getFrameInterval(frameRate: ScreenshotFrameRate): number {
  switch (normalizeScreenshotFrameRate(frameRate)) {
    case '0.25':
      return 250;
    case '0.5':
      return 500;
    case '1':
      return 1000;
    default:
      return 1000;
  }
}

export function FrameRateSelector({ compact = false, className }: FrameRateSelectorProps) {
  const { t } = useTranslation();
  const { screenshotFrameRate, setScreenshotFrameRate } = useAppStore();

  if (compact) {
    const selectedRate = normalizeScreenshotFrameRate(screenshotFrameRate);
    return (
      <div
        className={clsx('flex items-center justify-between gap-2 rounded-md bg-bg-tertiary p-1', className)}
      >
        <span className="px-1.5 text-xs text-text-secondary whitespace-nowrap">
          {t('screenshot.frameRate.shortTitle')}
        </span>
        <div
          className="grid grid-cols-3 gap-1"
          role="radiogroup"
          aria-label={t('screenshot.frameRate.title')}
        >
          {FRAME_RATE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selectedRate === option.value}
              onClick={() => setScreenshotFrameRate(option.value)}
              className={clsx(
                'h-7 min-w-12 rounded px-2 text-xs font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent/50',
                selectedRate === option.value
                  ? 'bg-bg-primary text-text-primary shadow-sm ring-1 ring-inset ring-border'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
              )}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 完整模式：带标题和图标，用于设置页面
  return (
    <div className={clsx('bg-bg-secondary rounded-xl p-4 border border-border', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Timer className="w-5 h-5 text-accent" />
          <div>
            <span className="font-medium text-text-primary">{t('screenshot.frameRate.title')}</span>
            <p className="text-xs text-text-muted mt-0.5">{t('screenshot.frameRate.hint')}</p>
          </div>
        </div>

        {/* 自定义美化下拉菜单 */}
        <FrameRateDropdown
          value={screenshotFrameRate}
          onChange={(next) => setScreenshotFrameRate(next)}
        />
      </div>
    </div>
  );
}

interface FrameRateDropdownProps {
  value: ScreenshotFrameRate;
  onChange: (value: ScreenshotFrameRate) => void;
}

function FrameRateDropdown({ value, onChange }: FrameRateDropdownProps) {
  const { t } = useTranslation();
  const triggerId = useId();
  const listboxId = useId();
  const selectedValue = normalizeScreenshotFrameRate(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      FRAME_RATE_OPTIONS.findIndex((option) => option.value === selectedValue),
    ),
  );

  const selectedOption =
    FRAME_RATE_OPTIONS.find((option) => option.value === selectedValue) ?? FRAME_RATE_OPTIONS[0];

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        // 关闭时将焦点返回到触发按钮
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // 打开时初始化活动项并将焦点移动到列表
  useEffect(() => {
    if (open) {
      const index = Math.max(
        0,
        FRAME_RATE_OPTIONS.findIndex((option) => option.value === selectedValue),
      );
      setActiveIndex(index);
      // 使用 setTimeout 确保元素已渲染
      setTimeout(() => {
        listboxRef.current?.focus();
      }, 0);
    }
  }, [open, selectedValue]);

  const closeAndFocusTrigger = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      setOpen((prev) => !prev);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    }
  };

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(FRAME_RATE_OPTIONS.length - 1, prev + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(0, prev - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(FRAME_RATE_OPTIONS.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeAndFocusTrigger();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = FRAME_RATE_OPTIONS[activeIndex];
      if (option) {
        onChange(option.value);
        closeAndFocusTrigger();
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={triggerId}
        ref={triggerRef}
        className={clsx(
          'min-w-[160px] px-3 py-1.5 rounded-lg border text-sm flex items-center justify-between gap-2',
          'bg-bg-tertiary border-border text-text-primary',
          'hover:bg-bg-hover transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent/50',
        )}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
      >
        <span className="truncate">{t(selectedOption.labelKey)}</span>
        <ChevronDown
          className={clsx('w-4 h-4 text-text-secondary transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          ref={listboxRef}
          className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-bg-primary shadow-lg outline-none"
          role="listbox"
          aria-labelledby={triggerId}
          tabIndex={-1}
          onKeyDown={handleListboxKeyDown}
        >
          {FRAME_RATE_OPTIONS.map((option, index) => {
            const isSelected = option.value === selectedValue;
            const isActive = index === activeIndex;
            const optionId = `${listboxId}-option-${option.value}`;
            return (
              <button
                key={optionId}
                id={optionId}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  closeAndFocusTrigger();
                }}
                className={clsx(
                  'w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2',
                  isActive
                    ? 'bg-bg-active text-text-primary'
                    : isSelected
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-primary hover:bg-bg-hover',
                )}
                role="option"
                aria-selected={isSelected}
              >
                <span className="truncate">{t(option.labelKey)}</span>
                {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
