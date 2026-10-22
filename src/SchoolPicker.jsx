import { useEffect, useRef, useState } from "react";
import { IVY, PLUS, ALL_SCHOOLS } from "./schools.js";

function GroupCheckbox({ label, ids, selected, onToggleGroup, strong }) {
  const count = ids.filter((id) => selected.has(id)).length;
  const all = count === ids.length;
  const some = count > 0 && !all;
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);

  return (
    <label className={strong ? "pick-row pick-group" : "pick-row pick-subgroup"}>
      <input
        ref={ref}
        type="checkbox"
        checked={all}
        onChange={() => onToggleGroup(ids, !all)}
      />
      <span>{label}</span>
      <span className="pick-count">
        {count} of {ids.length}
      </span>
    </label>
  );
}

export default function SchoolPicker({ selected, setSelected }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleGroup = (ids, on) => {
    const next = new Set(selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    setSelected(next);
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const ivyIds = IVY.map((s) => s.id);
  const plusIds = PLUS.map((s) => s.id);
  const allIds = ALL_SCHOOLS.map((s) => s.id);

  let summary;
  if (selected.size === allIds.length) summary = "All Ivy+ (12 schools)";
  else if (selected.size === 0) summary = "No schools selected";
  else if (selected.size === 1) summary = ALL_SCHOOLS.find((s) => selected.has(s.id)).name;
  else if (ivyIds.every((id) => selected.has(id)) && !plusIds.some((id) => selected.has(id))) summary = "All Ivys (8 schools)";
  else if (plusIds.every((id) => selected.has(id)) && !ivyIds.some((id) => selected.has(id))) summary = "All Plus Schools (4 schools)";
  else summary = `${selected.size} schools selected`;

  return (
    <div className="picker" ref={wrapRef}>
      <button
        type="button"
        className="field-button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{summary}</span>
        <span className="caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="picker-panel" role="group" aria-label="Choose schools">
          <GroupCheckbox label="All Ivy+" ids={allIds} selected={selected} onToggleGroup={toggleGroup} strong />

          <div className="pick-section">
            <GroupCheckbox label="All Ivys" ids={ivyIds} selected={selected} onToggleGroup={toggleGroup} />
            <ul className="pick-list">
              {IVY.map((s) => (
                <li key={s.id}>
                  <label className="pick-row pick-item">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} />
                    <span>{s.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="pick-section">
            <GroupCheckbox label="All Plus Schools" ids={plusIds} selected={selected} onToggleGroup={toggleGroup} />
            <ul className="pick-list">
              {PLUS.map((s) => (
                <li key={s.id}>
                  <label className="pick-row pick-item">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} />
                    <span>{s.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
