import { useRef, type KeyboardEvent } from 'react';

export interface OptionCardItem<T extends string> {
  value: T;
  title: string;
  desc: string;
}

interface OptionCardGroupProps<T extends string> {
  labelledBy: string;
  options: readonly OptionCardItem<T>[];
  selected: T | null | undefined;
  onSelect: (value: T) => void;
  describedBy?: string;
}

/** 단일 선택 카드 묶음 — 방향키로 이동·선택하는 radiogroup (roving tabindex) */
export default function OptionCardGroup<T extends string>({
  labelledBy,
  options,
  selected,
  onSelect,
  describedBy,
}: OptionCardGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((opt) => opt.value === selected);
  const focusableIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const moveTo = (index: number) => {
    const next = (index + options.length) % options.length;
    refs.current[next]?.focus();
    onSelect(options[next].value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveTo(index + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      moveTo(index - 1);
    }
  };

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      {options.map((opt, index) => {
        const isSelected = opt.value === selected;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={index === focusableIndex ? 0 : -1}
            className={`option-card${isSelected ? ' selected' : ''}`}
            onClick={() => onSelect(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            <span className="option-card-title">{opt.title}</span>
            <span className="option-card-desc">{opt.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
