import { useState } from 'react';
import { X, Plus } from 'lucide-react';

export function ComplianceBadgeListEditor({ value, onChange }: { value: string[]; onChange: (badges: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    if (input.trim() && !value.includes(input.trim())) {
      onChange([...value, input.trim()]);
      setInput('');
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="e.g. SOC 2 Type II"
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
        />
        <button type="button" onClick={add} className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-slate-200">
          <Plus className="size-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map(badge => (
          <div key={badge} className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground">
            {badge}
            <button type="button" onClick={() => onChange(value.filter(b => b !== badge))} className="text-muted-foreground hover:text-muted-foreground">
              <X className="size-3" />
            </button>
          </div>
        ))}
        {value.length === 0 && <span className="text-xs text-muted-foreground">No badges added.</span>}
      </div>
    </div>
  );
}
