'use client';
/**
 * Edits the blocks of a Free layout section: add, reorder, duplicate, remove.
 * A Columns block opens per-column tabs, each with its own block list. Columns
 * cannot be nested inside columns (one level keeps phones readable).
 */
import { BLOCKS, BLOCK_KEYS, createBlock, normalizeBlock } from '@/lib/sections';
import { clone, cx, move, uid } from '@/lib/utils';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FieldList } from './Fields';

function AddBlock({ onAdd, allowContainers }) {
  const [open, setOpen] = useState(false);
  const keys = BLOCK_KEYS.filter((k) => allowContainers || !BLOCKS[k].container);
  return (
    <div>
      <button type="button" className="ui-btn w-full !border-dashed" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Plus size={14} /> Add block
      </button>
      {open && (
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-medium hover:border-[#0d7a6f] hover:text-[#0d7a6f]"
              onClick={() => {
                onAdd(createBlock(k));
                setOpen(false);
              }}
            >
              {BLOCKS[k].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ColumnsEditor({ block, onChange }) {
  const [tab, setTab] = useState(0);
  const cols = block.children || [];
  return (
    <div className="mt-2 rounded-lg border border-slate-200">
      <div className="flex border-b border-slate-200" role="tablist">
        {cols.map((c, i) => (
          <button key={i} type="button" role="tab" aria-selected={tab === i} className="ui-tab flex-1" onClick={() => setTab(i)}>
            Column {i + 1} <span className="text-slate-400">({c.length})</span>
          </button>
        ))}
      </div>
      <div className="p-2">
        <BlocksEditor
          value={cols[tab] || []}
          allowContainers={false}
          onChange={(next) => onChange({ ...block, children: cols.map((c, i) => (i === tab ? next : c)) })}
        />
      </div>
    </div>
  );
}

export default function BlocksEditor({ value = [], onChange, allowContainers = true }) {
  const [open, setOpen] = useState(null);
  const list = value;
  const update = (i, next) => onChange(list.map((b, j) => (j === i ? normalizeBlock(next) : b)));

  return (
    <div className="space-y-1.5">
      {list.length === 0 && <p className="ui-help">No blocks yet.</p>}
      {list.map((block, i) => {
        const def = BLOCKS[block.type];
        const isOpen = open === block.id;
        return (
          <div key={block.id} className={cx('rounded-lg border bg-white', isOpen ? 'border-[#0d7a6f]' : 'border-slate-200')}>
            <div className="flex items-center gap-1 px-1.5 py-1">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-1 text-left" onClick={() => setOpen(isOpen ? null : block.id)}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-[12.5px] font-semibold">{def?.label || block.type}</span>
                <span className="truncate text-[12px] text-slate-500">{def?.preview?.(block.props || {}, block)}</span>
              </button>
              <button type="button" className="ui-icon-btn !h-7 !w-7" disabled={i === 0} onClick={() => onChange(move(list, i, i - 1))} aria-label="Move up">
                <ArrowUp size={13} />
              </button>
              <button type="button" className="ui-icon-btn !h-7 !w-7" disabled={i === list.length - 1} onClick={() => onChange(move(list, i, i + 1))} aria-label="Move down">
                <ArrowDown size={13} />
              </button>
              <button
                type="button"
                className="ui-icon-btn !h-7 !w-7"
                onClick={() => {
                  const copy = clone(block);
                  copy.id = uid('b');
                  if (copy.children) copy.children = copy.children.map((col) => col.map((c) => ({ ...c, id: uid('b') })));
                  onChange([...list.slice(0, i + 1), copy, ...list.slice(i + 1)]);
                }}
                aria-label="Duplicate"
              >
                <Copy size={13} />
              </button>
              <button type="button" className="ui-icon-btn !h-7 !w-7 hover:!text-red-600" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Delete block">
                <Trash2 size={13} />
              </button>
            </div>
            {isOpen && def && (
              <div className="space-y-3 border-t border-slate-100 p-3">
                <FieldList fields={def.fields} value={block.props || {}} onChange={(props) => update(i, { ...block, props })} />
                {def.container && <ColumnsEditor block={block} onChange={(next) => update(i, next)} />}
              </div>
            )}
          </div>
        );
      })}
      <AddBlock
        allowContainers={allowContainers}
        onAdd={(b) => {
          onChange([...list, b]);
          setOpen(b.id);
        }}
      />
    </div>
  );
}
